<?php
class ProductController
{
    // Resolved storefront category scope (e.g. a men-only store), cached per request.
    // false = not yet resolved; null = no scope; array = ['ids'=>[int,...],'slug'=>string].
    private static $scope = false;

    /**
     * Storefront category scope from settings. When `storefront_category` names a
     * category slug, the whole storefront (listings, collections, filters, product
     * pages) is limited to that category and its children — everything else stays
     * in the DB (admin-managed) but is hidden from shoppers. Empty = full catalogue.
     */
    private function storeScope(): ?array
    {
        if (self::$scope === false) {
            self::$scope = null;
            $slug = trim((string) Setting::get('storefront_category', ''));
            if ($slug !== '') {
                $db = db();
                $s = $db->prepare('SELECT id FROM categories WHERE slug=?');
                $s->execute([$slug]);
                if ($id = (int) $s->fetchColumn()) {
                    $ch = $db->prepare('SELECT id FROM categories WHERE parent_id=?');
                    $ch->execute([$id]);
                    $ids = array_merge([$id], array_map('intval', $ch->fetchAll(PDO::FETCH_COLUMN)));
                    self::$scope = ['ids' => $ids, 'slug' => $slug];
                }
            }
        }
        return self::$scope;
    }

    /**
     * GET /api/products/filters — available filter facets for the storefront
     * sidebar, derived from real data (optionally scoped to a category/search):
     * distinct sizes, distinct colors (+ a representative hex), and price range.
     */
    public function filters(array $p): void
    {
        $db = db();
        $where = ['p.is_active = 1'];
        $args = [];
        if ($cat = Request::query('category')) {
            $where[] = 'c.slug = ?';
            $args[] = $cat;
        }
        if ($q = Request::query('search')) {
            $where[] = '(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
            $like = "%$q%";
            array_push($args, $like, $like, $like);
        }
        if ($scope = $this->storeScope()) {
            $where[] = 'p.category_id IN (' . implode(',', array_fill(0, count($scope['ids']), '?')) . ')';
            $args = array_merge($args, $scope['ids']);
        }
        $whereSql = implode(' AND ', $where);
        $base = "FROM products p JOIN categories c ON c.id = p.category_id";
        $vbase = "FROM product_variants pv
                  JOIN products p ON p.id = pv.product_id
                  JOIN categories c ON c.id = p.category_id";

        $priceStmt = $db->prepare("SELECT MIN(p.price) mn, MAX(p.price) mx $base WHERE $whereSql");
        $priceStmt->execute($args);
        $price = $priceStmt->fetch() ?: ['mn' => 0, 'mx' => 0];

        $sizeStmt = $db->prepare("SELECT DISTINCT pv.size $vbase
                                  WHERE $whereSql AND pv.size IS NOT NULL AND pv.size <> ''
                                  ORDER BY LENGTH(pv.size), pv.size");
        $sizeStmt->execute($args);
        $sizes = $sizeStmt->fetchAll(PDO::FETCH_COLUMN);

        $colorStmt = $db->prepare("SELECT pv.color, MAX(pv.color_hex) hex $vbase
                                   WHERE $whereSql AND pv.color IS NOT NULL AND pv.color <> ''
                                   GROUP BY pv.color ORDER BY pv.color");
        $colorStmt->execute($args);
        $colors = array_map(
            fn ($c) => ['name' => $c['color'], 'hex' => $c['hex'] ?: null],
            $colorStmt->fetchAll()
        );

        Response::success([
            'sizes'  => $sizes,
            'colors' => $colors,
            'price'  => ['min' => (float) ($price['mn'] ?? 0), 'max' => (float) ($price['mx'] ?? 0)],
        ]);
    }

    /** Product listing with search, filters, sort, pagination. */
    public function index(array $p): void
    {
        $db = db();
        $where = ['p.is_active = 1'];
        $args = [];

        if ($q = Request::query('search')) {
            $where[] = '(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
            $like = "%$q%";
            array_push($args, $like, $like, $like);
        }
        if ($cat = Request::query('category')) {
            $where[] = 'c.slug = ?';
            $args[] = $cat;
        }
        if ($brand = Request::query('brand')) {
            $brands = explode(',', $brand);
            $where[] = 'p.brand IN (' . implode(',', array_fill(0, count($brands), '?')) . ')';
            $args = array_merge($args, $brands);
        }
        if (($min = Request::query('min_price')) !== null && $min !== '') {
            $where[] = 'p.price >= ?';
            $args[] = (float) $min;
        }
        if (($max = Request::query('max_price')) !== null && $max !== '') {
            $where[] = 'p.price <= ?';
            $args[] = (float) $max;
        }
        // On-sale filter: only products actually discounted (selling below MRP).
        if (Request::query('on_sale')) {
            $where[] = 'p.mrp > 0 AND p.price < p.mrp';
        }
        // Size / color filter via variants
        $joinVar = '';
        $size  = Request::query('size');
        $color = Request::query('color');
        if ($size || $color) {
            $joinVar = 'JOIN product_variants pv ON pv.product_id = p.id';
            if ($size) {
                $sizes = explode(',', $size);
                $where[] = 'pv.size IN (' . implode(',', array_fill(0, count($sizes), '?')) . ')';
                $args = array_merge($args, $sizes);
            }
            if ($color) {
                $colors = explode(',', $color);
                $where[] = 'pv.color IN (' . implode(',', array_fill(0, count($colors), '?')) . ')';
                $args = array_merge($args, $colors);
            }
        }
        // Storefront category scope (e.g. men-only store) applies to every listing.
        if ($scope = $this->storeScope()) {
            $where[] = 'p.category_id IN (' . implode(',', array_fill(0, count($scope['ids']), '?')) . ')';
            $args = array_merge($args, $scope['ids']);
        }

        $sortMap = [
            'price_asc'  => 'p.price ASC',
            'price_desc' => 'p.price DESC',
            'popularity' => 'p.sold_count DESC',
            'rating'     => 'p.rating_avg DESC',
            'newest'     => 'p.created_at DESC',
            // Biggest discount first (guard against mrp=0 to avoid div-by-zero).
            'discount'   => 'CASE WHEN p.mrp > 0 THEN (p.mrp - p.price) / p.mrp ELSE 0 END DESC',
        ];
        $order = $sortMap[Request::query('sort', 'newest')] ?? 'p.created_at DESC';

        $page    = max(1, (int) Request::query('page', 1));
        $perPage = min(48, max(1, (int) Request::query('per_page', 12)));
        $offset  = ($page - 1) * $perPage;

        $whereSql = implode(' AND ', $where);

        $countSql = "SELECT COUNT(DISTINCT p.id) FROM products p
                     JOIN categories c ON c.id = p.category_id $joinVar WHERE $whereSql";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($args);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT DISTINCT p.*, c.name AS category_name, c.slug AS category_slug,
                   (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC, sort_order LIMIT 1) AS image
                FROM products p
                JOIN categories c ON c.id = p.category_id $joinVar
                WHERE $whereSql
                ORDER BY $order
                LIMIT $perPage OFFSET $offset";
        $stmt = $db->prepare($sql);
        $stmt->execute($args);

        Response::success([
            'products' => array_map([$this, 'castProduct'], $stmt->fetchAll()),
            'pagination' => [
                'page' => $page, 'per_page' => $perPage,
                'total' => $total, 'pages' => (int) ceil($total / $perPage),
            ],
        ]);
    }

    public function show(array $p): void
    {
        $db = db();
        $stmt = $db->prepare(
            'SELECT p.*, c.name AS category_name, c.slug AS category_slug
             FROM products p JOIN categories c ON c.id=p.category_id
             WHERE p.slug=? AND p.is_active=1'
        );
        $stmt->execute([$p['slug']]);
        $product = $stmt->fetch();
        if (!$product) {
            Response::error('Product not found', 404);
        }
        // Hide products outside the storefront scope (e.g. non-men items).
        if (($scope = $this->storeScope()) && !in_array((int) $product['category_id'], $scope['ids'], true)) {
            Response::error('Product not found', 404);
        }
        $product = $this->castProduct($product);

        $imgs = $db->prepare('SELECT id, image_url, is_primary FROM product_images WHERE product_id=? ORDER BY is_primary DESC, sort_order');
        $imgs->execute([$product['id']]);
        $product['images'] = $imgs->fetchAll();

        $vars = $db->prepare('SELECT id, size, color, color_hex, price, mrp, price_diff, stock FROM product_variants WHERE product_id=? ORDER BY COALESCE(price, 0), id');
        $vars->execute([$product['id']]);
        $product['variants'] = $vars->fetchAll();
        $product['sizes']  = array_values(array_unique(array_filter(array_column($product['variants'], 'size'))));
        $product['colors'] = $this->uniqueColors($product['variants']);

        Response::success($product);
    }

    public function related(array $p): void
    {
        $db = db();
        $stmt = $db->prepare('SELECT id, category_id FROM products WHERE slug=?');
        $stmt->execute([$p['slug']]);
        $base = $stmt->fetch();
        if (!$base) {
            Response::success([]);
        }
        $rel = $db->prepare(
            "SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p WHERE p.category_id=? AND p.id<>? AND p.is_active=1
             ORDER BY p.sold_count DESC LIMIT 8"
        );
        $rel->execute([$base['category_id'], $base['id']]);
        $rows = $rel->fetchAll();

        // Thin category → top up with best-selling / newest products from the rest of the store.
        if (count($rows) < 4) {
            $exclude = array_merge([(int) $base['id']], array_map(fn ($r) => (int) $r['id'], $rows));
            $marks = implode(',', array_fill(0, count($exclude), '?'));
            $more = $db->prepare(
                "SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
                 FROM products p WHERE p.is_active=1 AND p.id NOT IN ($marks)
                 ORDER BY p.sold_count DESC, p.created_at DESC LIMIT " . (8 - count($rows))
            );
            $more->execute($exclude);
            $rows = array_merge($rows, $more->fetchAll());
        }
        Response::success(array_map([$this, 'castProduct'], $rows));
    }

    /**
     * GET /share/product/{slug} — the link people share. WhatsApp / Facebook / X
     * read its Open Graph tags (photo, name, price, description) to build the
     * preview card; real visitors are redirected straight to the product page.
     */
    public function share(array $p): void
    {
        $stmt = db()->prepare(
            'SELECT p.id, p.name, p.slug, p.price, p.mrp, p.description,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p WHERE p.slug=? AND p.is_active=1'
        );
        $stmt->execute([(string) ($p['slug'] ?? '')]);
        $prod = $stmt->fetch();

        $front = rtrim((string) env('FRONTEND_URL', 'http://localhost:5190'), '/');
        $target = $prod ? $front . '/product/' . rawurlencode($prod['slug']) : $front . '/shop';
        $api = MiscController::apiBase();

        $store = Setting::get('store_name', 'NutValley');
        $title = $prod ? $prod['name'] . ' — ₹' . number_format((float) $prod['price']) : $store;
        $desc = '';
        $img = '';
        if ($prod) {
            $mrp = (float) $prod['mrp'];
            $price = (float) $prod['price'];
            if ($mrp > $price) {
                $desc = 'MRP ₹' . number_format($mrp) . ' · ' . (int) floor(100 * ($mrp - $price) / $mrp) . '% off. ';
            }
            $desc .= mb_substr(trim(preg_replace('/\s+/', ' ', strip_tags((string) $prod['description']))), 0, 180);
            // Hosted images are used directly; inline (data:) images go through the thumb passthrough.
            $img = preg_match('#^https?://#i', (string) $prod['image']) ? $prod['image'] : $api . '/api/products/' . (int) $prod['id'] . '/thumb';
            // WhatsApp/Facebook previews are most reliable with a ~1200px JPG — let Cloudinary convert (.webp → .jpg).
            if (str_contains($img, 'res.cloudinary.com') && str_contains($img, '/image/upload/')) {
                $img = preg_replace('#\.(webp|avif|heic)$#i', '.jpg', str_replace('/image/upload/', '/image/upload/f_jpg,q_auto,w_1200/', $img));
            }
        }

        $e = fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
        $self = $api . '/share/product/' . rawurlencode((string) ($p['slug'] ?? ''));

        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: public, max-age=300');
        echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            . '<title>' . $e($title) . '</title>'
            . '<meta name="description" content="' . $e($desc) . '">'
            . '<meta property="og:type" content="product">'
            . '<meta property="og:site_name" content="' . $e($store) . '">'
            . '<meta property="og:title" content="' . $e($title) . '">'
            . '<meta property="og:description" content="' . $e($desc) . '">'
            . '<meta property="og:url" content="' . $e($self) . '">'
            . ($img ? '<meta property="og:image" content="' . $e($img) . '"><meta property="og:image:alt" content="' . $e($prod['name']) . '">' : '')
            . '<meta name="twitter:card" content="summary_large_image">'
            . '<meta name="twitter:title" content="' . $e($title) . '">'
            . '<meta name="twitter:description" content="' . $e($desc) . '">'
            . ($img ? '<meta name="twitter:image" content="' . $e($img) . '">' : '')
            . '<meta http-equiv="refresh" content="0;url=' . $e($target) . '">'
            . '<link rel="canonical" href="' . $e($target) . '">'
            . '</head><body><script>location.replace(' . json_encode($target) . ');</script>'
            . '<a href="' . $e($target) . '">' . $e($title) . '</a></body></html>';
        exit;
    }

    /** GET /api/products/{slug}/frequently-bought — co-purchased products,
     *  falling back to same-category top sellers when there's no order history. */
    public function frequentlyBought(array $p): void
    {
        $db = db();
        $stmt = $db->prepare('SELECT id, category_id FROM products WHERE slug=?');
        $stmt->execute([$p['slug']]);
        $base = $stmt->fetch();
        if (!$base) {
            Response::success([]);
        }
        $pid = (int) $base['id'];

        // Products bought in the same orders as this one.
        $co = $db->prepare(
            "SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image,
                    COUNT(*) AS bought_together
             FROM order_items oi1
             JOIN order_items oi2 ON oi2.order_id = oi1.order_id AND oi2.product_id <> oi1.product_id
             JOIN products p ON p.id = oi2.product_id AND p.is_active = 1
             WHERE oi1.product_id = ?
             GROUP BY p.id ORDER BY bought_together DESC, p.sold_count DESC LIMIT 4"
        );
        $co->execute([$pid]);
        $rows = $co->fetchAll();

        // Fallback: same-category best sellers when there's no co-purchase data.
        if (!$rows) {
            $fb = $db->prepare(
                "SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
                 FROM products p WHERE p.category_id=? AND p.id<>? AND p.is_active=1
                 ORDER BY p.sold_count DESC LIMIT 4"
            );
            $fb->execute([(int) $base['category_id'], $pid]);
            $rows = $fb->fetchAll();
        }

        Response::success(array_map([$this, 'castProduct'], $rows));
    }

    public function featured(array $p): void   { $this->collection('is_featured=1'); }
    public function trending(array $p): void   { $this->collection('is_trending=1'); }
    public function newArrivals(array $p): void{ $this->collection('1=1', 'created_at DESC'); }
    public function bestSellers(array $p): void { $this->collection('1=1', 'sold_count DESC'); }

    private function collection(string $cond, string $order = 'created_at DESC'): void
    {
        $limit = min(20, max(1, (int) Request::query('limit', 8)));
        // Storefront scope (ids come from the DB, safe to inline as integers).
        $scopeSql = ($scope = $this->storeScope())
            ? ' AND p.category_id IN (' . implode(',', $scope['ids']) . ')' : '';
        $sql = "SELECT p.*, c.slug AS category_slug,
                   (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
                FROM products p JOIN categories c ON c.id=p.category_id
                WHERE p.is_active=1 AND $cond$scopeSql ORDER BY $order LIMIT $limit";
        $rows = db()->query($sql)->fetchAll();
        Response::success(array_map([$this, 'castProduct'], $rows));
    }

    private function castProduct(array $row): array
    {
        foreach (['price', 'mrp', 'rating_avg', 'shipping_fee'] as $f) {
            if (isset($row[$f])) {
                $row[$f] = (float) $row[$f];
            }
        }
        foreach (['id', 'stock', 'rating_count', 'sold_count', 'category_id', 'is_returnable', 'is_free_shipping'] as $f) {
            if (isset($row[$f])) {
                $row[$f] = (int) $row[$f];
            }
        }
        // If is_free_shipping column is missing or null, default to 1 (or based on shipping_fee)
        if (!isset($row['is_free_shipping'])) {
            $row['is_free_shipping'] = (isset($row['shipping_fee']) && $row['shipping_fee'] > 0) ? 0 : 1;
        }
        if (!isset($row['shipping_fee'])) {
            $row['shipping_fee'] = $row['is_free_shipping'] ? 0.0 : 0.0;
        }
        if (isset($row['specifications']) && is_string($row['specifications'])) {
            $row['specifications'] = json_decode($row['specifications'], true);
        }
        if (isset($row['mrp'], $row['price']) && $row['mrp'] > 0) {
            $row['discount_pct'] = (int) floor(100 * ($row['mrp'] - $row['price']) / $row['mrp']); // floor: never show -100% unless free
        }
        return $row;
    }

    private function uniqueColors(array $variants): array
    {
        $seen = [];
        foreach ($variants as $v) {
            if ($v['color'] && !isset($seen[$v['color']])) {
                $seen[$v['color']] = ['color' => $v['color'], 'hex' => $v['color_hex']];
            }
        }
        return array_values($seen);
    }
}

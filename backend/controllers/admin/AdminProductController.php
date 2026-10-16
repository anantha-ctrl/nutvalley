<?php
class AdminProductController
{
    public function index(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            "SELECT p.id, p.name, p.slug, p.brand, p.price, p.mrp, p.stock, p.low_stock_alert, p.is_active, p.is_featured,
                    p.is_trending, p.is_returnable, p.is_free_shipping, p.shipping_fee, p.rating_avg, p.sold_count, c.name AS category,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.created_at DESC"
        )->fetchAll();
        Response::success($rows);
    }

    public function store(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $v = Validator::make($data, [
            'name'        => 'required|min:2|max:200',
            'category_id' => 'required|numeric',
            'price'       => 'required|numeric',
            'mrp'         => 'required|numeric',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $db = db();
        $slug = AdminCategoryController::slugify($data['name']);
        $isFreeShipping = isset($data['is_free_shipping']) ? (int) (bool) $data['is_free_shipping'] : 1;
        $shippingFee = $isFreeShipping ? 0.00 : max(0, (float) ($data['shipping_fee'] ?? 0));

        $db->prepare(
            'INSERT INTO products
             (name, slug, category_id, brand, description, specifications, price, mrp, stock, low_stock_alert,
              is_featured, is_trending, is_active, is_returnable, is_free_shipping, shipping_fee)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $data['name'], $slug, (int) $data['category_id'], $data['brand'] ?? null,
            $data['description'] ?? null,
            isset($data['specifications']) ? json_encode($data['specifications']) : null,
            $data['price'], $data['mrp'], (int) ($data['stock'] ?? 0), (int) ($data['low_stock_alert'] ?? 5),
            !empty($data['is_featured']) ? 1 : 0, !empty($data['is_trending']) ? 1 : 0,
            isset($data['is_active']) ? (int) $data['is_active'] : 1,
            // Default to returnable unless the admin explicitly turns it off.
            isset($data['is_returnable']) ? (int) (bool) $data['is_returnable'] : 1,
            $isFreeShipping,
            $shippingFee,
        ]);
        $productId = (int) $db->lastInsertId();

        $this->syncImages($productId, $data['images'] ?? []);
        $this->syncVariants($productId, $data['variants'] ?? []);

        Response::success(['id' => $productId, 'slug' => $slug], 'Product created', 201);
    }

    public function update(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $data = Request::body();
        $db = db();
        $isFreeShipping = isset($data['is_free_shipping']) ? (int) (bool) $data['is_free_shipping'] : 1;
        $shippingFee = $isFreeShipping ? 0.00 : max(0, (float) ($data['shipping_fee'] ?? 0));

        $stmt = $db->prepare(
            'UPDATE products SET name=?, category_id=?, brand=?, description=?, specifications=?,
             price=?, mrp=?, stock=?, low_stock_alert=?, is_featured=?, is_trending=?, is_active=?,
             is_returnable=?, is_free_shipping=?, shipping_fee=? WHERE id=?'
        );
        $stmt->execute([
            $data['name'], (int) $data['category_id'], $data['brand'] ?? null, $data['description'] ?? null,
            isset($data['specifications']) ? json_encode($data['specifications']) : null,
            $data['price'], $data['mrp'], (int) ($data['stock'] ?? 0), (int) ($data['low_stock_alert'] ?? 5),
            !empty($data['is_featured']) ? 1 : 0, !empty($data['is_trending']) ? 1 : 0,
            isset($data['is_active']) ? (int) $data['is_active'] : 1,
            isset($data['is_returnable']) ? (int) (bool) $data['is_returnable'] : 1,
            $isFreeShipping,
            $shippingFee,
            $id,
        ]);

        if (isset($data['variants'])) {
            $db->prepare('DELETE FROM product_variants WHERE product_id=?')->execute([$id]);
            $this->syncVariants($id, $data['variants']);
        }
        // Replace the image set (delete then re-insert) so re-saving doesn't
        // pile up duplicate rows. Only touch images when the client sent them.
        if (isset($data['images'])) {
            $db->prepare('DELETE FROM product_images WHERE product_id=?')->execute([$id]);
            $this->syncImages($id, $data['images']);
        }
        Response::success(['id' => $id], 'Product updated');
    }

    public function destroy(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $db = db();
        try {
            $db->prepare('UPDATE order_items SET product_id=NULL WHERE product_id=?')->execute([$id]);

            // Clean up related child tables
            $db->prepare('DELETE FROM product_images WHERE product_id=?')->execute([$id]);
            $db->prepare('DELETE FROM product_variants WHERE product_id=?')->execute([$id]);
            $db->prepare('DELETE FROM reviews WHERE product_id=?')->execute([$id]);
            $db->prepare('DELETE FROM wishlist WHERE product_id=?')->execute([$id]);
            $db->prepare('DELETE FROM cart WHERE product_id=?')->execute([$id]);
            $db->prepare('DELETE FROM recently_viewed WHERE product_id=?')->execute([$id]);

            // Delete the product
            $db->prepare('DELETE FROM products WHERE id=?')->execute([$id]);

            Response::success(null, 'Product deleted');
        } catch (PDOException $e) {
            Response::error('Could not delete product: ' . $e->getMessage(), 400);
        }
    }

    /** Bulk activate / deactivate / delete by ids. */
    public function bulk(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $ids = array_values(array_filter(array_map('intval', (array) ($data['ids'] ?? []))));
        $action = $data['action'] ?? '';
        if (!$ids) {
            Response::error('No products selected', 422);
        }
        $db = db();
        $in = implode(',', array_fill(0, count($ids), '?'));
        if ($action === 'delete') {
            try {
                $db->prepare("UPDATE order_items SET product_id=NULL WHERE product_id IN ($in)")->execute($ids);
                $db->prepare("DELETE FROM product_images WHERE product_id IN ($in)")->execute($ids);
                $db->prepare("DELETE FROM product_variants WHERE product_id IN ($in)")->execute($ids);
                $db->prepare("DELETE FROM reviews WHERE product_id IN ($in)")->execute($ids);
                $db->prepare("DELETE FROM wishlist WHERE product_id IN ($in)")->execute($ids);
                $db->prepare("DELETE FROM cart WHERE product_id IN ($in)")->execute($ids);
                $db->prepare("DELETE FROM recently_viewed WHERE product_id IN ($in)")->execute($ids);
                $db->prepare("DELETE FROM products WHERE id IN ($in)")->execute($ids);
            } catch (PDOException $e) {
                Response::error('Could not delete selected products', 400);
            }
        } elseif ($action === 'activate' || $action === 'deactivate') {
            $val = $action === 'activate' ? 1 : 0;
            $db->prepare("UPDATE products SET is_active=$val WHERE id IN ($in)")->execute($ids);
        } else {
            Response::error('Invalid bulk action', 422);
        }
        Response::success(['affected' => count($ids)], 'Bulk action applied');
    }

    /**
     * Bulk create / update products from parsed CSV rows (Admin → Products → Bulk Upload).
     * Columns (header names are case/space-insensitive; name, category, price required for new rows):
     *   name, category (name or slug — auto-created if new), price, mrp, stock, low_stock_alert,
     *   brand, description, images (URLs separated by "|"; "image" also accepted),
     *   specifications ("Material: Glass beads | Length: 18 in"),
     *   active, featured, trending, returnable, free_shipping (yes/no), shipping_fee (₹, when not free).
     * A row whose name matches an existing product (case-insensitive) UPDATES that product —
     * only the columns filled in on the row are changed — so the same sheet can be re-uploaded
     * to edit prices/stock without creating duplicates.
     */
    public function import(array $p): void
    {
        Auth::admin();
        $rows = Request::input('rows', []);
        if (!is_array($rows) || !$rows) {
            Response::error('No rows to import. Check your CSV file.', 422);
        }

        $db = db();

        // Category lookup keyed by lowercased name AND slug.
        $catMap = [];
        foreach ($db->query('SELECT id, name, slug FROM categories')->fetchAll() as $c) {
            $catMap[strtolower(trim($c['name']))] = (int) $c['id'];
            $catMap[strtolower(trim($c['slug']))] = (int) $c['id'];
        }
        // Existing products keyed by lowercased name (update instead of duplicating).
        $prodMap = [];
        foreach ($db->query('SELECT id, name FROM products')->fetchAll() as $row) {
            $prodMap[strtolower(trim($row['name']))] = (int) $row['id'];
        }

        $catIns = $db->prepare('INSERT INTO categories (name, slug, is_active) VALUES (?,?,1)');
        $imgDel = $db->prepare('DELETE FROM product_images WHERE product_id=?');
        $imgIns = $db->prepare('INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?,?,?,?)');

        // First non-empty value among the given column names, else null.
        $val = function (array $r, string ...$keys): ?string {
            foreach ($keys as $k) {
                if (isset($r[$k]) && trim((string) $r[$k]) !== '') return trim((string) $r[$k]);
            }
            return null;
        };
        $flag = fn (?string $v) => $v === null ? null
            : (in_array(strtolower($v), ['1', 'yes', 'y', 'true', 'active', 'on'], true) ? 1 : 0);
        // "₹1,299.00" / "Rs. 1299" -> "1299.00"; text with no digits stays as-is so it fails validation
        $num = fn (?string $v) => $v === null ? null
            : (preg_match('/\d/', $v) ? preg_replace('/[^0-9.\-]/', '', preg_replace('/^\D*?(?=\d)/', '', $v)) : $v);

        $created = 0;
        $updated = 0;
        $newCategories = [];
        $errors = [];

        foreach ($rows as $i => $r) {
            $line = (int) $i + 2; // +1 for header row, +1 for 1-based
            $r = is_array($r) ? $r : [];
            $name = $val($r, 'name', 'product_name', 'product');
            $existingId = $name !== null ? ($prodMap[strtolower($name)] ?? null) : null;

            $price  = $num($val($r, 'price', 'selling_price'));
            $mrp    = $num($val($r, 'mrp'));
            $catRaw = $val($r, 'category');

            if ($name === null) { $errors[] = "Row $line: 'name' is required"; continue; }
            if ($price !== null && !is_numeric($price)) { $errors[] = "Row $line: 'price' must be a number"; continue; }
            if ($mrp !== null && !is_numeric($mrp)) { $errors[] = "Row $line: 'mrp' must be a number"; continue; }
            if (!$existingId && $price === null) { $errors[] = "Row $line: 'price' is required for a new product"; continue; }
            if (!$existingId && $catRaw === null) { $errors[] = "Row $line: 'category' is required for a new product"; continue; }

            // Resolve / auto-create the category, reusing it for later rows.
            $catId = null;
            if ($catRaw !== null) {
                $catId = $catMap[strtolower($catRaw)] ?? null;
                if (!$catId) {
                    $catSlug = AdminCategoryController::uniqueCategorySlug($catRaw);
                    $catIns->execute([$catRaw, $catSlug]);
                    $catId = (int) $db->lastInsertId();
                    $catMap[strtolower($catRaw)] = $catId;
                    $catMap[strtolower($catSlug)] = $catId;
                    $newCategories[] = $catRaw;
                }
            }

            // "Material: Glass beads | Length: 18 in" -> {"Material":"Glass beads","Length":"18 in"}
            $specs = null;
            if (($specRaw = $val($r, 'specifications', 'specs')) !== null) {
                $specs = [];
                foreach (explode('|', $specRaw) as $pair) {
                    [$k, $v] = array_pad(array_map('trim', explode(':', $pair, 2)), 2, '');
                    if ($k !== '') $specs[$k] = $v;
                }
            }

            $free = $flag($val($r, 'free_shipping'));
            $fee  = $num($val($r, 'shipping_fee'));
            if ($fee !== null && $free === null) $free = (float) $fee > 0 ? 0 : 1; // a fee implies not-free
            if ($free === 1) $fee = '0';

            $stock = $num($val($r, 'stock'));
            $low   = $num($val($r, 'low_stock_alert', 'low_stock'));

            // Column => value for every field filled in on this row.
            $fields = array_filter([
                'category_id'      => $catId,
                'brand'            => $val($r, 'brand'),
                'description'      => $val($r, 'description'),
                'specifications'   => $specs !== null ? json_encode($specs, JSON_UNESCAPED_UNICODE) : null,
                'price'            => $price !== null ? (float) $price : null,
                'mrp'              => $mrp !== null ? (float) $mrp : null,
                'stock'            => $stock !== null ? (int) $stock : null,
                'low_stock_alert'  => $low !== null ? (int) $low : null,
                'is_active'        => $flag($val($r, 'active', 'is_active')),
                'is_featured'      => $flag($val($r, 'featured', 'is_featured')),
                'is_trending'      => $flag($val($r, 'trending', 'is_trending')),
                'is_returnable'    => $flag($val($r, 'returnable', 'is_returnable')),
                'is_free_shipping' => $free,
                'shipping_fee'     => $fee !== null ? max(0, (float) $fee) : null,
            ], fn ($v) => $v !== null);

            $imgRaw = $val($r, 'images', 'image', 'image_url');
            $images = $imgRaw !== null ? array_values(array_filter(array_map('trim', explode('|', $imgRaw)))) : [];

            try {
                $db->beginTransaction();
                if ($existingId) {
                    if ($fields) {
                        $set = implode(', ', array_map(fn ($c) => "$c=?", array_keys($fields)));
                        $db->prepare("UPDATE products SET $set WHERE id=?")
                           ->execute([...array_values($fields), $existingId]);
                    }
                    $pid = $existingId;
                } else {
                    $fields += [
                        'mrp'             => (float) $price, // MRP defaults to the price
                        'stock'           => 0,
                        'low_stock_alert' => 5,
                        'is_active'       => 1,
                        'is_returnable'   => 1,
                    ];
                    $fields = ['name' => $name, 'slug' => $this->uniqueSlug($name)] + $fields;
                    $cols = implode(', ', array_keys($fields));
                    $qs   = implode(',', array_fill(0, count($fields), '?'));
                    $db->prepare("INSERT INTO products ($cols) VALUES ($qs)")->execute(array_values($fields));
                    $pid = (int) $db->lastInsertId();
                    $prodMap[strtolower($name)] = $pid; // a repeated name later in the sheet updates it
                }

                if ($images) { // the images column replaces the gallery; first one is primary
                    $imgDel->execute([$pid]);
                    foreach ($images as $n => $url) {
                        $imgIns->execute([$pid, $url, $n === 0 ? 1 : 0, $n]);
                    }
                }
                $db->commit();
                $existingId ? $updated++ : $created++;
            } catch (Throwable $e) {
                if ($db->inTransaction()) $db->rollBack();
                $errors[] = "Row $line: " . $e->getMessage();
            }
        }

        Response::success(
            [
                'created'        => $created,
                'updated'        => $updated,
                'failed'         => count($errors),
                'new_categories' => array_values(array_unique($newCategories)),
                'errors'         => array_slice($errors, 0, 20),
            ],
            "Imported $created new, updated $updated product(s)" . ($errors ? ', ' . count($errors) . ' skipped' : '')
        );
    }

    /** Generate a slug that is guaranteed unique in the products table. */
    private function uniqueSlug(string $name): string
    {
        $base = AdminCategoryController::slugify($name);
        $slug = $base;
        $db = db();
        $check = $db->prepare('SELECT COUNT(*) FROM products WHERE slug=?');
        $n = 2;
        $check->execute([$slug]);
        while ((int) $check->fetchColumn() > 0) {
            $slug = $base . '-' . $n++;
            $check->execute([$slug]);
        }
        return $slug;
    }

    /** Accepts base64 data URIs or remote URLs; uploads data URIs to Cloudinary when configured. */
    public function uploadImages(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $images = Request::input('images', []);
        $stored = $this->syncImages($id, $images);
        Response::success($stored, 'Images uploaded');
    }

    public function lowStock(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            'SELECT id, name, stock, low_stock_alert FROM products
             WHERE stock <= low_stock_alert ORDER BY stock ASC'
        )->fetchAll();
        Response::success($rows);
    }

    /** Full inventory: every product with live stock + threshold. */
    public function inventory(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            "SELECT p.id, p.name, p.brand, p.stock, p.low_stock_alert, p.sold_count, p.is_active,
                    c.name AS category,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p JOIN categories c ON c.id = p.category_id
             ORDER BY p.stock ASC, p.name"
        )->fetchAll();
        Response::success($rows);
    }

    /** Quick stock / threshold update from the inventory screen. */
    public function updateStock(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $stock = max(0, (int) ($data['stock'] ?? 0));
        if (isset($data['low_stock_alert'])) {
            db()->prepare('UPDATE products SET stock=?, low_stock_alert=? WHERE id=?')
                ->execute([$stock, max(0, (int) $data['low_stock_alert']), (int) $p['id']]);
        } else {
            db()->prepare('UPDATE products SET stock=? WHERE id=?')->execute([$stock, (int) $p['id']]);
        }
        Response::success(null, 'Stock updated');
    }

    // ---------- helpers ----------

    private function syncImages(int $productId, array $images): array
    {
        $db = db();
        $stored = [];
        foreach ($images as $i => $img) {
            $url = is_array($img) ? ($img['url'] ?? '') : $img;
            $publicId = null;
            if (str_starts_with($url, 'data:image')) {
                $up = Cloudinary::upload($url, 'beadsboutique/products');
                if ($up) {
                    $url = $up['url'];
                    $publicId = $up['public_id'];
                }
            }
            if (!$url) {
                continue;
            }
            $db->prepare('INSERT INTO product_images (product_id, image_url, public_id, is_primary, sort_order) VALUES (?,?,?,?,?)')
               ->execute([$productId, $url, $publicId, $i === 0 ? 1 : 0, $i]);
            $stored[] = ['url' => $url, 'public_id' => $publicId];
        }
        return $stored;
    }

    private function syncVariants(int $productId, array $variants): void
    {
        $db = db();
        $stmt = $db->prepare('INSERT INTO product_variants (product_id, size, color, color_hex, price, mrp, sku, price_diff, stock) VALUES (?,?,?,?,?,?,?,?,?)');
        foreach ($variants as $v) {
            // Absolute per-variant price (manual rate); NULL keeps legacy base+diff behaviour.
            $price = (isset($v['price']) && $v['price'] !== '' && $v['price'] !== null) ? (float) $v['price'] : null;
            // Per-variant MRP for its own strike-through / discount; NULL uses the base MRP.
            $mrp = (isset($v['mrp']) && $v['mrp'] !== '' && $v['mrp'] !== null) ? (float) $v['mrp'] : null;
            $stmt->execute([
                $productId, $v['size'] ?? null, $v['color'] ?? null, $v['color_hex'] ?? null,
                $price, $mrp, $v['sku'] ?? null, (float) ($v['price_diff'] ?? 0), (int) ($v['stock'] ?? 0),
            ]);
        }
    }
}

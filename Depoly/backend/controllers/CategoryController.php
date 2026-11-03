<?php
class CategoryController
{
    public function index(array $p): void
    {
        // Storefront category scope (e.g. a men-only store): limit the visible
        // categories to the scoped one + its children. Empty setting = show all.
        $scopeSql = '';
        $slug = trim((string) Setting::get('storefront_category', ''));
        if ($slug !== '') {
            $s = db()->prepare('SELECT id FROM categories WHERE slug=?');
            $s->execute([$slug]);
            if ($id = (int) $s->fetchColumn()) {
                $scopeSql = ' AND (c.id = ' . $id . ' OR c.parent_id = ' . $id . ')';
            }
        }

        $rows = db()->query(
            'SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id=c.id AND is_active=1) AS product_count
             FROM categories c WHERE is_active=1' . $scopeSql . ' ORDER BY name'
        )->fetchAll();

        // Swap heavy inline base64 images for a light, cached passthrough URL so
        // this shared endpoint stays small. http(s) URLs are returned untouched.
        $base = MiscController::apiBase();
        foreach ($rows as &$r) {
            if (isset($r['image_url']) && str_starts_with((string) $r['image_url'], 'data:')) {
                $r['image_url'] = $base . '/api/categories/' . $r['slug'] . '/thumb';
            }
        }
        unset($r);

        Response::success($rows);
    }

    public function show(array $p): void
    {
        $stmt = db()->prepare('SELECT * FROM categories WHERE slug=? AND is_active=1');
        $stmt->execute([$p['slug']]);
        $cat = $stmt->fetch();
        if (!$cat) {
            Response::error('Category not found', 404);
        }
        Response::success($cat);
    }
}

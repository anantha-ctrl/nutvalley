<?php
class AdminCategoryController
{
    /**
     * GET /api/admin/categories — every category for management, unscoped.
     * (The public /api/categories is limited by the storefront scope, e.g. a
     * men-only store; admins must always see and manage the full list.)
     */
    public function index(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            'SELECT c.*, p.name AS parent_name,
                    (SELECT COUNT(*) FROM products WHERE category_id=c.id AND is_active=1) AS product_count
             FROM categories c
             LEFT JOIN categories p ON p.id = c.parent_id
             ORDER BY c.name'
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['id']            = (int) $r['id'];
            $r['product_count'] = (int) $r['product_count'];
            $r['is_active']     = (int) $r['is_active'];
        }
        unset($r);
        Response::success($rows);
    }

    public function store(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $v = Validator::make($data, ['name' => 'required|min:2|max:120']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $slug = self::uniqueCategorySlug($data['name']);
        // parent_id arrives as '' from the "Top-level (no parent)" option — coerce
        // any empty value to NULL so the BIGINT column doesn't reject it (strict mode).
        $parentId = !empty($data['parent_id']) ? (int) $data['parent_id'] : null;
        db()->prepare('INSERT INTO categories (name, slug, parent_id, image_url, description, is_active) VALUES (?,?,?,?,?,?)')
            ->execute([
                $data['name'], $slug, $parentId,
                Cloudinary::store($data['image_url'] ?? '', 'nutsvally/categories') ?: null, $data['description'] ?? null,
                isset($data['is_active']) ? (int) $data['is_active'] : 1,
            ]);
        Response::success(['id' => (int) db()->lastInsertId(), 'slug' => $slug], 'Category created', 201);
    }

    public function update(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $id = (int) $p['id'];
        // A category cannot be its own parent.
        $parentId = !empty($data['parent_id']) && (int) $data['parent_id'] !== $id ? (int) $data['parent_id'] : null;
        db()->prepare('UPDATE categories SET name=?, parent_id=?, image_url=?, description=?, is_active=? WHERE id=?')
            ->execute([
                $data['name'], $parentId, Cloudinary::store($data['image_url'] ?? '', 'nutsvally/categories') ?: null, $data['description'] ?? null,
                isset($data['is_active']) ? (int) $data['is_active'] : 1, $id,
            ]);
        Response::success(null, 'Category updated');
    }

    public function destroy(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $db = db();
        try {
            // Unlink any sub-categories so foreign key constraints don't block deletion
            $db->prepare('UPDATE categories SET parent_id=NULL WHERE parent_id=?')->execute([$id]);

            // Reassign or delete products in this category before deleting
            // (Check if a fallback 'Uncategorized' or default category exists, otherwise delete products)
            $db->prepare('DELETE FROM products WHERE category_id=?')->execute([$id]);

            // Delete the category
            $db->prepare('DELETE FROM categories WHERE id=?')->execute([$id]);
            Response::success(null, 'Category deleted');
        } catch (PDOException $e) {
            Response::error('Could not delete category: ' . $e->getMessage(), 400);
        }
    }

    public static function slugify(string $text): string
    {
        $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $text), '-'));
        return $slug . '-' . substr(uniqid(), -4);
    }

    /** Clean, human-readable category slug; adds -2, -3… only on collision. */
    public static function uniqueCategorySlug(string $name): string
    {
        $base = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name), '-')) ?: 'category';
        $slug = $base;
        $check = db()->prepare('SELECT COUNT(*) FROM categories WHERE slug=?');
        $n = 2;
        $check->execute([$slug]);
        while ((int) $check->fetchColumn() > 0) {
            $slug = $base . '-' . $n++;
            $check->execute([$slug]);
        }
        return $slug;
    }
}

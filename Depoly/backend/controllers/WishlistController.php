<?php
class WishlistController
{
    public function index(array $p): void
    {
        $userId = Auth::id();
        $stmt = db()->prepare(
            'SELECT w.id AS wishlist_id, p.*, c.slug AS category_slug,
                (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM wishlist w
             JOIN products p ON p.id=w.product_id
             JOIN categories c ON c.id=p.category_id
             WHERE w.user_id=? ORDER BY w.created_at DESC'
        );
        $stmt->execute([$userId]);
        Response::success($stmt->fetchAll());
    }

    public function store(array $p): void
    {
        $userId = Auth::id();
        $productId = (int) Request::input('product_id');
        if (!$productId) {
            Response::error('product_id is required', 422);
        }
        db()->prepare('INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?,?)')
            ->execute([$userId, $productId]);
        Response::success(null, 'Added to wishlist', 201);
    }

    public function destroy(array $p): void
    {
        $userId = Auth::id();
        // {id} may be the product_id for convenience
        db()->prepare('DELETE FROM wishlist WHERE user_id=? AND product_id=?')
            ->execute([$userId, (int) $p['id']]);
        Response::success(null, 'Removed from wishlist');
    }
}

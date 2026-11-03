<?php
class AdminReviewController
{
    /** GET /api/admin/reviews — all reviews with product + customer, newest first. */
    public function index(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            "SELECT r.id, r.rating, r.title, r.comment, r.is_hidden, r.created_at,
                    u.name AS user_name, u.email AS user_email,
                    p.id AS product_id, p.name AS product_name, p.slug AS product_slug
             FROM reviews r
             JOIN users u ON u.id = r.user_id
             JOIN products p ON p.id = r.product_id
             ORDER BY r.created_at DESC"
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['is_hidden'] = (int) $r['is_hidden'];
            $r['rating'] = (int) $r['rating'];
        }
        Response::success($rows);
    }

    /** PUT /api/admin/reviews/{id} — hide/unhide a review (soft moderation). */
    public function update(array $p): void
    {
        Auth::admin();
        $db = db();
        $id = (int) $p['id'];
        $hidden = (int) (bool) (Request::body()['is_hidden'] ?? 0);

        $row = $db->prepare('SELECT product_id FROM reviews WHERE id=?');
        $row->execute([$id]);
        $review = $row->fetch();
        if (!$review) {
            Response::error('Review not found', 404);
        }

        $db->prepare('UPDATE reviews SET is_hidden=? WHERE id=?')->execute([$hidden, $id]);
        ReviewController::recalcRating($db, (int) $review['product_id']);

        Response::success(['is_hidden' => $hidden], $hidden ? 'Review hidden' : 'Review restored');
    }

    /** DELETE /api/admin/reviews/{id} — permanently remove a review. */
    public function destroy(array $p): void
    {
        Auth::admin();
        $db = db();
        $id = (int) $p['id'];

        $row = $db->prepare('SELECT product_id FROM reviews WHERE id=?');
        $row->execute([$id]);
        $review = $row->fetch();
        if (!$review) {
            Response::error('Review not found', 404);
        }

        $db->prepare('DELETE FROM reviews WHERE id=?')->execute([$id]);
        ReviewController::recalcRating($db, (int) $review['product_id']);

        Response::success(null, 'Review deleted');
    }
}

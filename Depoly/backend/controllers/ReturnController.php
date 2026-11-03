<?php
class ReturnController
{
    /** POST /api/orders/{id}/return — customer requests a return on a delivered order. */
    public function request(array $p): void
    {
        $userId = Auth::id();
        $db = db();
        $orderId = (int) $p['id'];
        $reason = trim((string) (Request::body()['reason'] ?? ''));

        if ($reason === '') {
            Response::error('Please tell us why you are returning this order', 422, ['reason' => 'Reason is required']);
        }
        if (mb_strlen($reason) > 500) {
            $reason = mb_substr($reason, 0, 500);
        }

        $o = $db->prepare('SELECT id, status FROM orders WHERE id=? AND user_id=?');
        $o->execute([$orderId, $userId]);
        $order = $o->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }
        if ($order['status'] !== 'delivered') {
            Response::error('Only delivered orders can be returned', 400);
        }
        // Block returns when none of the order's products are returnable.
        if (!OrderController::orderHasReturnable($db, $orderId)) {
            Response::error('This order contains only non-returnable products, so it cannot be returned.', 400);
        }

        $ex = $db->prepare('SELECT id FROM returns WHERE order_id=?');
        $ex->execute([$orderId]);
        if ($ex->fetch()) {
            Response::error('A return request already exists for this order', 409);
        }

        $db->prepare('INSERT INTO returns (order_id, user_id, reason) VALUES (?,?,?)')
           ->execute([$orderId, $userId, $reason]);

        Response::success(['status' => 'requested'], 'Return requested — we will review it shortly.', 201);
    }
}

<?php
class AdminReturnController
{
    /** GET /api/admin/returns — all return requests with order + customer. */
    public function index(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            "SELECT rt.id, rt.order_id, rt.reason, rt.status, rt.admin_note, rt.created_at,
                    o.order_number, o.total, o.payment_status,
                    u.name AS user_name, u.email AS user_email
             FROM returns rt
             JOIN orders o ON o.id = rt.order_id
             JOIN users u ON u.id = rt.user_id
             ORDER BY rt.created_at DESC"
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['total'] = (float) $r['total'];
        }
        Response::success($rows);
    }

    /** PUT /api/admin/returns/{id} — approve / reject / refund a return. */
    public function update(array $p): void
    {
        Auth::admin();
        $db = db();
        $id = (int) $p['id'];
        $data = Request::body();
        $status = $data['status'] ?? '';
        $note = isset($data['admin_note']) ? mb_substr(trim((string) $data['admin_note']), 0, 500) : null;

        if (!in_array($status, ['approved', 'rejected', 'refunded'], true)) {
            Response::error('Invalid status', 422);
        }

        $r = $db->prepare(
            "SELECT rt.order_id, rt.status AS cur_status, o.order_number, u.name AS user_name, u.email AS user_email
             FROM returns rt JOIN orders o ON o.id = rt.order_id JOIN users u ON u.id = rt.user_id
             WHERE rt.id = ?"
        );
        $r->execute([$id]);
        $ret = $r->fetch();
        if (!$ret) {
            Response::error('Return not found', 404);
        }

        $db->prepare('UPDATE returns SET status=?, admin_note=? WHERE id=?')->execute([$status, $note, $id]);

        // On refund: restock the items and mark the order returned + refunded.
        if ($status === 'refunded') {
            OrderController::restockOrder($db, (int) $ret['order_id']);
            $db->prepare("UPDATE orders SET status='returned', payment_status='refunded' WHERE id=?")
               ->execute([$ret['order_id']]);
        }

        // Notify the customer.
        Mailer::send(
            $ret['user_email'],
            "Update on your return — {$ret['order_number']}",
            Mailer::returnStatusTemplate($ret['user_name'], $ret['order_number'], $status, $note)
        );

        Response::success(['status' => $status], "Return {$status}");
    }
}

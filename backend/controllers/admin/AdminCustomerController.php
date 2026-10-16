<?php
class AdminCustomerController
{
    public function index(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            "SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
                    (
                        (SELECT COUNT(*) FROM orders WHERE user_id=u.id) + 
                        (SELECT COUNT(*) FROM bills WHERE user_id=u.id AND status='paid')
                    ) AS order_count,
                    (
                        (SELECT COALESCE(SUM(total),0) FROM orders WHERE user_id=u.id AND payment_status='paid') + 
                        (SELECT COALESCE(SUM(total),0) FROM bills WHERE user_id=u.id AND status='paid')
                    ) AS total_spent
             FROM users u
             WHERE u.role='customer'
             ORDER BY u.created_at DESC"
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['order_count'] = (int) $r['order_count'];
            $r['total_spent']  = (float) $r['total_spent'];
        }
        Response::success($rows);
    }

    public function show(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $db = db();
        $stmt = $db->prepare("SELECT id, name, email, phone, status, created_at FROM users WHERE id=? AND role='customer'");
        $stmt->execute([$id]);
        $customer = $stmt->fetch();
        if (!$customer) {
            Response::error('Customer not found', 404);
        }
        
        // Fetch online orders
        $stmt1 = $db->prepare("SELECT 'online' AS channel, id, order_number, total, status, payment_status, placed_at AS created_at FROM orders WHERE user_id=? ORDER BY placed_at DESC");
        $stmt1->execute([$id]);
        $online = $stmt1->fetchAll();

        // Fetch counter bills
        $stmt2 = $db->prepare("SELECT 'counter' AS channel, id, bill_number AS order_number, total, status, 'paid' AS payment_status, created_at FROM bills WHERE user_id=? ORDER BY created_at DESC");
        $stmt2->execute([$id]);
        $counter = $stmt2->fetchAll();

        // Merge and sort by date descending
        $all = array_merge($online, $counter);
        usort($all, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));
        
        foreach ($all as &$o) {
            $o['total'] = (float) $o['total'];
        }
        
        $customer['orders'] = $all;
        Response::success($customer);
    }
}

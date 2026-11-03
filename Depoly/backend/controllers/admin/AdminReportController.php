<?php
class AdminReportController
{
    /** Resolve the [from, to] date window from query params (defaults: last 30 days). */
    private static function range(): array
    {
        $from = Request::query('from', date('Y-m-d', strtotime('-29 days')));
        $to   = Request::query('to', date('Y-m-d'));
        return [$from, $to];
    }

    public function sales(array $p): void
    {
        Auth::admin();
        [$from, $to] = self::range();
        $db = db();

        // Daily revenue — online orders + in-store counter bills, merged by day.
        $days = [];
        $os = $db->prepare(
            "SELECT DATE(placed_at) AS day, COUNT(*) AS orders,
                    SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN total ELSE 0 END) AS revenue
             FROM orders WHERE DATE(placed_at) BETWEEN ? AND ? GROUP BY day"
        );
        $os->execute([$from, $to]);
        foreach ($os->fetchAll() as $r) {
            $days[$r['day']] = ['day' => $r['day'], 'orders' => (int) $r['orders'], 'bills' => 0, 'revenue' => (float) $r['revenue']];
        }
        $bs = $db->prepare(
            "SELECT DATE(created_at) AS day, COUNT(*) AS bills, COALESCE(SUM(total),0) AS revenue
             FROM bills WHERE status='paid' AND DATE(created_at) BETWEEN ? AND ? GROUP BY day"
        );
        $bs->execute([$from, $to]);
        foreach ($bs->fetchAll() as $r) {
            if (!isset($days[$r['day']])) {
                $days[$r['day']] = ['day' => $r['day'], 'orders' => 0, 'bills' => 0, 'revenue' => 0.0];
            }
            $days[$r['day']]['bills'] = (int) $r['bills'];
            $days[$r['day']]['revenue'] += (float) $r['revenue'];
        }
        ksort($days);
        $daily = array_values($days);

        // Online revenue (drives average order value) + counter revenue.
        $orStmt = $db->prepare(
            "SELECT COALESCE(SUM(total),0) FROM orders WHERE payment_status='paid' AND status<>'cancelled' AND DATE(placed_at) BETWEEN ? AND ?"
        );
        $orStmt->execute([$from, $to]);
        $onlineRevenue = (float) $orStmt->fetchColumn();

        $cbStmt = $db->prepare(
            "SELECT COALESCE(SUM(total),0) AS rev, COUNT(*) AS cnt FROM bills WHERE status='paid' AND DATE(created_at) BETWEEN ? AND ?"
        );
        $cbStmt->execute([$from, $to]);
        $cb = $cbStmt->fetch();
        $counterRevenue = (float) $cb['rev'];
        $counterBills   = (int) $cb['cnt'];

        $totalRevenue = $onlineRevenue + $counterRevenue;
        $totalOrders  = array_sum(array_map('intval', array_column($daily, 'orders')));

        // Paid orders count (for average order value)
        $paidStmt = $db->prepare(
            "SELECT COUNT(*) FROM orders WHERE payment_status='paid' AND status<>'cancelled' AND DATE(placed_at) BETWEEN ? AND ?"
        );
        $paidStmt->execute([$from, $to]);
        $paidOrders = (int) $paidStmt->fetchColumn();

        // Items sold — online + counter.
        $itemsStmt = $db->prepare(
            "SELECT COALESCE(SUM(oi.quantity),0)
             FROM order_items oi JOIN orders o ON o.id=oi.order_id
             WHERE o.payment_status='paid' AND o.status<>'cancelled' AND DATE(o.placed_at) BETWEEN ? AND ?"
        );
        $itemsStmt->execute([$from, $to]);
        $itemsSold = (int) $itemsStmt->fetchColumn();
        $ciStmt = $db->prepare(
            "SELECT COALESCE(SUM(bi.quantity),0) FROM bill_items bi JOIN bills b ON b.id=bi.bill_id
             WHERE b.status='paid' AND DATE(b.created_at) BETWEEN ? AND ?"
        );
        $ciStmt->execute([$from, $to]);
        $itemsSold += (int) $ciStmt->fetchColumn();

        // New customers in range
        $custStmt = $db->prepare(
            "SELECT COUNT(*) FROM users WHERE role='customer' AND DATE(created_at) BETWEEN ? AND ?"
        );
        $custStmt->execute([$from, $to]);
        $newCustomers = (int) $custStmt->fetchColumn();

        // Coupons redeemed in range
        $coupStmt = $db->prepare(
            "SELECT COUNT(*) FROM orders WHERE coupon_code IS NOT NULL AND coupon_code<>'' AND DATE(placed_at) BETWEEN ? AND ?"
        );
        $coupStmt->execute([$from, $to]);
        $couponsUsed = (int) $coupStmt->fetchColumn();

        // Orders by status
        $statusStmt = $db->prepare(
            "SELECT status, COUNT(*) AS count FROM orders
             WHERE DATE(placed_at) BETWEEN ? AND ? GROUP BY status ORDER BY count DESC"
        );
        $statusStmt->execute([$from, $to]);
        $statusBreakdown = $statusStmt->fetchAll();

        // Revenue by payment method — online (razorpay/cod) + counter (cash/upi/card/other).
        $payStmt = $db->prepare(
            "SELECT payment_method AS method, COUNT(*) AS orders,
                    SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN total ELSE 0 END) AS revenue
             FROM orders WHERE DATE(placed_at) BETWEEN ? AND ?
             GROUP BY payment_method"
        );
        $payStmt->execute([$from, $to]);
        $paymentBreakdown = $payStmt->fetchAll();
        $payC = $db->prepare(
            "SELECT payment_method AS method, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
             FROM bills WHERE status='paid' AND DATE(created_at) BETWEEN ? AND ?
             GROUP BY payment_method"
        );
        $payC->execute([$from, $to]);
        $paymentBreakdown = array_merge($paymentBreakdown, $payC->fetchAll());
        usort($paymentBreakdown, fn ($a, $b) => (float) $b['revenue'] <=> (float) $a['revenue']);

        // Revenue by category — order_items + bill_items combined.
        $catStmt = $db->prepare(
            "SELECT c.name AS category, SUM(s.units) AS units, SUM(s.revenue) AS revenue
             FROM (
                 SELECT p.category_id AS cid, oi.quantity AS units, oi.line_total AS revenue
                   FROM order_items oi
                   JOIN orders o ON o.id=oi.order_id AND o.payment_status='paid' AND o.status<>'cancelled'
                   JOIN products p ON p.id=oi.product_id
                   WHERE DATE(o.placed_at) BETWEEN ? AND ?
                 UNION ALL
                 SELECT p.category_id AS cid, bi.quantity AS units, bi.line_total AS revenue
                   FROM bill_items bi
                   JOIN bills b ON b.id=bi.bill_id AND b.status='paid'
                   JOIN products p ON p.id=bi.product_id
                   WHERE DATE(b.created_at) BETWEEN ? AND ?
             ) s JOIN categories c ON c.id=s.cid
             GROUP BY c.id ORDER BY revenue DESC"
        );
        $catStmt->execute([$from, $to, $from, $to]);
        $categoryBreakdown = $catStmt->fetchAll();

        Response::success([
            'range'              => compact('from', 'to'),
            'daily'              => $daily,
            'total_orders'       => $totalOrders,
            'total_revenue'      => round($totalRevenue, 2),
            'online_revenue'     => round($onlineRevenue, 2),
            'counter_revenue'    => round($counterRevenue, 2),
            'counter_bills'      => $counterBills,
            'paid_orders'        => $paidOrders,
            'avg_order_value'    => $paidOrders > 0 ? round($onlineRevenue / $paidOrders, 2) : 0,
            'items_sold'         => $itemsSold,
            'new_customers'      => $newCustomers,
            'coupons_used'       => $couponsUsed,
            'status_breakdown'   => $statusBreakdown,
            'payment_breakdown'  => $paymentBreakdown,
            'category_breakdown' => $categoryBreakdown,
        ]);
    }

    public function products(array $p): void
    {
        Auth::admin();
        [$from, $to] = self::range();
        // Units + revenue across online orders AND in-store counter bills.
        $stmt = db()->prepare(
            "SELECT p.id, p.name, p.brand, p.sold_count, p.stock, p.price,
                    COALESCE(SUM(s.units),0)   AS units_sold,
                    COALESCE(SUM(s.revenue),0) AS revenue
             FROM products p
             LEFT JOIN (
                 SELECT oi.product_id AS pid, oi.quantity AS units, oi.line_total AS revenue
                   FROM order_items oi JOIN orders o ON o.id=oi.order_id
                   WHERE o.payment_status='paid' AND o.status<>'cancelled' AND DATE(o.placed_at) BETWEEN ? AND ?
                 UNION ALL
                 SELECT bi.product_id AS pid, bi.quantity AS units, bi.line_total AS revenue
                   FROM bill_items bi JOIN bills b ON b.id=bi.bill_id
                   WHERE b.status='paid' AND DATE(b.created_at) BETWEEN ? AND ?
             ) s ON s.pid = p.id
             GROUP BY p.id ORDER BY units_sold DESC, revenue DESC LIMIT 20"
        );
        $stmt->execute([$from, $to, $from, $to]);
        Response::success($stmt->fetchAll());
    }

    public function customers(array $p): void
    {
        Auth::admin();
        [$from, $to] = self::range();
        $stmt = db()->prepare(
            "SELECT u.id, u.name, u.email,
                    COUNT(o.id) AS orders,
                    COALESCE(SUM(CASE WHEN o.payment_status='paid' AND o.status<>'cancelled' THEN o.total ELSE 0 END),0) AS total_spent
             FROM users u JOIN orders o ON o.user_id=u.id
             WHERE u.role='customer' AND DATE(o.placed_at) BETWEEN ? AND ?
             GROUP BY u.id ORDER BY total_spent DESC LIMIT 20"
        );
        $stmt->execute([$from, $to]);
        Response::success($stmt->fetchAll());
    }
}

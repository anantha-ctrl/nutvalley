<?php
class AdminDashboardController
{
    public function stats(array $p): void
    {
        Auth::admin();
        $db = db();

        // ── Batch 1: Core KPIs in a single query via conditional aggregation ──
        $kpi = $db->query("
            SELECT
                -- Revenue & orders excluding cancelled
                COALESCE(SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN total ELSE 0 END),0)       AS online_sales,
                SUM(CASE WHEN payment_status='paid' THEN 1 ELSE 0 END)                                               AS total_orders,
                COALESCE(SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' AND DATE(placed_at)=CURDATE() THEN total ELSE 0 END),0) AS today_online,
                SUM(CASE WHEN payment_status='paid' AND status='pending' THEN 1 ELSE 0 END)                         AS pending_orders,
                SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' THEN 1 ELSE 0 END)                      AS paid_orders,
                -- Previous period comparisons (prior 7 days vs current 7 days)
                COALESCE(SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' AND placed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN total ELSE 0 END),0) AS online_7d,
                COALESCE(SUM(CASE WHEN payment_status='paid' AND status<>'cancelled' AND placed_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND placed_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN total ELSE 0 END),0) AS online_prev_7d,
                SUM(CASE WHEN payment_status='paid' AND placed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS orders_7d,
                SUM(CASE WHEN payment_status='paid' AND placed_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND placed_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS orders_prev_7d
            FROM orders
        ")->fetch();

        // ── Batch 2: Counter/POS data ──
        $bill = $db->query("
            SELECT
                COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0)                                        AS counter_sales,
                SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END)                                                        AS counter_bills,
                COALESCE(SUM(CASE WHEN status='paid' AND DATE(created_at)=CURDATE() THEN total ELSE 0 END),0)          AS today_counter
            FROM bills
        ")->fetch();

        // ── Batch 3: User KPIs ──
        $usr = $db->query("
            SELECT
                SUM(CASE WHEN role='customer' THEN 1 ELSE 0 END)                                                       AS total_customers,
                SUM(CASE WHEN role='customer' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END)     AS new_customers_7d,
                SUM(CASE WHEN role='customer' AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS new_customers_prev_7d
            FROM users
        ")->fetch();

        // ── Batch 4: Product KPIs ──
        $prod = $db->query("
            SELECT
                COUNT(*)                                          AS total_products,
                SUM(CASE WHEN stock <= low_stock_alert THEN 1 ELSE 0 END) AS low_stock
            FROM products
        ")->fetch();

        // Derived values
        $onlineSales   = (float) $kpi['online_sales'];
        $counterSales  = (float) $bill['counter_sales'];
        $totalSales    = $onlineSales + $counterSales;
        $todaySales    = (float) $kpi['today_online'] + (float) $bill['today_counter'];
        $paidOrders    = (int) $kpi['paid_orders'];
        $totalCustomers = (int) $usr['total_customers'];
        $avgOrderValue = $paidOrders > 0 ? round($onlineSales / $paidOrders, 2) : 0;
        $conversionRate = $totalCustomers > 0 ? round(($paidOrders / $totalCustomers) * 100, 1) : 0;

        // Trend deltas (percentage change current vs previous 7 days)
        $salesCur  = (float) $kpi['online_7d'] + (float) $bill['counter_sales'];
        $salesPrev = (float) $kpi['online_prev_7d'];
        $saleTrend = $salesPrev > 0 ? round((($salesCur - $salesPrev) / $salesPrev) * 100, 1) : ($salesCur > 0 ? 100 : 0);

        $ordersCur  = (int) $kpi['orders_7d'];
        $ordersPrev = (int) $kpi['orders_prev_7d'];
        $orderTrend = $ordersPrev > 0 ? round((($ordersCur - $ordersPrev) / $ordersPrev) * 100, 1) : ($ordersCur > 0 ? 100 : 0);

        $custCur  = (int) $usr['new_customers_7d'];
        $custPrev = (int) $usr['new_customers_prev_7d'];
        $custTrend = $custPrev > 0 ? round((($custCur - $custPrev) / $custPrev) * 100, 1) : ($custCur > 0 ? 100 : 0);

        // ── Monthly revenue (last 6 months) — online + counter merged ──
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $k = date('Y-m', strtotime("first day of -$i month"));
            $months[$k] = ['month' => $k, 'revenue' => 0.0, 'orders' => 0, 'counter' => 0.0];
        }
        foreach ($db->query(
            "SELECT DATE_FORMAT(placed_at,'%Y-%m') AS m,
                    SUM(CASE WHEN status<>'cancelled' THEN total ELSE 0 END) AS rev,
                    COUNT(*) AS ords
             FROM orders WHERE payment_status='paid' AND placed_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY m"
        )->fetchAll() as $r) {
            if (isset($months[$r['m']])) { $months[$r['m']]['revenue'] += (float) $r['rev']; $months[$r['m']]['orders'] += (int) $r['ords']; }
        }
        foreach ($db->query(
            "SELECT DATE_FORMAT(created_at,'%Y-%m') AS m, SUM(CASE WHEN status='paid' THEN total ELSE 0 END) AS rev
             FROM bills WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY m"
        )->fetchAll() as $r) {
            if (isset($months[$r['m']])) { $months[$r['m']]['revenue'] += (float) $r['rev']; $months[$r['m']]['counter'] += (float) $r['rev']; }
        }
        $monthly = array_values($months);

        // ── Status breakdown ──
        $statusBreakdown = $db->query(
            "SELECT status, COUNT(*) AS count FROM orders WHERE payment_status='paid' GROUP BY status"
        )->fetchAll();

        // ── Recent orders ──
        $recentOrders = $db->query(
            "SELECT o.id, o.order_number, o.total, o.status, o.placed_at, u.name AS customer
             FROM orders o JOIN users u ON u.id=o.user_id
             WHERE o.payment_status='paid' ORDER BY o.placed_at DESC LIMIT 8"
        )->fetchAll();

        // ── Top selling products ──
        $topProducts = $db->query(
            "SELECT p.id, p.name, p.brand, p.price,
                    COALESCE(SUM(s.units),0) AS units_sold,
                    COALESCE(SUM(s.rev),0)   AS revenue,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p
             JOIN (
                 SELECT oi.product_id AS pid, SUM(oi.quantity) AS units, SUM(oi.line_total) AS rev
                   FROM order_items oi JOIN orders o ON o.id=oi.order_id
                   WHERE o.payment_status='paid' AND o.status<>'cancelled' GROUP BY oi.product_id
                 UNION ALL
                 SELECT bi.product_id AS pid, SUM(bi.quantity) AS units, SUM(bi.line_total) AS rev
                   FROM bill_items bi JOIN bills b ON b.id=bi.bill_id
                   WHERE b.status='paid' GROUP BY bi.product_id
             ) s ON s.pid = p.id
             GROUP BY p.id HAVING units_sold > 0 ORDER BY units_sold DESC, revenue DESC LIMIT 5"
        )->fetchAll();

        // ── Newest customers ──
        $recentCustomers = $db->query(
            "SELECT id, name, email, created_at FROM users
             WHERE role='customer' ORDER BY created_at DESC LIMIT 5"
        )->fetchAll();

        // ── Activity feed — last 10 events from orders, customers, reviews, messages ──
        $activity = $db->query("
            (SELECT 'order' AS type,
                    CONVERT(CONCAT('New order ', order_number) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS title,
                    CONCAT('₹', FORMAT(total, 0), ' · ', status) AS description,
                    placed_at AS time
             FROM orders WHERE payment_status='paid' ORDER BY placed_at DESC LIMIT 5)
            UNION ALL
            (SELECT 'customer' AS type,
                    CONVERT(CONCAT(name, ' joined') USING utf8mb4) COLLATE utf8mb4_unicode_ci AS title,
                    CONVERT(email USING utf8mb4) COLLATE utf8mb4_unicode_ci AS description,
                    created_at AS time
             FROM users WHERE role='customer' ORDER BY created_at DESC LIMIT 3)
            UNION ALL
            (SELECT 'review' AS type,
                    CONVERT(CONCAT(u.name, ' reviewed') USING utf8mb4) COLLATE utf8mb4_unicode_ci AS title,
                    CONCAT(p.name, ' · ', r.rating, '★') AS description,
                    r.created_at AS time
             FROM reviews r
             JOIN users u ON u.id = r.user_id
             JOIN products p ON p.id = r.product_id
             ORDER BY r.created_at DESC LIMIT 2)
            UNION ALL
            (SELECT 'message' AS type,
                    CONVERT(CONCAT('Message from ', name) USING utf8mb4) COLLATE utf8mb4_unicode_ci AS title,
                    CONVERT(subject USING utf8mb4) COLLATE utf8mb4_unicode_ci AS description,
                    created_at AS time
             FROM contact_messages ORDER BY created_at DESC LIMIT 2)
            ORDER BY time DESC
            LIMIT 10
        ")->fetchAll();

        Response::success([
            'cards' => [
                'total_sales'      => round($totalSales, 2),
                'total_orders'     => (int) $kpi['total_orders'],
                'total_customers'  => $totalCustomers,
                'total_products'   => (int) $prod['total_products'],
                'low_stock'        => (int) $prod['low_stock'],
                'today_sales'      => round($todaySales, 2),
                'pending_orders'   => (int) $kpi['pending_orders'],
                'avg_order_value'  => $avgOrderValue,
                'new_customers_7d' => (int) $usr['new_customers_7d'],
                'online_sales'     => round($onlineSales, 2),
                'counter_sales'    => round($counterSales, 2),
                'counter_bills'    => (int) $bill['counter_bills'],
                'conversion_rate'  => $conversionRate,
            ],
            'trends' => [
                'sales'     => $saleTrend,
                'orders'    => $orderTrend,
                'customers' => $custTrend,
            ],
            'monthly_sales'    => $monthly,
            'status_breakdown' => $statusBreakdown,
            'recent_orders'    => $recentOrders,
            'top_products'     => $topProducts,
            'recent_customers' => $recentCustomers,
            'activity'         => $activity,
        ]);
    }

    /**
     * Live admin notifications aggregated from the database.
     * Each item carries a stable `key` so its read / dismissed state can be
     * persisted per admin in the notification_states table.
     */
    public function notifications(array $p): void
    {
        $admin = Auth::admin();
        $db = db();
        $items = [];

        // Pending orders that need processing
        $orders = $db->query(
            "SELECT order_number, total, placed_at FROM orders
             WHERE status='pending' AND payment_status='paid'
             ORDER BY placed_at DESC LIMIT 6"
        )->fetchAll();
        foreach ($orders as $o) {
            $items[] = [
                'key'   => 'order:' . $o['order_number'],
                'type'  => 'order',
                'title' => 'New order ' . $o['order_number'],
                'desc'  => '₹' . number_format((float) $o['total']) . ' · awaiting processing',
                'time'  => $o['placed_at'],
                'link'  => '/admin/orders',
            ];
        }

        // Low / out of stock
        $low = $db->query(
            'SELECT id, name, stock FROM products WHERE stock <= low_stock_alert ORDER BY stock ASC LIMIT 6'
        )->fetchAll();
        foreach ($low as $l) {
            $items[] = [
                'key'   => 'stock:' . $l['id'] . ':' . (int) $l['stock'],
                'type'  => 'stock',
                'title' => ((int) $l['stock'] === 0) ? 'Out of stock' : 'Low stock',
                'desc'  => $l['name'] . ' · ' . (int) $l['stock'] . ' left',
                'time'  => null,
                'link'  => '/admin/inventory',
            ];
        }

        // New customers (last 7 days)
        $cust = $db->query(
            "SELECT id, name, created_at FROM users
             WHERE role='customer' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY created_at DESC LIMIT 5"
        )->fetchAll();
        foreach ($cust as $c) {
            $items[] = [
                'key'   => 'customer:' . $c['id'],
                'type'  => 'customer',
                'title' => 'New customer',
                'desc'  => $c['name'] . ' just joined',
                'time'  => $c['created_at'],
                'link'  => '/admin/customers',
            ];
        }

        // Back-in-stock requests waiting
        // Older installations may not have the optional restock table yet;
        // notifications must still respond instead of terminating the request.
        $restock = 0;
        try { $restock = (int) $db->query('SELECT COUNT(*) FROM stock_notifications WHERE notified=0')->fetchColumn(); } catch (Throwable $e) {}
        if ($restock > 0) {
            $items[] = [
                'key'   => 'restock:' . $restock,
                'type'  => 'restock',
                'title' => 'Restock requests',
                'desc'  => $restock . ' customer(s) waiting for restocks',
                'time'  => null,
                'link'  => '/admin/inventory',
            ];
        }

        // Merge persisted read / dismissed state for this admin
        $states = [];
        try {
            $this->ensureNotificationStatesTable($db);
            $st = $db->prepare('SELECT notif_key, status FROM notification_states WHERE admin_id=?');
            $st->execute([(int) ($admin['sub'] ?? 0)]);
            foreach ($st->fetchAll() as $row) $states[$row['notif_key']] = $row['status'];
        } catch (Throwable $e) {}

        $visible = [];
        $unread = 0;
        foreach ($items as $it) {
            $status = $states[$it['key']] ?? null;
            if ($status === 'dismissed') {
                continue; // deleted by the admin — hide it
            }
            $it['read'] = ($status === 'read');
            if (!$it['read']) {
                $unread++;
            }
            $visible[] = $it;
        }

        Response::success([
            'count' => $unread,      // badge shows unread only
            'total' => count($visible),
            'items' => $visible,
        ]);
    }

    /** Persist a read / unread / dismissed state for a single notification key. */
    public function setNotificationState(array $p): void
    {
        try {
            $admin = Auth::admin();
            $key    = trim((string) Request::input('key', ''));
            $status = (string) Request::input('status', '');

            if ($key === '' || !in_array($status, ['read', 'unread', 'dismissed'], true)) {
                Response::error('Invalid notification state', 422);
            }

            $db = db();
            $this->ensureNotificationStatesTable($db);
            if ($status === 'unread') {
                // Clearing the read state = remove any stored row
                $del = $db->prepare('DELETE FROM notification_states WHERE admin_id=? AND notif_key=?');
                $del->execute([(int) ($admin['sub'] ?? 0), $key]);
            } else {
                $up = $db->prepare(
                    'INSERT INTO notification_states (admin_id, notif_key, status) VALUES (?,?,?)
                     ON DUPLICATE KEY UPDATE status=VALUES(status)'
                );
                $up->execute([(int) ($admin['sub'] ?? 0), $key, $status]);
            }
        } catch (Throwable $e) {}

        Response::success(['ok' => true]);
    }

    /** Mark every currently-visible notification as read. */
    public function markAllRead(array $p): void
    {
        try {
            $admin = Auth::admin();
            $keys = Request::input('keys', []);
            if (!is_array($keys) || !$keys) {
                Response::success(['ok' => true]);
                return;
            }
            $db = db();
            $this->ensureNotificationStatesTable($db);
            $up = $db->prepare(
                'INSERT INTO notification_states (admin_id, notif_key, status) VALUES (?,?,?)
                 ON DUPLICATE KEY UPDATE status=VALUES(status)'
            );
            foreach ($keys as $k) {
                $k = trim((string) $k);
                if ($k !== '') {
                    $up->execute([(int) ($admin['sub'] ?? 0), $k, 'read']);
                }
            }
        } catch (Throwable $e) {}

        Response::success(['ok' => true]);
    }

    private function ensureNotificationStatesTable(PDO $db): void
    {
        static $done = false;
        if ($done) return;
        try {
            $db->exec("
                CREATE TABLE IF NOT EXISTS notification_states (
                    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    admin_id   BIGINT NOT NULL,
                    notif_key  VARCHAR(191) NOT NULL,
                    status     VARCHAR(20) NOT NULL DEFAULT 'read',
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uniq_admin_key (admin_id, notif_key),
                    INDEX idx_admin (admin_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $done = true;
        } catch (Throwable $e) {}
    }
}

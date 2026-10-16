<?php
/**
 * Unified invoices — every sale in one place, whether it came in through the
 * online storefront (`orders`) or the in-store billing counter (`bills`).
 *   - index():  merged, date-sorted list + KPIs (online + counter combined)
 *   - order():  one online order as a full, print-ready invoice (admin-gated)
 * Counter bills reuse the existing GET /api/admin/billing/{id} for their detail.
 */
class AdminInvoiceController
{
    /** GET /api/admin/invoices — online orders + counter bills, newest first. */
    public function index(array $p): void
    {
        Auth::admin();
        $db = db();
        // The invoice register is intentionally online-orders only. Counter
        // bills remain available in the POS/Billing screen.
        $source = 'online';

        $invoices = [];

        // ---- Online orders ----
        if ($source === 'online') {
            $rows = $db->query(
                "SELECT o.id, o.order_number, o.total, o.status, o.payment_status, o.payment_method,
                        o.placed_at, u.name AS customer, u.email,
                        (SELECT COALESCE(SUM(quantity),0) FROM order_items WHERE order_id=o.id) AS items
                 FROM orders o JOIN users u ON u.id=o.user_id
                 WHERE o.payment_status='paid'
                 ORDER BY o.placed_at DESC"
            )->fetchAll();
            foreach ($rows as $r) {
                $invoices[] = [
                    'source'         => 'online',
                    'id'             => (int) $r['id'],
                    'number'         => $r['order_number'],
                    'customer'       => $r['customer'] ?: 'Guest',
                    'email'          => $r['email'],
                    'items'          => (int) $r['items'],
                    'total'          => (float) $r['total'],
                    'payment_method' => $r['payment_method'],
                    'payment_status' => $r['payment_status'],
                    'status'         => $r['status'],           // pending / shipped / delivered / cancelled
                    'date'           => $r['placed_at'],
                ];
            }
        }

        // Newest first from the database.
        usort($invoices, fn ($a, $b) => strcmp($b['date'], $a['date']));

        // KPIs — counts + realised revenue (paid online, paid counter).
        $onlineCount  = 0;
        $counterCount = 0;
        $revenue      = 0.0;
        foreach ($invoices as $inv) {
            if ($inv['source'] === 'online') {
                $onlineCount++;
                if ($inv['payment_status'] === 'paid' && $inv['status'] !== 'cancelled') {
                    $revenue += $inv['total'];
                }
            }
        }

        Response::success([
            'invoices' => $invoices,
            'stats'    => [
                'total'    => count($invoices),
                'online'   => $onlineCount,
                'counter'  => $counterCount,
                'revenue'  => round($revenue, 2),
            ],
        ]);
    }

    /** GET /api/admin/invoices/order/{id} — one online order, print-ready. */
    public function order(array $p): void
    {
        Auth::admin();
        $db = db();
        $stmt = $db->prepare(
            'SELECT o.*, u.name AS customer_name, u.email AS customer_email
             FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?'
        );
        $stmt->execute([(int) $p['id']]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }

        $items = $db->prepare('SELECT product_name, size, color, quantity, price, line_total FROM order_items WHERE order_id=?');
        $items->execute([$order['id']]);
        $order['items'] = array_map(function ($it) {
            $it['quantity']   = (int) $it['quantity'];
            $it['price']      = (float) $it['price'];
            $it['line_total'] = (float) $it['line_total'];
            return $it;
        }, $items->fetchAll());

        $order['shipping_address'] = json_decode($order['shipping_address'] ?? 'null', true);
        foreach (['subtotal', 'discount', 'shipping_fee', 'total'] as $f) {
            $order[$f] = (float) ($order[$f] ?? 0);
        }
        $order['id'] = (int) $order['id'];
        // Signed token for the invoice's delivery-verification QR.
        $order['verify_token'] = OrderController::verifyToken($order['id'], $order['order_number']);

        Response::success($order);
    }

    /** DELETE /api/admin/invoices/{source}/{id} — remove an invoice safely. */
    public function destroy(array $p): void
    {
        Auth::admin();
        $source = (string) ($p['source'] ?? '');
        $id = (int) ($p['id'] ?? 0);
        if (!in_array($source, ['online', 'counter'], true) || $id < 1) {
            Response::error('Invalid invoice', 422);
        }

        $db = db();
        $table = $source === 'online' ? 'orders' : 'bills';
        $stmt = $db->prepare("SELECT id, status FROM {$table} WHERE id=?");
        $stmt->execute([$id]);
        $invoice = $stmt->fetch();
        if (!$invoice) {
            Response::error('Invoice not found', 404);
        }

        // Cancelled online orders can be removed without affecting stock.
        // Counter bills may be removed directly; paid bills are restocked in
        // the transaction below before their invoice and items are deleted.
        $deletable = $source === 'online'
            ? $invoice['status'] === 'cancelled'
            : in_array($invoice['status'], ['paid', 'void'], true);
        if (!$deletable) {
            Response::error('Only cancelled or void invoices can be deleted.', 422);
        }

        $db->beginTransaction();
        try {
            if ($source === 'counter' && $invoice['status'] === 'paid') {
                $items = $db->prepare('SELECT product_id, quantity FROM bill_items WHERE bill_id=?');
                $items->execute([$id]);
                $restock = $db->prepare('UPDATE products SET stock=stock+?, sold_count=GREATEST(sold_count-?,0) WHERE id=?');
                foreach ($items->fetchAll() as $item) {
                    if ($item['product_id']) {
                        $qty = (int) $item['quantity'];
                        $restock->execute([$qty, $qty, (int) $item['product_id']]);
                    }
                }
            }
            $db->prepare("DELETE FROM {$table} WHERE id=?")->execute([$id]);
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Could not delete invoice.', 500);
        }
        Response::success(null, 'Invoice deleted');
    }
}

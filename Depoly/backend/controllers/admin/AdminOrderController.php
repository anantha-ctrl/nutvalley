<?php
class AdminOrderController
{
    public function index(array $p): void
    {
        Auth::admin();
        $where = '1=1';
        $args = [];
        if ($status = Request::query('status')) {
            $where .= ' AND o.status=?';
            $args[] = $status;
        }
        // A COD order is confirmed the moment it is placed — its money arrives on
        // delivery, so payment_status stays 'pending' until then. Filtering the
        // list on payment_status='paid' alone therefore hid every COD order from
        // the admin, making them impossible to fulfil.
        if (Request::query('payment_approval') === 'pending') {
            $where .= " AND o.payment_approval='pending'";           // UPI approvals tab
        } elseif (Request::query('unpaid') === '1') {
            // Abandoned online checkouts: never paid, and not COD.
            $where .= " AND o.payment_status<>'paid' AND o.payment_method<>'cod'";
        } else {
            $where .= " AND (o.payment_status='paid' OR o.payment_method='cod')";
        }
        $stmt = db()->prepare(
            "SELECT o.id, o.order_number, o.total, o.status, o.payment_status, o.payment_method,
                    o.payment_approval, o.payment_txn_id, o.payment_note, o.placed_at,
                    o.carrier, o.tracking_number,
                    o.delivery_provider, o.awb_code, o.courier_name, o.shipment_status,
                    o.shipment_eta, o.label_url, o.tracking_url, o.shipment_synced_at,
                    u.name AS customer, u.email, u.phone
             FROM orders o JOIN users u ON u.id=o.user_id
             WHERE $where ORDER BY o.placed_at DESC"
        );
        $stmt->execute($args);
        Response::success($stmt->fetchAll());
    }

    /** GET /api/admin/orders/{id}/payment — the UPI proof (txn id + screenshot). */
    public function paymentProof(array $p): void
    {
        Auth::admin();
        $stmt = db()->prepare(
            'SELECT o.id, o.order_number, o.total, o.payment_method, o.payment_status, o.payment_approval,
                    o.payment_txn_id, o.payment_screenshot, o.payment_note, o.payment_reviewed_at,
                    u.name AS customer, u.email, u.phone
             FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?'
        );
        $stmt->execute([(int) $p['id']]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::error('Order not found', 404);
        }
        $row['total'] = (float) $row['total'];
        Response::success($row);
    }

    /**
     * PUT /api/admin/orders/{id}/payment — approve or reject a manual UPI payment.
     * Approve => confirm the order (stock/points committed, customer emailed).
     * Reject  => mark failed with a note (customer emailed to re-submit).
     */
    public function reviewPayment(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $action = Request::input('action');
        $note = trim((string) Request::input('note', '')) ?: null;
        if (!in_array($action, ['approve', 'reject'], true)) {
            Response::error('Invalid action', 422);
        }

        $db = db();
        $stmt = $db->prepare('SELECT * FROM orders WHERE id=?');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }
        if ($order['payment_method'] !== 'upi') {
            Response::error('This order is not a UPI payment', 400);
        }
        if ($order['payment_approval'] === 'approved') {
            Response::error('Payment already approved', 400);
        }

        $info = $db->prepare('SELECT name, email FROM users WHERE id=?');
        $info->execute([(int) $order['user_id']]);
        $user = $info->fetch() ?: ['name' => 'Customer', 'email' => ''];

        if ($action === 'approve') {
            $db->prepare(
                "UPDATE orders
                 SET payment_approval='approved', payment_status='paid', status='processing',
                     payment_note=?, payment_reviewed_at=NOW()
                 WHERE id=?"
            )->execute([$note, $id]);
            // Commit stock, coupon usage, loyalty points + send the confirmation email.
            OrderController::finalizeFromDb($id);
            Response::success(null, 'Payment approved — order confirmed');
        }

        // Reject: mark failed. Stock was never decremented, so nothing to restock.
        $db->prepare(
            "UPDATE orders
             SET payment_approval='rejected', payment_status='failed',
                 payment_note=?, payment_reviewed_at=NOW()
             WHERE id=?"
        )->execute([$note, $id]);

        if ($user['email']) {
            Mailer::send(
                $user['email'],
                Mailer::brand() . " · Payment could not be verified — Order {$order['order_number']}",
                Mailer::upiRejectedTemplate($user['name'], $order['order_number'], $note)
            );
        }
        Response::success(null, 'Payment rejected — customer notified');
    }

    public function updateStatus(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $data = Request::body();
        $status = $data['status'] ?? null;
        $carrier = isset($data['carrier']) ? trim((string) $data['carrier']) : null;
        $tracking = isset($data['tracking_number']) ? trim((string) $data['tracking_number']) : null;

        $allowed = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];
        if ($status !== null && !in_array($status, $allowed, true)) {
            Response::error('Invalid status', 422);
        }
        $db = db();
        self::ensureHistoryTable($db);

        $currStmt = $db->prepare('SELECT * FROM orders WHERE id=?');
        $currStmt->execute([$id]);
        $curr = $currStmt->fetch();
        if (!$curr) {
            Response::error('Order not found', 404);
        }

        $newStatus = $status !== null ? $status : $curr['status'];
        $newCarrier = $carrier !== null ? $carrier : $curr['carrier'];
        $newTracking = $tracking !== null ? $tracking : $curr['tracking_number'];

        // A new edit starts a fresh redo branch.
        $db->prepare('DELETE FROM order_status_history WHERE order_id=? AND undone=1')->execute([$id]);
        $db->prepare('INSERT INTO order_status_history (order_id, old_status, old_carrier, old_tracking, new_status, new_carrier, new_tracking, undone) VALUES (?,?,?,?,?,?,?,0)')
           ->execute([$id, $curr['status'], $curr['carrier'], $curr['tracking_number'], $newStatus, $newCarrier, $newTracking]);

        $db->prepare('UPDATE orders SET status=?, carrier=?, tracking_number=? WHERE id=?')
           ->execute([$newStatus, $newCarrier, $newTracking, $id]);

        // Auto-book with the delivery partner the moment the parcel is packed,
        // when "Book automatically" is enabled in Delivery settings.
        $autoBooked = null;
        if ($newStatus === 'packed' && empty($curr['awb_code'])
            && Setting::get('delivery_auto_ship', '0') === '1' && Delivery::isConfigured()) {
            $book = Delivery::createShipment($id);
            $autoBooked = $book['ok'] ? $book['message'] : 'Auto-booking failed: ' . $book['message'];
            if ($book['ok']) {
                $newCarrier  = $book['data']['courier_name'] ?? $newCarrier;
                $newTracking = $book['data']['awb_code'] ?? $newTracking;
            }
        }

        if ($newStatus === 'delivered') {
            $db->prepare("UPDATE orders SET payment_status='paid' WHERE id=? AND payment_method='cod'")->execute([$id]);
            try { Automation::onDelivered($id); } catch (\Throwable $e) {}
        }

        // Email the customer only when something they care about changed: a new
        // status, or tracking details added/changed on a shipped order (so editing
        // the carrier box doesn't spam them with duplicate "update" mails).
        $statusChanged = $newStatus !== $curr['status'];
        $trackingChanged = $newStatus === 'shipped'
            && ($newTracking !== $curr['tracking_number'] || $newCarrier !== $curr['carrier'])
            && ($newTracking || $newCarrier);
        $notify = ($statusChanged || $trackingChanged) && $newStatus !== 'pending';

        // The status change is already committed; answer the admin now and send
        // the customer email after the connection closes (SMTP can take ~20s).
        Response::successThen(
            ['carrier' => $newCarrier, 'tracking_number' => $newTracking, 'auto_booked' => $autoBooked, 'customer_notified' => $notify],
            ($autoBooked ? 'Order status updated — ' . $autoBooked : 'Order status updated') . ($notify ? ' · customer emailed' : ''),
            function () use ($id, $newStatus, $notify) {
                if (!$notify) {
                    return;
                }
                if ($m = Mailer::orderEmail($id, $newStatus)) { // rendered from the live order row
                    Mailer::send($m['to'], $m['subject'], $m['html']);
                }
            }
        );
    }

    public function undoStatus(array $p): void
    {
        Auth::admin(); $db = db(); self::ensureHistoryTable($db); $id = (int) $p['id'];
        $q = $db->prepare('SELECT * FROM order_status_history WHERE order_id=? AND undone=0 ORDER BY id DESC LIMIT 1');
        $q->execute([$id]); $h = $q->fetch();
        if (!$h) Response::error('Nothing to undo', 422);
        $db->prepare('UPDATE orders SET status=?, carrier=?, tracking_number=? WHERE id=?')->execute([$h['old_status'], $h['old_carrier'], $h['old_tracking'], $id]);
        $db->prepare('UPDATE order_status_history SET undone=1 WHERE id=?')->execute([$h['id']]);
        Response::success(null, 'Order update undone');
    }

    public function redoStatus(array $p): void
    {
        Auth::admin(); $db = db(); self::ensureHistoryTable($db); $id = (int) $p['id'];
        $q = $db->prepare('SELECT * FROM order_status_history WHERE order_id=? AND undone=1 ORDER BY id ASC LIMIT 1');
        $q->execute([$id]); $h = $q->fetch();
        if (!$h) Response::error('Nothing to redo', 422);
        $db->prepare('UPDATE orders SET status=?, carrier=?, tracking_number=? WHERE id=?')->execute([$h['new_status'], $h['new_carrier'], $h['new_tracking'], $id]);
        $db->prepare('UPDATE order_status_history SET undone=0 WHERE id=?')->execute([$h['id']]);
        Response::success(null, 'Order update redone');
    }

    private static function ensureHistoryTable(PDO $db): void
    {
        $db->exec("CREATE TABLE IF NOT EXISTS order_status_history (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL,
          old_status VARCHAR(30) NOT NULL, old_carrier VARCHAR(120) NULL, old_tracking VARCHAR(120) NULL,
          new_status VARCHAR(30) NOT NULL, new_carrier VARCHAR(120) NULL, new_tracking VARCHAR(120) NULL,
          undone TINYINT(1) NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_osh_order (order_id)
        ) ENGINE=InnoDB");
    }
}

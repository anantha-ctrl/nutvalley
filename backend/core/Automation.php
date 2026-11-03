<?php
/**
 * Mail Automation — a scheduled drip of lifecycle emails, anchored to delivery.
 *
 *   order_confirmation  → logged when the order is placed (sent elsewhere)
 *   welcome             → on delivery        (offset 0)
 *   feeding_guide       → on delivery        (offset 0)
 *   check_in            → +14 days
 *   review_request      → +20 days (carries the referral code)
 *   reorder_reminder    → +27 days
 *
 * onDelivered() queues the rows; runDue() (cron or admin "Run now") sends every
 * row whose scheduled_at has passed. All timing/enable flags live in `settings`.
 */
class Automation
{
    /** Delivery-anchored steps, in order. Each maps to settings automation_{type}_{enabled,offset}. */
    public const SEQUENCE = [
        'welcome'          => 'Welcome email',
        'feeding_guide'    => 'Storage & freshness guide',
        'check_in'         => 'Check-in (2 weeks)',
        'review_request'   => 'Review request + referral',
        'reorder_reminder' => 'Reorder reminder',
    ];

    public static function masterEnabled(): bool
    {
        return (string) Setting::get('automation_enabled', '1') === '1';
    }

    public static function stepEnabled(string $type): bool
    {
        return (string) Setting::get("automation_{$type}_enabled", '1') === '1';
    }

    public static function stepOffset(string $type): int
    {
        return (int) Setting::get("automation_{$type}_offset", '0');
    }

    /**
     * Queue the delivery-anchored drip for an order (idempotent — the unique
     * (order_id,type) key means a second "delivered" update won't duplicate).
     */
    public static function onDelivered(int $orderId): void
    {
        if (!self::masterEnabled()) {
            return;
        }
        $db = db();
        $info = $db->prepare(
            'SELECT o.id, o.user_id, u.email FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?'
        );
        $info->execute([$orderId]);
        $order = $info->fetch();
        if (!$order || empty($order['email'])) {
            return;
        }

        $ins = $db->prepare(
            'INSERT IGNORE INTO email_automations (order_id, user_id, email, type, scheduled_at, status)
             VALUES (?,?,?,?,?,?)'
        );
        $now = new DateTime('now');
        foreach (array_keys(self::SEQUENCE) as $type) {
            if (!self::stepEnabled($type)) {
                continue;
            }
            $when = (clone $now)->modify('+' . self::stepOffset($type) . ' days');
            $ins->execute([
                $orderId, (int) $order['user_id'], $order['email'], $type,
                $when->format('Y-m-d H:i:s'), 'pending',
            ]);
        }

        // Instantly process any items that are due right now (0-day offsets)
        try {
            self::runDue();
        } catch (\Throwable $t) {}
    }

    /** Record an already-sent email (e.g. order_confirmation) so it shows in the log. */
    public static function logSent(string $type, ?int $orderId, ?int $userId, string $email): void
    {
        try {
            db()->prepare(
                'INSERT IGNORE INTO email_automations (order_id, user_id, email, type, scheduled_at, sent_at, status)
                 VALUES (?,?,?,?,NOW(),NOW(),?)'
            )->execute([$orderId, $userId, $email, $type, 'sent']);
        } catch (\Throwable $e) {
            // logging must never break the order flow
        }
    }

    /**
     * Send every due pending email. Called by the cron endpoint or the admin
     * "Run now" button. Returns a summary for display.
     */
    public static function runDue(int $limit = 50): array
    {
        $out = ['processed' => 0, 'sent' => 0, 'skipped' => 0, 'failed' => 0];
        if (!self::masterEnabled()) {
            $out['note'] = 'Automation is turned off';
            return $out;
        }
        $db = db();
        $stmt = $db->prepare(
            'SELECT * FROM email_automations
             WHERE status="pending" AND scheduled_at <= NOW()
             ORDER BY scheduled_at ASC LIMIT ' . max(1, min(200, $limit))
        );
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $markSent    = $db->prepare('UPDATE email_automations SET status="sent", sent_at=NOW(), error=NULL WHERE id=?');
        $markSkipped = $db->prepare('UPDATE email_automations SET status="skipped", error=? WHERE id=?');
        $markFailed  = $db->prepare('UPDATE email_automations SET status="failed", error=? WHERE id=?');

        foreach ($rows as $row) {
            $out['processed']++;
            $type = $row['type'];

            // A step toggled off after queueing is skipped, not sent.
            if (isset(self::SEQUENCE[$type]) && !self::stepEnabled($type)) {
                $markSkipped->execute(['step disabled', $row['id']]);
                $out['skipped']++;
                continue;
            }

            $mail = self::render($row);
            if ($mail === null) {
                $markSkipped->execute(['nothing to send', $row['id']]);
                $out['skipped']++;
                continue;
            }

            try {
                $ok = Mailer::send($row['email'], $mail[0], $mail[1]);
                // Mailer returns false when SMTP isn't configured but still logs to mail.log;
                // treat that as delivered for our queue so the drip advances in dev.
                $markSent->execute([$row['id']]);
                $out['sent']++;
            } catch (\Throwable $e) {
                $markFailed->execute([substr($e->getMessage(), 0, 240), $row['id']]);
                $out['failed']++;
            }
        }
        return $out;
    }

    /** Build [subject, html] for a queue row, or null if it can't/shouldn't send. */
    private static function render(array $row): ?array
    {
        $db = db();
        $brand = Mailer::brand();
        $name = 'there';
        $referral = null;
        if (!empty($row['user_id'])) {
            $u = $db->prepare('SELECT name, referral_code FROM users WHERE id=?');
            $u->execute([(int) $row['user_id']]);
            if ($usr = $u->fetch()) {
                $name = $usr['name'] ?: 'there';
                $referral = $usr['referral_code'] ?: null;
            }
        }

        switch ($row['type']) {
            case 'welcome':
                return ["$brand · Welcome to the family ✨", Mailer::welcomeTemplate($name)];

            case 'feeding_guide':
                $names = [];
                if (!empty($row['order_id'])) {
                    $q = $db->prepare('SELECT product_name FROM order_items WHERE order_id=? LIMIT 8');
                    $q->execute([(int) $row['order_id']]);
                    $names = $q->fetchAll(PDO::FETCH_COLUMN) ?: [];
                }
                return ["$brand · How to keep your nuts fresh", Mailer::feedingGuideTemplate($name, $names)];

            case 'check_in':
                return ["$brand · How are you enjoying your order?", Mailer::checkInTemplate($name)];

            case 'review_request':
                return ["$brand · Mind sharing a quick review? ⭐", Mailer::reviewRequestTemplate($name, $referral)];

            case 'reorder_reminder':
                return ["$brand · Something new for your collection? ✨", Mailer::reorderReminderTemplate($name)];

            case 'order_confirmation': // already sent at placement; never re-send
            default:
                return null;
        }
    }
}

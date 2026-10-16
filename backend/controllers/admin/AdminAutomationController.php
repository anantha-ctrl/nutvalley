<?php
/**
 * Admin console for Mail Automation — read the drip config + live queue log,
 * edit the schedule/toggles, and run due emails on demand.
 */
class AdminAutomationController
{
    /** The full sequence shown in the UI (order_confirmation is immediate, the rest are delivery-anchored). */
    private const STEPS = [
        ['type' => 'order_confirmation', 'label' => 'Order confirmation', 'trigger' => 'When the order is placed', 'fixed' => true],
        ['type' => 'welcome',            'label' => 'Welcome email',      'trigger' => 'On delivery'],
        ['type' => 'feeding_guide',      'label' => 'Jewellery care guide',      'trigger' => 'On delivery (day the product arrives)'],
        ['type' => 'check_in',           'label' => 'Check-in mail',      'trigger' => 'After delivery'],
        ['type' => 'review_request',     'label' => 'Review request (+ referral)', 'trigger' => 'After delivery'],
        ['type' => 'reorder_reminder',   'label' => 'Reorder reminder',   'trigger' => 'After delivery'],
    ];

    public function index(array $p): void
    {
        Auth::admin();
        $db = db();

        $steps = array_map(function ($s) {
            $type = $s['type'];
            $s['enabled'] = (string) Setting::get("automation_{$type}_enabled", '1') === '1';
            $s['offset']  = (int) Setting::get("automation_{$type}_offset", '0');
            return $s;
        }, self::STEPS);

        // Status counts + how many are due right now.
        $counts = $db->query(
            "SELECT status, COUNT(*) c FROM email_automations GROUP BY status"
        )->fetchAll(PDO::FETCH_KEY_PAIR);
        $due = (int) $db->query(
            "SELECT COUNT(*) FROM email_automations WHERE status='pending' AND scheduled_at <= NOW()"
        )->fetchColumn();

        // Recent queue rows for the live log.
        $log = $db->query(
            "SELECT ea.id, ea.type, ea.email, ea.scheduled_at, ea.sent_at, ea.status, ea.error,
                    o.order_number, u.name AS customer
             FROM email_automations ea
             LEFT JOIN orders o ON o.id = ea.order_id
             LEFT JOIN users  u ON u.id = ea.user_id
             ORDER BY ea.id DESC LIMIT 100"
        )->fetchAll();

        Response::success([
            'master_enabled' => Automation::masterEnabled(),
            'steps'          => $steps,
            'stats'          => [
                'pending' => (int) ($counts['pending'] ?? 0),
                'sent'    => (int) ($counts['sent'] ?? 0),
                'failed'  => (int) ($counts['failed'] ?? 0),
                'skipped' => (int) ($counts['skipped'] ?? 0),
                'due'     => $due,
            ],
            'log'            => $log,
        ]);
    }

    /** PUT — save master toggle + per-step enabled/offset. */
    public function save(array $p): void
    {
        Auth::admin();
        $body = Request::body();

        if (array_key_exists('master_enabled', $body)) {
            Setting::set('automation_enabled', $body['master_enabled'] ? '1' : '0');
        }
        foreach ((array) ($body['steps'] ?? []) as $s) {
            $type = preg_replace('/[^a-z_]/', '', (string) ($s['type'] ?? ''));
            if ($type === '' || $type === 'order_confirmation') {
                continue; // confirmation is fixed/immediate
            }
            if (array_key_exists('enabled', $s)) {
                Setting::set("automation_{$type}_enabled", $s['enabled'] ? '1' : '0');
            }
            if (array_key_exists('offset', $s)) {
                Setting::set("automation_{$type}_offset", (string) max(0, (int) $s['offset']));
            }
        }
        Response::success(null, 'Automation settings saved');
    }

    /** POST — process every due email now (manual trigger, no cron needed). */
    public function run(array $p): void
    {
        Auth::admin();
        $summary = Automation::runDue(200);
        Response::success($summary, 'Processed due emails');
    }
}

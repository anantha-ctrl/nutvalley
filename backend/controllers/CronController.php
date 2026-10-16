<?php
/**
 * Public cron entry point for scheduled jobs. Protected by a shared key so it
 * can be hit by Windows Task Scheduler / a real cron without an admin login:
 *
 *   curl "http://localhost/Beadsboutique/backend/api/cron/run?key=YOUR_CRON_KEY"
 *
 * Set CRON_KEY in backend/.env. If it's empty, the endpoint is disabled
 * (use the admin "Run now" button instead).
 */
class CronController
{
    public function run(array $p): void
    {
        $expected = (string) env('CRON_KEY', '');
        $given = (string) (Request::query('key') ?? '');
        if ($expected === '' || !hash_equals($expected, $given)) {
            Response::error('Forbidden', 403);
        }
        $summary = ['mail' => Automation::runDue(100)];

        // Keep every in-flight parcel's status fresh even when nobody has the
        // admin open, so order status / delivery emails fire on courier scans.
        try {
            $summary['shipments'] = AdminDeliveryController::syncAll(50);
        } catch (\Throwable $e) {
            $summary['shipments'] = ['error' => $e->getMessage()];
        }

        Response::success($summary, 'Cron run complete');
    }
}

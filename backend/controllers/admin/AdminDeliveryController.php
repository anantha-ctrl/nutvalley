<?php
/**
 * Delivery partner administration — credentials, connection test, and the
 * per-order shipment actions (book AWB, live track, cancel).
 *
 * Secrets are never echoed back to the browser: reads return a masked preview
 * plus a `*_set` boolean, and a write only replaces a secret when a non-masked
 * value is submitted. That way the settings form can round-trip safely.
 */
class AdminDeliveryController
{
    /** Config keys the admin form may write. */
    const WRITABLE = [
        'delivery_provider'        => 'enum',
        'delivery_api_key'         => 'secret',
        'delivery_api_secret'      => 'secret',
        'delivery_email'           => 'text',
        'delivery_pickup_location' => 'text',
        'delivery_pickup_pincode'  => 'text',
        'delivery_auto_ship'       => 'bool',
        'delivery_default_weight'  => 'decimal',
        'delivery_default_length'  => 'decimal',
        'delivery_default_breadth' => 'decimal',
        'delivery_default_height'  => 'decimal',
        'delivery_channel_id'      => 'text',
        'delivery_sandbox'         => 'bool',
    ];

    /**
     * Short field names the settings form posts, where they differ from the
     * storage key minus its `delivery_` prefix (the parcel defaults are stored
     * as delivery_default_* but sent as plain weight/length/breadth/height).
     */
    const ALIASES = [
        'delivery_default_weight'  => 'weight',
        'delivery_default_length'  => 'length',
        'delivery_default_breadth' => 'breadth',
        'delivery_default_height'  => 'height',
    ];

    const MASK = '••••••••';

    /** The field name the settings form uses for a storage key. */
    private static function shortName(string $key): string
    {
        return self::ALIASES[$key] ?? substr($key, strlen('delivery_'));
    }

    /** Show only the last 4 characters of a stored secret. */
    private static function mask(string $val): string
    {
        if ($val === '') {
            return '';
        }
        return self::MASK . substr($val, -4);
    }

    /** GET /api/admin/delivery/config */
    public function config(array $p): void
    {
        Auth::admin();
        $cfg = Delivery::config();

        // Keys pinned in backend/.env are read-only here: the form shows them
        // locked rather than pretending a save would take effect.
        $locked = Delivery::envLockedKeys();

        Response::success([
            'provider'        => Delivery::provider(),
            'label'           => Delivery::providerLabel(),
            'configured'      => Delivery::isConfigured(),
            'sandbox'         => $cfg['delivery_sandbox'] === '1',
            'env_locked'      => array_map([self::class, 'shortName'], $locked),
            'env_locked_vars' => array_map('strtoupper', $locked),
            'email'           => $cfg['delivery_email'],
            'api_key'         => self::mask((string) $cfg['delivery_api_key']),
            'api_key_set'     => $cfg['delivery_api_key'] !== '',
            'api_secret'      => self::mask((string) $cfg['delivery_api_secret']),
            'api_secret_set'  => $cfg['delivery_api_secret'] !== '',
            'pickup_location' => $cfg['delivery_pickup_location'],
            'pickup_pincode'  => $cfg['delivery_pickup_pincode'],
            'auto_ship'       => $cfg['delivery_auto_ship'] === '1',
            'channel_id'      => $cfg['delivery_channel_id'],
            'package'         => [
                'weight'  => (float) $cfg['delivery_default_weight'],
                'length'  => (float) $cfg['delivery_default_length'],
                'breadth' => (float) $cfg['delivery_default_breadth'],
                'height'  => (float) $cfg['delivery_default_height'],
            ],
            'token_expires_at' => (int) Setting::get('delivery_token_expires', '0'),
            'stats'            => self::stats(),
        ], self::$saveNotice ?: 'OK');
    }

    /** Live shipment counters for the settings panel header. */
    private static function stats(): array
    {
        try {
            $row = db()->query(
                "SELECT
                    COUNT(*)                                                          AS total,
                    SUM(awb_code IS NOT NULL)                                         AS booked,
                    SUM(awb_code IS NULL AND status NOT IN ('cancelled','delivered')) AS awaiting,
                    SUM(status='shipped')                                             AS in_transit,
                    SUM(status='delivered')                                           AS delivered
                 FROM orders
                 WHERE (payment_status='paid' OR payment_method='cod')"
            )->fetch() ?: [];
        } catch (\Throwable $e) {
            return ['total' => 0, 'booked' => 0, 'awaiting' => 0, 'in_transit' => 0, 'delivered' => 0];
        }
        return array_map(fn ($v) => (int) $v, [
            'total'      => $row['total']      ?? 0,
            'booked'     => $row['booked']     ?? 0,
            'awaiting'   => $row['awaiting']   ?? 0,
            'in_transit' => $row['in_transit'] ?? 0,
            'delivered'  => $row['delivered']  ?? 0,
        ]);
    }

    /** PUT /api/admin/delivery/config — save credentials & defaults. */
    public function saveConfig(array $p): void
    {
        Auth::admin();
        $body = Request::body();
        $providerChanged = false;
        $ignored = [];

        foreach (self::WRITABLE as $key => $type) {
            // Accept both the storage key ("delivery_api_key") and the short
            // form the settings form posts ("api_key", "weight", …).
            $short = self::shortName($key);
            $raw = array_key_exists($key, $body) ? $body[$key]
                 : (array_key_exists($short, $body) ? $body[$short] : null);
            if ($raw === null) {
                continue;
            }
            // backend/.env wins at read time, so writing this row would be a
            // silent no-op. Skip it and name the variable in the response.
            if (Delivery::isEnvLocked($key)) {
                $ignored[] = strtoupper($key);
                continue;
            }
            $val = is_bool($raw) ? ($raw ? '1' : '0') : trim((string) $raw);

            switch ($type) {
                case 'enum':
                    $val = strtolower($val);
                    if ($val !== 'none' && !in_array($val, Delivery::PROVIDERS, true)) {
                        Response::error('Unknown delivery provider: ' . $val, 422);
                    }
                    $providerChanged = $val !== Delivery::provider();
                    break;

                case 'secret':
                    // An unchanged masked value means "keep what's stored".
                    if ($val === '' || str_starts_with($val, self::MASK)) {
                        continue 2;
                    }
                    break;

                case 'bool':
                    $val = in_array(strtolower($val), ['1', 'true', 'yes', 'on'], true) ? '1' : '0';
                    break;

                case 'decimal':
                    $val = (string) max(0, (float) $val);
                    break;
            }
            Setting::set($key, $val);
        }

        // Credentials or provider changed → the cached bearer token is stale.
        if ($providerChanged
            || array_key_exists('api_secret', $body) || array_key_exists('delivery_api_secret', $body)
            || array_key_exists('api_key', $body)    || array_key_exists('delivery_api_key', $body)
            || array_key_exists('email', $body)      || array_key_exists('delivery_email', $body)) {
            Setting::set('delivery_token', '');
            Setting::set('delivery_token_expires', '0');
        }

        if ($ignored) {
            self::$saveNotice = 'Saved. Ignored ' . implode(', ', array_unique($ignored))
                . ' — set in backend/.env, which takes precedence.';
        }
        $this->config($p); // responds with the fresh, masked config
    }

    /** Message appended to the next config() response, if a save had caveats. */
    private static ?string $saveNotice = null;

    /** POST /api/admin/delivery/test — verify the saved credentials live. */
    public function test(array $p): void
    {
        Auth::admin();
        $res = Delivery::testConnection();
        if (!$res['ok']) {
            Response::error($res['message'], 422);
        }
        Response::success($res['details'], $res['message']);
    }

    /**
     * GET /api/admin/delivery/serviceability?pincode=560001&cod=0
     * Live courier list + rate + ETA for a destination pincode.
     */
    public function serviceability(array $p): void
    {
        Auth::admin();
        $pin = preg_replace('/\D/', '', (string) Request::query('pincode', ''));
        if (strlen($pin) !== 6) {
            Response::error('Enter a valid 6-digit pincode', 422);
        }
        $res = Delivery::serviceability(
            $pin,
            (string) Request::query('cod', '0') === '1',
            (float) Request::query('weight', Delivery::cfg('delivery_default_weight', '0.5'))
        );
        if (!$res['ok']) {
            Response::error($res['error'] ?: 'Serviceability check failed', 422);
        }
        Response::success($res);
    }

    /**
     * Build the shipment list from the current filters.
     * Shared by the live table and by both exports so they can never disagree.
     */
    private static function queryShipments(int $limit = 300): array
    {
        $where = '1=1';
        $args  = [];

        // Shippable = payment confirmed, or COD (paid on delivery, so its
        // payment_status stays 'pending' right up until the parcel lands).
        if (Request::query('include_unpaid') !== '1') {
            $where .= " AND (o.payment_status='paid' OR o.payment_method='cod')";
        }
        if ($s = Request::query('status')) {
            $where .= ' AND o.status=?';
            $args[] = $s;
        }
        if (Request::query('booked') === '0') {
            $where .= ' AND o.awb_code IS NULL';
        } elseif (Request::query('booked') === '1') {
            $where .= ' AND o.awb_code IS NOT NULL';
        }
        if ($from = Request::query('from')) {
            $where .= ' AND o.placed_at >= ?';
            $args[] = $from . ' 00:00:00';
        }
        if ($to = Request::query('to')) {
            $where .= ' AND o.placed_at <= ?';
            $args[] = $to . ' 23:59:59';
        }
        if ($q = trim((string) Request::query('q', ''))) {
            $where .= ' AND (o.order_number LIKE ? OR o.awb_code LIKE ? OR u.name LIKE ?)';
            $like = '%' . $q . '%';
            array_push($args, $like, $like, $like);
        }

        $stmt = db()->prepare(
            "SELECT o.id, o.order_number, o.status, o.total, o.payment_method, o.payment_status, o.placed_at,
                    o.awb_code, o.courier_name, o.carrier, o.tracking_number, o.shipment_status, o.shipment_eta,
                    o.label_url, o.tracking_url, o.shipment_synced_at, o.delivery_provider,
                    o.shipping_address, u.name AS customer, u.email, u.phone
             FROM orders o JOIN users u ON u.id=o.user_id
             WHERE $where ORDER BY o.placed_at DESC LIMIT " . max(1, $limit)
        );
        $stmt->execute($args);

        return array_map(function ($r) {
            $addr = json_decode($r['shipping_address'] ?? 'null', true) ?: [];
            unset($r['shipping_address']);
            $r['total']   = (float) $r['total'];
            $r['pincode'] = $addr['pincode'] ?? null;
            $r['city']    = $addr['city'] ?? null;
            $r['state']   = $addr['state'] ?? null;
            $r['address'] = trim(implode(', ', array_filter([
                $addr['line1'] ?? null, $addr['line2'] ?? null, $addr['city'] ?? null,
                $addr['state'] ?? null, $addr['pincode'] ?? null,
            ])));
            return $r;
        }, $stmt->fetchAll());
    }

    /** GET /api/admin/delivery/shipments — every order with its live shipment state. */
    public function shipments(array $p): void
    {
        Auth::admin();
        Response::success([
            'provider'   => Delivery::provider(),
            'label'      => Delivery::providerLabel(),
            'configured' => Delivery::isConfigured(),
            'stats'      => self::stats(),
            'orders'     => self::queryShipments(300),
        ]);
    }

    /** Columns shared by the CSV and PDF exports: [header, relative width, value fn]. */
    private static function exportColumns(): array
    {
        return [
            ['Order',    9,  fn ($r) => (string) $r['order_number']],
            ['Date',     9,  fn ($r) => $r['placed_at'] ? date('d M Y', strtotime($r['placed_at'])) : ''],
            ['Customer', 14, fn ($r) => (string) $r['customer']],
            ['Phone',    9,  fn ($r) => (string) $r['phone']],
            ['City',     10, fn ($r) => (string) ($r['city'] ?? '')],
            ['Pincode',  7,  fn ($r) => (string) ($r['pincode'] ?? '')],
            ['Amount',   8,  fn ($r) => number_format((float) $r['total'], 2, '.', '')],
            ['Payment',  8,  fn ($r) => strtoupper((string) $r['payment_method'])],
            ['Courier',  11, fn ($r) => (string) ($r['courier_name'] ?: $r['carrier'] ?: '')],
            ['AWB',      12, fn ($r) => (string) ($r['awb_code'] ?: $r['tracking_number'] ?: '')],
            ['Shipment', 12, fn ($r) => (string) ($r['shipment_status'] ?: '')],
            ['Status',   8,  fn ($r) => (string) $r['status']],
            ['ETA',      8,  fn ($r) => (string) ($r['shipment_eta'] ?: '')],
        ];
    }

    /**
     * GET /api/admin/delivery/export?format=csv|pdf — download the filtered
     * shipment list. Streams a real file (not JSON), so the browser saves it.
     */
    public function export(array $p): void
    {
        Auth::admin();
        $format = strtolower((string) Request::query('format', 'csv'));
        if (!in_array($format, ['csv', 'pdf'], true)) {
            Response::error('Unsupported export format: ' . $format, 422);
        }

        $rows = self::queryShipments(5000);
        $cols = self::exportColumns();
        $stamp = date('Y-m-d_His');
        $filename = "nutsvally-shipments_$stamp.$format";

        // Nothing but the file may reach the client.
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('X-Filename: ' . $filename); // readable by the browser fetch
        header('Access-Control-Expose-Headers: X-Filename, Content-Disposition');

        if ($format === 'csv') {
            header('Content-Type: text/csv; charset=utf-8');
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM so Excel reads UTF-8 correctly
            fputcsv($out, array_column($cols, 0));
            foreach ($rows as $r) {
                fputcsv($out, array_map(fn ($c) => $c[2]($r), $cols));
            }
            fclose($out);
            exit;
        }

        $stats = self::stats();
        $pdf = new Pdf('Shipments — ' . Setting::get('store_name', 'NutValley'), 'landscape');
        $pdf->subtitle(sprintf(
            'Delivery partner: %s  |  Generated %s  |  %d shipment(s)',
            Delivery::providerLabel(), date('d M Y, H:i'), count($rows)
        ));
        $pdf->summary([
            'Awaiting booking' => $stats['awaiting'],
            'AWB booked'       => $stats['booked'],
            'In transit'       => $stats['in_transit'],
            'Delivered'        => $stats['delivered'],
        ]);
        $pdf->table(
            array_column($cols, 0),
            array_column($cols, 1),
            array_map(fn ($r) => array_map(fn ($c) => $c[2]($r), $cols), $rows)
        );
        $pdf->note('Amounts in INR. Shipment status is the courier\'s own last reported scan.');

        $body = $pdf->output();
        header('Content-Type: application/pdf');
        header('Content-Length: ' . strlen($body));
        echo $body;
        exit;
    }

    /** POST /api/admin/orders/{id}/ship — book the parcel with the courier. */
    public function ship(array $p): void
    {
        Auth::admin();
        $courierId = Request::input('courier_id');
        $res = Delivery::createShipment((int) $p['id'], $courierId ? (int) $courierId : null);
        if (!$res['ok']) {
            Response::error($res['message'], 422);
        }
        Response::success($res['data'], $res['message']);
    }

    /** GET /api/admin/orders/{id}/track — live courier scans (admin view). */
    public function track(array $p): void
    {
        Auth::admin();
        $res = Delivery::track((int) $p['id'], Request::query('force') === '1');
        if (!$res['ok']) {
            Response::error($res['error'] ?: 'Tracking unavailable', 422, ['events' => $res['events'] ?? []]);
        }
        Response::success($res);
    }

    /** POST /api/admin/orders/{id}/ship/cancel — cancel with the courier. */
    public function cancel(array $p): void
    {
        Auth::admin();
        $res = Delivery::cancelShipment((int) $p['id']);
        if (!$res['ok']) {
            Response::error($res['message'], 422);
        }
        Response::success(null, $res['message']);
    }

    /**
     * POST /api/admin/delivery/sync — refresh every in-flight shipment in one go.
     * Called by the admin "Sync now" button and by the cron runner.
     */
    public function sync(array $p): void
    {
        Auth::admin();
        Response::success(self::syncAll(), 'Shipments synced');
    }

    /**
     * Poll every order that is booked but not finished. Returns a small summary.
     * Public + static so CronController can reuse it without an admin session.
     */
    public static function syncAll(int $limit = 50): array
    {
        if (!Delivery::isConfigured()) {
            return ['synced' => 0, 'failed' => 0, 'skipped' => 'no delivery partner connected'];
        }
        try {
            $rows = db()->query(
                "SELECT id FROM orders
                 WHERE awb_code IS NOT NULL AND status NOT IN ('delivered','cancelled')
                 ORDER BY COALESCE(shipment_synced_at, '1970-01-01') ASC
                 LIMIT " . max(1, $limit)
            )->fetchAll(PDO::FETCH_COLUMN);
        } catch (\Throwable $e) {
            return ['synced' => 0, 'failed' => 0, 'error' => 'shipment columns missing — run migration 036'];
        }

        $ok = 0; $fail = 0;
        foreach ($rows as $id) {
            $r = Delivery::track((int) $id, true);
            $r['ok'] ? $ok++ : $fail++;
        }
        return ['synced' => $ok, 'failed' => $fail, 'checked' => count($rows)];
    }
}

<?php
/**
 * Delivery partner (courier API) client — no SDK, plain cURL.
 *
 * Credentials come from two layers, in this order:
 *   1. backend/.env — DELIVERY_API_KEY, DELIVERY_API_SECRET, DELIVERY_PROVIDER…
 *      A non-empty value here wins and locks the field in the admin form.
 *   2. the `settings` table — admin-editable at Admin → Delivery → Courier
 *      account, so a store owner can rotate keys without server access.
 * See self::cfg(). The cached Shiprocket bearer token is runtime state, not
 * config, so it always lives in `settings` and is never read from .env.
 *
 * Supported providers:
 *   ithink     — iThink Logistics (access_token + secret_key in the JSON body)
 *   shiprocket — aggregator (email + password -> bearer token, cached ~9 days)
 *   delhivery  — direct courier (plain API token)
 *   none       — manual mode: admin types carrier + tracking number by hand
 *
 * Every method returns an array shaped ['ok' => bool, ...] and never throws,
 * so a courier outage can never take the storefront or admin down.
 */
class Delivery
{
    const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external';
    const DELHIVERY_BASE  = 'https://track.delhivery.com';
    // Production is my.ithinklogistics.com. (api.ithinklogistics.com answers
    // order/track.json from an older deployment but routes nothing else, so it
    // looks "connected" while every other call fails — do not use it.)
    const ITHINK_BASE     = 'https://my.ithinklogistics.com/api_v3';
    const ITHINK_STAGING  = 'https://pre-alpha.ithinklogistics.com/api_v3';

    /** Providers this class can actually talk to. */
    const PROVIDERS = ['ithink', 'shiprocket', 'delhivery'];

    /** Settings keys that make up the partner config. */
    const CONFIG_KEYS = [
        'delivery_provider'        => 'none',
        'delivery_api_key'         => '',
        'delivery_api_secret'      => '',
        'delivery_email'           => '',
        'delivery_pickup_location' => 'Primary',
        'delivery_pickup_pincode'  => '',
        'delivery_auto_ship'       => '0',
        'delivery_default_weight'  => '0.5',
        'delivery_default_length'  => '15',
        'delivery_default_breadth' => '12',
        'delivery_default_height'  => '8',
        'delivery_channel_id'      => '',
        'delivery_sandbox'         => '0',
    ];

    // ===================== config =====================

    /**
     * Read one config value.
     *
     * backend/.env wins whenever it defines a non-empty value; otherwise the
     * admin-editable `settings` row is used. This is the same precedence the
     * rest of the app documents in .env.example ("inga value kudutha adhu
     * default-a override pannum"), so a server-managed deployment can pin its
     * courier keys in .env and a self-serve one can drive everything from the
     * dashboard. The env name is just the key upper-cased:
     * delivery_api_key -> DELIVERY_API_KEY.
     */
    public static function cfg(string $key, string $default = ''): string
    {
        $fromEnv = env(strtoupper($key));
        if ($fromEnv !== null && trim((string) $fromEnv) !== '') {
            return trim((string) $fromEnv);
        }
        $val = Setting::get($key, '');
        return ($val === null || $val === '') ? $default : (string) $val;
    }

    /** True when backend/.env pins this key, so the admin form cannot change it. */
    public static function isEnvLocked(string $key): bool
    {
        $v = env(strtoupper($key));
        return $v !== null && trim((string) $v) !== '';
    }

    /** Every config key currently pinned by .env. */
    public static function envLockedKeys(): array
    {
        return array_values(array_filter(array_keys(self::CONFIG_KEYS), fn ($k) => self::isEnvLocked($k)));
    }

    /** Full config as [key => value], defaults applied. */
    public static function config(): array
    {
        $out = [];
        foreach (self::CONFIG_KEYS as $key => $default) {
            $out[$key] = self::cfg($key, $default);
        }
        return $out;
    }

    public static function provider(): string
    {
        $p = strtolower(self::cfg('delivery_provider', 'none'));
        return in_array($p, self::PROVIDERS, true) ? $p : 'none';
    }

    /** Human-readable partner name, for emails and export headers. */
    public static function providerLabel(?string $p = null): string
    {
        return [
            'ithink'     => 'iThink Logistics',
            'shiprocket' => 'Shiprocket',
            'delhivery'  => 'Delhivery',
        ][$p ?? self::provider()] ?? 'Manual';
    }

    /** True when a provider is selected AND its credentials are filled in. */
    public static function isConfigured(): bool
    {
        $key    = self::cfg('delivery_api_key');
        $secret = self::cfg('delivery_api_secret');

        switch (self::provider()) {
            case 'ithink':
                // iThink signs every call with both an access token and a secret.
                return $key !== '' && $secret !== '';
            case 'shiprocket':
                return self::cfg('delivery_email') !== '' && $secret !== '';
            case 'delhivery':
                return $key !== '';
        }
        return false;
    }

    // ===================== HTTP =====================

    /**
     * One cURL round-trip. Returns ['ok'=>bool,'status'=>int,'body'=>array,'error'=>?string].
     * $body: array => JSON encoded, string => sent raw, null => no request body.
     */
    private static function http(string $method, string $url, array $headers = [], $body = null, int $timeout = 30): array
    {
        if (!function_exists('curl_init')) {
            return ['ok' => false, 'status' => 0, 'body' => [], 'error' => 'cURL extension is not enabled on this server'];
        }
        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => strtoupper($method),
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER     => array_merge(['Accept: application/json'], $headers),
        ];
        if ($body !== null) {
            $opts[CURLOPT_POSTFIELDS] = is_string($body) ? $body : json_encode($body);
        }
        curl_setopt_array($ch, $opts);
        $raw    = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err    = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return ['ok' => false, 'status' => 0, 'body' => [], 'error' => $err ?: 'Network error reaching the courier API'];
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $decoded = ['raw' => $raw];
        }
        $ok = $status >= 200 && $status < 300;
        return [
            'ok'     => $ok,
            'status' => $status,
            'body'   => $decoded,
            'error'  => $ok ? null : self::readError($decoded, $status),
        ];
    }

    /** Pull a human-readable message out of an assorted courier error payload. */
    private static function readError(array $body, int $status): string
    {
        foreach (['message', 'error', 'msg', 'detail'] as $k) {
            if (!empty($body[$k]) && is_string($body[$k])) {
                return $body[$k];
            }
        }
        if (!empty($body['errors'])) {
            $flat = [];
            array_walk_recursive($body['errors'], function ($v) use (&$flat) { $flat[] = (string) $v; });
            if ($flat) {
                return implode(' · ', array_slice($flat, 0, 3));
            }
        }
        return "Courier API returned HTTP $status";
    }

    // ===================== Shiprocket auth =====================

    /**
     * Bearer token for Shiprocket, cached in settings until it expires.
     * Returns ['ok'=>bool,'token'=>string,'error'=>?string].
     */
    public static function shiprocketToken(bool $force = false): array
    {
        $cached  = (string) Setting::get('delivery_token', '');
        $expires = (int) Setting::get('delivery_token_expires', '0');
        if (!$force && $cached !== '' && $expires > time() + 300) {
            return ['ok' => true, 'token' => $cached, 'error' => null];
        }

        $email    = self::cfg('delivery_email');
        $password = self::cfg('delivery_api_secret');
        if ($email === '' || $password === '') {
            return ['ok' => false, 'token' => '', 'error' => 'Shiprocket email / password not set'];
        }

        $res = self::http('POST', self::SHIPROCKET_BASE . '/auth/login',
            ['Content-Type: application/json'], ['email' => $email, 'password' => $password]);

        if (!$res['ok'] || empty($res['body']['token'])) {
            return ['ok' => false, 'token' => '', 'error' => $res['error'] ?: 'Shiprocket login failed — check the email and password'];
        }
        $token = (string) $res['body']['token'];
        Setting::set('delivery_token', $token);
        // Shiprocket tokens last 10 days; refresh a day early.
        Setting::set('delivery_token_expires', (string) (time() + 9 * 86400));
        return ['ok' => true, 'token' => $token, 'error' => null];
    }

    /** Authenticated Shiprocket call; retries once with a fresh token on 401. */
    private static function sr(string $method, string $path, $body = null, bool $retry = true): array
    {
        $auth = self::shiprocketToken();
        if (!$auth['ok']) {
            return ['ok' => false, 'status' => 0, 'body' => [], 'error' => $auth['error']];
        }
        $res = self::http($method, self::SHIPROCKET_BASE . $path, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $auth['token'],
        ], $body);

        if (!$res['ok'] && $res['status'] === 401 && $retry) {
            self::shiprocketToken(true);
            return self::sr($method, $path, $body, false);
        }
        return $res;
    }

    /**
     * Authenticated iThink Logistics call.
     *
     * iThink does not use auth headers: every request is a POST whose JSON body
     * is `{"data": { ...payload, access_token, secret_key }}`. A transport-level
     * 200 can still carry `status: "error"`, so that is unwrapped here and
     * surfaced the same way an HTTP failure would be.
     */
    private static function it(string $path, array $payload): array
    {
        $token  = self::cfg('delivery_api_key');
        $secret = self::cfg('delivery_api_secret');
        if ($token === '' || $secret === '') {
            return ['ok' => false, 'status' => 0, 'body' => [], 'error' => 'iThink access token / secret key not set'];
        }
        $base = self::cfg('delivery_sandbox', '0') === '1' ? self::ITHINK_STAGING : self::ITHINK_BASE;

        $res = self::http('POST', $base . $path, ['Content-Type: application/json'], [
            'data' => $payload + ['access_token' => $token, 'secret_key' => $secret],
        ]);
        if (!$res['ok']) {
            return $res;
        }

        // 200 + {"status":"error"} is still a failure.
        $status = strtolower((string) ($res['body']['status'] ?? 'success'));
        if ($status === 'error' || $status === 'failed') {
            $res['ok'] = false;
            $res['error'] = self::ithinkMessage($res['body']);
        }
        return $res;
    }

    /**
     * Best-effort human message out of an iThink envelope.
     *
     * iThink uses two distinct error shapes, and telling them apart matters:
     *   {"status":"error","status_code":200,"message":"..."}  -> the endpoint ran
     *   {"status":"error","html_message":"Invalid Request"}   -> the endpoint is
     *      not routed for these keys at all (an unknown path answers identically)
     * The second one reads as a payload bug but is really an account entitlement,
     * so it gets spelled out rather than passed through as "Invalid Request".
     */
    private static function ithinkMessage(array $body): string
    {
        // A real per-endpoint error: prefer it, it is the most specific.
        foreach (['message', 'remark', 'error'] as $k) {
            if (!empty($body[$k]) && is_string($body[$k])) {
                return trim(strip_tags($body[$k]));
            }
        }
        if (!empty($body['html_message']) && is_string($body['html_message'])) {
            $msg = trim(strip_tags($body['html_message']));
            if (strcasecmp($msg, 'Invalid Request') === 0) {
                return 'iThink returned "Invalid Request" — this API endpoint is not enabled '
                     . 'for your access token. Ask iThink support to enable it on your account.';
            }
            return $msg;
        }
        // Per-shipment errors are nested one level under data.
        foreach ((array) ($body['data'] ?? []) as $row) {
            if (is_array($row) && !empty($row['remark'])) {
                return is_array($row['remark']) ? implode(' · ', $row['remark']) : (string) $row['remark'];
            }
        }
        return 'iThink Logistics rejected the request';
    }

    /**
     * Pickup warehouses on the iThink account, as [['id','name','pincode','status'], …].
     * iThink names the label `company_name`, not `name`.
     */
    public static function ithinkWarehouses(): array
    {
        $res = self::it('/warehouse/get.json', []);
        if (!$res['ok']) {
            return [];
        }
        $out = [];
        foreach ((array) ($res['body']['data'] ?? []) as $w) {
            if (!is_array($w) || empty($w['id'])) {
                continue;
            }
            $out[] = [
                'id'      => (string) $w['id'],
                'name'    => (string) ($w['company_name'] ?? $w['name'] ?? $w['warehouse_name'] ?? ('Warehouse ' . $w['id'])),
                'pincode' => (string) ($w['pincode'] ?? ''),
                'status'  => (string) ($w['status'] ?? ''),
            ];
        }
        return $out;
    }

    /**
     * Resolve the configured pickup setting to the warehouse id order/add.json
     * needs. Accepts an id directly, or a warehouse name; when nothing is
     * configured and the account has exactly one warehouse, that one is used.
     * Returns ['id'=>?string,'error'=>?string].
     */
    private static function ithinkPickupId(string $configured): array
    {
        $configured = trim($configured);
        // 'Primary' is our generic cross-provider default, not a real iThink name.
        if (strcasecmp($configured, 'Primary') === 0) {
            $configured = '';
        }
        if ($configured !== '' && ctype_digit($configured)) {
            return ['id' => $configured, 'error' => null];
        }

        $list = self::ithinkWarehouses();
        if (!$list) {
            return ['id' => null, 'error' => 'No pickup warehouse found on your iThink account. Add one in the iThink panel first.'];
        }
        if ($configured === '') {
            if (count($list) === 1) {
                return ['id' => $list[0]['id'], 'error' => null];
            }
            return ['id' => null, 'error' => 'Set the pickup warehouse in Admin → Delivery. Available: '
                . implode(', ', array_map(fn ($w) => $w['name'] . ' (' . $w['id'] . ')', $list))];
        }
        foreach ($list as $w) {
            if (strcasecmp($w['name'], $configured) === 0) {
                return ['id' => $w['id'], 'error' => null];
            }
        }
        return ['id' => null, 'error' => "Pickup warehouse '$configured' not found on your iThink account. Available: "
            . implode(', ', array_map(fn ($w) => $w['name'] . ' (' . $w['id'] . ')', $list))];
    }

    /** First per-shipment row from an iThink `data` map, whatever its key is. */
    private static function ithinkFirstRow(array $body): array
    {
        $data = $body['data'] ?? [];
        if (!is_array($data)) {
            return [];
        }
        foreach ($data as $row) {
            if (is_array($row)) {
                return $row;
            }
        }
        return [];
    }

    /** Authenticated Delhivery call. */
    private static function dl(string $method, string $path, $body = null, array $extraHeaders = []): array
    {
        $key = self::cfg('delivery_api_key');
        if ($key === '') {
            return ['ok' => false, 'status' => 0, 'body' => [], 'error' => 'Delhivery API token not set'];
        }
        return self::http($method, self::DELHIVERY_BASE . $path,
            array_merge(['Authorization: Token ' . $key], $extraHeaders), $body);
    }

    // ===================== public operations =====================

    /**
     * Verify the saved credentials against the live courier API.
     * Returns ['ok'=>bool,'message'=>string,'details'=>array].
     */
    public static function testConnection(): array
    {
        $provider = self::provider();
        if ($provider === 'none') {
            return ['ok' => false, 'message' => 'No delivery partner selected — pick one first.', 'details' => []];
        }

        if ($provider === 'ithink') {
            $res = self::it('/warehouse/get.json', []);
            if (!$res['ok']) {
                return ['ok' => false, 'message' => $res['error'] ?: 'iThink rejected the access token / secret key', 'details' => []];
            }
            $wh = self::ithinkWarehouses();
            // Booking needs a warehouse id, so show "Name (id)" — that is exactly
            // what the pickup field wants.
            $names = array_map(fn ($w) => $w['name'] . ' (' . $w['id'] . ')', $wh);
            $approved = array_filter($wh, fn ($w) => strcasecmp($w['status'], 'Approved') === 0);

            $message = 'Connected to iThink Logistics — ' . count($wh) . ' warehouse(s) found';
            $message .= $approved ? '.' : '. None are Approved yet — booking will fail until iThink approves one.';
            return ['ok' => true, 'message' => $message, 'details' => ['pickup_locations' => $names]];
        }

        if ($provider === 'shiprocket') {
            $auth = self::shiprocketToken(true);
            if (!$auth['ok']) {
                return ['ok' => false, 'message' => $auth['error'], 'details' => []];
            }
            $res = self::sr('GET', '/settings/company/pickup');
            if (!$res['ok']) {
                return ['ok' => true, 'message' => 'Connected to Shiprocket (pickup locations unavailable: ' . $res['error'] . ')', 'details' => []];
            }
            $list = $res['body']['data']['shipping_address'] ?? [];
            $names = array_values(array_filter(array_map(
                fn ($l) => $l['pickup_location'] ?? null,
                is_array($list) ? $list : []
            )));
            return [
                'ok'      => true,
                'message' => 'Connected to Shiprocket — ' . count($names) . ' pickup location(s) found.',
                'details' => ['pickup_locations' => $names],
            ];
        }

        // Delhivery: a pincode lookup is the cheapest authenticated ping.
        $pin = self::cfg('delivery_pickup_pincode') ?: '110001';
        $res = self::dl('GET', '/c/api/pin-codes/json/?filter_codes=' . urlencode($pin));
        if (!$res['ok']) {
            return ['ok' => false, 'message' => $res['error'] ?: 'Delhivery rejected the API token', 'details' => []];
        }
        return ['ok' => true, 'message' => 'Connected to Delhivery — API token accepted.', 'details' => []];
    }

    /**
     * Live serviceability + rate + ETA for a destination pincode.
     * Returns ['ok'=>bool,'serviceable'=>?bool,'couriers'=>[...],'eta'=>?string,'rate'=>?float].
     */
    public static function serviceability(string $destPin, bool $cod = false, float $weight = 0.5): array
    {
        $miss = ['ok' => false, 'serviceable' => null, 'couriers' => [], 'eta' => null, 'rate' => null];
        $provider = self::provider();
        $pickup   = self::cfg('delivery_pickup_pincode');

        if ($provider === 'none' || !self::isConfigured()) {
            return $miss + ['error' => 'No delivery partner connected'];
        }

        if ($provider === 'ithink') {
            $res = self::it('/pincode/check.json', ['pincode' => $destPin]);
            if (!$res['ok']) {
                return $miss + ['error' => $res['error']];
            }
            // Shape: data[<pincode>] holds city/state/remark plus ONE KEY PER
            // COURIER ("Delhivery", "Xpressbees", …), each an object of flags.
            $row = $res['body']['data'][$destPin] ?? self::ithinkFirstRow($res['body']);
            if (!is_array($row)) {
                return $miss + ['error' => 'Unexpected response from iThink'];
            }
            $meta = ['remark', 'state_name', 'city_name', 'city_id', 'state_id', 'status', 'message'];

            $couriers = [];
            foreach ($row as $name => $info) {
                if (in_array($name, $meta, true) || !is_array($info)) {
                    continue;
                }
                $prepaid = strtoupper((string) ($info['prepaid'] ?? 'N')) === 'Y';
                $codOk   = strtoupper((string) ($info['cod'] ?? 'N')) === 'Y';
                // Only offer couriers that can actually carry this payment mode.
                if ($cod ? !$codOk : !$prepaid) {
                    continue;
                }
                $couriers[] = [
                    'id'   => null,
                    'name' => (string) $name,
                    'rate' => null, // rates come from /rate/check.json, not this call
                    'days' => null,
                    'eta'  => null,
                    'cod'  => $codOk,
                    'mode' => (string) ($info['mode'] ?? ''),
                ];
            }

            // "Expected delivery on 2026-09-09"
            $eta = null;
            if (!empty($row['remark']) && preg_match('/(\d{4}-\d{2}-\d{2})/', (string) $row['remark'], $m)) {
                $eta = $m[1];
            }

            return [
                'ok'          => true,
                'serviceable' => count($couriers) > 0,
                'couriers'    => array_slice($couriers, 0, 10),
                'eta'         => $eta,
                'rate'        => null,
                'city'        => $row['city_name'] ?? null,
                'state'       => $row['state_name'] ?? null,
                'error'       => null,
            ];
        }

        if ($provider === 'shiprocket') {
            if ($pickup === '') {
                return $miss + ['error' => 'Pickup pincode not set in Delivery settings'];
            }
            $q = http_build_query([
                'pickup_postcode'   => $pickup,
                'delivery_postcode' => $destPin,
                'cod'               => $cod ? 1 : 0,
                'weight'            => $weight,
            ]);
            $res = self::sr('GET', '/courier/serviceability/?' . $q);
            if (!$res['ok']) {
                return $miss + ['error' => $res['error']];
            }
            $rows = $res['body']['data']['available_courier_companies'] ?? [];
            $couriers = array_map(fn ($c) => [
                'id'   => $c['courier_company_id'] ?? null,
                'name' => $c['courier_name'] ?? '',
                'rate' => isset($c['rate']) ? (float) $c['rate'] : null,
                'days' => $c['estimated_delivery_days'] ?? null,
                'eta'  => $c['etd'] ?? null,
                'cod'  => (int) ($c['cod'] ?? 0) === 1,
            ], is_array($rows) ? $rows : []);
            usort($couriers, fn ($a, $b) => ($a['rate'] ?? 1e9) <=> ($b['rate'] ?? 1e9));
            return [
                'ok'          => true,
                'serviceable' => count($couriers) > 0,
                'couriers'    => array_slice($couriers, 0, 10),
                'eta'         => $couriers[0]['eta'] ?? null,
                'rate'        => $couriers[0]['rate'] ?? null,
                'error'       => null,
            ];
        }

        // Delhivery
        $res = self::dl('GET', '/c/api/pin-codes/json/?filter_codes=' . urlencode($destPin));
        if (!$res['ok']) {
            return $miss + ['error' => $res['error']];
        }
        $pc = $res['body']['delivery_codes'][0]['postal_code'] ?? null;
        $serviceable = is_array($pc);
        return [
            'ok'          => true,
            'serviceable' => $serviceable,
            'couriers'    => $serviceable ? [[
                'id'   => null,
                'name' => 'Delhivery',
                'rate' => null,
                'days' => null,
                'eta'  => null,
                'cod'  => strtoupper((string) ($pc['cod'] ?? 'N')) === 'Y',
            ]] : [],
            'eta'   => null,
            'rate'  => null,
            'error' => null,
        ];
    }

    /**
     * Push an order to the courier and book an AWB.
     * Writes the returned AWB / courier / label back onto the order row.
     * Returns ['ok'=>bool,'message'=>string,'data'=>array].
     */
    public static function createShipment(int $orderId, ?int $courierId = null): array
    {
        if (!self::isConfigured()) {
            return ['ok' => false, 'message' => 'No delivery partner connected. Admin → Settings → Delivery partner.', 'data' => []];
        }

        $db = db();
        $stmt = $db->prepare(
            'SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
             FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?'
        );
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            return ['ok' => false, 'message' => 'Order not found', 'data' => []];
        }
        if (!empty($order['awb_code'])) {
            return ['ok' => false, 'message' => 'This order already has AWB ' . $order['awb_code'], 'data' => []];
        }

        $items = $db->prepare('SELECT product_name, size, color, price, quantity, product_id FROM order_items WHERE order_id=?');
        $items->execute([$orderId]);
        $lines = $items->fetchAll();
        if (!$lines) {
            return ['ok' => false, 'message' => 'Order has no items', 'data' => []];
        }

        $addr = json_decode($order['shipping_address'] ?? 'null', true) ?: [];
        $missing = [];
        foreach (['line1' => 'address', 'city' => 'city', 'state' => 'state', 'pincode' => 'pincode'] as $k => $label) {
            if (trim((string) ($addr[$k] ?? '')) === '') {
                $missing[] = $label;
            }
        }
        if ($missing) {
            return ['ok' => false, 'message' => 'Shipping address is missing: ' . implode(', ', $missing), 'data' => []];
        }

        // Courier-side rules, checked here so the admin gets a precise, actionable
        // message naming the order instead of a raw API rejection after a round-trip.
        $street = trim((string) $addr['line1'] . ' ' . (string) ($addr['line2'] ?? ''));
        $phone  = preg_replace('/\D/', '', (string) ($addr['phone'] ?? $order['customer_phone'] ?? ''));
        $pin    = preg_replace('/\D/', '', (string) $addr['pincode']);
        $bad    = [];
        if (mb_strlen($street) < 10) {
            $bad[] = 'street address is too short (' . mb_strlen($street) . ' chars, needs 10+)';
        }
        if (strlen($pin) !== 6) {
            $bad[] = 'pincode must be exactly 6 digits';
        }
        if (strlen($phone) < 10) {
            $bad[] = 'phone must have at least 10 digits';
        }
        if ($bad) {
            return ['ok' => false, 'data' => [], 'message' =>
                'Cannot book ' . $order['order_number'] . ' — ' . implode('; ', $bad)
                . '. Fix the delivery address on the order, then book again.'];
        }

        $cfg   = self::config();
        $units = max(1, array_sum(array_map(fn ($l) => (int) $l['quantity'], $lines)));
        // Per-unit default weight, so a 4-item parcel is not billed as a 1-item one.
        $weight = max(0.05, (float) $cfg['delivery_default_weight'] * $units);
        $isCod  = $order['payment_method'] === 'cod' && $order['payment_status'] !== 'paid';

        switch (self::provider()) {
            case 'ithink':
                $result = self::ithinkCreate($order, $lines, $addr, $cfg, $weight, $isCod);
                break;
            case 'shiprocket':
                $result = self::shiprocketCreate($order, $lines, $addr, $cfg, $weight, $isCod, $courierId);
                break;
            default:
                $result = self::delhiveryCreate($order, $lines, $addr, $cfg, $weight, $isCod);
        }

        if (!$result['ok']) {
            return $result;
        }

        $d = $result['data'];
        $db->prepare(
            'UPDATE orders SET delivery_provider=?, shipment_id=?, shipment_order_id=?, awb_code=?,
                    courier_name=?, shipment_status=?, shipment_eta=?, label_url=?, tracking_url=?,
                    carrier=?, tracking_number=?, shipment_synced_at=NOW()
             WHERE id=?'
        )->execute([
            self::provider(),
            $d['shipment_id'] ?? null,
            $d['shipment_order_id'] ?? null,
            $d['awb_code'] ?? null,
            $d['courier_name'] ?? null,
            $d['status'] ?? 'Booked',
            $d['eta'] ?? null,
            $d['label_url'] ?? null,
            $d['tracking_url'] ?? null,
            // Mirror into the legacy manual columns so every existing screen,
            // invoice and status email keeps working unchanged.
            $d['courier_name'] ?? null,
            $d['awb_code'] ?? null,
            $orderId,
        ]);

        self::logEvent($orderId, $d['awb_code'] ?? null, $d['status'] ?? 'Booked',
            'Shipment booked with ' . ($d['courier_name'] ?: 'courier'), null, date('Y-m-d H:i:s'));

        return ['ok' => true, 'message' => 'Shipment booked — AWB ' . ($d['awb_code'] ?: 'pending'), 'data' => $d];
    }

    /**
     * iThink Logistics: POST /order/add.json books the parcel and returns the
     * waybill plus the courier iThink picked for it, in one call.
     */
    private static function ithinkCreate(array $order, array $lines, array $addr, array $cfg, float $weight, bool $isCod): array
    {
        $phone = preg_replace('/\D/', '', (string) ($addr['phone'] ?? $order['customer_phone'] ?? ''));
        $shipment = [
            'waybill'                     => '',
            'order'                       => (string) $order['order_number'],
            'sub_order'                   => '',
            'order_date'                  => date('Y-m-d H:i', strtotime($order['placed_at'] ?: 'now')),
            'total_amount'                => (string) $order['total'],
            'name'                        => (string) ($addr['full_name'] ?? $order['customer_name'] ?? 'Customer'),
            'company_name'                => '',
            'add'                         => (string) $addr['line1'],
            'add2'                        => (string) ($addr['line2'] ?? ''),
            'add3'                        => '',
            'pin'                         => (string) $addr['pincode'],
            'city'                        => (string) $addr['city'],
            'state'                       => (string) $addr['state'],
            'country'                     => 'India',
            'phone'                       => $phone,
            'alt_phone'                   => '',
            'email'                       => (string) ($order['customer_email'] ?? ''),
            'is_billing_same_as_shipping' => 'yes',
            'products'                    => array_map(fn ($l) => [
                'product_name'     => (string) $l['product_name'],
                'product_sku'      => 'BB-' . ($l['product_id'] ?: '0') . ($l['size'] ? '-' . $l['size'] : ''),
                'product_quantity' => (string) (int) $l['quantity'],
                'product_price'    => (string) $l['price'],
                'product_tax_rate' => '',
                'product_hsn_code' => '',
                'product_discount' => '',
            ], $lines),
            // iThink expects centimetres and KILOGRAMS (hard cap 150kg), unlike
            // Delhivery's raw API which wants grams.
            'shipment_length'      => (string) $cfg['delivery_default_length'],
            'shipment_width'       => (string) $cfg['delivery_default_breadth'],
            'shipment_height'      => (string) $cfg['delivery_default_height'],
            'weight'               => number_format(min(150, max(0.01, $weight)), 2, '.', ''),
            'shipping_charges'     => (string) $order['shipping_fee'],
            'giftwrap_charges'     => '0',
            'transaction_charges'  => '0',
            'total_discount'       => (string) $order['discount'],
            'first_attemp_discount'=> '0',
            'cod_amount'           => $isCod ? (string) $order['total'] : '0',
            'payment_mode'         => $isCod ? 'COD' : 'Prepaid',
            'reseller_name'        => Setting::get('store_name', 'NutValley'),
            'eway_bill_number'     => '',
            'gst_number'           => '',
            'what3words'           => '',
        ];

        // order/add.json takes the pickup warehouse as an ID beside `shipments`
        // (not a name inside a pickup_address array).
        $pickup = self::ithinkPickupId((string) $cfg['delivery_pickup_location']);
        if (!$pickup['id']) {
            return ['ok' => false, 'message' => $pickup['error'], 'data' => []];
        }
        // Returns go back to the pickup warehouse unless a separate one is set.
        $shipment['return_address_id'] = trim((string) $cfg['delivery_channel_id']) ?: $pickup['id'];

        $res = self::it('/order/add.json', [
            'shipments'         => [$shipment],
            'pickup_address_id' => $pickup['id'],
            // Required by order/add.json even when empty. Blank lets iThink pick
            // the courier and service; set delivery_channel_id-style overrides
            // only if the account needs a specific carrier.
            'logistics'         => '',
            's_type'            => '',
            'order_type'        => '',
        ]);
        if (!$res['ok']) {
            return ['ok' => false, 'message' => $res['error'] ?: 'iThink rejected the shipment', 'data' => []];
        }

        $row = self::ithinkFirstRow($res['body']);
        $awb = trim((string) ($row['waybill'] ?? ''));
        if ($awb === '') {
            $remark = $row['remark'] ?? 'iThink did not return a waybill';
            return ['ok' => false, 'message' => is_array($remark) ? implode(' · ', $remark) : (string) $remark, 'data' => []];
        }

        $courier = (string) ($row['logistic_name'] ?? 'iThink Logistics');
        return ['ok' => true, 'message' => 'Booked', 'data' => [
            'shipment_id'       => (string) ($row['refnum'] ?? $awb),
            'shipment_order_id' => (string) ($row['order_id'] ?? $order['order_number']),
            'awb_code'          => $awb,
            'courier_name'      => $courier,
            'status'            => 'Booked',
            'eta'               => null,
            'label_url'         => $row['label'] ?? null,
            'tracking_url'      => 'https://ithinklogistics.co.in/track/' . rawurlencode($awb),
        ]];
    }

    /** iThink Logistics: POST /order/track.json returns the full scan history. */
    private static function ithinkTrack(string $awb): array
    {
        $res = self::it('/order/track.json', ['awb_number_list' => $awb]);
        if (!$res['ok']) {
            return ['ok' => false, 'error' => $res['error'], 'status' => null, 'eta' => null, 'events' => []];
        }
        $row = $res['body']['data'][$awb] ?? self::ithinkFirstRow($res['body']);
        if (!$row || !is_array($row)) {
            return ['ok' => false, 'error' => 'iThink has no data for this waybill yet', 'status' => null, 'eta' => null, 'events' => []];
        }

        // Full history lives in order_details.scan_details; last_scan_details is
        // only the newest entry, used as a fallback when the array is absent.
        $scans = $row['scan_details'] ?? ($row['order_details']['scan_details'] ?? []);
        if (!$scans && !empty($row['last_scan_details']) && is_array($row['last_scan_details'])) {
            $scans = [$row['last_scan_details']];
        }

        $events = array_map(fn ($s) => [
            'status'   => (string) ($s['status'] ?? 'Update'),
            // `remark` is the human line; `status_reason` explains a failed attempt.
            'activity' => trim((string) ($s['remark'] ?? '') . (
                !empty($s['status_reason']) ? ' — ' . $s['status_reason'] : ''
            )),
            'location' => (string) ($s['scan_location'] ?? ''),
            'event_at' => !empty($s['scan_date_time'] ?? $s['status_date_time'] ?? null)
                ? date('Y-m-d H:i:s', strtotime((string) ($s['scan_date_time'] ?? $s['status_date_time'])))
                : null,
        ], is_array($scans) ? $scans : []);

        $edd = $row['expected_delivery_date'] ?? null;

        return [
            'ok'      => true,
            'error'   => null,
            'status'  => (string) ($row['current_status'] ?? ''),
            'eta'     => $edd ? date('Y-m-d', strtotime((string) $edd)) : null,
            'courier' => $row['logistic'] ?? null,
            'events'  => $events,
        ];
    }

    /** Shiprocket: create adhoc order, then assign an AWB, then fetch the label. */
    private static function shiprocketCreate(array $order, array $lines, array $addr, array $cfg, float $weight, bool $isCod, ?int $courierId): array
    {
        $name  = trim((string) ($addr['full_name'] ?? $order['customer_name'] ?? 'Customer'));
        $parts = preg_split('/\s+/', $name, 2);

        $payload = [
            'order_id'              => $order['order_number'],
            'order_date'            => date('Y-m-d H:i', strtotime($order['placed_at'] ?: 'now')),
            'pickup_location'       => $cfg['delivery_pickup_location'] ?: 'Primary',
            'billing_customer_name' => $parts[0] ?: 'Customer',
            'billing_last_name'     => $parts[1] ?? '',
            'billing_address'       => (string) $addr['line1'],
            'billing_address_2'     => (string) ($addr['line2'] ?? ''),
            'billing_city'          => (string) $addr['city'],
            'billing_pincode'       => (string) $addr['pincode'],
            'billing_state'         => (string) $addr['state'],
            'billing_country'       => 'India',
            'billing_email'         => (string) ($order['customer_email'] ?? ''),
            'billing_phone'         => preg_replace('/\D/', '', (string) ($addr['phone'] ?? $order['customer_phone'] ?? '')),
            'shipping_is_billing'   => true,
            'order_items'           => array_map(fn ($l) => [
                'name'          => $l['product_name'],
                'sku'           => 'BB-' . ($l['product_id'] ?: '0') . ($l['size'] ? '-' . $l['size'] : ''),
                'units'         => (int) $l['quantity'],
                'selling_price' => (float) $l['price'],
            ], $lines),
            'payment_method'        => $isCod ? 'COD' : 'Prepaid',
            'shipping_charges'      => (float) $order['shipping_fee'],
            'total_discount'        => (float) $order['discount'],
            'sub_total'             => (float) $order['total'],
            'length'                => (float) $cfg['delivery_default_length'],
            'breadth'               => (float) $cfg['delivery_default_breadth'],
            'height'                => (float) $cfg['delivery_default_height'],
            'weight'                => $weight,
        ];
        if ($cfg['delivery_channel_id'] !== '') {
            $payload['channel_id'] = $cfg['delivery_channel_id'];
        }

        $create = self::sr('POST', '/orders/create/adhoc', $payload);
        if (!$create['ok'] || empty($create['body']['shipment_id'])) {
            return ['ok' => false, 'message' => $create['error'] ?: 'Shiprocket rejected the order', 'data' => []];
        }
        $shipmentId = (string) $create['body']['shipment_id'];
        $srOrderId  = (string) ($create['body']['order_id'] ?? '');

        $awbBody = ['shipment_id' => $shipmentId];
        if ($courierId) {
            $awbBody['courier_id'] = $courierId;
        }
        $awbRes  = self::sr('POST', '/courier/assign/awb', $awbBody);
        $awbData = $awbRes['body']['response']['data'] ?? [];
        $awb     = $awbData['awb_code'] ?? null;

        if (!$awb) {
            // The order exists at Shiprocket but no courier was assigned — keep the
            // shipment id so the admin can retry AWB assignment instead of duplicating.
            return ['ok' => true, 'message' => 'Order created, AWB pending', 'data' => [
                'shipment_id'       => $shipmentId,
                'shipment_order_id' => $srOrderId,
                'awb_code'          => null,
                'courier_name'      => $awbData['courier_name'] ?? null,
                'status'            => 'AWB pending',
                'eta'               => null,
                'label_url'         => null,
                'tracking_url'      => null,
            ]];
        }

        $label = self::sr('POST', '/courier/generate/label', ['shipment_id' => [$shipmentId]]);

        return ['ok' => true, 'message' => 'Booked', 'data' => [
            'shipment_id'       => $shipmentId,
            'shipment_order_id' => $srOrderId,
            'awb_code'          => (string) $awb,
            'courier_name'      => $awbData['courier_name'] ?? null,
            'status'            => 'Booked',
            'eta'               => null,
            'label_url'         => $label['body']['label_url'] ?? null,
            'tracking_url'      => 'https://shiprocket.co/tracking/' . rawurlencode((string) $awb),
        ]];
    }

    /** Delhivery: single-shipment CMU create (waybill allotted by Delhivery). */
    private static function delhiveryCreate(array $order, array $lines, array $addr, array $cfg, float $weight, bool $isCod): array
    {
        $desc = implode(', ', array_map(fn ($l) => $l['product_name'] . ' x' . (int) $l['quantity'], array_slice($lines, 0, 5)));
        $shipment = [
            'name'            => (string) ($addr['full_name'] ?? $order['customer_name'] ?? 'Customer'),
            'add'             => trim($addr['line1'] . ' ' . (string) ($addr['line2'] ?? '')),
            'pin'             => (string) $addr['pincode'],
            'city'            => (string) $addr['city'],
            'state'           => (string) $addr['state'],
            'country'         => 'India',
            'phone'           => preg_replace('/\D/', '', (string) ($addr['phone'] ?? $order['customer_phone'] ?? '')),
            'order'           => (string) $order['order_number'],
            'payment_mode'    => $isCod ? 'COD' : 'Prepaid',
            'cod_amount'      => $isCod ? (string) $order['total'] : '0',
            'total_amount'    => (string) $order['total'],
            'products_desc'   => $desc,
            'quantity'        => (string) array_sum(array_map(fn ($l) => (int) $l['quantity'], $lines)),
            'weight'          => (string) ($weight * 1000), // Delhivery expects grams
            'shipment_width'  => (string) $cfg['delivery_default_breadth'],
            'shipment_height' => (string) $cfg['delivery_default_height'],
            'seller_name'     => Setting::get('store_name', 'NutValley'),
        ];
        $data = [
            'shipments'       => [$shipment],
            'pickup_location' => ['name' => $cfg['delivery_pickup_location'] ?: 'Primary'],
        ];
        $form = 'format=json&data=' . urlencode(json_encode($data));

        $res = self::dl('POST', '/api/cmu/create.json', $form, ['Content-Type: application/x-www-form-urlencoded']);
        if (!$res['ok']) {
            return ['ok' => false, 'message' => $res['error'] ?: 'Delhivery rejected the shipment', 'data' => []];
        }
        $pkg = $res['body']['packages'][0] ?? null;
        if (!$pkg || empty($pkg['waybill'])) {
            $why = $res['body']['rmk'] ?? ($pkg['remarks'] ?? 'Delhivery did not return a waybill');
            return ['ok' => false, 'message' => is_array($why) ? implode(' · ', $why) : (string) $why, 'data' => []];
        }
        $awb = (string) $pkg['waybill'];
        return ['ok' => true, 'message' => 'Booked', 'data' => [
            'shipment_id'       => $awb,
            'shipment_order_id' => (string) $order['order_number'],
            'awb_code'          => $awb,
            'courier_name'      => 'Delhivery',
            'status'            => (string) ($pkg['status'] ?? 'Booked'),
            'eta'               => null,
            'label_url'         => null,
            'tracking_url'      => 'https://www.delhivery.com/track/package/' . rawurlencode($awb),
        ]];
    }

    /**
     * Poll the courier for the live scan history of one order and persist it.
     * Returns ['ok'=>bool,'status'=>?string,'eta'=>?string,'events'=>[...]].
     */
    public static function track(int $orderId, bool $force = false): array
    {
        $db = db();
        $stmt = $db->prepare(
            'SELECT id, awb_code, delivery_provider, shipment_status, shipment_eta, tracking_url,
                    shipment_synced_at, status
             FROM orders WHERE id=?'
        );
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            return ['ok' => false, 'error' => 'Order not found', 'events' => []];
        }
        if (empty($order['awb_code'])) {
            return ['ok' => false, 'error' => 'No AWB booked for this order yet', 'events' => self::events($orderId)];
        }

        // Throttle live polls to once a minute; the stored timeline is served in between,
        // so a page that refreshes every few seconds never hammers the courier API.
        $synced = $order['shipment_synced_at'] ? strtotime($order['shipment_synced_at']) : 0;
        if (!$force && $synced > time() - 60) {
            return [
                'ok'           => true,
                'cached'       => true,
                'status'       => $order['shipment_status'],
                'eta'          => $order['shipment_eta'],
                'tracking_url' => $order['tracking_url'],
                'events'       => self::events($orderId),
            ];
        }

        // Track with whichever partner actually booked the parcel, not the one
        // currently selected — a switched provider must not orphan live shipments.
        $provider = $order['delivery_provider'] ?: self::provider();
        switch ($provider) {
            case 'ithink':
                $live = self::ithinkTrack((string) $order['awb_code']);
                break;
            case 'delhivery':
                $live = self::delhiveryTrack((string) $order['awb_code']);
                break;
            default:
                $live = self::shiprocketTrack((string) $order['awb_code']);
        }

        if (!$live['ok']) {
            return [
                'ok'           => false,
                'error'        => $live['error'],
                'status'       => $order['shipment_status'],
                'eta'          => $order['shipment_eta'],
                'tracking_url' => $order['tracking_url'],
                'events'       => self::events($orderId),
            ];
        }

        foreach ($live['events'] as $ev) {
            self::logEvent($orderId, (string) $order['awb_code'], $ev['status'], $ev['activity'], $ev['location'], $ev['event_at']);
        }

        $db->prepare('UPDATE orders SET shipment_status=?, shipment_eta=COALESCE(?, shipment_eta), shipment_synced_at=NOW() WHERE id=?')
           ->execute([$live['status'] ?: $order['shipment_status'], $live['eta'], $orderId]);

        // Mirror the courier state onto the order lifecycle so the customer's order
        // page, the admin dashboard counters and the status emails all agree.
        self::syncOrderStatus($orderId, (string) $order['status'], (string) $live['status']);

        return [
            'ok'           => true,
            'cached'       => false,
            'status'       => $live['status'],
            'eta'          => $live['eta'],
            'tracking_url' => $order['tracking_url'],
            'events'       => self::events($orderId),
        ];
    }

    private static function shiprocketTrack(string $awb): array
    {
        $res = self::sr('GET', '/courier/track/awb/' . rawurlencode($awb));
        if (!$res['ok']) {
            return ['ok' => false, 'error' => $res['error'], 'status' => null, 'eta' => null, 'events' => []];
        }
        $data       = $res['body']['tracking_data'] ?? [];
        $activities = $data['shipment_track_activities'] ?? [];
        $head       = $data['shipment_track'][0] ?? [];

        $events = array_map(fn ($a) => [
            'status'   => (string) ($a['status'] ?? $a['sr-status-label'] ?? 'Update'),
            'activity' => (string) ($a['activity'] ?? ''),
            'location' => (string) ($a['location'] ?? ''),
            'event_at' => !empty($a['date']) ? date('Y-m-d H:i:s', strtotime($a['date'])) : null,
        ], is_array($activities) ? $activities : []);

        return [
            'ok'     => true,
            'error'  => null,
            'status' => (string) ($head['current_status'] ?? ($events[0]['status'] ?? '')),
            'eta'    => !empty($head['edd']) ? date('Y-m-d', strtotime($head['edd'])) : null,
            'events' => $events,
        ];
    }

    private static function delhiveryTrack(string $awb): array
    {
        $res = self::dl('GET', '/api/v1/packages/json/?waybill=' . rawurlencode($awb));
        if (!$res['ok']) {
            return ['ok' => false, 'error' => $res['error'], 'status' => null, 'eta' => null, 'events' => []];
        }
        $ship = $res['body']['ShipmentData'][0]['Shipment'] ?? null;
        if (!$ship) {
            return ['ok' => false, 'error' => 'Delhivery has no data for this waybill yet', 'status' => null, 'eta' => null, 'events' => []];
        }
        $scans = $ship['Scans'] ?? [];
        $events = array_map(function ($s) {
            $d = $s['ScanDetail'] ?? $s;
            return [
                'status'   => (string) ($d['Scan'] ?? 'Update'),
                'activity' => (string) ($d['Instructions'] ?? ''),
                'location' => (string) ($d['ScannedLocation'] ?? ''),
                'event_at' => !empty($d['ScanDateTime']) ? date('Y-m-d H:i:s', strtotime($d['ScanDateTime'])) : null,
            ];
        }, is_array($scans) ? $scans : []);

        return [
            'ok'     => true,
            'error'  => null,
            'status' => (string) ($ship['Status']['Status'] ?? ''),
            'eta'    => !empty($ship['ExpectedDeliveryDate']) ? date('Y-m-d', strtotime($ship['ExpectedDeliveryDate'])) : null,
            'events' => $events,
        ];
    }

    /** Cancel a booked shipment with the courier. */
    public static function cancelShipment(int $orderId): array
    {
        $db = db();
        $stmt = $db->prepare('SELECT awb_code, shipment_order_id, delivery_provider FROM orders WHERE id=?');
        $stmt->execute([$orderId]);
        $o = $stmt->fetch();
        if (!$o || empty($o['awb_code'])) {
            return ['ok' => false, 'message' => 'No shipment booked for this order'];
        }
        $provider = $o['delivery_provider'] ?: self::provider();

        if ($provider === 'ithink') {
            $res = self::it('/order/cancel.json', ['awb_numbers' => (string) $o['awb_code']]);
        } elseif ($provider === 'shiprocket') {
            $res = self::sr('POST', '/orders/cancel', ['ids' => [$o['shipment_order_id']]]);
        } else {
            $res = self::dl('POST', '/api/p/edit', ['waybill' => $o['awb_code'], 'cancellation' => 'true'],
                ['Content-Type: application/json']);
        }
        if (!$res['ok']) {
            return ['ok' => false, 'message' => $res['error'] ?: 'Courier refused the cancellation'];
        }

        $db->prepare(
            'UPDATE orders SET shipment_status=?, shipment_synced_at=NOW(), awb_code=NULL, shipment_id=NULL,
                    label_url=NULL, tracking_url=NULL, tracking_number=NULL WHERE id=?'
        )->execute(['Cancelled', $orderId]);
        self::logEvent($orderId, (string) $o['awb_code'], 'Cancelled', 'Shipment cancelled from admin', null, date('Y-m-d H:i:s'));
        return ['ok' => true, 'message' => 'Shipment cancelled with the courier'];
    }

    // ===================== events / status =====================

    /** Insert one scan, ignoring duplicates from repeated polls. */
    private static function logEvent(int $orderId, ?string $awb, string $status, ?string $activity, ?string $location, ?string $eventAt): void
    {
        $fp = sha1($status . '|' . (string) $activity . '|' . (string) $eventAt);
        try {
            db()->prepare(
                'INSERT IGNORE INTO shipment_events (order_id, awb_code, status, activity, location, event_at, fingerprint)
                 VALUES (?,?,?,?,?,?,?)'
            )->execute([
                $orderId, $awb, mb_substr($status, 0, 120),
                $activity ? mb_substr($activity, 0, 255) : null,
                $location ? mb_substr($location, 0, 160) : null,
                $eventAt, $fp,
            ]);
        } catch (\Throwable $e) {}
    }

    /** Stored scan timeline for an order, newest first. */
    public static function events(int $orderId): array
    {
        try {
            $s = db()->prepare(
                'SELECT status, activity, location, event_at, created_at FROM shipment_events
                 WHERE order_id=? ORDER BY COALESCE(event_at, created_at) DESC, id DESC LIMIT 60'
            );
            $s->execute([$orderId]);
            return $s->fetchAll();
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** Map a raw courier status string onto our order lifecycle enum. */
    public static function mapStatus(string $courierStatus): ?string
    {
        $s = strtolower($courierStatus);
        if ($s === '') {
            return null;
        }
        if (str_contains($s, 'deliver') && !str_contains($s, 'undeliver') && !str_contains($s, 'out for')) {
            return 'delivered';
        }
        if (str_contains($s, 'rto') || str_contains($s, 'cancel')) {
            return 'cancelled';
        }
        foreach (['out for delivery', 'in transit', 'transit', 'shipped', 'dispatch', 'picked'] as $needle) {
            if (str_contains($s, $needle)) {
                return 'shipped';
            }
        }
        if (str_contains($s, 'pickup') || str_contains($s, 'manifest') || str_contains($s, 'pack')) {
            return 'packed';
        }
        return null;
    }

    /**
     * Move the order's own status forward when the courier reports progress.
     * Only ever moves forward, and never overrides an already-cancelled order.
     */
    private static function syncOrderStatus(int $orderId, string $current, string $courierStatus): void
    {
        $mapped = self::mapStatus($courierStatus);
        if (!$mapped || $mapped === $current || $current === 'cancelled') {
            return;
        }
        $rank = ['pending' => 0, 'processing' => 1, 'packed' => 2, 'shipped' => 3, 'delivered' => 4, 'cancelled' => 5];
        if ($mapped !== 'cancelled' && ($rank[$mapped] ?? 0) <= ($rank[$current] ?? 0)) {
            return;
        }
        try {
            db()->prepare('UPDATE orders SET status=? WHERE id=?')->execute([$mapped, $orderId]);
            if ($mapped === 'delivered') {
                db()->prepare("UPDATE orders SET payment_status='paid' WHERE id=? AND payment_method='cod'")->execute([$orderId]);
                try { Automation::onDelivered($orderId); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) {}
    }
}

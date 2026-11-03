<?php
/**
 * Admin view & control over the loyalty programme.
 *   - index:  every customer's point balance + programme totals
 *   - show:   one customer's full transaction history
 *   - adjust: manually credit or debit a customer's points (recorded as 'adjust')
 */
class AdminLoyaltyController
{
    /** GET /api/admin/loyalty — all customers ranked by point balance + KPIs. */
    public function index(array $p): void
    {
        Auth::admin();
        $db = db();

        $rows = $db->query(
            "SELECT u.id, u.name, u.email, u.loyalty_points,
                    (SELECT COALESCE(SUM(points),0) FROM loyalty_transactions t
                       WHERE t.user_id = u.id AND t.points > 0)                       AS total_earned,
                    (SELECT COALESCE(-SUM(points),0) FROM loyalty_transactions t
                       WHERE t.user_id = u.id AND t.points < 0)                       AS total_redeemed
             FROM users u
             WHERE u.role <> 'admin'
             ORDER BY u.loyalty_points DESC, u.name ASC"
        )->fetchAll();

        foreach ($rows as &$r) {
            $r['loyalty_points'] = (int) $r['loyalty_points'];
            $r['total_earned']   = (int) $r['total_earned'];
            $r['total_redeemed'] = (int) $r['total_redeemed'];
        }
        unset($r);

        // Programme-wide KPIs.
        $stats = $db->query(
            "SELECT
                COALESCE(SUM(CASE WHEN points > 0 THEN points END), 0) AS issued,
                COALESCE(-SUM(CASE WHEN points < 0 THEN points END), 0) AS redeemed
             FROM loyalty_transactions"
        )->fetch();

        $outstanding = (int) $db->query('SELECT COALESCE(SUM(loyalty_points),0) FROM users')->fetchColumn();

        Response::success([
            'customers' => $rows,
            'stats'     => [
                'issued'      => (int) $stats['issued'],
                'redeemed'    => (int) $stats['redeemed'],
                'outstanding' => $outstanding,
            ],
            'settings'  => LoyaltyController::config(),
        ]);
    }

    /** PUT /api/admin/loyalty/settings — update the programme rules. */
    public function saveSettings(array $p): void
    {
        Auth::admin();
        $body = Request::body();

        // key => [min, max, isFloat] guard rails
        $fields = [
            'loyalty_earn_rate_pct'  => [0, 100, false],
            'loyalty_earn_cap'       => [0, 100000, false],
            'loyalty_redeem_cap_pct' => [0, 100, false],
            'loyalty_point_value'    => [0.01, 1000, true],
        ];
        foreach ($fields as $key => [$min, $max, $isFloat]) {
            if (array_key_exists($key, $body)) {
                $raw = $isFloat ? (float) $body[$key] : (int) $body[$key];
                $val = max($min, min($max, $raw));
                LoyaltyController::saveSetting($key, $isFloat ? round($val, 2) : $val);
            }
        }
        Response::success(LoyaltyController::config(), 'Loyalty settings updated');
    }

    /** GET /api/admin/loyalty/{id} — one customer's balance and history. */
    public function show(array $p): void
    {
        Auth::admin();
        $db = db();
        $id = (int) $p['id'];

        $u = $db->prepare('SELECT id, name, email, loyalty_points FROM users WHERE id=?');
        $u->execute([$id]);
        $user = $u->fetch();
        if (!$user) {
            Response::error('Customer not found', 404);
        }
        $user['loyalty_points'] = (int) $user['loyalty_points'];

        $tx = $db->prepare(
            "SELECT t.id, t.points, t.type, t.note, t.order_id, t.created_at, o.order_number
             FROM loyalty_transactions t
             LEFT JOIN orders o ON o.id = t.order_id
             WHERE t.user_id=? ORDER BY t.id DESC LIMIT 100"
        );
        $tx->execute([$id]);

        Response::success([
            'user'    => $user,
            'history' => $tx->fetchAll(),
        ]);
    }

    /** POST /api/admin/loyalty/{id}/adjust — manually credit (+) or debit (-) points. */
    public function adjust(array $p): void
    {
        Auth::admin();
        $db = db();
        $id = (int) $p['id'];
        $body = Request::body();

        $points = (int) ($body['points'] ?? 0);
        $note   = trim((string) ($body['note'] ?? ''));

        if ($points === 0) {
            Response::error('Enter a non-zero point amount (use a minus sign to deduct).', 422);
        }

        $exists = $db->prepare('SELECT loyalty_points FROM users WHERE id=? AND role<>"admin"');
        $exists->execute([$id]);
        $current = $exists->fetchColumn();
        if ($current === false) {
            Response::error('Customer not found', 404);
        }
        if ($points < 0 && (int) $current + $points < 0) {
            Response::error('Cannot deduct more than the customer has (' . (int) $current . ' pts).', 422);
        }

        LoyaltyController::award(
            $db, $id, $points, 'adjust', null,
            $note !== '' ? $note : ('Admin adjustment by ' . (Auth::user()['name'] ?? 'admin'))
        );

        Response::success(['points' => LoyaltyController::balance($id)],
            ($points > 0 ? 'Credited ' : 'Deducted ') . abs($points) . ' points');
    }
}

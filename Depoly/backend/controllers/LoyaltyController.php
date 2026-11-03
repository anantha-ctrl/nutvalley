<?php
/**
 * Loyalty points.
 *   - Earn EARN_RATE of the order subtotal as points (1 point = Rs.1).
 *   - Redeem points at checkout, up to REDEEM_CAP of the payable amount.
 */
class LoyaltyController
{
    // Default rules — overridable per-store from the `settings` table (admin panel).
    const DEFAULTS = [
        'loyalty_earn_rate_pct'  => 5,   // earn 5% of subtotal as points
        'loyalty_earn_cap'       => 25,  // MAX points earned on a single order
        'loyalty_redeem_cap_pct' => 50,  // points cover up to 50% of the payable amount
        'loyalty_point_value'    => 1,   // rupee value of ONE point (e.g. 0.5 = 2 pts per Rs.1)
    ];

    // point_value may be fractional (e.g. 0.5); everything else is a whole number.
    const FLOAT_KEYS = ['loyalty_point_value'];

    private static ?array $cfg = null;

    /** Effective rules: DB settings merged over DEFAULTS (cached per request). */
    public static function config(): array
    {
        if (self::$cfg === null) {
            $rows = [];
            try {
                $rows = db()->query("SELECT `key`,`value` FROM settings WHERE `key` LIKE 'loyalty_%'")
                            ->fetchAll(PDO::FETCH_KEY_PAIR);
            } catch (\Throwable $e) { /* settings table missing -> use defaults */ }
            $merged = array_merge(self::DEFAULTS, $rows);
            foreach ($merged as $k => $v) {
                $merged[$k] = in_array($k, self::FLOAT_KEYS, true) ? (float) $v : (int) $v;
            }
            self::$cfg = $merged;
        }
        return self::$cfg;
    }

    /** Rupee value of a number of points. */
    public static function pointValue(): float
    {
        return (float) self::config()['loyalty_point_value'];
    }

    public static function redeemValue(int $points): float
    {
        return round($points * self::pointValue(), 2);
    }

    public static function balance(int $userId): int
    {
        $s = db()->prepare('SELECT loyalty_points FROM users WHERE id=?');
        $s->execute([$userId]);
        return (int) $s->fetchColumn();
    }

    /** Credit (or debit, if negative) points and record the transaction. */
    public static function award(PDO $db, int $userId, int $points, string $type, ?int $orderId = null, ?string $note = null): void
    {
        if ($points === 0) {
            return;
        }
        $db->prepare('UPDATE users SET loyalty_points = GREATEST(loyalty_points + ?, 0) WHERE id=?')
           ->execute([$points, $userId]);
        $db->prepare('INSERT INTO loyalty_transactions (user_id, points, type, order_id, note) VALUES (?,?,?,?,?)')
           ->execute([$userId, $points, $type, $orderId, $note]);
    }

    /** Points earned for a given order subtotal, capped at the per-order maximum. */
    public static function pointsFor(float $subtotal): int
    {
        $c = self::config();
        $earned = (int) floor($subtotal * $c['loyalty_earn_rate_pct'] / 100);
        return min($earned, $c['loyalty_earn_cap']); // never exceed the cap
    }

    /** Clamp a requested redemption (in POINTS) to balance and the per-order cap. */
    public static function clampRedeem(int $userId, int $requested, float $payable): int
    {
        if ($requested <= 0) {
            return 0;
        }
        // Cap is a share of the payable amount, converted from rupees to points.
        $capRupees = $payable * self::config()['loyalty_redeem_cap_pct'] / 100;
        $capPoints = (int) floor($capRupees / self::pointValue());
        return max(0, min($requested, self::balance($userId), $capPoints));
    }

    /** Generate a unique referral code. */
    public static function makeReferralCode(PDO $db): string
    {
        do {
            $code = 'CF' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        } while ($db->query('SELECT 1 FROM users WHERE referral_code=' . $db->quote($code))->fetch());
        return $code;
    }

    /** GET /api/loyalty — the caller's balance and history. */
    public function index(array $p): void
    {
        $userId = Auth::id();
        $db = db();
        $u = $db->prepare('SELECT loyalty_points FROM users WHERE id=?');
        $u->execute([$userId]);
        $user = $u->fetch();

        $tx = $db->prepare('SELECT points, type, note, created_at FROM loyalty_transactions WHERE user_id=? ORDER BY id DESC LIMIT 50');
        $tx->execute([$userId]);

        $c = self::config();
        Response::success([
            'points'         => (int) $user['loyalty_points'],
            'earn_rate_pct'  => $c['loyalty_earn_rate_pct'],
            'earn_cap'       => $c['loyalty_earn_cap'],
            'redeem_cap_pct' => $c['loyalty_redeem_cap_pct'],
            'point_value'    => $c['loyalty_point_value'],
            'history'        => $tx->fetchAll(),
        ]);
    }

    /** Persist a settings key (admin). Resets the per-request config cache. */
    public static function saveSetting(string $key, $value): void
    {
        db()->prepare('INSERT INTO settings (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)')
            ->execute([$key, (string) $value]);
        self::$cfg = null;
    }
}

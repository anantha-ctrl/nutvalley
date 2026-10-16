<?php
class CouponController
{
    public function apply(array $p): void
    {
        $userId = Auth::id();
        $code = strtoupper(trim((string) Request::input('code')));
        $subtotal = (float) Request::input('subtotal', 0);
        $coupon = self::validateCoupon($code, $subtotal, $userId);
        if (!$coupon['valid']) {
            Response::error($coupon['message'], 400);
        }
        Response::success([
            'code'     => $code,
            'discount' => $coupon['discount'],
            'type'     => $coupon['coupon']['type'],
        ], 'Coupon applied');
    }

    /**
     * Reusable validation used by checkout too.
     * Pass $userId so "first order only" coupons (e.g. WELCOME10) can be checked.
     */
    public static function validateCoupon(string $code, float $subtotal, ?int $userId = null): array
    {
        $stmt = db()->prepare('SELECT * FROM coupons WHERE code=? AND is_active=1');
        $stmt->execute([$code]);
        $c = $stmt->fetch();
        if (!$c) {
            return ['valid' => false, 'message' => 'Invalid coupon code'];
        }
        if ($c['expires_at'] && strtotime($c['expires_at']) < time()) {
            return ['valid' => false, 'message' => 'Coupon has expired'];
        }
        // First-order-only coupons are valid only if the user has no prior orders.
        if (!empty($c['first_order_only'])) {
            if ($userId === null) {
                return ['valid' => false, 'message' => 'Please log in to use this coupon'];
            }
            $o = db()->prepare("SELECT COUNT(*) FROM orders WHERE user_id=? AND status<>'cancelled'");
            $o->execute([$userId]);
            if ((int) $o->fetchColumn() > 0) {
                return ['valid' => false, 'message' => 'This coupon is valid only on your first order'];
            }
        }
        if ($c['usage_limit'] !== null && (int) $c['used_count'] >= (int) $c['usage_limit']) {
            return ['valid' => false, 'message' => 'Coupon usage limit reached'];
        }
        if ($subtotal < (float) $c['min_order']) {
            return ['valid' => false, 'message' => 'Minimum order of ₹' . (int) $c['min_order'] . ' required'];
        }
        if ($c['type'] === 'percentage') {
            $discount = $subtotal * ((float) $c['value'] / 100);
            if ($c['max_discount'] !== null) {
                $discount = min($discount, (float) $c['max_discount']);
            }
        } else {
            $discount = (float) $c['value'];
        }
        $discount = round(min($discount, $subtotal), 2);
        return ['valid' => true, 'discount' => $discount, 'coupon' => $c];
    }
}

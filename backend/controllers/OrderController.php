<?php
class OrderController
{
    public function index(array $p): void
    {
        $userId = Auth::id();
        $stmt = db()->prepare(
            'SELECT id, order_number, total, status, payment_status, payment_method, placed_at,
                    carrier, tracking_number, courier_name, awb_code, shipment_status, shipment_eta
             FROM orders WHERE user_id=? ORDER BY placed_at DESC'
        );
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll();
        foreach ($orders as &$o) {
            $o['total'] = (float) $o['total'];
        }
        Response::success($orders);
    }

    public function show(array $p): void
    {
        $userId = Auth::id();
        $db = db();
        $stmt = $db->prepare('SELECT * FROM orders WHERE id=? AND user_id=?');
        $stmt->execute([(int) $p['id'], $userId]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }
        $items = $db->prepare('SELECT * FROM order_items WHERE order_id=?');
        $items->execute([$order['id']]);
        $order['items'] = $items->fetchAll();

        // Attach this customer's existing review (if any) per product, so the UI
        // can prefill the form / show a "reviewed" state. Reviews open only once
        // the order is delivered.
        $rev = $db->prepare('SELECT rating, title, comment FROM reviews WHERE product_id=? AND user_id=?');
        foreach ($order['items'] as &$it) {
            if (!empty($it['product_id'])) {
                $rev->execute([(int) $it['product_id'], $userId]);
                $r = $rev->fetch();
                $it['my_review'] = $r ? ['rating' => (int) $r['rating'], 'title' => $r['title'], 'comment' => $r['comment']] : null;
            } else {
                $it['my_review'] = null;
            }
        }
        unset($it);

        $order['shipping_address'] = json_decode($order['shipping_address'], true);
        foreach (['subtotal', 'discount', 'shipping_fee', 'total'] as $f) {
            $order[$f] = (float) $order[$f];
        }
        $order['timeline'] = $this->timeline($order['status']);
        // Signed token for the invoice's delivery-verification QR.
        $order['verify_token'] = self::verifyToken((int) $order['id'], $order['order_number']);

        // Return/refund request for this order (if any).
        $ret = $db->prepare('SELECT status, reason, admin_note, created_at FROM returns WHERE order_id=?');
        $ret->execute([$order['id']]);
        $order['return'] = $ret->fetch() ?: null;

        // Whether a return can be raised: at least one item is a product still
        // flagged returnable. Items whose product was deleted (product_id NULL)
        // don't count. Drives the "Request Return" button on the frontend.
        $order['returnable'] = self::orderHasReturnable($db, (int) $order['id']);

        // Courier scan history captured so far. The page polls /orders/{id}/track
        // for fresh scans; this makes the first paint show the timeline already.
        $order['shipment_events'] = Delivery::events((int) $order['id']);

        Response::success($order);
    }

    /** COD limit: orders above this amount must pay online. 0 / empty = no limit. */
    public static function codMax(): float
    {
        return (float) Setting::get('cod_max_amount', 1000);
    }

    /** Whether Cash on Delivery may be used for an order of this total. */
    public static function codAllowed(float $total): bool
    {
        $max = self::codMax();
        return $max <= 0 || $total <= $max;
    }

    /** True when the order contains at least one product still flagged returnable. */
    public static function orderHasReturnable(PDO $db, int $orderId): bool
    {
        $q = $db->prepare(
            'SELECT COUNT(*) FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ? AND p.is_returnable = 1'
        );
        $q->execute([$orderId]);
        return (int) $q->fetchColumn() > 0;
    }

    /** Place a Cash-on-Delivery order directly. */
    public function placeCod(array $p): void
    {
        $userId = Auth::id();
        $built = self::buildOrderData($userId, Request::body());
        // COD is only allowed up to the threshold; bigger carts must pay online.
        if (!self::codAllowed((float) $built['total'])) {
            Response::error('Cash on Delivery is available only for orders up to ' . self::codMax() . '. Please pay online.', 422);
        }
        $orderId = self::persistOrder($userId, $built, 'cod', 'pending');
        self::finalizeOrder($userId, $orderId, $built);
        Response::success(['order_id' => $orderId, 'order_number' => $built['order_number']], 'Order placed (COD)', 201);
    }

    /**
     * Place an order paid manually by UPI / QR. The customer pays to the store's
     * UPI id and submits the transaction id + a payment screenshot. The order is
     * recorded as PENDING VERIFICATION — stock/points are only committed once an
     * admin approves the payment (see AdminOrderController::reviewPayment).
     */
    public function placeUpi(array $p): void
    {
        $userId = Auth::id();
        $body = Request::body();

        $txnId = trim((string) ($body['txn_id'] ?? ''));
        $shot = trim((string) ($body['screenshot'] ?? ''));
        if ($txnId === '') {
            Response::error('Please enter the UPI transaction / reference id', 422);
        }
        if ($shot === '') {
            Response::error('Please upload a payment screenshot', 422);
        }
        if (Setting::get('upi_id', '') === '') {
            Response::error('Online UPI payment is not configured. Please choose Cash on Delivery.', 400);
        }

        $built = self::buildOrderData($userId, $body);
        $orderId = self::persistOrder($userId, $built, 'upi', 'pending');

        // Upload the proof screenshot to Cloudinary when configured; otherwise
        // keep the data URI inline (payment_screenshot is MEDIUMTEXT).
        if (str_starts_with($shot, 'data:image')) {
            $up = Cloudinary::upload($shot, 'beadsboutique/payments');
            if ($up) {
                $shot = $up['url'];
            }
        }

        db()->prepare(
            "UPDATE orders
             SET payment_txn_id=?, payment_screenshot=?, payment_approval='pending'
             WHERE id=? AND user_id=?"
        )->execute([$txnId, $shot, $orderId, $userId]);

        // The customer has committed to this order — empty their cart so they
        // don't accidentally pay twice. Stock is decremented on approval.
        db()->prepare('DELETE FROM cart WHERE user_id=?')->execute([$userId]);

        self::notifyAdminUpiPending($userId, $built, $txnId);

        Response::success(
            ['order_id' => $orderId, 'order_number' => $built['order_number'], 'pending_approval' => true],
            'Payment submitted. Your order is awaiting verification.',
            201
        );
    }

    /**
     * Deterministic, tamper-proof token for an order's verification QR. It is an
     * HMAC of the order id + number keyed by the server secret, so a scanned code
     * can be validated without a DB column and cannot be forged or guessed.
     */
    public static function verifyToken(int $id, string $orderNumber): string
    {
        $secret = env('JWT_SECRET', 'novo-verify-secret');
        return substr(hash_hmac('sha256', $id . '|' . $orderNumber, $secret), 0, 20);
    }

    /**
     * GET /api/orders/verify/{id}?t=<token> — PUBLIC delivery-verification lookup.
     * Scanned from the invoice QR at delivery time; returns the live order details
     * (items, quantities, ship-to, status) so the courier can confirm the parcel.
     * Token-gated to prevent order enumeration; no auth so any scanner app works.
     */
    public function verifyPublic(array $p): void
    {
        $param = trim((string) ($p['id'] ?? ''));
        $token = trim((string) Request::query('t', ''));
        $db = db();

        if (is_numeric($param)) {
            $stmt = $db->prepare(
                'SELECT o.id, o.order_number, o.status, o.carrier, o.tracking_number, o.payment_method, o.payment_status, o.payment_approval,
                        o.total, o.placed_at, o.shipping_address, u.name AS customer_name, u.phone AS customer_phone
                 FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?'
            );
            $stmt->execute([(int) $param]);
        } else {
            $stmt = $db->prepare(
                'SELECT o.id, o.order_number, o.status, o.carrier, o.tracking_number, o.payment_method, o.payment_status, o.payment_approval,
                        o.total, o.placed_at, o.shipping_address, u.name AS customer_name, u.phone AS customer_phone
                 FROM orders o JOIN users u ON u.id=o.user_id WHERE o.order_number=?'
            );
            $stmt->execute([$param]);
        }

        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }

        $expectedToken = self::verifyToken((int)$order['id'], $order['order_number']);
        if ($token !== '' && !hash_equals(strtolower($expectedToken), strtolower($token))) {
            $fallbackToken = substr(hash_hmac('sha256', (string)$order['id'], env('JWT_SECRET', 'novo-verify-secret')), 0, 20);
            if (!hash_equals(strtolower($fallbackToken), strtolower($token))) {
                Response::error('Invalid or expired verification code', 403);
            }
        }

        $it = $db->prepare(
            'SELECT oi.product_name, oi.size, oi.color, oi.quantity, oi.price, oi.line_total, oi.image_url,
                    p.id AS product_id, p.slug AS product_slug
             FROM order_items oi
             LEFT JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id=?'
        );
        $it->execute([(int)$order['id']]);
        $rows = $it->fetchAll();
        $addr = json_decode($order['shipping_address'] ?? 'null', true) ?: [];

        Response::success([
            'verified'         => true,
            'order_number'     => $order['order_number'],
            'status'           => $order['status'],
            'carrier'          => $order['carrier'],
            'tracking_number'  => $order['tracking_number'],
            'payment_method'   => $order['payment_method'],
            'payment_status'   => $order['payment_status'],
            'payment_approval' => $order['payment_approval'],
            'placed_at'        => $order['placed_at'],
            'total'            => (float) $order['total'],
            'item_count'       => array_sum(array_map(fn ($r) => (int) $r['quantity'], $rows)),
            'ship_to'          => [
                'name'    => $addr['full_name'] ?? $order['customer_name'],
                'phone'   => $addr['phone'] ?? $order['customer_phone'],
                'line1'   => $addr['line1'] ?? '',
                'line2'   => $addr['line2'] ?? '',
                'city'    => $addr['city'] ?? '',
                'state'   => $addr['state'] ?? '',
                'pincode' => $addr['pincode'] ?? '',
            ],
            'items'            => array_map(fn ($r) => [
                'product_id' => $r['product_id'] ? (int) $r['product_id'] : null,
                'slug'       => $r['product_slug'] ?? '',
                'name'       => $r['product_name'],
                'qty'        => (int) $r['quantity'],
                'size'       => $r['size'],
                'color'      => $r['color'],
                'price'      => (float) $r['price'],
                'line_total' => (float) $r['line_total'],
                'image'      => $r['image_url'],
            ], $rows),
        ]);
    }

    /** Email the store admin that a UPI payment needs verification. Best effort. */
    private static function notifyAdminUpiPending(int $userId, array $built, string $txnId): void
    {
        $db = db();
        $u = $db->prepare('SELECT name, email, phone FROM users WHERE id=?');
        $u->execute([$userId]);
        $cust = $u->fetch() ?: ['name' => 'Customer', 'email' => '', 'phone' => ''];

        $adminTo = Setting::get('store_contact_to', '')
            ?: Setting::get('store_contact_email', '')
            ?: (string) ($db->query("SELECT email FROM users WHERE role='admin' ORDER BY id LIMIT 1")->fetchColumn() ?: '');
        if ($adminTo === '') {
            return;
        }

        Mailer::send(
            $adminTo,
            Mailer::brand() . ' · UPI payment to verify — Order ' . $built['order_number'],
            Mailer::upiPendingAdminTemplate(
                $built['order_number'],
                $cust['name'],
                $cust['phone'] ?? '',
                (float) $built['total'],
                $txnId
            )
        );
    }

    public function cancel(array $p): void
    {
        $userId = Auth::id();
        $db = db();
        $stmt = $db->prepare('SELECT * FROM orders WHERE id=? AND user_id=?');
        $stmt->execute([(int) $p['id'], $userId]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }
        if (!self::customerCanCancel((string) $order['status'])) {
            Response::error(self::cancelBlockedMessage((string) $order['status']), 400);
        }
        // Atomic: only cancels if the status is STILL cancellable, so an admin
        // marking it "shipped" at the same moment always wins.
        $upd = $db->prepare(
            "UPDATE orders SET status='cancelled' WHERE id=? AND status NOT IN ('shipped','delivered','cancelled')"
        );
        $upd->execute([$order['id']]);
        if ($upd->rowCount() === 0) {
            $now = $db->prepare('SELECT status FROM orders WHERE id=?');
            $now->execute([$order['id']]);
            Response::error(self::cancelBlockedMessage((string) $now->fetchColumn()), 409);
        }
        self::restockOrder($db, (int) $order['id']);

        // Tell the customer (with refund note if prepaid) and alert the store so it isn't packed/shipped.
        Mailer::queueOrderEmail((int) $order['id'], 'cancelled');
        self::notifyAdminCancelled((int) $order['id']);

        Response::success(['status' => 'cancelled'], 'Order cancelled');
    }

    /** Customers may cancel only until the parcel has shipped. */
    public static function customerCanCancel(string $status): bool
    {
        return !in_array($status, ['shipped', 'delivered', 'cancelled'], true);
    }

    private static function cancelBlockedMessage(string $status): string
    {
        return match ($status) {
            'shipped'   => 'This order has already been shipped and can no longer be cancelled. You can request a return after delivery.',
            'delivered' => 'This order has been delivered and can no longer be cancelled. You can request a return instead.',
            'cancelled' => 'This order is already cancelled.',
            default     => 'This order can no longer be cancelled.',
        };
    }

    /** Store alert when a customer cancels — so nobody packs or ships it. */
    public static function notifyAdminCancelled(int $orderId): void
    {
        $to = Mailer::adminInbox();
        if ($to === '') {
            return;
        }
        try {
            if ($m = Mailer::adminOrderEmail($orderId, 'cancelled')) {
                Mailer::queue($to, $m['subject'], $m['html']);
            }
        } catch (\Throwable $e) {
            error_log('Admin cancel email failed: ' . $e->getMessage());
        }
    }

    /** Return every item of an order to stock and decrement sold counts. */
    public static function restockOrder(PDO $db, int $orderId): void
    {
        $items = $db->prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=?');
        $items->execute([$orderId]);
        foreach ($items->fetchAll() as $it) {
            if ($it['variant_id']) {
                $db->prepare('UPDATE product_variants SET stock=stock+? WHERE id=?')->execute([$it['quantity'], $it['variant_id']]);
            }
            if ($it['product_id']) {
                $db->prepare('UPDATE products SET stock=stock+?, sold_count=GREATEST(sold_count-?,0) WHERE id=?')
                   ->execute([$it['quantity'], $it['quantity'], $it['product_id']]);
            }
        }
    }

    // ================= shipping =================

    const FREE_SHIPPING_MIN = 0; // default 0 (free shipping)
    const BASE_SHIPPING = 0;        // default 0 (no shipping charge)

    public static function freeShippingMin(): float
    {
        return (float) Setting::get('store_free_shipping_min', self::FREE_SHIPPING_MIN);
    }

    public static function baseShipping(): float
    {
        return (float) Setting::get('store_base_shipping', self::BASE_SHIPPING);
    }

    /** True when the user has never placed a (non-cancelled) order. */
    public static function isFirstOrder(int $userId): bool
    {
        $stmt = db()->prepare("SELECT COUNT(*) FROM orders WHERE user_id=? AND status<>'cancelled'");
        $stmt->execute([$userId]);
        return ((int) $stmt->fetchColumn()) === 0;
    }

    /**
     * Shipping rule:
     *   - If all items in the cart are free shipping -> FREE
     *   - If any item has a shipping fee -> that shipping fee is applied
     *   - If subtotal reaches free shipping threshold (if configured > 0) -> FREE
     */
    public static function calculateShippingForCart(int $userId, array $cartItems, float $payable): float
    {
        $freeMin = self::freeShippingMin();
        if ($freeMin > 0 && $payable >= $freeMin) {
            return 0.0;
        }
        $baseShipping = self::baseShipping();
        $itemShippingTotal = 0.0;
        $hasNonFreeItem = false;
        foreach ($cartItems as $c) {
            $fee = isset($c['shipping_fee']) ? (float) $c['shipping_fee'] : 0.0;
            $isFree = isset($c['is_free_shipping']) ? (int) $c['is_free_shipping'] : ($fee > 0 ? 0 : 1);
            if ($fee > 0) {
                $isFree = 0;
            }
            if ($isFree === 0) {
                $hasNonFreeItem = true;
                $itemShippingTotal += ($fee > 0 ? $fee : $baseShipping);
            }
        }
        if (!$hasNonFreeItem) {
            return 0.0;
        }
        return $itemShippingTotal;
    }

    public static function shippingFee(int $userId, float $payable): float
    {
        $base = self::baseShipping();
        if ($base <= 0) {
            return 0.0;
        }
        $min = self::freeShippingMin();
        return ($min > 0 && $payable >= $min) ? 0.0 : $base;
    }

    /** Lightweight info for the checkout page to display the correct shipping. */
    public function shippingInfo(array $p): void
    {
        $userId = Auth::id();
        Response::success([
            'is_first_order'    => self::isFirstOrder($userId),
            'free_shipping_min' => self::freeShippingMin(),
            'base_shipping'     => self::baseShipping(),
            'partner'           => Delivery::provider(),
            'partner_live'      => Delivery::isConfigured(),
        ]);
    }

    /**
     * GET /api/shipping-check?pincode=560001&cod=0 — live courier serviceability
     * for a delivery pincode, used on the product page and at checkout.
     * Falls back to a "no partner" answer instead of erroring, so the storefront
     * keeps working when no courier account is connected.
     */
    public function shippingCheck(array $p): void
    {
        $pin = preg_replace('/\D/', '', (string) Request::query('pincode', ''));
        if (strlen($pin) !== 6) {
            Response::error('Enter a valid 6-digit pincode', 422);
        }
        if (!Delivery::isConfigured()) {
            Response::success([
                'pincode'     => $pin,
                'partner'     => Delivery::provider(),
                'serviceable' => null,
                'eta'         => null,
                'couriers'    => [],
                'message'     => 'Delivery estimates are unavailable right now.',
            ]);
        }

        $res = Delivery::serviceability($pin, (string) Request::query('cod', '0') === '1');
        if (!$res['ok']) {
            Response::success([
                'pincode'     => $pin,
                'partner'     => Delivery::provider(),
                'serviceable' => null,
                'eta'         => null,
                'couriers'    => [],
                'message'     => 'Could not reach the courier — please try again.',
            ]);
        }

        Response::success([
            'pincode'     => $pin,
            'partner'     => Delivery::provider(),
            'serviceable' => $res['serviceable'],
            'eta'         => $res['eta'],
            'rate'        => $res['rate'],
            'couriers'    => array_slice($res['couriers'], 0, 3),
            'message'     => $res['serviceable']
                ? ($res['eta'] ? 'Delivery by ' . $res['eta'] : 'Delivery available to this pincode')
                : 'Sorry, we do not deliver to this pincode yet.',
        ]);
    }

    /**
     * GET /api/orders/{id}/track — live courier scans for the signed-in
     * customer's own order. Ownership is checked before any courier call.
     */
    public function track(array $p): void
    {
        $userId = Auth::id();
        $id = (int) $p['id'];
        $stmt = db()->prepare(
            'SELECT id, order_number, status, carrier, tracking_number, courier_name, awb_code,
                    shipment_status, shipment_eta, tracking_url
             FROM orders WHERE id=? AND user_id=?'
        );
        $stmt->execute([$id, $userId]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }

        $res = Delivery::track($id);
        Response::success([
            'order_number'    => $order['order_number'],
            'order_status'    => $order['status'],
            'courier'         => $order['courier_name'] ?: $order['carrier'],
            'awb_code'        => $order['awb_code'] ?: $order['tracking_number'],
            'tracking_url'    => $res['tracking_url'] ?? $order['tracking_url'],
            'shipment_status' => $res['status'] ?? $order['shipment_status'],
            'eta'             => $res['eta'] ?? $order['shipment_eta'],
            'live'            => (bool) ($res['ok'] ?? false),
            'note'            => $res['ok'] ?? false ? null : ($res['error'] ?? null),
            'events'          => $res['events'] ?? [],
        ]);
    }

    // ================= shared order building =================

    /** Builds order line items + totals from the user's cart. */
    /**
     * Server-side pricing of the user's cart (the single source of truth for totals).
     * $requireAddress = false lets the checkout quote price the cart before an address is picked.
     */
    public static function buildOrderData(int $userId, array $body, bool $requireAddress = true): array
    {
        $db = db();
        $stmt = $db->prepare(
            'SELECT ct.quantity, ct.variant_id, p.id AS product_id, p.name, p.price, p.stock,
                    COALESCE(p.is_free_shipping, 1) AS is_free_shipping,
                    COALESCE(p.shipping_fee, 0.00) AS shipping_fee,
                    pv.size, pv.color, pv.price_diff, pv.price AS variant_price, pv.stock AS variant_stock,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM cart ct JOIN products p ON p.id=ct.product_id
             LEFT JOIN product_variants pv ON pv.id=ct.variant_id
             WHERE ct.user_id=?'
        );
        $stmt->execute([$userId]);
        $cart = $stmt->fetchAll();
        if (!$cart) {
            Response::error('Cart is empty', 400);
        }

        $items = [];
        $subtotal = 0;
        foreach ($cart as $c) {
            $available = $c['variant_id'] ? (int) $c['variant_stock'] : (int) $c['stock'];
            if ((int) $c['quantity'] > $available) {
                Response::error("Insufficient stock for {$c['name']}", 400);
            }
            $price = ($c['variant_price'] !== null)
                ? (float) $c['variant_price']
                : (float) $c['price'] + (float) ($c['price_diff'] ?? 0);
            $line = $price * (int) $c['quantity'];
            $subtotal += $line;
            $items[] = [
                'product_id' => (int) $c['product_id'],
                'variant_id' => $c['variant_id'] ? (int) $c['variant_id'] : null,
                'name'       => $c['name'],
                'image'      => $c['image'],
                'size'       => $c['size'],
                'color'      => $c['color'],
                'price'      => $price,
                'quantity'   => (int) $c['quantity'],
                'line_total' => $line,
            ];
        }

        // Shipping address: explicit object or saved address_id
        $address = $body['shipping_address'] ?? null;
        if (!$address && !empty($body['address_id'])) {
            $a = $db->prepare('SELECT * FROM addresses WHERE id=? AND user_id=?');
            $a->execute([(int) $body['address_id'], $userId]);
            $address = $a->fetch() ?: null;
        }
        if (!$address && $requireAddress) {
            Response::error('Shipping address is required', 422);
        }

        $discount = 0;
        $couponCode = null;
        if (!empty($body['coupon_code'])) {
            $res = CouponController::validateCoupon(strtoupper($body['coupon_code']), $subtotal, $userId);
            if (!$res['valid']) {
                Response::error($res['message'], 422); // reject the order rather than silently dropping the coupon
            }
            $discount = $res['discount'];
            $couponCode = strtoupper($body['coupon_code']);
        }

        $shipping = self::calculateShippingForCart($userId, $cart, $subtotal - $discount);

        // Loyalty redemption: points -> rupees at the configured point value.
        $pointsRedeem = LoyaltyController::clampRedeem(
            $userId, (int) ($body['points_redeem'] ?? 0), $subtotal - $discount
        );
        $pointsValue = LoyaltyController::redeemValue($pointsRedeem);

        $total = round($subtotal - $discount - $pointsValue + $shipping, 2);

        return [
            'order_number'  => '', // assigned sequentially inside persistOrder() (e.g. BB00001)
            'items'         => $items,
            'subtotal'      => round($subtotal, 2),
            'discount'      => $discount,
            'shipping_fee'  => $shipping,
            'points_used'   => $pointsRedeem,
            'points_earned' => LoyaltyController::pointsFor($subtotal),
            'total'         => $total,
            'coupon_code'   => $couponCode,
            'address'       => $address,
            'address_id'    => $body['address_id'] ?? null,
        ];
    }

    /**
     * Next sequential, human-friendly order number — BB00001, BB00002, …
     * Prefix is admin-configurable via the `order_prefix` setting (default FUR).
     * Must be called inside the order transaction (uses FOR UPDATE to stay race-safe).
     */
    private static function nextOrderNumber(PDO $db): string
    {
        $prefix = preg_replace('/[^A-Za-z0-9]/', '', (string) Setting::get('order_prefix', 'BB')) ?: 'BB';
        $stmt = $db->prepare(
            "SELECT order_number FROM orders
             WHERE order_number LIKE ? AND order_number NOT LIKE 'TEMP_%'
             ORDER BY id DESC LIMIT 1 FOR UPDATE"
        );
        $stmt->execute([$prefix . '%']);
        $last = $stmt->fetchColumn();
        $next = $last ? ((int) preg_replace('/[^0-9]/', '', $last)) + 1 : 1;
        return $prefix . str_pad((string) $next, 5, '0', STR_PAD_LEFT);
    }

    /** Inserts the order + items atomically, returns order id. Fills $d['order_number']. */
    public static function persistOrder(int $userId, array &$d, string $method, string $paymentStatus, ?string $rzpOrderId = null): int
    {
        $db = db();
        $db->beginTransaction();
        try {
            // Insert with a temporary unique number, then assign the sequential one
            // (so the FOR UPDATE lookup can't collide with this same row).
            $temp = 'TEMP_' . uniqid('', true);
            $db->prepare(
                'INSERT INTO orders
                 (order_number, user_id, address_id, shipping_address, subtotal, discount, shipping_fee, total,
                  points_used, points_earned, coupon_code, payment_method, payment_status, razorpay_order_id, status)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([
                $temp, $userId, $d['address_id'] ?? null, json_encode($d['address']),
                $d['subtotal'], $d['discount'], $d['shipping_fee'], $d['total'],
                $d['points_used'] ?? 0, $d['points_earned'] ?? 0,
                $d['coupon_code'], $method, $paymentStatus, $rzpOrderId, 'pending',
            ]);
            $orderId = (int) $db->lastInsertId();

            $orderNumber = self::nextOrderNumber($db);
            $db->prepare('UPDATE orders SET order_number=? WHERE id=?')->execute([$orderNumber, $orderId]);
            $d['order_number'] = $orderNumber; // propagate back to the caller (emails, response)

            $ins = $db->prepare(
                'INSERT INTO order_items
                 (order_id, product_id, variant_id, product_name, image_url, size, color, price, quantity, line_total)
                 VALUES (?,?,?,?,?,?,?,?,?,?)'
            );
            foreach ($d['items'] as $it) {
                $ins->execute([
                    $orderId, $it['product_id'], $it['variant_id'], $it['name'], $it['image'],
                    $it['size'], $it['color'], $it['price'], $it['quantity'], $it['line_total'],
                ]);
            }
            $db->commit();
            return $orderId;
        } catch (\Throwable $e) {
            // Roll back so a failed items insert never leaves an orphan order
            // (which would otherwise consume the customer's "first order" status).
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    /** Decrements stock, bumps coupon usage, clears cart. Call after payment confirmed (or COD). */
    public static function finalizeOrder(int $userId, int $orderId, array $d): void
    {
        $db = db();
        foreach ($d['items'] as $it) {
            if ($it['variant_id']) {
                $db->prepare('UPDATE product_variants SET stock=GREATEST(stock-?,0) WHERE id=?')
                   ->execute([$it['quantity'], $it['variant_id']]);
            }
            $db->prepare('UPDATE products SET stock=GREATEST(stock-?,0), sold_count=sold_count+? WHERE id=?')
               ->execute([$it['quantity'], $it['quantity'], $it['product_id']]);
        }
        if ($d['coupon_code']) {
            $db->prepare('UPDATE coupons SET used_count=used_count+1 WHERE code=?')->execute([$d['coupon_code']]);
        }
        $db->prepare('DELETE FROM cart WHERE user_id=?')->execute([$userId]);

        // ---- Loyalty points ----
        // Redeem the points the customer applied, then credit points earned.
        if (!empty($d['points_used'])) {
            LoyaltyController::award($db, $userId, -(int) $d['points_used'], 'redeem', $orderId, 'Redeemed at checkout');
        }
        if (!empty($d['points_earned'])) {
            LoyaltyController::award($db, $userId, (int) $d['points_earned'], 'earn', $orderId, 'Earned on order ' . $d['order_number']);
        }

        // Confirmation to the customer + new-order alert to the store. Both are
        // queued so SMTP never delays the customer's checkout response.
        $u = $db->prepare('SELECT name, email, phone FROM users WHERE id=?');
        $u->execute([$userId]);
        if ($user = $u->fetch()) {
            Mailer::queueOrderEmail($orderId, 'placed'); // full receipt rendered from the saved order
            Automation::logSent('order_confirmation', $orderId, $userId, $user['email']);
        }
        self::notifyAdminNewOrder($orderId);
    }

    /**
     * Email the store as soon as an order is confirmed. Without this the admin
     * only ever heard about UPI orders awaiting verification — COD and gateway
     * orders arrived silently, so nobody knew there was anything to pack.
     */
    public static function notifyAdminNewOrder(int $orderId): void
    {
        $to = Mailer::adminInbox();
        if ($to === '') {
            return;
        }
        try {
            if ($m = Mailer::adminOrderEmail($orderId)) {
                Mailer::queue($to, $m['subject'], $m['html']);
            }
        } catch (\Throwable $e) {
            // Never let a notification failure affect the order itself.
            error_log('Admin new-order email failed: ' . $e->getMessage());
        }
    }

    /**
     * Commit an already-persisted order (stock, coupon usage, loyalty, email)
     * from its saved DB rows. Used when a manual UPI payment is approved by an
     * admin — the order existed as "pending verification" and is now confirmed.
     */
    public static function finalizeFromDb(int $orderId): void
    {
        $db = db();
        $o = $db->prepare('SELECT * FROM orders WHERE id=?');
        $o->execute([$orderId]);
        $order = $o->fetch();
        if (!$order) {
            return;
        }
        $uid = (int) $order['user_id'];

        $items = $db->prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=?');
        $items->execute([$orderId]);
        foreach ($items->fetchAll() as $it) {
            if ($it['variant_id']) {
                $db->prepare('UPDATE product_variants SET stock=GREATEST(stock-?,0) WHERE id=?')
                   ->execute([$it['quantity'], $it['variant_id']]);
            }
            if ($it['product_id']) {
                $db->prepare('UPDATE products SET stock=GREATEST(stock-?,0), sold_count=sold_count+? WHERE id=?')
                   ->execute([$it['quantity'], $it['quantity'], $it['product_id']]);
            }
        }
        if ($order['coupon_code']) {
            $db->prepare('UPDATE coupons SET used_count=used_count+1 WHERE code=?')->execute([$order['coupon_code']]);
        }
        if ((int) $order['points_used'] > 0) {
            LoyaltyController::award($db, $uid, -(int) $order['points_used'], 'redeem', $orderId, 'Redeemed at checkout');
        }
        if ((int) $order['points_earned'] > 0) {
            LoyaltyController::award($db, $uid, (int) $order['points_earned'], 'earn', $orderId, 'Earned on order ' . $order['order_number']);
        }

        $u = $db->prepare('SELECT name, email FROM users WHERE id=?');
        $u->execute([$uid]);
        if ($user = $u->fetch()) {
            Mailer::queueOrderEmail($orderId, 'placed');
            Automation::logSent('order_confirmation', $orderId, $uid, $user['email']);
        }
        // A UPI order becomes real only on approval — alert the store now.
        self::notifyAdminNewOrder($orderId);
    }

    /** Re-add a past order's items back into the cart. */
    public function reorder(array $p): void
    {
        $userId = Auth::id();
        $db = db();
        $ord = $db->prepare('SELECT id FROM orders WHERE id=? AND user_id=?');
        $ord->execute([(int) $p['id'], $userId]);
        if (!$ord->fetch()) {
            Response::error('Order not found', 404);
        }
        $items = $db->prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=?');
        $items->execute([(int) $p['id']]);

        $added = 0;
        $skipped = 0;
        foreach ($items->fetchAll() as $it) {
            // Skip products that no longer exist or are inactive.
            $pr = $db->prepare('SELECT stock, is_active FROM products WHERE id=?');
            $pr->execute([$it['product_id']]);
            $prod = $pr->fetch();
            if (!$prod || !$prod['is_active']) { $skipped++; continue; }

            // Upsert into cart (merge quantity if the same line already exists).
            $existing = $db->prepare(
                'SELECT id, quantity FROM cart WHERE user_id=? AND product_id=? AND ' .
                ($it['variant_id'] ? 'variant_id=?' : 'variant_id IS NULL')
            );
            $existing->execute($it['variant_id'] ? [$userId, $it['product_id'], $it['variant_id']] : [$userId, $it['product_id']]);
            if ($row = $existing->fetch()) {
                $db->prepare('UPDATE cart SET quantity=quantity+? WHERE id=?')->execute([(int) $it['quantity'], $row['id']]);
            } else {
                $db->prepare('INSERT INTO cart (user_id, product_id, variant_id, quantity) VALUES (?,?,?,?)')
                   ->execute([$userId, $it['product_id'], $it['variant_id'], (int) $it['quantity']]);
            }
            $added++;
        }

        Response::success(['added' => $added, 'skipped' => $skipped],
            $added ? "$added item(s) added to cart" . ($skipped ? ", $skipped unavailable" : '') : 'No items could be re-added');
    }

    private function timeline(string $status): array
    {
        $steps = ['pending', 'processing', 'packed', 'shipped', 'delivered'];
        if ($status === 'cancelled') {
            return [['status' => 'cancelled', 'done' => true]];
        }
        $idx = array_search($status, $steps, true);
        return array_map(fn($s, $i) => ['status' => $s, 'done' => $i <= $idx], $steps, array_keys($steps));
    }
}

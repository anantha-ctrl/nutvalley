<?php
class CheckoutController
{
    /**
     * Live price quote for the checkout page — totals straight from the DB
     * (cart, product prices, coupon, shipping rules) plus which payment
     * methods this order may use.
     */
    public function quote(array $p): void
    {
        $userId = Auth::id();
        $d = OrderController::buildOrderData($userId, Request::body(), false);

        Response::success([
            'subtotal'     => $d['subtotal'],
            'discount'     => $d['discount'],
            'shipping_fee' => $d['shipping_fee'],
            'total'        => $d['total'],
            'coupon_code'  => $d['coupon_code'],
            'cod_max'      => OrderController::codMax(),
            'cod_allowed'  => OrderController::codAllowed((float) $d['total']),
            'online_mode'  => Razorpay::configured() ? 'live' : 'test',
            // Keys set but rejected by Razorpay → hide online payment on the checkout.
            'online_available' => !Razorpay::configured() || Razorpay::available(),
        ]);
    }

    /**
     * Create a pending order + Razorpay order. Frontend opens Razorpay checkout with the returned data.
     */
    public function createOrder(array $p): void
    {
        $userId = Auth::id();
        // The store accepts UPI only (POST /api/orders/upi) — Razorpay is switched off.
        Response::error('Card / Netbanking payment is not available. Please pay via UPI.', 422);
        $d = OrderController::buildOrderData($userId, Request::body());

        // Razorpay is available for any amount (it's the only option above the COD threshold).
        $rzpOrder = Razorpay::createOrder((int) round($d['total'] * 100), $d['order_number'] ?: ('rcpt_' . uniqid()));

        // Keys set but Razorpay refused (wrong keys / network) — stop here, never fake a payment.
        if ($rzpOrder === null && Razorpay::configured()) {
            Response::error('Online payment is unavailable right now. Please try again shortly or choose Cash on Delivery.', 502);
        }

        // No keys at all → demo "test" order so the flow can still be tried end-to-end.
        $rzpOrderId = $rzpOrder['id'] ?? ('order_test_' . uniqid());
        $orderId = OrderController::persistOrder($userId, $d, 'razorpay', 'pending', $rzpOrderId);

        Response::success([
            'order_id'          => $orderId,
            'order_number'      => $d['order_number'],
            'amount'            => (int) round($d['total'] * 100),
            'currency'          => 'INR',
            'razorpay_order_id' => $rzpOrderId,
            'razorpay_key'      => env('RAZORPAY_KEY_ID', ''),
            'is_test'           => $rzpOrder === null, // true => keys missing, use verify with test flag
        ], 'Order created. Proceed to payment.', 201);
    }

    /**
     * Verify the Razorpay signature and finalize the order.
     */
    public function verify(array $p): void
    {
        $userId = Auth::id();
        $data = Request::body();
        $orderId = (int) ($data['order_id'] ?? 0);

        $db = db();
        $stmt = $db->prepare('SELECT * FROM orders WHERE id=? AND user_id=?');
        $stmt->execute([$orderId, $userId]);
        $order = $stmt->fetch();
        if (!$order) {
            Response::error('Order not found', 404);
        }
        if ($order['payment_status'] === 'paid') {
            Response::success(['order_number' => $order['order_number']], 'Already paid');
        }

        // Test mode is decided by the SERVER only (no keys + a test order) — never by the request.
        $isTest = !Razorpay::configured() && str_starts_with((string) $order['razorpay_order_id'], 'order_test_');
        if (!$isTest) {
            // Verify against the Razorpay order id stored for THIS order, so a payment
            // made for a different (cheaper) order can't be replayed here.
            $ok = Razorpay::verifySignature(
                (string) $order['razorpay_order_id'],
                $data['razorpay_payment_id'] ?? '',
                $data['razorpay_signature'] ?? ''
            );
            if (!$ok) {
                $db->prepare("UPDATE orders SET payment_status='failed' WHERE id=?")->execute([$orderId]);
                Response::error('Payment verification failed', 400);
            }
        }

        $db->prepare("UPDATE orders SET payment_status='paid', status='processing', razorpay_payment_id=? WHERE id=?")
           ->execute([$data['razorpay_payment_id'] ?? ('pay_test_' . uniqid()), $orderId]);

        // Finalize from the saved order rows: stock, coupon, loyalty points, the
        // customer's confirmation email and the admin's new-order alert.
        OrderController::finalizeFromDb($orderId);
        $db->prepare('DELETE FROM cart WHERE user_id=?')->execute([$userId]);

        Response::success(['order_number' => $order['order_number']], 'Payment successful');
    }
}

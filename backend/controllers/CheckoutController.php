<?php
class CheckoutController
{
    /**
     * Create a pending order + Razorpay order. Frontend opens Razorpay checkout with the returned data.
     */
    public function createOrder(array $p): void
    {
        $userId = Auth::id();
        $d = OrderController::buildOrderData($userId, Request::body());

        // Razorpay is available for any amount (it's the only option above the COD threshold).
        $rzpOrder = Razorpay::createOrder((int) round($d['total'] * 100), $d['order_number']);

        // If Razorpay keys are not configured, fall back to a "test" order so the flow is still demoable.
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

        $isTest = !empty($data['is_test']) || !env('RAZORPAY_KEY_SECRET');
        if (!$isTest) {
            $ok = Razorpay::verifySignature(
                $data['razorpay_order_id'] ?? '',
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

        // Finalize: decrement stock, clear cart. Rebuild the item list from saved order_items.
        $this->finalizeFromOrderItems($userId, $order);

        Response::success(['order_number' => $order['order_number']], 'Payment successful');
    }

    private function finalizeFromOrderItems(int $userId, array $order): void
    {
        $db = db();
        $items = $db->prepare('SELECT product_id, variant_id, quantity FROM order_items WHERE order_id=?');
        $items->execute([$order['id']]);
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
        $db->prepare('DELETE FROM cart WHERE user_id=?')->execute([$userId]);
    }
}

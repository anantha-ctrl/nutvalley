<?php
/**
 * Razorpay helper - order creation + signature verification (no SDK).
 */
class Razorpay
{
    /** Create a Razorpay order. Returns the order array or null. */
    public static function createOrder(int $amountPaise, string $receipt): ?array
    {
        $keyId = env('RAZORPAY_KEY_ID');
        $secret = env('RAZORPAY_KEY_SECRET');
        if (!$keyId || !$secret) {
            return null;
        }
        $payload = json_encode([
            'amount'   => $amountPaise,
            'currency' => 'INR',
            'receipt'  => $receipt,
        ]);
        $ch = curl_init('https://api.razorpay.com/v1/orders');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD        => "$keyId:$secret",
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => 30,
        ]);
        $res = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($res, true);
        return isset($data['id']) ? $data : null;
    }

    /** Verify the payment signature returned by Razorpay checkout. */
    public static function verifySignature(string $orderId, string $paymentId, string $signature): bool
    {
        $secret = env('RAZORPAY_KEY_SECRET');
        $expected = hash_hmac('sha256', "$orderId|$paymentId", $secret);
        return hash_equals($expected, $signature);
    }
}

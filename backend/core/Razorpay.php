<?php
/**
 * Razorpay helper - order creation + signature verification (no SDK).
 */
class Razorpay
{
    /** True when both API keys are set in .env (live or test gateway in use). */
    public static function configured(): bool
    {
        return (bool) env('RAZORPAY_KEY_ID') && (bool) env('RAZORPAY_KEY_SECRET');
    }

    /**
     * True when the gateway actually accepts our keys. Pings Razorpay at most every
     * 5 minutes (cached in storage/, re-checked at once if the keys change) so the
     * checkout can hide online payment instead of failing on "Pay".
     */
    public static function available(): bool
    {
        if (!self::configured()) {
            return false;
        }
        $file = __DIR__ . '/../storage/razorpay_status.json';
        $sig = hash('sha256', env('RAZORPAY_KEY_ID') . ':' . env('RAZORPAY_KEY_SECRET'));
        $cache = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
        if (is_array($cache) && ($cache['sig'] ?? '') === $sig && time() - (int) ($cache['at'] ?? 0) < 300) {
            return (bool) $cache['ok'];
        }

        $ch = curl_init('https://api.razorpay.com/v1/orders?count=1');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD        => env('RAZORPAY_KEY_ID') . ':' . env('RAZORPAY_KEY_SECRET'),
            CURLOPT_TIMEOUT        => 10,
        ]);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 0) {
            return true; // network blip — don't block payments, createOrder will report it
        }
        $ok = $code === 200;
        if (!$ok) {
            error_log('Razorpay keys rejected: HTTP ' . $code . ' — check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env');
        }
        if (!is_dir(dirname($file))) {
            @mkdir(dirname($file), 0775, true);
        }
        @file_put_contents($file, json_encode(['sig' => $sig, 'ok' => $ok, 'at' => time()]));
        return $ok;
    }

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
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        $data = json_decode((string) $res, true);
        if (!isset($data['id'])) {
            // Surface the reason in the PHP error log (e.g. 401 "Authentication failed" = wrong keys).
            error_log('Razorpay createOrder failed: HTTP ' . $code . ' '
                . ($err ?: ($data['error']['description'] ?? (string) $res)));
            return null;
        }
        return $data;
    }

    /** Verify the payment signature returned by Razorpay checkout. */
    public static function verifySignature(string $orderId, string $paymentId, string $signature): bool
    {
        $secret = (string) env('RAZORPAY_KEY_SECRET');
        if ($secret === '' || $orderId === '' || $paymentId === '' || $signature === '') {
            return false;
        }
        $expected = hash_hmac('sha256', "$orderId|$paymentId", $secret);
        return hash_equals($expected, $signature);
    }
}

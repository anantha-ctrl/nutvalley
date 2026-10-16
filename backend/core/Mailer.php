<?php
/**
 * Mailer with two drivers:
 *   - log  : writes the email to storage/mail.log (great for local dev / OTP testing)
 *   - smtp : sends via SMTP using raw sockets (supports STARTTLS, e.g. Gmail)
 */
class Mailer
{
    public static function send(string $to, string $subject, string $html, ?string $replyTo = null): bool
    {
        $driver = env('MAIL_DRIVER', 'log');
        if ($driver === 'smtp') {
            return self::smtp($to, $subject, $html, $replyTo);
        }
        return self::log($to, $subject, $html);
    }

    private static function log(string $to, string $subject, string $html): bool
    {
        $dir = __DIR__ . '/../storage';
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $entry = '[' . date('Y-m-d H:i:s') . "] TO: $to | SUBJECT: $subject\n$html\n" . str_repeat('-', 60) . "\n";
        return (bool) file_put_contents($dir . '/mail.log', $entry, FILE_APPEND);
    }

    private static function smtp(string $to, string $subject, string $html, ?string $replyTo = null): bool
    {
        $host = env('SMTP_HOST', 'smtp.gmail.com');
        $port = (int) env('SMTP_PORT', 587);
        $user = env('SMTP_USER');
        $pass = preg_replace('/\s+/', '', (string) env('SMTP_PASS')); // Gmail shows app passwords with spaces
        $from = env('MAIL_FROM', $user ?: 'no-reply@beadsboutiquejewellery.com');
        $fromName = env('MAIL_FROM_NAME', self::brand());

        if (!$user || !$pass) {
            self::log($to, $subject, $html); // not configured yet — don't break the flow
            return false;
        }

        $fp = @fsockopen($port === 465 ? "ssl://$host" : $host, $port, $errno, $errstr, 20);
        if (!$fp) {
            error_log("SMTP connect failed: $errstr ($errno)");
            self::log($to, $subject, $html);
            return false;
        }
        stream_set_timeout($fp, 20);

        // Reads a full (possibly multi-line) SMTP reply and returns its status code.
        $read = function () use ($fp): int {
            $code = 0; $line = '';
            while (($line = fgets($fp, 1024)) !== false) {
                $code = (int) substr($line, 0, 3);
                if (isset($line[3]) && $line[3] === ' ') break; // last line of the reply
            }
            return $code;
        };
        $cmd = function (string $c) use ($fp, $read): int { fwrite($fp, $c . "\r\n"); return $read(); };
        $fail = function (string $stage) use ($fp, $to, $subject, $html) {
            error_log("SMTP failed at: $stage");
            @fwrite($fp, "QUIT\r\n"); fclose($fp);
            self::log($to, $subject, $html); // graceful fallback
            return false;
        };

        if ($read() !== 220) return $fail('greeting');
        if ($cmd("EHLO beadsboutique") !== 250) return $fail('ehlo');
        if ($cmd("STARTTLS") !== 220) return $fail('starttls');
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
            return $fail('tls');
        }
        if ($cmd("EHLO beadsboutique") !== 250) return $fail('ehlo2');
        if ($cmd("AUTH LOGIN") !== 334) return $fail('auth');
        if ($cmd(base64_encode($user)) !== 334) return $fail('user');
        if ($cmd(base64_encode($pass)) !== 235) return $fail('pass (check the App Password)');
        if ($cmd("MAIL FROM:<$from>") !== 250) return $fail('mail from');
        if ($cmd("RCPT TO:<$to>") !== 250) return $fail('rcpt to');
        if ($cmd("DATA") !== 354) return $fail('data');

        // RFC 2047-encode non-ASCII text (emoji / ₹ in subjects, names) so mail clients render it
        $enc = fn (string $s) => preg_match('/[^\x20-\x7E]/', $s) ? '=?UTF-8?B?' . base64_encode($s) . '?=' : $s;
        $headers  = "From: " . $enc($fromName) . " <$from>\r\n";
        $headers .= "To: <$to>\r\n";
        if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $headers .= "Reply-To: <$replyTo>\r\n"; // replies go straight to the sender
        }
        $headers .= "Subject: " . $enc($subject) . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body = str_replace("\n.", "\n..", $html); // dot-stuffing
        if ($cmd($headers . "\r\n" . $body . "\r\n.") !== 250) return $fail('send');

        $cmd("QUIT");
        fclose($fp);
        return true;
    }

    /** Live brand name (admin-editable in Settings), used across every email. */
    /**
     * Where staff notifications go: the admin-set message inbox, else the public
     * contact address, else the first admin account. Empty when none is set.
     */
    public static function adminInbox(): string
    {
        $to = trim((string) Setting::get('store_contact_to', ''))
            ?: trim((string) Setting::get('store_contact_email', ''));
        if ($to === '') {
            try {
                $to = (string) (db()->query("SELECT email FROM users WHERE role='admin' ORDER BY id LIMIT 1")->fetchColumn() ?: '');
            } catch (\Throwable $e) {
                $to = '';
            }
        }
        return filter_var($to, FILTER_VALIDATE_EMAIL) ? $to : '';
    }

    /**
     * Send after the response reaches the client, so SMTP never delays checkout
     * or an admin action. Falls back to sending inline outside a web request
     * (CLI/cron), where there is no response to wait for.
     */
    public static function queue(string $to, string $subject, string $html): void
    {
        if ($to === '') {
            return;
        }
        if (PHP_SAPI === 'cli') {
            self::send($to, $subject, $html);
            return;
        }
        Response::defer(function () use ($to, $subject, $html) {
            self::send($to, $subject, $html);
        });
    }

    public static function brand(): string
    {
        return (string) Setting::get('store_name', 'Beadsboutique');
    }

    public static function otpTemplate(string $name, string $otp): string
    {
        $brand = self::brand();
        return "
        <div style='font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0b0b0f;color:#fff;border-radius:16px'>
            <h2 style='color:#c9a96a'>$brand</h2>
            <p>Hi $name,</p>
            <p>Your verification code is:</p>
            <div style='font-size:34px;letter-spacing:10px;font-weight:700;color:#c9a96a;margin:18px 0'>$otp</div>
            <p style='color:#aaa'>This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
        </div>";
    }

    /** Shared shell for transactional emails. */
    private static function shell(string $inner): string
    {
        $brand = self::brand();
        return "
        <div style='font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#0b0b0f;color:#fff;border-radius:16px'>
            <h2 style='color:#c9a96a;margin:0 0 16px'>$brand</h2>
            $inner
            <p style='color:#777;font-size:12px;margin-top:28px'>$brand · Premium fashion, curated for you.</p>
        </div>";
    }

    public static function orderPlacedTemplate(string $name, string $orderNumber, float $total): string
    {
        $amt = '₹' . number_format($total, 2);
        return self::shell("
            <p>Hi $name,</p>
            <p>Thanks for your order! We've received <b style='color:#c9a96a'>$orderNumber</b> and it's now being processed.</p>
            <p style='font-size:22px;font-weight:700;margin:18px 0'>$amt</p>
            <p style='color:#aaa'>We'll email you again when it ships. You can track it anytime from your account.</p>");
    }

    public static function orderStatusTemplate(string $name, string $orderNumber, string $status, ?string $carrier = null, ?string $tracking = null): string
    {
        $labels = [
            'processing' => "is now being processed",
            'packed'     => "has been packed and is ready to ship",
            'shipped'    => "has shipped 🚚",
            'delivered'  => "has been delivered ✅",
            'cancelled'  => "has been cancelled",
        ];
        $line = $labels[$status] ?? "status was updated to <b>$status</b>";
        $track = '';
        if ($status === 'shipped' && ($carrier || $tracking)) {
            $track = "<p style='margin-top:14px;padding:12px 16px;background:#15151c;border-radius:10px'>"
                . ($carrier ? "Carrier: <b>$carrier</b><br>" : '')
                . ($tracking ? "Tracking #: <b style='color:#c9a96a'>$tracking</b>" : '')
                . "</p>";
        }
        return self::shell("
            <p>Hi $name,</p>
            <p>Your order <b style='color:#c9a96a'>$orderNumber</b> $line.</p>
            $track");
    }

    public static function returnStatusTemplate(string $name, string $orderNumber, string $status, ?string $note = null): string
    {
        $labels = [
            'approved' => "has been <b style='color:#c9a96a'>approved</b>. Please ship the item back as instructed.",
            'rejected' => "could not be approved.",
            'refunded' => "has been <b style='color:#22c55e'>refunded</b> &#10003;. The amount reflects in 5&ndash;7 business days.",
        ];
        $line = $labels[$status] ?? "status was updated to <b>$status</b>.";
        $noteHtml = $note ? "<p style='margin-top:14px;padding:12px 16px;background:#15151c;border-radius:10px;color:#ddd'>Note from our team: $note</p>" : '';
        return self::shell("
            <p>Hi $name,</p>
            <p>Your return request for order <b style='color:#c9a96a'>$orderNumber</b> $line</p>
            $noteHtml");
    }

    /** Sent to the store admin when a customer submits a UPI payment to verify. */
    /**
     * Staff alert for every confirmed order — the one email that tells the store
     * there is something to pack. $items is [['product_name','quantity','price'], …].
     */
    public static function newOrderAdminTemplate(
        string $orderNumber, string $customer, string $phone, string $email,
        float $total, string $paymentMethod, string $paymentStatus, array $items, array $address
    ): string {
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
        $amt = '₹' . number_format($total, 2);
        $pay = strtoupper($paymentMethod) . ' · ' . $paymentStatus;
        $cod = strtolower($paymentMethod) === 'cod'
            ? "<span style='color:#f0b429'> — collect $amt on delivery</span>" : '';

        $rows = '';
        foreach ($items as $it) {
            $rows .= "<tr>
                <td style='padding:6px 0;color:#ddd'>" . $e($it['product_name'] ?? '') . "</td>
                <td style='padding:6px 0;text-align:center;color:#aaa'>× " . (int) ($it['quantity'] ?? 0) . "</td>
                <td style='padding:6px 0;text-align:right;color:#ddd'>₹" . number_format((float) ($it['line_total'] ?? $it['price'] ?? 0), 2) . "</td>
            </tr>";
        }

        $addrLine = implode(', ', array_filter([
            $address['line1'] ?? null, $address['line2'] ?? null, $address['city'] ?? null,
            $address['state'] ?? null, $address['pincode'] ?? null,
        ]));
        $ph = $phone ? '<br>Phone: <b>' . $e($phone) . '</b>' : '';

        return self::shell("
            <p style='font-size:15px'><b style='color:#c9a96a'>New order received</b></p>
            <p style='margin-top:14px;padding:12px 16px;background:#15151c;border-radius:10px'>
                Order: <b style='color:#c9a96a'>" . $e($orderNumber) . "</b><br>
                Customer: <b>" . $e($customer) . "</b>$ph<br>
                Email: " . $e($email) . "<br>
                Payment: <b>" . $e($pay) . "</b>$cod<br>
                Total: <b style='color:#c9a96a'>$amt</b>
            </p>
            <table style='width:100%;margin-top:14px;border-collapse:collapse;font-size:14px'>$rows</table>
            <p style='margin-top:14px;padding:12px 16px;background:#15151c;border-radius:10px;color:#ddd'>
                <b style='color:#c9a96a'>Ship to</b><br>" . $e($addrLine) . "
            </p>
            <p style='color:#aaa'>Open <b>Admin &rarr; Delivery</b> to book the shipment.</p>");
    }

    public static function upiPendingAdminTemplate(string $orderNumber, string $customer, string $phone, float $total, string $txnId): string
    {
        $amt = '₹' . number_format($total, 2);
        $ph = $phone ? "<br>Phone: <b>$phone</b>" : '';
        return self::shell("
            <p style='font-size:15px'><b style='color:#c9a96a'>New UPI payment awaiting verification</b></p>
            <p style='margin-top:14px;padding:12px 16px;background:#15151c;border-radius:10px'>
                Order: <b style='color:#c9a96a'>$orderNumber</b><br>
                Customer: <b>$customer</b>$ph<br>
                Amount: <b>$amt</b><br>
                Txn / Ref id: <b style='color:#c9a96a'>$txnId</b>
            </p>
            <p style='color:#aaa'>Open <b>Admin &rarr; Orders</b> to review the screenshot and approve or reject the payment.</p>");
    }

    /** Sent to the customer when their UPI payment could not be verified. */
    public static function upiRejectedTemplate(string $name, string $orderNumber, ?string $note = null): string
    {
        $noteHtml = $note ? "<p style='margin-top:14px;padding:12px 16px;background:#15151c;border-radius:10px;color:#ddd'>Note from our team: $note</p>" : '';
        return self::shell("
            <p>Hi $name,</p>
            <p>We couldn't verify the payment for your order <b style='color:#c9a96a'>$orderNumber</b>.</p>
            <p style='color:#aaa'>If you've already paid, please reply with the correct transaction id / screenshot and we'll sort it out. Otherwise you can place the order again.</p>
            $noteHtml");
    }

    /** Storefront base URL for CTA buttons in automated emails. */
    private static function storeUrl(): string
    {
        return rtrim((string) env('FRONTEND_URL', 'http://localhost:5190'), '/');
    }

    private static function button(string $label, string $href): string
    {
        return "<a href='$href' style='display:inline-block;margin-top:16px;padding:12px 24px;background:#b8745a;color:#3a0d14;border-radius:10px;text-decoration:none;font-weight:700'>$label</a>";
    }

    // ── Mail Automation drip templates ───────────────────────────────

    /** Welcome to the family — sent on delivery. */
    public static function welcomeTemplate(string $name): string
    {
        $url = self::storeUrl();
        return self::shell("
            <p style='font-size:16px'>Welcome to the family, <b>$name</b> ✨</p>
            <p>Your first order has arrived — thank you for choosing our handcrafted jewellery.
            Every piece is made and checked with care, so you can wear it with confidence.</p>
            <p style='color:#aaa'>We hope you love wearing it as much as we loved making it.</p>
            " . self::button('Explore the store', $url));
    }

    /** Jewellery care guide — sent the day the order is delivered. */
    public static function feedingGuideTemplate(string $name, array $productNames = []): string
    {
        $items = $productNames
            ? '<ul style="color:#ddd;margin:8px 0 0;padding-left:18px">'
              . implode('', array_map(fn($n) => "<li style='margin:4px 0'>" . htmlspecialchars($n) . '</li>', $productNames))
              . '</ul>'
            : '';
        return self::shell("
            <p>Hi $name,</p>
            <p>Your order has arrived 🎉 Here's how to get the best from it:</p>
            $items
            <div style='margin-top:14px;padding:14px 16px;background:#15151c;border-radius:10px;color:#ddd'>
                <b style='color:#b8745a'>Jewellery care tips</b>
                <p style='margin:8px 0 0'>• Put your jewellery on last — after perfume, lotion and make-up.<br>
                • Remove it before bathing, swimming, sleeping or exercising.<br>
                • Wipe gently with a soft, dry cloth after wearing.<br>
                • Store each piece separately in a dry pouch or box.</p>
            </div>
            <p style='color:#aaa'>Size guides and material details are on each product page.</p>");
    }

    /** 2-week check-in — sent 14 days after delivery. */
    public static function checkInTemplate(string $name): string
    {
        return self::shell("
            <p>Hi $name,</p>
            <p>It's been a couple of weeks — how are you enjoying your new pieces? 💎</p>
            <p>If anything isn't quite right, just reply to this email and our team will help you sort it out.</p>
            <p style='color:#aaa'>We're always here to help.</p>");
    }

    /** Review request (carries the referral code) — sent 20 days after delivery. */
    public static function reviewRequestTemplate(string $name, ?string $referralCode = null): string
    {
        $url = self::storeUrl();
        $ref = $referralCode ? "
            <div style='margin-top:18px;padding:14px 16px;background:#15151c;border-radius:10px'>
                <b style='color:#b8745a'>Share the love & earn</b>
                <p style='margin:8px 0 0;color:#ddd'>Refer a friend with your code
                <b style='color:#b8745a;letter-spacing:2px'>$referralCode</b> — they get a warm welcome and you get rewarded.</p>
            </div>" : '';
        return self::shell("
            <p>Hi $name,</p>
            <p>Loving your recent order? A quick <b>review</b> helps other jewellery lovers shop with confidence —
            and only takes a minute ⭐</p>
            " . self::button('Write a review', $url . '/orders') . "
            $ref");
    }

    /** Reorder reminder — sent ~27 days after delivery. */
    public static function reorderReminderTemplate(string $name): string
    {
        $url = self::storeUrl();
        return self::shell("
            <p>Hi $name,</p>
            <p>Ready for something new? ✨ Fresh beadwork lands every month — now's a great time to
            <b>add a new piece</b> to your collection.</p>
            <p style='color:#aaa'>Reorder favourites in one tap from your order history.</p>
            " . self::button('Reorder now', $url . '/orders'));
    }

    public static function resetTemplate(string $name, string $link): string
    {
        $brand = self::brand();
        return "
        <div style='font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0b0b0f;color:#fff;border-radius:16px'>
            <h2 style='color:#c9a96a'>$brand</h2>
            <p>Hi $name,</p>
            <p>Click below to reset your password (valid 30 minutes):</p>
            <a href='$link' style='display:inline-block;margin-top:12px;padding:12px 22px;background:#c9a96a;color:#000;border-radius:10px;text-decoration:none;font-weight:700'>Reset Password</a>
        </div>";
    }
}

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
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
        return self::shell("
            <p style='margin:0 0 12px'>Hi " . $e($name) . ",</p>
            <p style='margin:0'>Your verification code is:</p>
            <div style='font-size:34px;letter-spacing:10px;font-weight:700;color:#b8745a;margin:18px 0'>" . $e($otp) . "</div>
            <p style='color:#7a5a5f;margin:0'>This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>");
    }

    // ── Design system for every email: blush page, white card, wine-maroon header ──
    // Inline styles + tables only, so it renders the same in Gmail, Outlook and phones.

    private const C_INK = '#3a0d14';   // wine maroon (brand)
    private const C_GOLD = '#b8745a';  // rose gold accent
    private const C_BG = '#fbf4f2';    // blush page
    private const C_LINE = '#eedfdc';  // hairlines
    private const C_MUTED = '#7a5a5f'; // secondary text

    /** Shared shell for transactional emails. */
    private static function shell(string $inner, string $preheader = ''): string
    {
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
        $brand = $e(self::brand());
        $logo = (string) Setting::get('store_logo', '');
        // Email clients block data: images — only use a hosted logo.
        $head = preg_match('#^https?://#i', $logo)
            ? "<img src='" . $e($logo) . "' alt='$brand' height='44' style='height:44px;max-width:200px;border:0;display:block;margin:0 auto;background:#fff;border-radius:8px;padding:4px 8px'>"
            : "<span style='font-family:Georgia,serif;font-size:24px;font-weight:700;color:#fff;letter-spacing:.5px'>$brand</span>";

        $phone = trim((string) Setting::get('store_contact_phone', ''));
        $wa = preg_replace('/\D/', '', (string) Setting::get('store_whatsapp', ''));
        $mail = trim((string) Setting::get('store_contact_email', ''));
        $help = array_filter([
            $wa ? "<a href='https://wa.me/$wa' style='color:" . self::C_GOLD . ";text-decoration:none'>WhatsApp</a>" : '',
            $phone ? "<a href='tel:" . $e(preg_replace('/\s+/', '', $phone)) . "' style='color:" . self::C_GOLD . ";text-decoration:none'>" . $e($phone) . '</a>' : '',
            $mail ? "<a href='mailto:" . $e($mail) . "' style='color:" . self::C_GOLD . ";text-decoration:none'>" . $e($mail) . '</a>' : '',
        ]);
        $store = $e(self::storeUrl());
        $pre = $preheader !== '' ? "<div style='display:none;max-height:0;overflow:hidden;opacity:0'>" . $e($preheader) . '</div>' : '';

        return "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
<body style='margin:0;padding:0;background:" . self::C_BG . "'>$pre
<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background:" . self::C_BG . ";padding:24px 12px'><tr><td align='center'>
  <table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid " . self::C_LINE . ";font-family:Arial,Helvetica,sans-serif;color:" . self::C_INK . ";font-size:15px;line-height:1.55'>
    <tr><td align='center' style='background:" . self::C_INK . ";padding:22px 24px'><a href='$store' style='text-decoration:none'>$head</a></td></tr>
    <tr><td style='padding:28px 28px 8px'>$inner</td></tr>
    <tr><td style='padding:20px 28px 26px;border-top:1px solid " . self::C_LINE . ";text-align:center;font-size:12px;color:" . self::C_MUTED . "'>
      " . ($help ? 'Need help? ' . implode(' &nbsp;·&nbsp; ', $help) . '<br>' : '') . "
      <a href='$store' style='color:" . self::C_MUTED . ";text-decoration:none'>$brand</a> · Handcrafted beaded jewellery
    </td></tr>
  </table>
</td></tr></table></body></html>";
    }

    // ── Order emails (customer + admin), always rendered from the live order in the DB ──

    /** Order + items + address straight from the DB, or null if the order doesn't exist. */
    private static function loadOrder(int $orderId): ?array
    {
        $q = db()->prepare(
            'SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
             FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?'
        );
        $q->execute([$orderId]);
        $o = $q->fetch();
        if (!$o) {
            return null;
        }
        $it = db()->prepare('SELECT product_name, image_url, size, color, price, quantity, line_total FROM order_items WHERE order_id=?');
        $it->execute([$orderId]);
        $o['items'] = $it->fetchAll();
        $o['address'] = json_decode((string) ($o['shipping_address'] ?? ''), true) ?: [];
        return $o;
    }

    private static function money($v): string
    {
        $n = (float) $v;
        return '₹' . (floor($n) == $n ? number_format($n) : number_format($n, 2));
    }

    /** Small product thumbnail URL that email clients can show (hosted, JPG). */
    private static function thumb(?string $src): string
    {
        $src = (string) $src;
        if (!preg_match('#^https?://#i', $src)) {
            return '';
        }
        if (str_contains($src, 'res.cloudinary.com') && str_contains($src, '/image/upload/')) {
            $src = preg_replace('#\.(webp|avif|heic)$#i', '.jpg', str_replace('/image/upload/', '/image/upload/f_jpg,q_auto,w_140,h_140,c_fill/', $src));
        }
        return $src;
    }

    private static function itemsTable(array $o): string
    {
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
        $rows = '';
        foreach ($o['items'] as $it) {
            $img = self::thumb($it['image_url'] ?? '');
            $pic = $img
                ? "<img src='" . $e($img) . "' width='56' height='56' alt='' style='width:56px;height:56px;border-radius:10px;object-fit:cover;display:block;border:1px solid " . self::C_LINE . "'>"
                : "<div style='width:56px;height:56px;border-radius:10px;background:" . self::C_BG . "'></div>";
            $variant = implode(' · ', array_filter([$it['size'] ?? '', $it['color'] ?? '']));
            $rows .= "<tr>
              <td width='64' style='padding:10px 0;border-bottom:1px solid " . self::C_LINE . "'>$pic</td>
              <td style='padding:10px 10px;border-bottom:1px solid " . self::C_LINE . "'>
                <div style='font-weight:600'>" . $e($it['product_name']) . "</div>
                <div style='font-size:13px;color:" . self::C_MUTED . "'>Qty " . (int) $it['quantity'] . ' × ' . self::money($it['price']) . ($variant ? ' · ' . $e($variant) : '') . "</div>
              </td>
              <td align='right' style='padding:10px 0;border-bottom:1px solid " . self::C_LINE . ";font-weight:600;white-space:nowrap'>" . self::money($it['line_total']) . "</td>
            </tr>";
        }

        $line = fn ($label, $value, $style = '') =>
            "<tr><td colspan='2' style='padding:4px 0;color:" . self::C_MUTED . ";$style'>$label</td><td align='right' style='padding:4px 0;$style'>$value</td></tr>";
        $totals = $line('Subtotal', self::money($o['subtotal']));
        if ((float) $o['discount'] > 0) {
            $totals .= $line('Discount' . ($o['coupon_code'] ? ' (' . $e($o['coupon_code']) . ')' : ''), '−' . self::money($o['discount']), 'color:#15803d');
        }
        if ((int) $o['points_used'] > 0) {
            $totals .= $line('Loyalty points used', (int) $o['points_used'] . ' pts');
        }
        $totals .= $line('Shipping', (float) $o['shipping_fee'] > 0 ? self::money($o['shipping_fee']) : 'Free');
        $totals .= "<tr><td colspan='2' style='padding:10px 0 0;border-top:1px solid " . self::C_LINE . ";font-size:17px;font-weight:700'>Total</td>
                    <td align='right' style='padding:10px 0 0;border-top:1px solid " . self::C_LINE . ";font-size:17px;font-weight:700;color:" . self::C_GOLD . "'>" . self::money($o['total']) . '</td></tr>';

        return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='margin:8px 0 4px'>$rows</table>
                <table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='margin:8px 0 18px;font-size:14px'>$totals</table>";
    }

    private static function paymentLabel(array $o): string
    {
        $m = strtolower((string) $o['payment_method']);
        $method = ['cod' => 'Cash on Delivery', 'razorpay' => 'Online (Razorpay)', 'upi' => 'UPI'][$m] ?? strtoupper($m);
        $status = (string) $o['payment_status'] === 'paid' ? 'Paid' : ($m === 'cod' ? 'Pay ' . self::money($o['total']) . ' on delivery' : ucfirst((string) $o['payment_status']));
        return "$method · $status";
    }

    private static function infoBoxes(array $o): string
    {
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
        $a = $o['address'];
        $addr = implode('<br>', array_filter([
            '<b>' . $e($a['full_name'] ?? $o['customer_name']) . '</b>',
            $e(trim(($a['line1'] ?? '') . (empty($a['line2']) ? '' : ', ' . $a['line2']))),
            $e(trim(($a['city'] ?? '') . ', ' . ($a['state'] ?? '') . ' - ' . ($a['pincode'] ?? ''), ', -')),
            !empty($a['phone']) ? '📞 ' . $e($a['phone']) : '',
        ]));
        $placed = $o['placed_at'] ? date('d M Y, h:i A', strtotime($o['placed_at'])) : '';
        $box = "padding:14px 16px;background:" . self::C_BG . ";border-radius:12px;font-size:14px;vertical-align:top";
        return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='margin:0 0 18px'><tr>
          <td width='50%' style='$box'><div style='font-size:11px;letter-spacing:1px;text-transform:uppercase;color:" . self::C_GOLD . ";font-weight:700;margin-bottom:6px'>Delivering to</div>$addr</td>
          <td width='12' style='width:12px;min-width:12px;font-size:0;line-height:0'>&nbsp;</td>
          <td width='50%' style='$box'><div style='font-size:11px;letter-spacing:1px;text-transform:uppercase;color:" . self::C_GOLD . ";font-weight:700;margin-bottom:6px'>Order info</div>
            Order <b>" . $e($o['order_number']) . "</b><br>" . ($placed ? "Placed $placed<br>" : '') . $e(self::paymentLabel($o)) . '</td>
        </tr></table>';
    }

    /** 4-step tracker: Confirmed → Packed → Shipped → Delivered. */
    private static function progress(string $status): string
    {
        if ($status === 'cancelled') {
            return "<div style='margin:4px 0 20px;padding:12px 16px;border-radius:12px;background:#fdecec;color:#b42318;font-weight:600;text-align:center'>This order has been cancelled</div>";
        }
        $steps = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];
        $reached = ['pending' => 0, 'processing' => 0, 'packed' => 1, 'shipped' => 2, 'delivered' => 3][$status] ?? 0;
        $cells = '';
        foreach ($steps as $i => $label) {
            $on = $i <= $reached;
            $dot = $on ? self::C_GOLD : self::C_LINE;
            $cells .= "<td align='center' width='25%' style='font-size:12px;color:" . ($on ? self::C_INK : self::C_MUTED) . ";font-weight:" . ($on ? '700' : '400') . "'>
              <div style='height:6px;background:$dot;border-radius:3px;margin:0 3px 8px'></div>" . ($on ? '✓ ' : '') . "$label</td>";
        }
        return "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='margin:4px 0 22px'><tr>$cells</tr></table>";
    }

    /**
     * Customer email for an order event: 'placed' or a status
     * (processing / packed / shipped / delivered / cancelled).
     * Returns ['to','subject','html'] or null when there is nothing to send.
     */
    public static function orderEmail(int $orderId, string $event): ?array
    {
        $o = self::loadOrder($orderId);
        if (!$o || empty($o['customer_email'])) {
            return null;
        }
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
        $num = $e($o['order_number']);
        $name = $e(explode(' ', trim((string) ($o['customer_name'] ?: 'there')))[0]);
        $cod = strtolower((string) $o['payment_method']) === 'cod' && $o['payment_status'] !== 'paid';

        $copy = [
            'placed'     => ['Order confirmed 🎉', "Order $num confirmed", "Thank you for shopping with us, $name! We've received your order and our artisans are getting it ready."],
            'processing' => ['We\'re preparing your order', "Order $num is being prepared", "Good news, $name — your order is being prepared with care."],
            'packed'     => ['Your order is packed 📦', "Order $num is packed", "Your jewellery is packed and ready to be handed to our delivery partner, $name."],
            'shipped'    => ['Your order is on its way 🚚', "Order $num has shipped", "Exciting news, $name! Your order has left our studio and is on its way to you."],
            'delivered'  => ['Delivered — enjoy! ✨', "Order $num delivered", "Your order has been delivered, $name. We hope you love wearing it as much as we loved making it!"],
            'cancelled'  => ['Your order was cancelled', "Order $num cancelled", "Your order $num has been cancelled, $name."],
        ];
        if (!isset($copy[$event])) {
            return null;
        }
        [$heading, $subjectTail, $lead] = $copy[$event];
        $status = $event === 'placed' ? (string) $o['status'] : $event;

        // Event-specific extra block.
        $extra = '';
        if ($event === 'shipped') {
            $carrier = $o['courier_name'] ?: $o['carrier'];
            $awb = $o['awb_code'] ?: $o['tracking_number'];
            $trackUrl = $o['tracking_url'] ?: '';
            if ($carrier || $awb) {
                $extra .= "<div style='margin:0 0 18px;padding:14px 16px;border:1px dashed " . self::C_GOLD . ";border-radius:12px;font-size:14px'>"
                    . ($carrier ? 'Courier: <b>' . $e($carrier) . '</b><br>' : '')
                    . ($awb ? 'Tracking number: <b style="color:' . self::C_GOLD . '">' . $e($awb) . '</b>' : '')
                    . ($trackUrl ? "<br><a href='" . $e($trackUrl) . "' style='color:" . self::C_GOLD . ";font-weight:700'>Track with courier →</a>" : '')
                    . '</div>';
            }
            if ($o['shipment_eta']) {
                $extra .= "<p style='margin:0 0 18px'>Expected delivery: <b>" . $e(date('d M Y', strtotime($o['shipment_eta']))) . '</b></p>';
            }
        }
        if ($cod && in_array($event, ['placed', 'shipped', 'packed'], true)) {
            $extra .= "<p style='margin:0 0 18px;padding:12px 16px;background:#fff7e6;border-radius:12px;font-size:14px'>💵 Please keep <b>" . self::money($o['total']) . '</b> ready to pay on delivery (cash or UPI).</p>';
        }
        if ($event === 'cancelled' && $o['payment_status'] === 'paid' && strtolower((string) $o['payment_method']) !== 'cod') {
            $extra .= "<p style='margin:0 0 18px;padding:12px 16px;background:" . self::C_BG . ";border-radius:12px;font-size:14px'>Your payment of <b>" . self::money($o['total']) . '</b> will be refunded to the original payment method within 5–7 business days.</p>';
        }

        $orderUrl = self::storeUrl() . '/orders/' . (int) $o['id'];
        $cta = $event === 'delivered'
            ? self::button('Rate your purchase', $orderUrl) . "<span style='display:inline-block;width:8px'></span>" . self::button('Shop again', self::storeUrl() . '/shop', true)
            : self::button($event === 'shipped' ? 'Track your order' : 'View your order', $orderUrl);

        $html = self::shell("
            <h1 style='margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:" . self::C_INK . "'>$heading</h1>
            <p style='margin:0 0 20px;color:" . self::C_MUTED . "'>$lead</p>
            " . self::progress($status) . "
            $extra
            " . self::infoBoxes($o) . "
            <div style='font-size:11px;letter-spacing:1px;text-transform:uppercase;color:" . self::C_GOLD . ";font-weight:700'>Order summary</div>
            " . self::itemsTable($o) . "
            <div style='text-align:center;margin:6px 0 18px'>$cta</div>", strip_tags($lead));

        return [
            'to'      => (string) $o['customer_email'],
            'subject' => self::brand() . ' · ' . html_entity_decode($subjectTail, ENT_QUOTES, 'UTF-8'),
            'html'    => $html,
        ];
    }

    /** Queue the customer email for an order event (sent after the HTTP response). */
    public static function queueOrderEmail(int $orderId, string $event): void
    {
        try {
            if ($m = self::orderEmail($orderId, $event)) {
                self::queue($m['to'], $m['subject'], $m['html']);
            }
        } catch (\Throwable $e) {
            error_log('Order email failed: ' . $e->getMessage()); // never break the order flow
        }
    }

    /**
     * Store alert for an order: 'new' (everything needed to pack and ship it) or
     * 'cancelled' (customer cancelled — do not pack / ship).
     */
    public static function adminOrderEmail(int $orderId, string $kind = 'new'): ?array
    {
        $o = self::loadOrder($orderId);
        if (!$o) {
            return null;
        }
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
        $cod = strtolower((string) $o['payment_method']) === 'cod' && $o['payment_status'] !== 'paid';
        $phone = $o['address']['phone'] ?? $o['customer_phone'] ?? '';
        $waNum = preg_replace('/\D/', '', (string) $phone);
        if (strlen($waNum) === 10) {
            $waNum = '91' . $waNum;
        }
        $adminUrl = self::storeUrl() . '/admin/orders';
        $cancelled = $kind === 'cancelled';
        $heading = $cancelled ? 'Order cancelled by customer ❌' : 'New order received 🛍️';
        $prepaid = $o['payment_status'] === 'paid' && strtolower((string) $o['payment_method']) !== 'cod';
        $alert = $cancelled
            ? "<p style='margin:0 0 18px;padding:12px 16px;background:#fdecec;color:#b42318;border-radius:12px;font-size:14px;font-weight:600'>Do not pack or ship this order — items have been returned to stock."
              . ($prepaid ? ' The customer paid online: please refund ' . self::money($o['total']) . ' from the Razorpay dashboard.' : '') . '</p>'
            : ($cod ? "<p style='margin:0 0 18px;padding:12px 16px;background:#fff7e6;border-radius:12px;font-size:14px'>💵 Cash on Delivery — collect <b>" . self::money($o['total']) . '</b> on delivery.</p>' : '');

        $html = self::shell("
            <h1 style='margin:0 0 6px;font-family:Georgia,serif;font-size:24px'>$heading</h1>
            <p style='margin:0 0 18px;color:" . self::C_MUTED . "'>Order <b style='color:" . self::C_INK . "'>" . $e($o['order_number']) . '</b> · ' . self::money($o['total']) . ' · ' . $e(self::paymentLabel($o)) . "</p>
            $alert
            <div style='margin:0 0 18px;padding:14px 16px;background:" . self::C_BG . ";border-radius:12px;font-size:14px'>
              <div style='font-size:11px;letter-spacing:1px;text-transform:uppercase;color:" . self::C_GOLD . ";font-weight:700;margin-bottom:6px'>Customer</div>
              <b>" . $e($o['customer_name']) . '</b><br>' . $e($o['customer_email'])
              . ($phone ? '<br>📞 ' . $e($phone) . ($waNum ? " · <a href='https://wa.me/$waNum' style='color:" . self::C_GOLD . "'>WhatsApp</a>" : '') : '') . "
            </div>
            " . self::infoBoxes($o) . "
            <div style='font-size:11px;letter-spacing:1px;text-transform:uppercase;color:" . self::C_GOLD . ";font-weight:700'>" . ($cancelled ? 'Cancelled items' : 'Items to pack') . "</div>
            " . self::itemsTable($o) . "
            <div style='text-align:center;margin:6px 0 18px'>" . self::button('Open in Admin', $adminUrl) . '</div>',
            ($cancelled ? 'Cancelled: ' : 'New order ') . $o['order_number'] . ' — ' . self::money($o['total']));

        return [
            'subject' => $cancelled
                ? self::brand() . ' · ❌ Order ' . $o['order_number'] . ' cancelled by customer' . ($prepaid ? ' — refund ' . self::money($o['total']) : '')
                : self::brand() . ' · New order ' . $o['order_number'] . ' — ' . self::money($o['total']) . ($cod ? ' (COD)' : ''),
            'html'    => $html,
        ];
    }

    public static function returnStatusTemplate(string $name, string $orderNumber, string $status, ?string $note = null): string
    {
        $labels = [
            'approved' => "has been <b style='color:#b8745a'>approved</b>. Please ship the item back as instructed.",
            'rejected' => "could not be approved.",
            'refunded' => "has been <b style='color:#22c55e'>refunded</b> &#10003;. The amount reflects in 5&ndash;7 business days.",
        ];
        $line = $labels[$status] ?? "status was updated to <b>$status</b>.";
        $noteHtml = $note ? "<p style='margin-top:14px;padding:12px 16px;background:#fbf4f2;border-radius:10px;color:#3a0d14'>Note from our team: $note</p>" : '';
        return self::shell("
            <p>Hi $name,</p>
            <p>Your return request for order <b style='color:#b8745a'>$orderNumber</b> $line</p>
            $noteHtml");
    }

    /** Sent to the store admin when a customer submits a UPI payment to verify. */
    public static function upiPendingAdminTemplate(string $orderNumber, string $customer, string $phone, float $total, string $txnId): string
    {
        $amt = '₹' . number_format($total, 2);
        $ph = $phone ? "<br>Phone: <b>$phone</b>" : '';
        return self::shell("
            <p style='font-size:15px'><b style='color:#b8745a'>New UPI payment awaiting verification</b></p>
            <p style='margin-top:14px;padding:12px 16px;background:#fbf4f2;border-radius:10px'>
                Order: <b style='color:#b8745a'>$orderNumber</b><br>
                Customer: <b>$customer</b>$ph<br>
                Amount: <b>$amt</b><br>
                Txn / Ref id: <b style='color:#b8745a'>$txnId</b>
            </p>
            <p style='color:#7a5a5f'>Open <b>Admin &rarr; Orders</b> to review the screenshot and approve or reject the payment.</p>");
    }

    /** Sent to the customer when their UPI payment could not be verified. */
    public static function upiRejectedTemplate(string $name, string $orderNumber, ?string $note = null): string
    {
        $noteHtml = $note ? "<p style='margin-top:14px;padding:12px 16px;background:#fbf4f2;border-radius:10px;color:#3a0d14'>Note from our team: $note</p>" : '';
        return self::shell("
            <p>Hi $name,</p>
            <p>We couldn't verify the payment for your order <b style='color:#b8745a'>$orderNumber</b>.</p>
            <p style='color:#7a5a5f'>If you've already paid, please reply with the correct transaction id / screenshot and we'll sort it out. Otherwise you can place the order again.</p>
            $noteHtml");
    }

    /** Storefront base URL for CTA buttons in automated emails. */
    private static function storeUrl(): string
    {
        return rtrim((string) env('FRONTEND_URL', 'http://localhost:5190'), '/');
    }

    private static function button(string $label, string $href, bool $secondary = false): string
    {
        $href = htmlspecialchars($href, ENT_QUOTES, 'UTF-8');
        $style = $secondary
            ? 'background:#ffffff;color:' . self::C_INK . ';border:1.5px solid ' . self::C_INK
            : 'background:' . self::C_INK . ';color:#ffffff;border:1.5px solid ' . self::C_INK;
        return "<a href='$href' style='display:inline-block;margin-top:8px;padding:12px 26px;$style;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px'>$label</a>";
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
            <p style='color:#7a5a5f'>We hope you love wearing it as much as we loved making it.</p>
            " . self::button('Explore the store', $url));
    }

    /** Jewellery care guide — sent the day the order is delivered. */
    public static function feedingGuideTemplate(string $name, array $productNames = []): string
    {
        $items = $productNames
            ? '<ul style="color:#3a0d14;margin:8px 0 0;padding-left:18px">'
              . implode('', array_map(fn($n) => "<li style='margin:4px 0'>" . htmlspecialchars($n) . '</li>', $productNames))
              . '</ul>'
            : '';
        return self::shell("
            <p>Hi $name,</p>
            <p>Your order has arrived 🎉 Here's how to get the best from it:</p>
            $items
            <div style='margin-top:14px;padding:14px 16px;background:#fbf4f2;border-radius:10px;color:#3a0d14'>
                <b style='color:#b8745a'>Jewellery care tips</b>
                <p style='margin:8px 0 0'>• Put your jewellery on last — after perfume, lotion and make-up.<br>
                • Remove it before bathing, swimming, sleeping or exercising.<br>
                • Wipe gently with a soft, dry cloth after wearing.<br>
                • Store each piece separately in a dry pouch or box.</p>
            </div>
            <p style='color:#7a5a5f'>Size guides and material details are on each product page.</p>");
    }

    /** 2-week check-in — sent 14 days after delivery. */
    public static function checkInTemplate(string $name): string
    {
        return self::shell("
            <p>Hi $name,</p>
            <p>It's been a couple of weeks — how are you enjoying your new pieces? 💎</p>
            <p>If anything isn't quite right, just reply to this email and our team will help you sort it out.</p>
            <p style='color:#7a5a5f'>We're always here to help.</p>");
    }

    /** Review request (carries the referral code) — sent 20 days after delivery. */
    public static function reviewRequestTemplate(string $name, ?string $referralCode = null): string
    {
        $url = self::storeUrl();
        $ref = $referralCode ? "
            <div style='margin-top:18px;padding:14px 16px;background:#fbf4f2;border-radius:10px'>
                <b style='color:#b8745a'>Share the love & earn</b>
                <p style='margin:8px 0 0;color:#3a0d14'>Refer a friend with your code
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
            <p style='color:#7a5a5f'>Reorder favourites in one tap from your order history.</p>
            " . self::button('Reorder now', $url . '/orders'));
    }

    public static function resetTemplate(string $name, string $link): string
    {
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
        return self::shell("
            <p style='margin:0 0 12px'>Hi " . $e($name) . ",</p>
            <p style='margin:0 0 6px'>Click below to reset your password (valid for 30 minutes):</p>
            <div style='text-align:center;margin:14px 0 18px'>" . self::button('Reset Password', $link) . "</div>
            <p style='color:#7a5a5f;font-size:13px;margin:0'>If you didn't ask for this, you can safely ignore this email.</p>");
    }
}

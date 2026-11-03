<?php
class MiscController
{
    /**
     * GET /api/products/{id}/thumb — public passthrough for a product's primary image.
     * Keeps list/search JSON tiny: heavy admin-uploaded base64 images are streamed
     * as real binary (cached) here instead of being embedded in every response.
     *   - http(s) URL   → 302 redirect to it
     *   - data:... URI  → decode base64 and stream with the right content-type
     *   - none          → 404
     */
    public function productImage(array $p): void
    {
        $stmt = db()->prepare(
            'SELECT image_url FROM product_images WHERE product_id=? ORDER BY is_primary DESC LIMIT 1'
        );
        $stmt->execute([(int) ($p['id'] ?? 0)]);
        self::streamImage($stmt->fetchColumn());
    }

    /** GET /api/categories/{slug}/thumb — public passthrough for a category image. */
    public function categoryImage(array $p): void
    {
        $stmt = db()->prepare('SELECT image_url FROM categories WHERE slug=? LIMIT 1');
        $stmt->execute([(string) ($p['slug'] ?? '')]);
        self::streamImage($stmt->fetchColumn());
    }

    /** GET /api/banners/{id}/image — stream a banner image outside the JSON payload. */
    public function bannerImage(array $p): void
    {
        $stmt = db()->prepare('SELECT image_url FROM banners WHERE id=? AND is_active=1 LIMIT 1');
        $stmt->execute([(int) ($p['id'] ?? 0)]);
        self::streamImage($stmt->fetchColumn());
    }

    /**
     * Serve an image reference as real binary (keeps list/search JSON tiny — heavy
     * admin-uploaded base64 images live here, cached, not embedded in every response).
     *   - http(s) URL   → 302 redirect to it
     *   - data:... URI  → decode base64 and stream with the right content-type
     *   - none / bad    → 404
     */
    private static function streamImage($img): void
    {
        if (!$img) {
            http_response_code(404);
            exit;
        }
        if (preg_match('#^https?://#i', $img)) {
            header('Location: ' . $img, true, 302);
            exit;
        }
        if (str_starts_with($img, 'data:') && preg_match('#^data:([^;,]*)[^,]*,(.*)$#s', $img, $m)) {
            $mime = $m[1] !== '' ? $m[1] : 'image/png';
            $data = base64_decode($m[2], true);
            if ($data !== false) {
                header('Content-Type: ' . $mime);
                header('Cache-Control: public, max-age=604800');
                header('Content-Length: ' . strlen($data));
                echo $data;
                exit;
            }
        }
        http_response_code(404);
        exit;
    }

    /** Absolute base URL of this API (e.g. http://host/CloudFashion/backend). */
    public static function apiBase(): string
    {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
        return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $dir;
    }

    public function newsletter(array $p): void
    {
        $email = Request::input('email');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Valid email required', 422);
        }
        db()->prepare('INSERT IGNORE INTO newsletter (email) VALUES (?)')->execute([$email]);
        Response::success(null, 'Subscribed to newsletter');
    }

    public function contact(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, [
            'name'    => 'required|min:2',
            'email'   => 'required|email',
            'message' => 'required|min:5',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }

        $name    = trim($data['name']);
        $email   = trim($data['email']);
        $subject = trim($data['subject'] ?? '') ?: 'New message';
        $message = trim($data['message']);

        // 1) Persist so the team never loses a message (visible in Admin → Messages).
        db()->prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?,?,?,?)')
            ->execute([$name, $email, $subject, $message]);

        // 2) Notify the store inbox. Reply-To = customer so a reply reaches them.
        $inbox = Setting::get('store_contact_to') ?: env('MAIL_FROM', 'nutsvally@gmail.com');
        $e = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        Mailer::send(
            $inbox,
            'Contact form: ' . $subject,
            "<p><b>{$e($name)}</b> &lt;{$e($email)}&gt;</p>"
              . '<p><b>Subject:</b> ' . $e($subject) . '</p>'
              . '<p>' . nl2br($e($message)) . '</p>',
            $email
        );
        Response::success(null, 'Message sent. We will get back to you soon.');
    }

    /** GET /api/landing — public, admin-editable copy for the landing hero + story. */
    public function landing(array $p): void
    {
        // Live store numbers for the brand-intro strip (real DB counts, no hardcoded figures).
        $db = db();
        $reviews = $db->query('SELECT COUNT(*) AS n, ROUND(AVG(rating), 1) AS avg FROM reviews WHERE is_hidden = 0')->fetch();
        $stats = [
            'customers'    => (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn(),
            'products'     => (int) $db->query('SELECT COUNT(*) FROM products WHERE is_active = 1')->fetchColumn(),
            'categories'   => (int) $db->query('SELECT COUNT(*) FROM categories WHERE is_active = 1')->fetchColumn(),
            'reviews'      => (int) ($reviews['n'] ?? 0),
            'avg_rating'   => $reviews['avg'] !== null ? (float) $reviews['avg'] : null,
        ];

        Response::success([
            'hero_eyebrow'  => Setting::get('landing_hero_eyebrow', 'NutValley — Premium Nuts & Dry Fruits'),
            'hero_title'    => Setting::get('landing_hero_title', 'Nature\'s finest, packed fresh.'),
            'hero_accent'   => Setting::get('landing_hero_accent', 'Healthy snacking made easy.'),
            'hero_subtitle' => Setting::get('landing_hero_subtitle', 'Almonds, cashews, pistachios, walnuts, dates & more — delivered across India.'),
            'hero_cta'      => Setting::get('landing_hero_cta', 'Shop Now'),
            'hero_cta_link' => Setting::get('landing_hero_cta_link', '/shop'),
            'story_quote'   => Setting::get('landing_story_quote', 'Our mission is simple — pure, fresh nuts and dry fruits that make every day a little healthier.'),
            'stats'         => $stats,
            // Editorial imagery (admin-editable URLs; empty -> frontend uses its built-in default).
            'hero_image'    => Setting::get('landing_img_hero', ''),
            'intro_image'   => Setting::get('landing_img_intro', ''),
            'men_image'     => Setting::get('landing_img_men', ''),
            'women_image'   => Setting::get('landing_img_women', ''),
            'kids_image'    => Setting::get('landing_img_kids', ''),
            'newarrival_image' => Setting::get('landing_img_newarrival', ''),
        ]);
    }

    /** GET /api/store-info — public store config (contact, announcement, socials…). */
    public function storeInfo(array $p): void
    {
        Response::success([
            'name'              => Setting::get('store_name', 'NutValley'),
            'logo'              => Setting::get('store_logo', ''),
            'email'             => Setting::get('store_contact_email', 'nutsvally@gmail.com'),
            'phone'             => Setting::get('store_contact_phone', '+91 98765 43210'),
            'address'           => Setting::get('store_address', 'Bengaluru, India'),
            'announcement'      => Setting::get('store_announcement', ''),
            'free_shipping_min' => (int) Setting::get('store_free_shipping_min', 0),
            'instagram'         => Setting::get('store_instagram', ''),
            'facebook'          => Setting::get('store_facebook', ''),
            'twitter'           => Setting::get('store_twitter', ''),
            'whatsapp'          => Setting::get('store_whatsapp', ''),
        ]);
    }

    /**
     * Public payee details for the checkout UPI / QR payment panel.
     * Returns the admin-configured UPI id, payee name, optional static QR image
     * and bank-account details. No secrets here — a UPI id is meant to be shared.
     */
    public function paymentInfo(array $p): void
    {
        $upiId = Setting::get('upi_id', '');
        Response::success([
            'upi_enabled'    => $upiId !== '',
            // Payment rule: orders up to this amount are COD-only; above it, online-only.
            'cod_max_amount' => (float) Setting::get('cod_max_amount', 1000),
            'upi_id'         => $upiId,
            'payee_name'     => Setting::get('upi_payee_name', '') ?: Setting::get('store_name', 'NutValley'),
            'qr_image'       => Setting::get('upi_qr_image', ''),
            'bank_name'      => Setting::get('bank_name', ''),
            'account_name'   => Setting::get('bank_account_name', ''),
            'account_number' => Setting::get('bank_account_number', ''),
            'ifsc'           => Setting::get('bank_ifsc', ''),
        ]);
    }

    /** Public list of active, non-expired coupons (for the offers banner). */
    public function offers(array $p): void
    {
        $rows = db()->query(
            "SELECT code, type, value, min_order, max_discount, first_order_only, expires_at
             FROM coupons
             WHERE is_active = 1
               AND (expires_at IS NULL OR expires_at > NOW())
               AND (usage_limit IS NULL OR used_count < usage_limit)
             ORDER BY value DESC"
        )->fetchAll();
        Response::success($rows);
    }

    /** Public homepage banners. */
    public function banners(array $p): void
    {
        $rows = db()->query(
            'SELECT id, title, subtitle, cta_label, cta_link, image_url
             FROM banners WHERE is_active = 1 ORDER BY sort_order, id'
        )->fetchAll();
        $base = self::apiBase();
        foreach ($rows as &$row) {
            // Large base64 uploads must not block JSON parsing or carousel rendering.
            // The browser loads them independently as cached image resources instead.
            if (str_starts_with((string) $row['image_url'], 'data:')) {
                $row['image_url'] = $base . '/api/banners/' . (int) $row['id'] . '/image';
            }
        }
        unset($row);
        Response::success($rows);
    }

    /** Register interest in an out-of-stock product. */
    public function notifyStock(array $p): void
    {
        $data = Request::body();
        $productId = (int) ($data['product_id'] ?? 0);
        $email = $data['email'] ?? null;
        if (!$productId || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Valid product and email are required', 422);
        }
        db()->prepare(
            'INSERT IGNORE INTO stock_notifications (product_id, email) VALUES (?,?)'
        )->execute([$productId, $email]);
        Response::success(null, "We'll email you when it's back in stock");
    }

    public function recentlyViewed(array $p): void
    {
        $userId = Auth::id();
        $stmt = db()->prepare(
            "SELECT p.*, (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM recently_viewed rv JOIN products p ON p.id=rv.product_id
             WHERE rv.user_id=? AND p.is_active=1 ORDER BY rv.viewed_at DESC LIMIT 10"
        );
        $stmt->execute([$userId]);
        Response::success($stmt->fetchAll());
    }

    public function trackView(array $p): void
    {
        $user = Auth::optional();
        if (!$user) {
            Response::success(null); // anonymous - tracked client-side
        }
        $productId = (int) Request::input('product_id');
        if ($productId) {
            db()->prepare(
                'INSERT INTO recently_viewed (user_id, product_id) VALUES (?,?)
                 ON DUPLICATE KEY UPDATE viewed_at=NOW()'
            )->execute([(int) $user['sub'], $productId]);
        }
        Response::success(null);
    }
}

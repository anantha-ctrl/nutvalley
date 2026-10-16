<?php
/** Store-wide settings (contact details, message inbox) — admin editable. */
class AdminSettingsController
{
    // key => validate-as ('email' keys are validated as addresses; others free text).
    const FIELDS = [
        'store_name'              => 'text',
        'store_logo'              => 'text',
        'store_contact_email'     => 'email',
        'store_contact_phone'     => 'text',
        'store_address'           => 'text',
        'store_contact_to'        => 'email',
        'store_announcement'      => 'text',
        'store_free_shipping_min' => 'number',
        'store_base_shipping'     => 'number',
        'store_instagram'         => 'text',
        'store_facebook'          => 'text',
        'store_twitter'           => 'text',
        'store_whatsapp'          => 'text',
        // Homepage (landing) storytelling copy — live on the landing hero + story.
        'landing_hero_eyebrow'    => 'text',
        'landing_hero_title'      => 'text',
        'landing_hero_accent'     => 'text',
        'landing_hero_subtitle'   => 'text',
        'landing_hero_cta'        => 'text',
        'landing_hero_cta_link'   => 'text',
        'landing_story_quote'     => 'text',
        // Landing imagery (URLs)
        'landing_img_hero'        => 'text',
        'landing_img_intro'       => 'text',
        'landing_img_men'         => 'text',
        'landing_img_newarrival'  => 'text',
        // Orders & payment rules
        'order_prefix'            => 'text',
        'cod_max_amount'          => 'number',
        // Billing / POS invoice defaults
        'billing_tax_pct'         => 'number',
        'billing_invoice_prefix'  => 'text',
        'billing_footer_note'     => 'text',
        // Online UPI / QR payment (manual, admin-verified)
        'upi_id'                  => 'text',
        'upi_payee_name'          => 'text',
        'upi_qr_image'            => 'text',
        'bank_account_name'       => 'text',
        'bank_account_number'     => 'text',
        'bank_ifsc'               => 'text',
        'bank_name'               => 'text',
    ];

    /** Current values for every known setting (any prefix). */
    private static function collect(): array
    {
        $out = [];
        foreach (self::FIELDS as $key => $_) {
            $out[$key] = Setting::get($key, '');
        }
        return $out;
    }

    /** GET /api/admin/settings — current store settings. */
    public function index(array $p): void
    {
        Auth::admin();
        Response::success(self::collect());
    }

    /** PUT /api/admin/settings — save changed store settings. */
    public function update(array $p): void
    {
        Auth::admin();
        $body = Request::body();
        foreach (self::FIELDS as $key => $type) {
            if (!array_key_exists($key, $body)) {
                continue;
            }
            $val = trim((string) $body[$key]);
            if ($type === 'email' && $val !== '' && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
                Response::error('Invalid email for ' . str_replace('_', ' ', $key), 422);
            }
            if ($type === 'number') {
                $val = (string) max(0, (int) $val);
            }
            // Image uploads (store logo + landing images): push data URIs to Cloudinary
            // when configured, else store them inline (settings.value is MEDIUMTEXT).
            $isImageKey = $key === 'store_logo' || $key === 'upi_qr_image' || str_starts_with($key, 'landing_img_');
            if ($isImageKey && str_starts_with($val, 'data:image')) {
                try {
                    $up = Cloudinary::upload($val, 'beadsboutique/branding');
                    if ($up && !empty($up['url'])) {
                        $val = $up['url'];
                    }
                } catch (\Throwable $e) {
                    // Fall back to storing inline base64 in MEDIUMTEXT
                }
            }
            Setting::set($key, $val);
        }
        Response::success(self::collect(), 'Settings saved');
    }
}

-- Migration 016: more admin-editable store settings.
--   Drive the announcement bar, free-shipping threshold, socials & WhatsApp
--   from the DB instead of hardcoded values.

INSERT INTO settings (`key`, `value`) VALUES
  ('store_name',              'Novo Clothing'),
  ('store_announcement',      'FREE SHIPPING OVER ₹1999 · EASY 7-DAY RETURNS · USE CODE WELCOME10'),
  ('store_free_shipping_min', '1999'),
  ('store_base_shipping',     '79'),
  ('store_instagram',         'https://www.instagram.com/cloud_fashion_001/'),
  ('store_facebook',          ''),
  ('store_twitter',           ''),
  ('store_whatsapp',          '919876543210')
ON DUPLICATE KEY UPDATE `value` = `value`;

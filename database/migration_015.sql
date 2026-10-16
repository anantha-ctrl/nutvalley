-- Migration 015: store-wide, admin-editable contact details.
--   * Shown on the public Contact page.
--   * store_contact_email also receives Contact Us submissions.

INSERT INTO settings (`key`, `value`) VALUES
  ('store_contact_email', 'support@cloudfashion.com'),
  ('store_contact_phone', '+91 98765 43210'),
  ('store_address',       'Bengaluru, India')
ON DUPLICATE KEY UPDATE `value` = `value`;

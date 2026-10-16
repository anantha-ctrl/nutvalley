-- Migration 024 — Manual UPI / QR-code payment with admin approval
-- Adds a "pay by UPI/QR" online option (no Razorpay gateway required):
-- the customer scans a QR / pays to the UPI ID, enters the transaction id and
-- uploads a screenshot; the order waits for admin verification before it is
-- confirmed. Everything is stored in the DB and reviewed from Admin -> Orders.

-- 1) New online payment method + proof / approval columns on orders.
ALTER TABLE orders
  MODIFY payment_method ENUM('razorpay','cod','upi') NOT NULL DEFAULT 'razorpay';

ALTER TABLE orders
  ADD COLUMN payment_txn_id     VARCHAR(120) NULL AFTER razorpay_payment_id,
  ADD COLUMN payment_screenshot MEDIUMTEXT   NULL AFTER payment_txn_id,
  ADD COLUMN payment_approval   ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none' AFTER payment_screenshot,
  ADD COLUMN payment_note       VARCHAR(255) NULL AFTER payment_approval,
  ADD COLUMN payment_reviewed_at DATETIME    NULL AFTER payment_note;

-- 2) Admin-editable payee details (shown on the checkout QR/account panel).
INSERT INTO settings (`key`, `value`) VALUES
  ('upi_id',              ''),
  ('upi_payee_name',      ''),
  ('upi_qr_image',        ''),
  ('bank_account_name',   ''),
  ('bank_account_number', ''),
  ('bank_ifsc',           ''),
  ('bank_name',           '')
ON DUPLICATE KEY UPDATE `value` = `value`;

-- Migration 012: editable settings store + loyalty earning cap.
--   * A simple key/value settings table so admins can tune business rules
--     without code changes.
--   * Seeds the loyalty programme rules, including a NEW per-order earning cap
--     (max points earned on any single order, regardless of cart size).

CREATE TABLE IF NOT EXISTS settings (
  `key`      VARCHAR(64) NOT NULL PRIMARY KEY,
  `value`    VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO settings (`key`, `value`) VALUES
  ('loyalty_earn_rate_pct',  '5'),
  ('loyalty_earn_cap',       '25'),
  ('loyalty_redeem_cap_pct', '50'),
  ('loyalty_signup_bonus',   '50'),
  ('loyalty_referral_bonus', '100')
ON DUPLICATE KEY UPDATE `value` = `value`;

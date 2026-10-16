-- Migration 010: Loyalty points & referrals.
--   * Customers earn points on every order and can redeem them at checkout
--     (1 point = Rs.1).
--   * Each customer has a referral code; referring a friend rewards both.

ALTER TABLE users
  ADD COLUMN loyalty_points INT NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN referral_code  VARCHAR(12) NULL AFTER loyalty_points,
  ADD COLUMN referred_by    BIGINT UNSIGNED NULL AFTER referral_code,
  ADD UNIQUE KEY uniq_referral_code (referral_code);

ALTER TABLE orders
  ADD COLUMN points_used   INT NOT NULL DEFAULT 0 AFTER total,
  ADD COLUMN points_earned INT NOT NULL DEFAULT 0 AFTER points_used;

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  points     INT NOT NULL,                 -- positive = credit, negative = debit
  type       ENUM('earn','redeem','referral','signup') NOT NULL,
  order_id   BIGINT UNSIGNED NULL,
  note       VARCHAR(160) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

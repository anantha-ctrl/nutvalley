-- Migration 009: Returns & Refunds (RMA).
-- A customer can request a return on a delivered order; an admin approves /
-- rejects, and on refund the items are restocked and payment marked refunded.

ALTER TABLE orders
  MODIFY status ENUM('pending','processing','packed','shipped','delivered','cancelled','returned')
  NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS returns (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id   BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  reason     VARCHAR(500) NOT NULL,
  status     ENUM('requested','approved','rejected','refunded') NOT NULL DEFAULT 'requested',
  admin_note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_return_order (order_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 032: Mail Automation — a scheduled drip of lifecycle emails.
--   order_confirmation  → immediately when the order is placed
--   welcome             → on delivery
--   feeding_guide       → on delivery (same day the product arrives)
--   check_in            → 14 days after delivery
--   review_request      → 20 days after delivery (carries the referral code)
--   reorder_reminder    → 27 days after delivery (25–30 day window)
-- A cron/admin runner sends every row whose scheduled_at has passed.

CREATE TABLE IF NOT EXISTS email_automations (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id     BIGINT NULL,
  user_id      BIGINT NULL,
  email        VARCHAR(255) NOT NULL,
  type         VARCHAR(40)  NOT NULL,
  scheduled_at DATETIME     NOT NULL,
  sent_at      DATETIME     NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending',   -- pending | sent | failed | skipped
  error        VARCHAR(255) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_order_type (order_id, type),
  KEY idx_due (status, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Config (admin-editable in Admin → Automation). '1' = on. *_offset = days after delivery.
INSERT INTO settings (`key`,`value`) VALUES
  ('automation_enabled',                 '1'),
  ('automation_welcome_enabled',         '1'),
  ('automation_welcome_offset',          '0'),
  ('automation_feeding_guide_enabled',   '1'),
  ('automation_feeding_guide_offset',    '0'),
  ('automation_check_in_enabled',        '1'),
  ('automation_check_in_offset',         '14'),
  ('automation_review_request_enabled',  '1'),
  ('automation_review_request_offset',   '20'),
  ('automation_reorder_reminder_enabled','1'),
  ('automation_reorder_reminder_offset', '27')
ON DUPLICATE KEY UPDATE `value` = `value`;   -- keep existing edits on re-run

-- ============================================================
-- Migration 036: Delivery partner (courier API) integration
--
-- Adds live shipment fields to `orders`, a scan-event log table
-- (`shipment_events`) that powers real-time tracking timelines,
-- and the settings rows that hold the partner credentials.
-- Safe to re-run.
-- ============================================================

-- ---- orders: live shipment state from the courier API -------
ALTER TABLE orders
    ADD COLUMN delivery_provider   VARCHAR(30)  NULL DEFAULT NULL COMMENT 'shiprocket | delhivery | manual'
        AFTER tracking_number,
    ADD COLUMN shipment_id         VARCHAR(80)  NULL DEFAULT NULL COMMENT 'provider shipment id'
        AFTER delivery_provider,
    ADD COLUMN shipment_order_id   VARCHAR(80)  NULL DEFAULT NULL COMMENT 'provider order id'
        AFTER shipment_id,
    ADD COLUMN awb_code            VARCHAR(80)  NULL DEFAULT NULL COMMENT 'airway bill / waybill no'
        AFTER shipment_order_id,
    ADD COLUMN courier_name        VARCHAR(120) NULL DEFAULT NULL
        AFTER awb_code,
    ADD COLUMN shipment_status     VARCHAR(60)  NULL DEFAULT NULL COMMENT 'raw courier status text'
        AFTER courier_name,
    ADD COLUMN shipment_eta        DATE         NULL DEFAULT NULL COMMENT 'estimated delivery date'
        AFTER shipment_status,
    ADD COLUMN label_url           VARCHAR(500) NULL DEFAULT NULL
        AFTER shipment_eta,
    ADD COLUMN tracking_url        VARCHAR(500) NULL DEFAULT NULL
        AFTER label_url,
    ADD COLUMN shipment_synced_at  TIMESTAMP    NULL DEFAULT NULL COMMENT 'last live poll'
        AFTER tracking_url;

ALTER TABLE orders ADD INDEX idx_order_awb (awb_code);

-- ---- shipment_events: every courier scan (real-time timeline) ----
CREATE TABLE IF NOT EXISTS shipment_events (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id    BIGINT UNSIGNED NOT NULL,
    awb_code    VARCHAR(80)     NULL,
    status      VARCHAR(120)    NOT NULL,
    activity    VARCHAR(255)    NULL,
    location    VARCHAR(160)    NULL,
    event_at    DATETIME        NULL,
    fingerprint CHAR(40)        NOT NULL COMMENT 'sha1(status|activity|event_at) — de-dupes re-polls',
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_event (order_id, fingerprint),
    INDEX idx_se_order (order_id, event_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- settings: delivery partner configuration ---------------
INSERT INTO settings (`key`, `value`) VALUES
  ('delivery_provider',        'none'),
  ('delivery_api_key',         ''),
  ('delivery_api_secret',      ''),
  ('delivery_email',           ''),
  ('delivery_token',           ''),
  ('delivery_token_expires',   '0'),
  ('delivery_pickup_location', 'Primary'),
  ('delivery_pickup_pincode',  ''),
  ('delivery_auto_ship',       '0'),
  ('delivery_default_weight',  '0.5'),
  ('delivery_default_length',  '15'),
  ('delivery_default_breadth', '12'),
  ('delivery_default_height',  '8'),
  ('delivery_channel_id',      ''),
  ('delivery_sandbox',         '0')
ON DUPLICATE KEY UPDATE `value` = `value`;

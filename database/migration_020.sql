-- ============================================================
-- Migration 020 — In-store Billing / POS (invoicing)
-- Counter billing: cashier builds a bill, decrements live stock,
-- records the sale, and prints an invoice. Fully DB-backed.
-- ============================================================

CREATE TABLE IF NOT EXISTS bills (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bill_number     VARCHAR(30)     NOT NULL UNIQUE,
    cashier_id      BIGINT UNSIGNED DEFAULT NULL,          -- admin who rang it up
    user_id         BIGINT UNSIGNED DEFAULT NULL,          -- linked registered customer (optional)
    customer_name   VARCHAR(120)    DEFAULT NULL,
    customer_phone  VARCHAR(20)     DEFAULT NULL,
    subtotal        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    discount        DECIMAL(10,2)   NOT NULL DEFAULT 0,     -- resolved rupee discount
    discount_type   ENUM('flat','percent') NOT NULL DEFAULT 'flat',
    discount_value  DECIMAL(10,2)   NOT NULL DEFAULT 0,     -- raw entry (₹ or %)
    tax_pct         DECIMAL(5,2)    NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total           DECIMAL(10,2)   NOT NULL DEFAULT 0,
    paid            DECIMAL(10,2)   NOT NULL DEFAULT 0,
    change_due      DECIMAL(10,2)   NOT NULL DEFAULT 0,
    payment_method  ENUM('cash','card','upi','other') NOT NULL DEFAULT 'cash',
    note            VARCHAR(500)    DEFAULT NULL,
    status          ENUM('paid','void') NOT NULL DEFAULT 'paid',
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_bills_created (created_at),
    INDEX idx_bills_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bill_items (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bill_id       BIGINT UNSIGNED NOT NULL,
    product_id    BIGINT UNSIGNED DEFAULT NULL,
    product_name  VARCHAR(200)    NOT NULL,                 -- snapshot
    sku           VARCHAR(80)     DEFAULT NULL,
    price         DECIMAL(10,2)   NOT NULL,                 -- unit price
    quantity      INT             NOT NULL,
    line_total    DECIMAL(10,2)   NOT NULL,
    FOREIGN KEY (bill_id)    REFERENCES bills(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_bi_bill (bill_id)
) ENGINE=InnoDB;

-- Billing defaults (admin-editable in Settings)
INSERT INTO settings (`key`, `value`) VALUES
    ('billing_tax_pct',        '0'),
    ('billing_invoice_prefix', 'INV'),
    ('billing_footer_note',    'Thank you for shopping with Novo Clothing!')
ON DUPLICATE KEY UPDATE `key` = `key`;

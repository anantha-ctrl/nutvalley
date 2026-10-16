-- ============================================================
--  beadsboutique_setup.sql — FULL fresh install for Beadsboutique
--  Open in MySQL Workbench and run the whole script (⚡ Execute).
--  Creates `beadsboutique_db` with all tables + the jewellery catalogue.
--  Safe: works on a new or EMPTY beadsboutique_db; it FAILS (instead of
--  overwriting) if the tables already exist.
--  Generated from cloudfashion.sql + migrations + seed_jewellery.sql
--  (pet-store data migrations 025–029 and 037 are intentionally left out).
-- ============================================================

CREATE DATABASE IF NOT EXISTS beadsboutique_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE beadsboutique_db;


SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE users (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(120)    NOT NULL,
    email           VARCHAR(160)    NOT NULL UNIQUE,
    phone           VARCHAR(20)     DEFAULT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    role            ENUM('customer','admin') NOT NULL DEFAULT 'customer',
    is_verified     TINYINT(1)      NOT NULL DEFAULT 0,
    avatar_url      VARCHAR(500)    DEFAULT NULL,
    status          ENUM('active','blocked') NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Email OTP / Password reset tokens
-- ------------------------------------------------------------
CREATE TABLE auth_tokens (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    token       VARCHAR(120)    NOT NULL,           -- OTP code or reset token
    type        ENUM('email_otp','password_reset') NOT NULL,
    expires_at  DATETIME        NOT NULL,
    used        TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tokens_lookup (user_id, type, used)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Categories
-- ------------------------------------------------------------
CREATE TABLE categories (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(120)    NOT NULL,
    slug        VARCHAR(140)    NOT NULL UNIQUE,
    parent_id   BIGINT UNSIGNED DEFAULT NULL,
    image_url   VARCHAR(500)    DEFAULT NULL,
    description VARCHAR(500)    DEFAULT NULL,
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_cat_slug (slug)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Products
-- ------------------------------------------------------------
CREATE TABLE products (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    slug            VARCHAR(220)    NOT NULL UNIQUE,
    category_id     BIGINT UNSIGNED NOT NULL,
    brand           VARCHAR(120)    DEFAULT NULL,
    description     TEXT,
    specifications  JSON            DEFAULT NULL,    -- {"Material":"Cotton","Fit":"Slim"}
    price           DECIMAL(10,2)   NOT NULL,
    mrp             DECIMAL(10,2)   NOT NULL,        -- compare-at price
    stock           INT             NOT NULL DEFAULT 0,
    low_stock_alert INT             NOT NULL DEFAULT 5,
    rating_avg      DECIMAL(3,2)    NOT NULL DEFAULT 0,
    rating_count    INT             NOT NULL DEFAULT 0,
    sold_count      INT             NOT NULL DEFAULT 0,
    is_featured     TINYINT(1)      NOT NULL DEFAULT 0,
    is_trending     TINYINT(1)      NOT NULL DEFAULT 0,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_prod_cat (category_id),
    INDEX idx_prod_brand (brand),
    INDEX idx_prod_flags (is_featured, is_trending, is_active),
    FULLTEXT idx_prod_search (name, description, brand)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Product Images
-- ------------------------------------------------------------
CREATE TABLE product_images (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id  BIGINT UNSIGNED NOT NULL,
    image_url   VARCHAR(500)    NOT NULL,
    public_id   VARCHAR(200)    DEFAULT NULL,        -- Cloudinary public_id
    is_primary  TINYINT(1)      NOT NULL DEFAULT 0,
    sort_order  INT             NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_img_product (product_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Product Variants (size + color combos)
-- ------------------------------------------------------------
CREATE TABLE product_variants (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id  BIGINT UNSIGNED NOT NULL,
    size        VARCHAR(40)     DEFAULT NULL,
    color       VARCHAR(40)     DEFAULT NULL,
    color_hex   VARCHAR(9)      DEFAULT NULL,
    sku         VARCHAR(80)     DEFAULT NULL,
    price_diff  DECIMAL(10,2)   NOT NULL DEFAULT 0,  -- added to base price
    stock       INT             NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_var_product (product_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Addresses
-- ------------------------------------------------------------
CREATE TABLE addresses (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      BIGINT UNSIGNED NOT NULL,
    full_name    VARCHAR(120)    NOT NULL,
    phone        VARCHAR(20)     NOT NULL,
    line1        VARCHAR(200)    NOT NULL,
    line2        VARCHAR(200)    DEFAULT NULL,
    city         VARCHAR(80)     NOT NULL,
    state        VARCHAR(80)     NOT NULL,
    pincode      VARCHAR(12)     NOT NULL,
    country      VARCHAR(80)     NOT NULL DEFAULT 'India',
    is_default   TINYINT(1)      NOT NULL DEFAULT 0,
    created_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_addr_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Wishlist
-- ------------------------------------------------------------
CREATE TABLE wishlist (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    product_id  BIGINT UNSIGNED NOT NULL,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wishlist (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Cart
-- ------------------------------------------------------------
CREATE TABLE cart (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    product_id  BIGINT UNSIGNED NOT NULL,
    variant_id  BIGINT UNSIGNED DEFAULT NULL,
    quantity    INT             NOT NULL DEFAULT 1,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart (user_id, product_id, variant_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Coupons
-- ------------------------------------------------------------
CREATE TABLE coupons (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(40)     NOT NULL UNIQUE,
    type            ENUM('percentage','fixed') NOT NULL,
    value           DECIMAL(10,2)   NOT NULL,
    min_order       DECIMAL(10,2)   NOT NULL DEFAULT 0,
    max_discount    DECIMAL(10,2)   DEFAULT NULL,
    usage_limit     INT             DEFAULT NULL,
    used_count      INT             NOT NULL DEFAULT 0,
    expires_at      DATETIME        DEFAULT NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_coupon_code (code)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Orders
-- ------------------------------------------------------------
CREATE TABLE orders (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number        VARCHAR(30)     NOT NULL UNIQUE,
    user_id             BIGINT UNSIGNED NOT NULL,
    address_id          BIGINT UNSIGNED DEFAULT NULL,
    shipping_address    JSON            NOT NULL,        -- snapshot at order time
    subtotal            DECIMAL(10,2)   NOT NULL,
    discount            DECIMAL(10,2)   NOT NULL DEFAULT 0,
    shipping_fee        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total               DECIMAL(10,2)   NOT NULL,
    coupon_code         VARCHAR(40)     DEFAULT NULL,
    payment_method      ENUM('razorpay','cod') NOT NULL DEFAULT 'razorpay',
    payment_status      ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
    razorpay_order_id   VARCHAR(80)     DEFAULT NULL,
    razorpay_payment_id VARCHAR(80)     DEFAULT NULL,
    status              ENUM('pending','processing','packed','shipped','delivered','cancelled')
                        NOT NULL DEFAULT 'pending',
    placed_at           TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE CASCADE,
    FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    INDEX idx_order_user (user_id),
    INDEX idx_order_status (status),
    INDEX idx_order_payment (payment_status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Order Items
-- ------------------------------------------------------------
CREATE TABLE order_items (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED DEFAULT NULL,
    variant_id      BIGINT UNSIGNED DEFAULT NULL,
    product_name    VARCHAR(200)    NOT NULL,           -- snapshot
    image_url       VARCHAR(500)    DEFAULT NULL,
    size            VARCHAR(40)     DEFAULT NULL,
    color           VARCHAR(40)     DEFAULT NULL,
    price           DECIMAL(10,2)   NOT NULL,
    quantity        INT             NOT NULL,
    line_total      DECIMAL(10,2)   NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_oi_order (order_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Reviews
-- ------------------------------------------------------------
CREATE TABLE reviews (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id  BIGINT UNSIGNED NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    rating      TINYINT         NOT NULL,              -- 1..5
    title       VARCHAR(160)    DEFAULT NULL,
    comment     TEXT,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_review (product_id, user_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    INDEX idx_review_product (product_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Recently Viewed
-- ------------------------------------------------------------
CREATE TABLE recently_viewed (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    product_id  BIGINT UNSIGNED NOT NULL,
    viewed_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_recent (user_id, product_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Newsletter
-- ------------------------------------------------------------
CREATE TABLE newsletter (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(160)    NOT NULL UNIQUE,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  SEED DATA
-- ============================================================

-- Admin user (password: Admin@123) and demo customer (password: Test@123)
-- Hashes are bcrypt; regenerate with backend/scripts/hash.php if needed.
INSERT INTO users (name, email, password_hash, role, is_verified) VALUES
('Beadsboutique Admin', 'admin@beadsboutiquejewellery.com', '$2y$10$XZ4IAbRvJfYsIs/aD55N6O7UOsIWAljynLIakfzMGT3PtzdHVwaFy', 'admin', 1),
('Demo Customer', 'customer@beadsboutiquejewellery.com', '$2y$10$fl/qW.4uARZe6MmBmnl3MOLk5dRkQwadd1vGOzrBEP8563/cJyZhy', 'customer', 1);

-- Coupons
INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, expires_at) VALUES
('WELCOME10', 'percentage', 10.00, 999.00, 500.00, 1000, DATE_ADD(NOW(), INTERVAL 90 DAY)),
('FLAT500', 'fixed', 500.00, 2999.00, NULL, 500, DATE_ADD(NOW(), INTERVAL 30 DAY));

-- ================= migration_002.sql =================
-- Migration 002: banners + stock notifications (marketing / admin features)

CREATE TABLE IF NOT EXISTS banners (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(160)    NOT NULL,
    subtitle    VARCHAR(200)    DEFAULT NULL,
    cta_label   VARCHAR(80)     DEFAULT NULL,
    cta_link    VARCHAR(200)    DEFAULT NULL,
    image_url   VARCHAR(500)    NOT NULL,
    sort_order  INT             NOT NULL DEFAULT 0,
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_notifications (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id  BIGINT UNSIGNED NOT NULL,
    email       VARCHAR(160)    NOT NULL,
    notified    TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_notify (product_id, email),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;



-- ================= migration_003.sql =================
-- Migration 003: per-admin notification read / dismissed state
-- Notifications are computed live from the DB, so we only persist the
-- read/dismissed state keyed by a stable notification key per admin.

CREATE TABLE IF NOT EXISTS notification_states (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id   BIGINT UNSIGNED NOT NULL,
    notif_key  VARCHAR(191) NOT NULL,
    status     ENUM('read','dismissed') NOT NULL DEFAULT 'read',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_admin_key (admin_id, notif_key),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ================= migration_004.sql =================
-- Migration 004: allow base64 image data-URIs to be stored when Cloudinary
-- is not configured. varchar(500) overflows for inline images, so widen the
-- image columns to MEDIUMTEXT (up to 16MB).

ALTER TABLE product_images MODIFY image_url MEDIUMTEXT NOT NULL;
ALTER TABLE categories     MODIFY image_url MEDIUMTEXT NULL;
ALTER TABLE banners        MODIFY image_url MEDIUMTEXT NOT NULL;


-- ================= migration_005.sql =================
-- Migration 005: "first order only" coupons (e.g. WELCOME10 for new customers).
-- When set, the coupon is only valid if the user has no previous orders.

ALTER TABLE coupons
    ADD COLUMN first_order_only TINYINT(1) NOT NULL DEFAULT 0 AFTER usage_limit;

-- WELCOME10 is the new-customer welcome offer: first order only.
UPDATE coupons SET first_order_only = 1 WHERE code = 'WELCOME10';


-- ================= migration_006.sql =================
-- Migration 006: order fulfilment — shipment tracking fields.

ALTER TABLE orders
    ADD COLUMN carrier         VARCHAR(60) NULL AFTER status,
    ADD COLUMN tracking_number VARCHAR(80) NULL AFTER carrier;


-- ================= migration_007.sql =================
-- Migration 007: order_items snapshots the product image at purchase time.
-- When Cloudinary isn't configured, images are stored inline as base64
-- data-URIs, which overflow varchar(500). Widen to MEDIUMTEXT.

ALTER TABLE order_items MODIFY image_url MEDIUMTEXT NULL;


-- ================= migration_008.sql =================
-- Migration 008: review moderation.
-- Admins can soft-hide a review (keeps the row, removes it from the storefront
-- and from the product's rating aggregate) without deleting it outright.

ALTER TABLE reviews ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER comment;


-- ================= migration_009.sql =================
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


-- ================= migration_010.sql =================
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


-- ================= migration_011.sql =================
-- Migration 011: allow admins to manually adjust loyalty points.
-- Adds an 'adjust' transaction type so manual credits/debits from the admin
-- panel are recorded distinctly from earn/redeem/referral/signup.

ALTER TABLE loyalty_transactions
  MODIFY COLUMN type ENUM('earn','redeem','referral','signup','adjust') NOT NULL;


-- ================= migration_012.sql =================
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


-- ================= migration_013.sql =================
-- Migration 013: configurable rupee value per loyalty point.
--   loyalty_point_value = rupees one point is worth (default 1.00).
--   e.g. 0.50 means 2 points = Rs.1; 0.10 means 10 points = Rs.1.

INSERT INTO settings (`key`, `value`) VALUES
  ('loyalty_point_value', '1')
ON DUPLICATE KEY UPDATE `value` = `value`;


-- ================= migration_014.sql =================
-- Migration 014: persist Contact Us submissions so admins can read & reply.

CREATE TABLE IF NOT EXISTS contact_messages (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(160) NOT NULL,
  subject    VARCHAR(200) NULL,
  message    TEXT NOT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_read (is_read),
  KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ================= migration_015.sql =================
-- Migration 015: store-wide, admin-editable contact details.
--   * Shown on the public Contact page.
--   * store_contact_email also receives Contact Us submissions.

INSERT INTO settings (`key`, `value`) VALUES
  ('store_contact_email', 'beadsboutiquejewellery@gmail.com'),
  ('store_contact_phone', '+91 98765 43210'),
  ('store_address',       'Bengaluru, India')
ON DUPLICATE KEY UPDATE `value` = `value`;


-- ================= migration_016.sql =================
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


-- ================= migration_017.sql =================
-- Migration 017: admin-editable landing (homepage) storytelling copy.
--   Powers the premium landing hero + brand-story quote, live from the DB.

INSERT INTO settings (`key`, `value`) VALUES
  ('landing_hero_eyebrow',  'Novo Clothing — Est. Elegance'),
  ('landing_hero_title',    'We don''t sell clothes.'),
  ('landing_hero_accent',   'We create confidence.'),
  ('landing_hero_subtitle', 'Editorial fashion, crafted in India — designed to make every moment feel like a statement.'),
  ('landing_hero_cta',      'Explore Collection'),
  ('landing_hero_cta_link', '/shop'),
  ('landing_story_quote',   'Our mission is not to sell clothes. We build confidence through fashion.')
ON DUPLICATE KEY UPDATE `value` = `value`;


-- ================= migration_018.sql =================
-- Migration 018: admin-editable landing (homepage) imagery.
--   Optional URL overrides for the hero, brand-intro, Men/Women/Kids and
--   new-arrival images. Empty value = the frontend uses its built-in default.

INSERT INTO settings (`key`, `value`) VALUES
  ('landing_img_hero',       ''),
  ('landing_img_intro',      ''),
  ('landing_img_men',        ''),
  ('landing_img_women',      ''),
  ('landing_img_kids',       ''),
  ('landing_img_newarrival', '')
ON DUPLICATE KEY UPDATE `value` = `value`;


-- ================= migration_019.sql =================
-- Migration 019: allow settings to hold large values (inline base64 images).
--   Landing images can be uploaded from the admin; when Cloudinary is not
--   configured they are stored inline as data URIs, so widen `value`.

ALTER TABLE settings MODIFY COLUMN `value` MEDIUMTEXT NOT NULL;


-- ================= migration_020.sql =================
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


-- ================= migration_021.sql =================
-- ============================================================
-- Migration 021 — Cashier role (billing-counter staff)
-- A cashier can sign in and use ONLY the billing/POS screen.
-- ============================================================

ALTER TABLE users
    MODIFY role ENUM('customer','admin','cashier') NOT NULL DEFAULT 'customer';


-- ================= migration_022.sql =================
-- ============================================================
-- Migration 022 — Billing: Split payment (cash + card/UPI)
-- Replaces the "other" payment method with "split", where a bill
-- is settled partly in cash and partly by card/UPI. The two
-- portions are stored so the invoice can show the breakdown.
-- ============================================================

ALTER TABLE bills
  MODIFY payment_method ENUM('cash','card','upi','split') NOT NULL DEFAULT 'cash',
  ADD COLUMN split_cash    DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER change_due,
  ADD COLUMN split_digital DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER split_cash;


-- ================= migration_023.sql =================
-- ============================================================
-- Migration 023 — Storefront category scope (men-only store)
-- When `storefront_category` holds a category slug, the whole
-- storefront (listings, collections, filters, product pages, nav
-- categories) is limited to that category + its children. Other
-- products stay in the DB (admin-managed) but are hidden from
-- shoppers. Leave the value empty to show the full catalogue.
-- ============================================================

INSERT INTO settings (`key`, `value`) VALUES
    ('storefront_category', 'men')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);


-- ================= migration_024.sql =================
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


-- ================= migration_026_performance_indexes.sql =================
-- Performance indexes for live admin lists and date-range reports.
ALTER TABLE orders ADD INDEX idx_orders_placed_payment (placed_at, payment_status, status);
ALTER TABLE bills ADD INDEX idx_bills_created_status (created_at, status);
ALTER TABLE order_items ADD INDEX idx_order_items_order_product (order_id, product_id);


-- ================= migration_030_variant_price.sql =================
-- ============================================================
--  migration_030_variant_price.sql
--  Absolute per-variant price (manual rate per size), replacing the
--  "price_diff" (added-to-base) model in the UI.
--  `price` is NULL for legacy variants -> backend falls back to
--  base price + price_diff, so nothing breaks.
-- ============================================================

ALTER TABLE product_variants
  ADD COLUMN price DECIMAL(10,2) DEFAULT NULL AFTER color_hex;


-- ================= migration_031_variant_mrp.sql =================
-- 031: per-variant MRP so each size/pack can show its own strike-through
-- price + discount %. NULL keeps the product-level base MRP.
ALTER TABLE product_variants
  ADD COLUMN mrp DECIMAL(10,2) DEFAULT NULL AFTER price;


-- ================= migration_032_mail_automation.sql =================
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


-- ================= migration_033_order_prefix.sql =================
-- 033: online order numbers become sequential + FURCIL-prefixed (FUR00001, FUR00002…)
--   replacing the old CF + date + random format. Prefix is admin-editable here.
INSERT INTO settings (`key`,`value`) VALUES ('order_prefix','FUR')
ON DUPLICATE KEY UPDATE `value` = `value`;


-- ================= migration_034_product_returnable.sql =================
-- Migration 034: per-product returnable flag
-- Some products can be returned, some cannot. Default = returnable (1) so
-- existing products keep their current behaviour.
ALTER TABLE products
  ADD COLUMN is_returnable TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active;


-- ================= migration_035_product_shipping.sql =================
-- Migration 035: Add is_free_shipping and shipping_fee to products
ALTER TABLE products
  ADD COLUMN is_free_shipping TINYINT(1) NOT NULL DEFAULT 1 AFTER is_returnable,
  ADD COLUMN shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER is_free_shipping;


-- ================= migration_036_delivery_partner.sql =================
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


-- ================= seed_jewellery.sql =================
-- ============================================================
--  seed_jewellery.sql
--  Beadsboutique jewellery catalogue + store settings for a FRESH
--  database (used by beadsboutique_setup.sql). Insert-only — it does
--  not delete anything.
-- ============================================================

-- ---- Categories ----
INSERT INTO categories (name, slug, description, is_active) VALUES
('Necklaces', 'necklaces', 'Handstrung beaded necklaces, chokers & layering strands', 1),
('Bracelets', 'bracelets', 'Stackable beaded bracelets, charm & stretch bands',      1),
('Earrings',  'earrings',  'Beaded studs, drops, hoops & jhumkas',                  1),
('Rings',     'rings',     'Dainty beaded and wire-wrapped rings',                  1),
('Anklets',   'anklets',   'Light, playful beaded anklets for everyday wear',       1);

-- ---- Products (category_id resolved by slug) ----
INSERT INTO products
(name, slug, category_id, brand, description, specifications, price, mrp, stock, is_featured, is_trending, rating_avg, rating_count, sold_count)
VALUES
('Pearl & Gold Bead Layered Necklace','pearl-gold-bead-layered-necklace',(SELECT id FROM categories WHERE slug='necklaces'),'Beadsboutique',
 'Two delicate strands of glass pearls and gold-tone beads that layer beautifully on their own.',
 '{"Material":"Glass Pearls, Gold-tone Beads","Length":"16 + 18 in","Clasp":"Lobster"}',899.00,1299.00,40,1,1,0,0,0),
('Turquoise Stone Bead Choker','turquoise-stone-bead-choker',(SELECT id FROM categories WHERE slug='necklaces'),'Beadsboutique',
 'Hand-strung turquoise-hued stone beads with an adjustable extender chain.',
 '{"Material":"Stone Beads","Length":"14 in + 2 in extender","Clasp":"Lobster"}',749.00,999.00,35,1,0,0,0,0),
('Boho Multi-Colour Seed Bead Necklace','boho-multi-colour-seed-bead-necklace',(SELECT id FROM categories WHERE slug='necklaces'),'Beadsboutique',
 'Bright seed beads in a festive boho mix — an easy way to add colour to any outfit.',
 '{"Material":"Glass Seed Beads","Length":"20 in","Clasp":"Toggle"}',599.00,849.00,50,0,1,0,0,0),
('Rose Quartz Beaded Bracelet','rose-quartz-beaded-bracelet',(SELECT id FROM categories WHERE slug='bracelets'),'Beadsboutique',
 'Soft pink 8 mm rose quartz beads on durable stretch cord. Perfect for everyday stacking.',
 '{"Material":"Rose Quartz","Bead Size":"8 mm","Fit":"Stretch"}',499.00,699.00,60,1,1,0,0,0),
('Evil Eye Crystal Charm Bracelet','evil-eye-crystal-charm-bracelet',(SELECT id FROM categories WHERE slug='bracelets'),'Beadsboutique',
 'Faceted crystal beads with an evil-eye charm on an adjustable sliding knot.',
 '{"Material":"Crystal Beads, Enamel Charm","Fit":"Adjustable"}',449.00,649.00,70,0,1,0,0,0),
('Black Onyx & Gold Stack Set (3 pcs)','black-onyx-gold-stack-set-3-pcs',(SELECT id FROM categories WHERE slug='bracelets'),'Beadsboutique',
 'Three coordinating bracelets in black onyx and gold-tone beads — wear together or apart.',
 '{"Material":"Onyx, Gold-tone Beads","Pieces":"3","Fit":"Stretch"}',999.00,1399.00,30,1,0,0,0,0),
('Beaded Jhumka Earrings','beaded-jhumka-earrings',(SELECT id FROM categories WHERE slug='earrings'),'Beadsboutique',
 'Traditional jhumka silhouette reworked in tiny glass beads — lightweight enough for all-day wear.',
 '{"Material":"Glass Beads, Brass Base","Length":"5 cm","Closure":"Hook"}',549.00,799.00,45,1,1,0,0,0),
('Pearl Drop Earrings','pearl-drop-earrings',(SELECT id FROM categories WHERE slug='earrings'),'Beadsboutique',
 'A single glass pearl suspended from a gold-tone stud — simple, elegant, office-ready.',
 '{"Material":"Glass Pearl, Gold-tone","Length":"2.5 cm","Closure":"Push Back"}',399.00,599.00,55,0,0,0,0,0),
('Colourful Tassel Bead Hoops','colourful-tassel-bead-hoops',(SELECT id FROM categories WHERE slug='earrings'),'Beadsboutique',
 'Statement hoops wrapped in seed beads with playful thread tassels.',
 '{"Material":"Seed Beads, Thread","Diameter":"4 cm","Closure":"Hook"}',499.00,749.00,40,0,1,0,0,0),
('Dainty Seed Bead Ring','dainty-seed-bead-ring',(SELECT id FROM categories WHERE slug='rings'),'Beadsboutique',
 'A delicate band of seed beads on stretch cord — stack a few in different colours.',
 '{"Material":"Glass Seed Beads","Fit":"Stretch"}',199.00,299.00,100,0,1,0,0,0),
('Wire-Wrapped Amethyst Ring','wire-wrapped-amethyst-ring',(SELECT id FROM categories WHERE slug='rings'),'Beadsboutique',
 'A polished amethyst bead hand-wrapped in gold-tone wire.',
 '{"Material":"Amethyst, Gold-tone Wire","Stone":"Amethyst"}',349.00,499.00,40,1,0,0,0,0),
('Ocean Blue Beaded Anklet','ocean-blue-beaded-anklet',(SELECT id FROM categories WHERE slug='anklets'),'Beadsboutique',
 'Blue and white glass beads with a tiny shell charm — made for summer.',
 '{"Material":"Glass Beads, Shell Charm","Length":"24 cm + extender","Clasp":"Lobster"}',349.00,499.00,50,0,1,0,0,0),
('Gold Bead Layered Anklet','gold-bead-layered-anklet',(SELECT id FROM categories WHERE slug='anklets'),'Beadsboutique',
 'Two fine strands of gold-tone beads for a subtle shimmer at the ankle.',
 '{"Material":"Gold-tone Beads","Length":"24 cm + extender","Clasp":"Lobster"}',399.00,599.00,45,1,0,0,0,0);

-- ---- Product images (placeholders — replace from Admin > Products) ----
INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
SELECT id, CONCAT('https://placehold.co/800x800/f6e6e4/3a0d14?text=', REPLACE(name, ' ', '+')), 1, 0
FROM products;

-- ---- Variants (bracelet sizes / ring sizes / colours) ----
INSERT INTO product_variants (product_id, size, color, color_hex, stock)
SELECT p.id, v.size, NULL, NULL, v.stock
FROM products p
JOIN (SELECT 'S' AS size, 20 AS stock UNION ALL SELECT 'M', 25 UNION ALL SELECT 'L', 15) v
WHERE p.slug IN ('rose-quartz-beaded-bracelet', 'black-onyx-gold-stack-set-3-pcs');

INSERT INTO product_variants (product_id, size, color, color_hex, stock)
SELECT p.id, v.size, NULL, NULL, v.stock
FROM products p
JOIN (SELECT '10' AS size, 12 AS stock UNION ALL SELECT '12', 15 UNION ALL SELECT '14', 15 UNION ALL SELECT '16', 10) v
WHERE p.slug = 'wire-wrapped-amethyst-ring';

INSERT INTO product_variants (product_id, size, color, color_hex, stock)
SELECT p.id, NULL, v.color, v.hex, 25
FROM products p
JOIN (SELECT 'Pink' AS color, '#E8A0B4' AS hex UNION ALL SELECT 'Teal', '#2A9D8F' UNION ALL SELECT 'Gold', '#C9A227') v
WHERE p.slug = 'dainty-seed-bead-ring';

-- ---- Banners ----
INSERT INTO banners (title, subtitle, cta_label, cta_link, image_url, sort_order, is_active) VALUES
('Handstrung Necklaces', 'Pearls, stones & seed beads made to layer', 'Shop Necklaces', '/category/necklaces', 'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Necklaces', 0, 1),
('Stack & Shine',        'Beaded bracelets for every wrist',          'Shop Bracelets', '/category/bracelets', 'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Bracelets', 1, 1),
('Light as a Feather',   'Jhumkas, drops & hoops in tiny beads',      'Shop Earrings',  '/category/earrings',  'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Earrings',  2, 1),
('Little Details',       'Dainty rings and summery anklets',          'Shop Now',       '/shop',               'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Rings+%26+Anklets', 3, 1);

-- ---- Coupons ----
INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, expires_at) VALUES
('BEADS10',  'percentage', 10.00, 999.00,  500.00, 1000, DATE_ADD(NOW(), INTERVAL 90 DAY)),
('BEADS500', 'fixed',     500.00, 2999.00, NULL,    500, DATE_ADD(NOW(), INTERVAL 30 DAY));

-- ---- Store settings (rows were created by the earlier migrations) ----
UPDATE settings SET `value` = 'Beadsboutique'                         WHERE `key` IN ('store_name', 'upi_payee_name', 'bank_account_name');
UPDATE settings SET `value` = 'beadsboutiquejewellery@gmail.com'    WHERE `key` = 'store_contact_email';
INSERT INTO settings (`key`, `value`) VALUES ('store_contact_to', 'beadsboutiquejewellery@gmail.com')
  ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
UPDATE settings SET `value` = 'India'                                 WHERE `key` = 'store_address';
UPDATE settings SET `value` = ''                                      WHERE `key` = 'store_instagram';
UPDATE settings SET `value` = 'FREE SHIPPING OVER ₹1999 · EASY 7-DAY RETURNS · USE CODE BEADS10' WHERE `key` = 'store_announcement';
UPDATE settings SET `value` = 'Thank you for shopping with Beadsboutique!' WHERE `key` = 'billing_footer_note';
UPDATE settings SET `value` = 'BB'                                    WHERE `key` = 'order_prefix';
UPDATE settings SET `value` = 'Beadsboutique — Handcrafted Jewellery' WHERE `key` = 'landing_hero_eyebrow';
UPDATE settings SET `value` = 'Handcrafted beads, made to shine.'     WHERE `key` = 'landing_hero_title';
UPDATE settings SET `value` = 'Jewellery made for you.'               WHERE `key` = 'landing_hero_accent';
UPDATE settings SET `value` = 'Necklaces, bracelets, earrings, rings & anklets — delivered across India.' WHERE `key` = 'landing_hero_subtitle';
UPDATE settings SET `value` = 'Shop Jewellery'                        WHERE `key` = 'landing_hero_cta';
UPDATE settings SET `value` = 'Our mission is simple — jewellery that feels personal and is made to be loved.' WHERE `key` = 'landing_story_quote';

-- ================= migration_038_user_avatar.sql =================
ALTER TABLE users MODIFY avatar_url MEDIUMTEXT NULL;

-- ============================================================
--  Novo Clothing - MySQL Schema
--  Single Vendor Fashion E-Commerce
--  Engine: InnoDB  |  Charset: utf8mb4
-- ============================================================

DROP DATABASE IF EXISTS cloudfashion;
CREATE DATABASE cloudfashion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cloudfashion;

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

-- Top-level categories
INSERT INTO categories (name, slug, description, is_active) VALUES
('Men', 'men', 'Menswear, essentials & statement pieces', 1),
('Women', 'women', 'Curated womenswear & couture', 1),
('Kids', 'kids', 'Playful, comfortable kidswear', 1),
('Footwear', 'footwear', 'Sneakers, heels, boots & more', 1),
('Accessories', 'accessories', 'Bags, belts, watches & jewellery', 1);

-- Sample products
INSERT INTO products
(name, slug, category_id, brand, description, specifications, price, mrp, stock, is_featured, is_trending, rating_avg, rating_count, sold_count)
VALUES
('Aurora Oversized Cotton Shirt', 'aurora-oversized-cotton-shirt', 1, 'Cloud Label',
 'Breathable oversized cotton shirt with a relaxed drape and mother-of-pearl buttons.',
 '{"Material":"100% Cotton","Fit":"Oversized","Pattern":"Solid","Wash":"Machine Wash"}',
 1499.00, 2499.00, 40, 1, 1, 4.6, 38, 210),
('Noir Tailored Blazer', 'noir-tailored-blazer', 1, 'Maison Cloud',
 'A sharp single-breasted blazer in structured twill for elevated everyday tailoring.',
 '{"Material":"Poly-Viscose","Fit":"Slim","Lining":"Full","Closure":"Single Button"}',
 3999.00, 6999.00, 18, 1, 0, 4.8, 12, 64),
('Seraphine Floral Midi Dress', 'seraphine-floral-midi-dress', 2, 'Cloud Atelier',
 'Flowing midi dress in a watercolour floral print with a flattering wrap waist.',
 '{"Material":"Viscose","Length":"Midi","Neck":"V-Neck","Occasion":"Casual"}',
 2299.00, 3999.00, 30, 1, 1, 4.7, 54, 180),
('Luna Knit Co-ord Set', 'luna-knit-co-ord-set', 2, 'Cloud Label',
 'Soft ribbed knit co-ord set — cropped top and high-waist trousers.',
 '{"Material":"Cotton Blend","Pieces":"2","Fit":"Regular"}',
 2799.00, 4499.00, 22, 0, 1, 4.5, 21, 96),
('Pixel Kids Graphic Tee', 'pixel-kids-graphic-tee', 3, 'Tiny Cloud',
 'Colourful organic-cotton graphic tee that keeps up with playtime.',
 '{"Material":"Organic Cotton","Fit":"Regular","Age":"4-10y"}',
 599.00, 999.00, 60, 0, 0, 4.4, 17, 140),
('Strato Low-Top Sneakers', 'strato-low-top-sneakers', 4, 'Cloud Kicks',
 'Minimal low-top sneakers with cushioned insoles and a vegan-leather upper.',
 '{"Material":"Vegan Leather","Sole":"Rubber","Closure":"Lace-Up"}',
 3299.00, 4999.00, 35, 1, 1, 4.7, 73, 250),
('Halo Leather Crossbody Bag', 'halo-leather-crossbody-bag', 5, 'Cloud Atelier',
 'Compact crossbody in pebbled leather with gold-tone hardware.',
 '{"Material":"Genuine Leather","Strap":"Adjustable","Closure":"Magnetic"}',
 2599.00, 3999.00, 25, 1, 0, 4.6, 29, 88),
('Eclipse Minimal Watch', 'eclipse-minimal-watch', 5, 'Cloud Time',
 'Slim 38mm minimalist watch with a sapphire-coated dial and mesh strap.',
 '{"Case":"38mm","Movement":"Quartz","Water Resistance":"3ATM"}',
 4499.00, 7999.00, 15, 0, 1, 4.9, 41, 70);

-- Images (placeholder URLs; replace with Cloudinary uploads)
INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800', 1, 0),
(1, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800', 0, 1),
(2, 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800', 1, 0),
(3, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800', 1, 0),
(4, 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800', 1, 0),
(5, 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800', 1, 0),
(6, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 1, 0),
(7, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800', 1, 0),
(8, 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800', 1, 0);

-- Variants
INSERT INTO product_variants (product_id, size, color, color_hex, stock) VALUES
(1, 'S', 'Ivory', '#F5F0E8', 10), (1, 'M', 'Ivory', '#F5F0E8', 15), (1, 'L', 'Sage', '#B2C2A4', 15),
(2, 'M', 'Noir', '#111111', 6), (2, 'L', 'Noir', '#111111', 6), (2, 'XL', 'Charcoal', '#36454F', 6),
(3, 'S', 'Blush', '#F2C6C2', 10), (3, 'M', 'Blush', '#F2C6C2', 10), (3, 'L', 'Blush', '#F2C6C2', 10),
(6, 'UK7', 'White', '#FFFFFF', 12), (6, 'UK8', 'White', '#FFFFFF', 12), (6, 'UK9', 'Black', '#111111', 11);

-- Coupons
INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, expires_at) VALUES
('WELCOME10', 'percentage', 10.00, 999.00, 500.00, 1000, DATE_ADD(NOW(), INTERVAL 90 DAY)),
('FLAT500', 'fixed', 500.00, 2999.00, NULL, 500, DATE_ADD(NOW(), INTERVAL 30 DAY));

-- Migration 002: banners + stock notifications (marketing / admin features)
USE cloudfashion;

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

INSERT INTO banners (title, subtitle, cta_label, cta_link, image_url, sort_order)
SELECT * FROM (
    SELECT 'Summer Couture' t, 'New Season Arrivals' s, 'Shop Women' cl, '/category/women' clk,
           'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600' i, 0 o
    UNION ALL SELECT 'Sharp & Tailored', 'The Menswear Edit', 'Shop Men', '/category/men',
           'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=1600', 1
    UNION ALL SELECT 'Step Into Style', 'Footwear Drop', 'Shop Footwear', '/category/footwear',
           'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1600', 2
) seed
WHERE NOT EXISTS (SELECT 1 FROM banners LIMIT 1);

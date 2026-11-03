-- ============================================================
--  nutsvally_setup.sql — FULL fresh install for NutValley
--  Premium nuts & dry fruits store.
--
--  Open in MySQL Workbench and run the whole script (⚡ Execute),
--  or:  mysql -u root -p < database/nutsvally_setup.sql
--
--  Creates `nutsvally_db` with every table + the NutValley catalogue
--  (categories, products, pack-size variants, banners, coupons, settings).
--  Fails (instead of overwriting) if the tables already exist.
--
--  Logins:  admin@nutvalley.com / Admin@123
--           customer@nutvalley.com / Test@123
-- ============================================================

CREATE DATABASE IF NOT EXISTS nutsvally_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nutsvally_db;
SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;


CREATE TABLE `addresses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `line1` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `line2` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pincode` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'India',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_addr_user` (`user_id`),
  CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auth_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `token` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('email_otp','password_reset') COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tokens_lookup` (`user_id`,`type`,`used`),
  CONSTRAINT `auth_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `banners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subtitle` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cta_label` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cta_link` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bill_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bill_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int NOT NULL,
  `line_total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `idx_bi_bill` (`bill_id`),
  CONSTRAINT `bill_items_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bill_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bills` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bill_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cashier_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_type` enum('flat','percent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'flat',
  `discount_value` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax_pct` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid` decimal(10,2) NOT NULL DEFAULT '0.00',
  `change_due` decimal(10,2) NOT NULL DEFAULT '0.00',
  `split_cash` decimal(10,2) NOT NULL DEFAULT '0.00',
  `split_digital` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_method` enum('cash','card','upi','split') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('paid','void') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'paid',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bill_number` (`bill_number`),
  KEY `cashier_id` (`cashier_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_bills_created` (`created_at`),
  KEY `idx_bills_status` (`status`),
  KEY `idx_bills_created_status` (`created_at`,`status`),
  CONSTRAINT `bills_ibfk_1` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bills_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cart` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart` (`user_id`,`product_id`,`variant_id`),
  KEY `product_id` (`product_id`),
  KEY `variant_id` (`variant_id`),
  CONSTRAINT `cart_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_ibfk_3` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `image_url` mediumtext COLLATE utf8mb4_unicode_ci,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `parent_id` (`parent_id`),
  KEY `idx_cat_slug` (`slug`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contact_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(160) NOT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_read` (`is_read`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `coupons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('percentage','fixed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `min_order` decimal(10,2) NOT NULL DEFAULT '0.00',
  `max_discount` decimal(10,2) DEFAULT NULL,
  `usage_limit` int DEFAULT NULL,
  `first_order_only` tinyint(1) NOT NULL DEFAULT '0',
  `used_count` int NOT NULL DEFAULT '0',
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_coupon_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `email_automations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `type` varchar(40) NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `sent_at` datetime DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `error` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_order_type` (`order_id`,`type`),
  KEY `idx_due` (`status`,`scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `loyalty_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `points` int NOT NULL,
  `type` enum('earn','redeem','referral','signup','adjust') NOT NULL,
  `order_id` bigint unsigned DEFAULT NULL,
  `note` varchar(160) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `loyalty_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `loyalty_transactions_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `newsletter` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_states` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` bigint unsigned NOT NULL,
  `notif_key` varchar(191) NOT NULL,
  `status` enum('read','dismissed') NOT NULL DEFAULT 'read',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_key` (`admin_id`,`notif_key`),
  CONSTRAINT `notification_states_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned DEFAULT NULL,
  `variant_id` bigint unsigned DEFAULT NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` mediumtext COLLATE utf8mb4_unicode_ci,
  `size` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int NOT NULL,
  `line_total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `idx_oi_order` (`order_id`),
  KEY `idx_order_items_order_product` (`order_id`,`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `address_id` bigint unsigned DEFAULT NULL,
  `shipping_address` json NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL,
  `points_used` int NOT NULL DEFAULT '0',
  `points_earned` int NOT NULL DEFAULT '0',
  `coupon_code` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` enum('razorpay','cod','upi') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'razorpay',
  `payment_status` enum('pending','paid','failed','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `razorpay_order_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `razorpay_payment_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_txn_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_screenshot` mediumtext COLLATE utf8mb4_unicode_ci,
  `payment_approval` enum('none','pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `payment_note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_reviewed_at` datetime DEFAULT NULL,
  `status` enum('pending','processing','packed','shipped','delivered','cancelled','returned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `carrier` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_number` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_provider` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'shiprocket | delhivery | manual',
  `shipment_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'provider shipment id',
  `shipment_order_id` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'provider order id',
  `awb_code` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'airway bill / waybill no',
  `courier_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipment_status` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'raw courier status text',
  `shipment_eta` date DEFAULT NULL COMMENT 'estimated delivery date',
  `label_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipment_synced_at` timestamp NULL DEFAULT NULL COMMENT 'last live poll',
  `placed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `address_id` (`address_id`),
  KEY `idx_order_user` (`user_id`),
  KEY `idx_order_status` (`status`),
  KEY `idx_order_payment` (`payment_status`),
  KEY `idx_orders_placed_payment` (`placed_at`,`payment_status`,`status`),
  KEY `idx_order_awb` (`awb_code`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_images` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `image_url` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `public_id` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_img_product` (`product_id`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_variants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `size` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_hex` varchar(9) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `mrp` decimal(10,2) DEFAULT NULL,
  `sku` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price_diff` decimal(10,2) NOT NULL DEFAULT '0.00',
  `stock` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_var_product` (`product_id`),
  CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(220) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `brand` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `specifications` json DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `mrp` decimal(10,2) NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `low_stock_alert` int NOT NULL DEFAULT '5',
  `rating_avg` decimal(3,2) NOT NULL DEFAULT '0.00',
  `rating_count` int NOT NULL DEFAULT '0',
  `sold_count` int NOT NULL DEFAULT '0',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `is_trending` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_returnable` tinyint(1) NOT NULL DEFAULT '1',
  `is_free_shipping` tinyint(1) NOT NULL DEFAULT '1',
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_prod_cat` (`category_id`),
  KEY `idx_prod_brand` (`brand`),
  KEY `idx_prod_flags` (`is_featured`,`is_trending`,`is_active`),
  FULLTEXT KEY `idx_prod_search` (`name`,`description`,`brand`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `recently_viewed` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `viewed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recent` (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `recently_viewed_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recently_viewed_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `returns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `reason` varchar(500) NOT NULL,
  `status` enum('requested','approved','rejected','refunded') NOT NULL DEFAULT 'requested',
  `admin_note` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_return_order` (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `returns_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `returns_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `rating` tinyint NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `is_hidden` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_review` (`product_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_review_product` (`product_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `settings` (
  `key` varchar(64) NOT NULL,
  `value` mediumtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `shipment_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `awb_code` varchar(80) DEFAULT NULL,
  `status` varchar(120) NOT NULL,
  `activity` varchar(255) DEFAULT NULL,
  `location` varchar(160) DEFAULT NULL,
  `event_at` datetime DEFAULT NULL,
  `fingerprint` char(40) NOT NULL COMMENT 'sha1(status|activity|event_at) — de-dupes re-polls',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_event` (`order_id`,`fingerprint`),
  KEY `idx_se_order` (`order_id`,`event_at`),
  CONSTRAINT `shipment_events_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `stock_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `email` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notified` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_notify` (`product_id`,`email`),
  CONSTRAINT `stock_notifications_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('customer','admin','cashier') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `avatar_url` mediumtext COLLATE utf8mb4_unicode_ci,
  `status` enum('active','blocked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `loyalty_points` int NOT NULL DEFAULT '0',
  `referral_code` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referred_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uniq_referral_code` (`referral_code`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wishlist` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wishlist` (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `wishlist_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wishlist_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  SEED DATA — NutValley premium nuts & dry fruits
-- ============================================================

-- ---- Users ----
-- Admin (password: Admin@123) and demo customer (password: Test@123).
-- Hashes are bcrypt; regenerate with backend/scripts/hash.php if needed.
INSERT INTO users (name, email, password_hash, role, is_verified) VALUES
('NutValley Admin', 'admin@nutvalley.com',    '$2y$10$XZ4IAbRvJfYsIs/aD55N6O7UOsIWAljynLIakfzMGT3PtzdHVwaFy', 'admin',    1),
('Demo Customer',   'customer@nutvalley.com', '$2y$10$fl/qW.4uARZe6MmBmnl3MOLk5dRkQwadd1vGOzrBEP8563/cJyZhy', 'customer', 1);

-- ---- Categories ----
INSERT INTO categories (name, slug, description, image_url, is_active) VALUES
('Almonds',      'almonds',      'California & Mamra almonds — rich, crunchy and full of nutrition',   'https://placehold.co/700x700/fbf6ea/1a4d23?text=Almonds',      1),
('Cashews',      'cashews',      'Whole W240 & W320 cashews — plain, roasted and lightly salted',      'https://placehold.co/700x700/fbf6ea/1a4d23?text=Cashews',      1),
('Pistachios',   'pistachios',   'Roasted & salted Iranian and Californian pistachios',                'https://placehold.co/700x700/fbf6ea/1a4d23?text=Pistachios',   1),
('Walnuts',      'walnuts',      'Light-halves Kashmiri and Chilean walnut kernels',                   'https://placehold.co/700x700/fbf6ea/1a4d23?text=Walnuts',      1),
('Dates',        'dates',        'Soft Medjool, Ajwa and Kimia dates',                                 'https://placehold.co/700x700/fbf6ea/1a4d23?text=Dates',        1),
('Dried Fruits', 'dried-fruits', 'Raisins, figs, apricots, prunes and berries',                       'https://placehold.co/700x700/fbf6ea/1a4d23?text=Dried+Fruits', 1),
('Seeds',        'seeds',        'Chia, flax, pumpkin and sunflower seeds',                            'https://placehold.co/700x700/fbf6ea/1a4d23?text=Seeds',        1),
('Gift Boxes',   'gift-boxes',   'Festive and corporate dry fruit gift boxes',                         'https://placehold.co/700x700/fbf6ea/1a4d23?text=Gift+Boxes',   1);

-- ---- Products (price/mrp = smallest pack; category resolved by slug) ----
INSERT INTO products
(name, slug, category_id, brand, description, specifications, price, mrp, stock, is_featured, is_trending, is_returnable)
VALUES
('California Almonds', 'california-almonds', (SELECT id FROM categories WHERE slug='almonds'), 'NutValley',
 'Premium, large California almonds — naturally crunchy and rich in protein, fibre and vitamin E.',
 '{"Origin":"California, USA","Grade":"Non-Pareil","Shelf Life":"6 months","Storage":"Cool, dry place"}', 299.00, 399.00, 300, 1, 1, 0),
('Mamra Almonds', 'mamra-almonds', (SELECT id FROM categories WHERE slug='almonds'), 'NutValley',
 'Rare, oil-rich Mamra almonds — the most nutritious almond variety, perfect for soaking.',
 '{"Origin":"Iran","Grade":"Premium","Shelf Life":"6 months","Storage":"Cool, dry place"}', 649.00, 849.00, 150, 1, 0, 0),
('Whole Cashews W240', 'whole-cashews-w240', (SELECT id FROM categories WHERE slug='cashews'), 'NutValley',
 'Large, creamy W240 whole cashews — the perfect everyday snack and cooking essential.',
 '{"Origin":"India","Grade":"W240","Shelf Life":"6 months","Storage":"Air-tight container"}', 329.00, 449.00, 300, 1, 1, 0),
('Roasted & Salted Cashews', 'roasted-salted-cashews', (SELECT id FROM categories WHERE slug='cashews'), 'NutValley',
 'Whole cashews slow-roasted and lightly salted for a crunchy, savoury bite.',
 '{"Origin":"India","Grade":"W320","Flavour":"Roasted & Salted","Shelf Life":"4 months"}', 349.00, 469.00, 200, 0, 1, 0),
('Roasted Pistachios', 'roasted-pistachios', (SELECT id FROM categories WHERE slug='pistachios'), 'NutValley',
 'Naturally opened Iranian pistachios, roasted and lightly salted.',
 '{"Origin":"Iran","Flavour":"Roasted & Salted","Shelf Life":"6 months","Storage":"Cool, dry place"}', 399.00, 549.00, 200, 1, 1, 0),
('California Pistachio Kernels', 'california-pistachio-kernels', (SELECT id FROM categories WHERE slug='pistachios'), 'NutValley',
 'Shelled, unsalted green pistachio kernels — ideal for sweets, desserts and baking.',
 '{"Origin":"California, USA","Type":"Shelled, Unsalted","Shelf Life":"6 months"}', 549.00, 699.00, 120, 0, 0, 0),
('Kashmiri Walnut Kernels', 'kashmiri-walnut-kernels', (SELECT id FROM categories WHERE slug='walnuts'), 'NutValley',
 'Light-halves Kashmiri walnut kernels — a rich source of omega-3 for brain and heart health.',
 '{"Origin":"Kashmir, India","Grade":"Light Halves","Shelf Life":"4 months","Storage":"Refrigerate after opening"}', 449.00, 599.00, 180, 1, 0, 0),
('Medjool Dates', 'medjool-dates', (SELECT id FROM categories WHERE slug='dates'), 'NutValley',
 'Large, soft and caramel-sweet Medjool dates — nature''s own energy bar.',
 '{"Origin":"Jordan","Grade":"Jumbo","Shelf Life":"9 months","Storage":"Cool, dry place"}', 499.00, 649.00, 150, 1, 1, 0),
('Ajwa Dates', 'ajwa-dates', (SELECT id FROM categories WHERE slug='dates'), 'NutValley',
 'Premium soft Ajwa dates from Madinah with a rich, mild sweetness.',
 '{"Origin":"Saudi Arabia","Grade":"Premium","Shelf Life":"9 months"}', 699.00, 899.00, 100, 0, 0, 0),
('Afghan Black Raisins', 'afghan-black-raisins', (SELECT id FROM categories WHERE slug='dried-fruits'), 'NutValley',
 'Seedless Afghan black raisins — naturally sweet and rich in iron.',
 '{"Origin":"Afghanistan","Type":"Seedless","Shelf Life":"9 months"}', 199.00, 279.00, 250, 0, 1, 0),
('Dried Figs (Anjeer)', 'dried-figs-anjeer', (SELECT id FROM categories WHERE slug='dried-fruits'), 'NutValley',
 'Soft, sun-dried Afghan figs packed with fibre and natural sweetness.',
 '{"Origin":"Afghanistan","Grade":"Jumbo","Shelf Life":"9 months"}', 449.00, 599.00, 150, 1, 0, 0),
('Dried Apricots', 'dried-apricots', (SELECT id FROM categories WHERE slug='dried-fruits'), 'NutValley',
 'Plump, tangy-sweet Turkish dried apricots — no added sugar.',
 '{"Origin":"Turkey","Type":"No added sugar","Shelf Life":"9 months"}', 349.00, 449.00, 150, 0, 0, 0),
('Chia Seeds', 'chia-seeds', (SELECT id FROM categories WHERE slug='seeds'), 'NutValley',
 'Raw chia seeds rich in omega-3, fibre and protein — add to smoothies, puddings and salads.',
 '{"Type":"Raw","Shelf Life":"12 months","Storage":"Cool, dry place"}', 199.00, 299.00, 250, 0, 1, 0),
('Roasted Pumpkin Seeds', 'roasted-pumpkin-seeds', (SELECT id FROM categories WHERE slug='seeds'), 'NutValley',
 'Lightly roasted pumpkin seeds — a crunchy, zinc-rich snack.',
 '{"Type":"Roasted","Shelf Life":"6 months"}', 249.00, 349.00, 200, 0, 0, 0),
('Festive Dry Fruit Gift Box', 'festive-dry-fruit-gift-box', (SELECT id FROM categories WHERE slug='gift-boxes'), 'NutValley',
 'A premium gift box of almonds, cashews, pistachios and raisins — perfect for Diwali, weddings and festivals.',
 '{"Contents":"Almonds, Cashews, Pistachios, Raisins","Net Weight":"800 g","Shelf Life":"6 months"}', 1299.00, 1599.00, 80, 1, 1, 0),
('Classic Trail Mix', 'classic-trail-mix', (SELECT id FROM categories WHERE slug='gift-boxes'), 'NutValley',
 'A healthy mix of almonds, cashews, walnuts, raisins and seeds for on-the-go snacking.',
 '{"Contents":"Almonds, Cashews, Walnuts, Raisins, Seeds","Shelf Life":"4 months"}', 279.00, 379.00, 200, 0, 1, 0);

-- ---- Product images (placeholders — replace from Admin > Products) ----
INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
SELECT id, CONCAT('https://placehold.co/800x800/fbf6ea/1a4d23?text=', REPLACE(name, ' ', '+')), 1, 0
FROM products;

-- ---- Pack-size variants: 250 g = base price, 500 g = 1.9x, 1 kg = 3.6x ----
INSERT INTO product_variants (product_id, size, price, mrp, sku, stock)
SELECT p.id, v.size, ROUND(p.price * v.f), ROUND(p.mrp * v.f), CONCAT('NV-', p.id, '-', v.code), v.stock
FROM products p
JOIN (SELECT '250 g' AS size, 1.0 AS f, '250' AS code, 100 AS stock
      UNION ALL SELECT '500 g', 1.9, '500', 80
      UNION ALL SELECT '1 kg',  3.6, '1000', 40) v
WHERE p.slug NOT IN ('festive-dry-fruit-gift-box');

-- ---- Banners ----
INSERT INTO banners (title, subtitle, cta_label, cta_link, image_url, sort_order, is_active) VALUES
('Premium Almonds',  'Rich, crunchy and packed fresh',          'Shop Almonds',   '/category/almonds',    'https://placehold.co/1600x900/fbf6ea/1a4d23?text=Premium+Almonds',  0, 1),
('Whole Cashews',    'Creamy W240 cashews for every day',        'Shop Cashews',   '/category/cashews',    'https://placehold.co/1600x900/fbf6ea/1a4d23?text=Whole+Cashews',    1, 1),
('Nature''s Candy',  'Soft Medjool & Ajwa dates',                'Shop Dates',     '/category/dates',      'https://placehold.co/1600x900/fbf6ea/1a4d23?text=Dates',            2, 1),
('Festive Gifting',    'Festive dry fruit gift boxes',             'Shop Gift Boxes','/category/gift-boxes', 'https://placehold.co/1600x900/fbf6ea/1a4d23?text=Gift+Boxes',       3, 1);

-- ---- Coupons ----
INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, expires_at, first_order_only) VALUES
('WELCOME10', 'percentage', 10.00, 499.00,  200.00, 1000, DATE_ADD(NOW(), INTERVAL 90 DAY), 1),
('NUTS10',    'percentage', 10.00, 999.00,  500.00, 1000, DATE_ADD(NOW(), INTERVAL 90 DAY), 0),
('NUTS500',   'fixed',     500.00, 2999.00, NULL,    500, DATE_ADD(NOW(), INTERVAL 30 DAY), 0);

-- ---- Store settings ----
INSERT INTO settings (`key`, `value`) VALUES
  -- Store
  ('store_name',              'NutValley'),
  ('store_contact_email',     'nutvalley@gmail.com'),
  ('store_contact_to',        'nutvalley@gmail.com'),
  ('store_contact_phone',     '+91 98765 43210'),
  ('store_address',           'India'),
  ('store_announcement',      'FREE SHIPPING OVER ₹999 · PACKED FRESH · USE CODE NUTS10'),
  ('store_free_shipping_min', '999'),
  ('store_base_shipping',     '0'),
  ('store_instagram',         ''),
  ('store_facebook',          ''),
  ('store_twitter',           ''),
  ('store_whatsapp',          '919876543210'),
  ('storefront_category',     ''),
  ('order_prefix',            'NV'),
  -- Landing page
  ('landing_hero_eyebrow',    'NutValley — Premium Nuts & Dry Fruits'),
  ('landing_hero_title',      'Nature''s finest, packed fresh.'),
  ('landing_hero_accent',     'Healthy snacking made easy.'),
  ('landing_hero_subtitle',   'Almonds, cashews, pistachios, walnuts, dates & more — delivered across India.'),
  ('landing_hero_cta',        'Shop Now'),
  ('landing_hero_cta_link',   '/shop'),
  ('landing_story_quote',     'Our mission is simple — pure, fresh nuts and dry fruits that make every day a little healthier.'),
  ('landing_img_hero',        ''),
  ('landing_img_intro',       ''),
  ('landing_img_men',         ''),
  ('landing_img_women',       ''),
  ('landing_img_kids',        ''),
  ('landing_img_newarrival',  ''),
  -- Loyalty
  ('loyalty_earn_rate_pct',   '5'),
  ('loyalty_earn_cap',        '25'),
  ('loyalty_point_value',     '1'),
  ('loyalty_redeem_cap_pct',  '50'),
  ('loyalty_referral_bonus',  '100'),
  ('loyalty_signup_bonus',    '50'),
  -- Billing / POS
  ('billing_tax_pct',         '0'),
  ('billing_invoice_prefix',  'INV'),
  ('billing_footer_note',     'Thank you for shopping with NutValley!'),
  -- Manual UPI / bank payment
  ('upi_id',                  ''),
  ('upi_payee_name',          'NutValley'),
  ('upi_qr_image',            ''),
  ('bank_account_name',       'NutValley'),
  ('bank_account_number',     ''),
  ('bank_ifsc',               ''),
  ('bank_name',               ''),
  -- Mail automation ('1' = on; *_offset = days after delivery)
  ('automation_enabled',                  '1'),
  ('automation_welcome_enabled',          '1'),
  ('automation_welcome_offset',           '0'),
  ('automation_feeding_guide_enabled',    '1'),
  ('automation_feeding_guide_offset',     '0'),
  ('automation_check_in_enabled',         '1'),
  ('automation_check_in_offset',          '14'),
  ('automation_review_request_enabled',   '1'),
  ('automation_review_request_offset',    '20'),
  ('automation_reorder_reminder_enabled', '1'),
  ('automation_reorder_reminder_offset',  '27'),
  -- Delivery partner
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
  ('delivery_sandbox',         '0');

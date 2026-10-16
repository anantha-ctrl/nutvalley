-- Migration 035: Add is_free_shipping and shipping_fee to products
ALTER TABLE products
  ADD COLUMN is_free_shipping TINYINT(1) NOT NULL DEFAULT 1 AFTER is_returnable,
  ADD COLUMN shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER is_free_shipping;

-- ============================================================
--  migration_030_variant_price.sql
--  Absolute per-variant price (manual rate per size), replacing the
--  "price_diff" (added-to-base) model in the UI.
--  `price` is NULL for legacy variants -> backend falls back to
--  base price + price_diff, so nothing breaks.
-- ============================================================

ALTER TABLE product_variants
  ADD COLUMN price DECIMAL(10,2) DEFAULT NULL AFTER color_hex;

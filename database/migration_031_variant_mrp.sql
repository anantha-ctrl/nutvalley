-- 031: per-variant MRP so each size/pack can show its own strike-through
-- price + discount %. NULL keeps the product-level base MRP.
ALTER TABLE product_variants
  ADD COLUMN mrp DECIMAL(10,2) DEFAULT NULL AFTER price;

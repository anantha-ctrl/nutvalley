-- Migration 034: per-product returnable flag
-- Some products can be returned, some cannot. Default = returnable (1) so
-- existing products keep their current behaviour.
ALTER TABLE products
  ADD COLUMN is_returnable TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active;

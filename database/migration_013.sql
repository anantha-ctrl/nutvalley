-- Migration 013: configurable rupee value per loyalty point.
--   loyalty_point_value = rupees one point is worth (default 1.00).
--   e.g. 0.50 means 2 points = Rs.1; 0.10 means 10 points = Rs.1.

INSERT INTO settings (`key`, `value`) VALUES
  ('loyalty_point_value', '1')
ON DUPLICATE KEY UPDATE `value` = `value`;

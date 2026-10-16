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

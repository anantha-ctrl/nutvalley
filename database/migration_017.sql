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

-- ============================================================
--  migration_026_pet_banners.sql
--  Replace the old clothing hero banners with pet-store banners.
--  (You can still edit / add banners live in Admin > Banners.)
-- ============================================================

DELETE FROM banners;
ALTER TABLE banners AUTO_INCREMENT = 1;

INSERT INTO banners (title, subtitle, cta_label, cta_link, image_url, sort_order, is_active) VALUES
('Nutrition They''ll Love',   'Premium food & treats for happy, healthy dogs', 'Shop Dogs',  '/category/dogs',       'https://placehold.co/1600x900/e8e2d5/1c3025?text=dog,pet', 0, 1),
('Purr-fect Picks',          'Food, litter, scratchers & toys for cats',      'Shop Cats',  '/category/cats',       'https://placehold.co/1600x900/e8e2d5/1c3025?text=cat,pet', 1, 1),
('Chirps & Feathers',        'Fortified feed, cages & perches for birds',     'Shop Birds', '/category/birds',      'https://placehold.co/1600x900/e8e2d5/1c3025?text=parrot,bird', 2, 1),
('Dive Into Aquatics',       'Tanks, filters, lighting & fish food',          'Shop Fish',  '/category/fish',       'https://placehold.co/1600x900/e8e2d5/1c3025?text=aquarium,fish', 3, 1),
('Little Companions',        'Hay, habitats & wheels for small pets',         'Shop Now',   '/category/small-pets', 'https://placehold.co/1600x900/e8e2d5/1c3025?text=rabbit,hamster', 4, 1);

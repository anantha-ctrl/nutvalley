-- ============================================================
--  seed_jewellery.sql
--  Beadsboutique jewellery catalogue + store settings for a FRESH
--  database (used by beadsboutique_setup.sql). Insert-only — it does
--  not delete anything.
-- ============================================================

-- ---- Categories ----
INSERT INTO categories (name, slug, description, is_active) VALUES
('Necklaces', 'necklaces', 'Handstrung beaded necklaces, chokers & layering strands', 1),
('Bracelets', 'bracelets', 'Stackable beaded bracelets, charm & stretch bands',      1),
('Earrings',  'earrings',  'Beaded studs, drops, hoops & jhumkas',                  1),
('Rings',     'rings',     'Dainty beaded and wire-wrapped rings',                  1),
('Anklets',   'anklets',   'Light, playful beaded anklets for everyday wear',       1);

-- ---- Products (category_id resolved by slug) ----
INSERT INTO products
(name, slug, category_id, brand, description, specifications, price, mrp, stock, is_featured, is_trending, rating_avg, rating_count, sold_count)
VALUES
('Pearl & Gold Bead Layered Necklace','pearl-gold-bead-layered-necklace',(SELECT id FROM categories WHERE slug='necklaces'),'Beadsboutique',
 'Two delicate strands of glass pearls and gold-tone beads that layer beautifully on their own.',
 '{"Material":"Glass Pearls, Gold-tone Beads","Length":"16 + 18 in","Clasp":"Lobster"}',899.00,1299.00,40,1,1,0,0,0),
('Turquoise Stone Bead Choker','turquoise-stone-bead-choker',(SELECT id FROM categories WHERE slug='necklaces'),'Beadsboutique',
 'Hand-strung turquoise-hued stone beads with an adjustable extender chain.',
 '{"Material":"Stone Beads","Length":"14 in + 2 in extender","Clasp":"Lobster"}',749.00,999.00,35,1,0,0,0,0),
('Boho Multi-Colour Seed Bead Necklace','boho-multi-colour-seed-bead-necklace',(SELECT id FROM categories WHERE slug='necklaces'),'Beadsboutique',
 'Bright seed beads in a festive boho mix — an easy way to add colour to any outfit.',
 '{"Material":"Glass Seed Beads","Length":"20 in","Clasp":"Toggle"}',599.00,849.00,50,0,1,0,0,0),
('Rose Quartz Beaded Bracelet','rose-quartz-beaded-bracelet',(SELECT id FROM categories WHERE slug='bracelets'),'Beadsboutique',
 'Soft pink 8 mm rose quartz beads on durable stretch cord. Perfect for everyday stacking.',
 '{"Material":"Rose Quartz","Bead Size":"8 mm","Fit":"Stretch"}',499.00,699.00,60,1,1,0,0,0),
('Evil Eye Crystal Charm Bracelet','evil-eye-crystal-charm-bracelet',(SELECT id FROM categories WHERE slug='bracelets'),'Beadsboutique',
 'Faceted crystal beads with an evil-eye charm on an adjustable sliding knot.',
 '{"Material":"Crystal Beads, Enamel Charm","Fit":"Adjustable"}',449.00,649.00,70,0,1,0,0,0),
('Black Onyx & Gold Stack Set (3 pcs)','black-onyx-gold-stack-set-3-pcs',(SELECT id FROM categories WHERE slug='bracelets'),'Beadsboutique',
 'Three coordinating bracelets in black onyx and gold-tone beads — wear together or apart.',
 '{"Material":"Onyx, Gold-tone Beads","Pieces":"3","Fit":"Stretch"}',999.00,1399.00,30,1,0,0,0,0),
('Beaded Jhumka Earrings','beaded-jhumka-earrings',(SELECT id FROM categories WHERE slug='earrings'),'Beadsboutique',
 'Traditional jhumka silhouette reworked in tiny glass beads — lightweight enough for all-day wear.',
 '{"Material":"Glass Beads, Brass Base","Length":"5 cm","Closure":"Hook"}',549.00,799.00,45,1,1,0,0,0),
('Pearl Drop Earrings','pearl-drop-earrings',(SELECT id FROM categories WHERE slug='earrings'),'Beadsboutique',
 'A single glass pearl suspended from a gold-tone stud — simple, elegant, office-ready.',
 '{"Material":"Glass Pearl, Gold-tone","Length":"2.5 cm","Closure":"Push Back"}',399.00,599.00,55,0,0,0,0,0),
('Colourful Tassel Bead Hoops','colourful-tassel-bead-hoops',(SELECT id FROM categories WHERE slug='earrings'),'Beadsboutique',
 'Statement hoops wrapped in seed beads with playful thread tassels.',
 '{"Material":"Seed Beads, Thread","Diameter":"4 cm","Closure":"Hook"}',499.00,749.00,40,0,1,0,0,0),
('Dainty Seed Bead Ring','dainty-seed-bead-ring',(SELECT id FROM categories WHERE slug='rings'),'Beadsboutique',
 'A delicate band of seed beads on stretch cord — stack a few in different colours.',
 '{"Material":"Glass Seed Beads","Fit":"Stretch"}',199.00,299.00,100,0,1,0,0,0),
('Wire-Wrapped Amethyst Ring','wire-wrapped-amethyst-ring',(SELECT id FROM categories WHERE slug='rings'),'Beadsboutique',
 'A polished amethyst bead hand-wrapped in gold-tone wire.',
 '{"Material":"Amethyst, Gold-tone Wire","Stone":"Amethyst"}',349.00,499.00,40,1,0,0,0,0),
('Ocean Blue Beaded Anklet','ocean-blue-beaded-anklet',(SELECT id FROM categories WHERE slug='anklets'),'Beadsboutique',
 'Blue and white glass beads with a tiny shell charm — made for summer.',
 '{"Material":"Glass Beads, Shell Charm","Length":"24 cm + extender","Clasp":"Lobster"}',349.00,499.00,50,0,1,0,0,0),
('Gold Bead Layered Anklet','gold-bead-layered-anklet',(SELECT id FROM categories WHERE slug='anklets'),'Beadsboutique',
 'Two fine strands of gold-tone beads for a subtle shimmer at the ankle.',
 '{"Material":"Gold-tone Beads","Length":"24 cm + extender","Clasp":"Lobster"}',399.00,599.00,45,1,0,0,0,0);

-- ---- Product images (placeholders — replace from Admin > Products) ----
INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
SELECT id, CONCAT('https://placehold.co/800x800/f6e6e4/3a0d14?text=', REPLACE(name, ' ', '+')), 1, 0
FROM products;

-- ---- Variants (bracelet sizes / ring sizes / colours) ----
INSERT INTO product_variants (product_id, size, color, color_hex, stock)
SELECT p.id, v.size, NULL, NULL, v.stock
FROM products p
JOIN (SELECT 'S' AS size, 20 AS stock UNION ALL SELECT 'M', 25 UNION ALL SELECT 'L', 15) v
WHERE p.slug IN ('rose-quartz-beaded-bracelet', 'black-onyx-gold-stack-set-3-pcs');

INSERT INTO product_variants (product_id, size, color, color_hex, stock)
SELECT p.id, v.size, NULL, NULL, v.stock
FROM products p
JOIN (SELECT '10' AS size, 12 AS stock UNION ALL SELECT '12', 15 UNION ALL SELECT '14', 15 UNION ALL SELECT '16', 10) v
WHERE p.slug = 'wire-wrapped-amethyst-ring';

INSERT INTO product_variants (product_id, size, color, color_hex, stock)
SELECT p.id, NULL, v.color, v.hex, 25
FROM products p
JOIN (SELECT 'Pink' AS color, '#E8A0B4' AS hex UNION ALL SELECT 'Teal', '#2A9D8F' UNION ALL SELECT 'Gold', '#C9A227') v
WHERE p.slug = 'dainty-seed-bead-ring';

-- ---- Banners ----
INSERT INTO banners (title, subtitle, cta_label, cta_link, image_url, sort_order, is_active) VALUES
('Handstrung Necklaces', 'Pearls, stones & seed beads made to layer', 'Shop Necklaces', '/category/necklaces', 'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Necklaces', 0, 1),
('Stack & Shine',        'Beaded bracelets for every wrist',          'Shop Bracelets', '/category/bracelets', 'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Bracelets', 1, 1),
('Light as a Feather',   'Jhumkas, drops & hoops in tiny beads',      'Shop Earrings',  '/category/earrings',  'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Earrings',  2, 1),
('Little Details',       'Dainty rings and summery anklets',          'Shop Now',       '/shop',               'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Rings+%26+Anklets', 3, 1);

-- ---- Coupons ----
INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, expires_at) VALUES
('BEADS10',  'percentage', 10.00, 999.00,  500.00, 1000, DATE_ADD(NOW(), INTERVAL 90 DAY)),
('BEADS500', 'fixed',     500.00, 2999.00, NULL,    500, DATE_ADD(NOW(), INTERVAL 30 DAY));

-- ---- Store settings (rows were created by the earlier migrations) ----
UPDATE settings SET `value` = 'Beadsboutique'                         WHERE `key` IN ('store_name', 'upi_payee_name', 'bank_account_name');
UPDATE settings SET `value` = 'beadsboutiquejewellery@gmail.com'    WHERE `key` = 'store_contact_email';
INSERT INTO settings (`key`, `value`) VALUES ('store_contact_to', 'beadsboutiquejewellery@gmail.com')
  ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
UPDATE settings SET `value` = 'India'                                 WHERE `key` = 'store_address';
UPDATE settings SET `value` = ''                                      WHERE `key` = 'store_instagram';
UPDATE settings SET `value` = 'FREE SHIPPING OVER ₹1999 · EASY 7-DAY RETURNS · USE CODE BEADS10' WHERE `key` = 'store_announcement';
UPDATE settings SET `value` = 'Thank you for shopping with Beadsboutique!' WHERE `key` = 'billing_footer_note';
UPDATE settings SET `value` = 'BB'                                    WHERE `key` = 'order_prefix';
UPDATE settings SET `value` = 'Beadsboutique — Handcrafted Jewellery' WHERE `key` = 'landing_hero_eyebrow';
UPDATE settings SET `value` = 'Handcrafted beads, made to shine.'     WHERE `key` = 'landing_hero_title';
UPDATE settings SET `value` = 'Jewellery made for you.'               WHERE `key` = 'landing_hero_accent';
UPDATE settings SET `value` = 'Necklaces, bracelets, earrings, rings & anklets — delivered across India.' WHERE `key` = 'landing_hero_subtitle';
UPDATE settings SET `value` = 'Shop Jewellery'                        WHERE `key` = 'landing_hero_cta';
UPDATE settings SET `value` = 'Our mission is simple — jewellery that feels personal and is made to be loved.' WHERE `key` = 'landing_story_quote';

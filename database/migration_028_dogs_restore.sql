-- ============================================================
--  migration_028_dogs_restore.sql
--  Restores the Dogs category + its 6 products (deleted along with
--  the other pet categories). Non-destructive, idempotent (slug-keyed).
--  Run together with migration_027 to rebuild the full pet catalogue.
-- ============================================================

INSERT IGNORE INTO categories (name, slug, description, is_active) VALUES
('Dogs', 'dogs', 'Food, toys, beds, collars & grooming for dogs', 1);

INSERT IGNORE INTO products
(name, slug, category_id, brand, description, specifications, price, mrp, stock, is_featured, is_trending, rating_avg, rating_count, sold_count)
VALUES
('Premium Chicken & Rice Adult Dog Food 3kg','premium-chicken-rice-adult-dog-food-3kg',(SELECT id FROM categories WHERE slug='dogs'),'FurFeast',
 'Complete, balanced nutrition for adult dogs with real chicken as the first ingredient. High protein, no artificial colours.',
 '{"Life Stage":"Adult","Flavour":"Chicken & Rice","Net Weight":"3kg","Type":"Dry Food"}',1249.00,1699.00,60,1,1,4.7,54,210),
('Durable Rubber Bone Chew Toy','durable-rubber-bone-chew-toy',(SELECT id FROM categories WHERE slug='dogs'),'PawPlay',
 'Tough natural-rubber chew that soothes gums and keeps teeth clean. Bounces for fetch too.',
 '{"Material":"Natural Rubber","Size":"Medium","Use":"Chew / Fetch"}',349.00,599.00,120,0,1,4.5,38,320),
('Orthopedic Memory Foam Dog Bed','orthopedic-memory-foam-dog-bed',(SELECT id FROM categories WHERE slug='dogs'),'SnugPaws',
 'Memory-foam base that supports joints, with a removable machine-washable cover.',
 '{"Fill":"Memory Foam","Cover":"Removable / Washable","Water Resistant":"Yes"}',2499.00,3999.00,25,1,0,4.8,22,85),
('Adjustable Nylon Dog Collar','adjustable-nylon-dog-collar',(SELECT id FROM categories WHERE slug='dogs'),'TrailBuddy',
 'Weatherproof nylon collar with a quick-release buckle and reflective stitching for night walks.',
 '{"Material":"Nylon","Buckle":"Quick-Release","Reflective":"Yes"}',399.00,699.00,90,0,0,4.4,40,150),
('Retractable Dog Leash 5m','retractable-dog-leash-5m',(SELECT id FROM categories WHERE slug='dogs'),'TrailBuddy',
 'One-hand brake and lock, tangle-free 5m tape for controlled walks.',
 '{"Length":"5m","Max Weight":"40kg","Lock":"One-Button"}',699.00,1099.00,45,0,1,4.6,29,130),
('Oatmeal Soothing Dog Shampoo 500ml','oatmeal-soothing-dog-shampoo-500ml',(SELECT id FROM categories WHERE slug='dogs'),'PetPure',
 'Gentle oatmeal formula that calms itchy skin and leaves the coat soft and shiny. Paraben-free.',
 '{"Volume":"500ml","Skin":"Sensitive","Free From":"Parabens & SLS"}',449.00,699.00,70,0,0,4.5,17,95);

-- Images
DELETE pi FROM product_images pi JOIN products p ON p.id = pi.product_id
 WHERE p.slug IN ('premium-chicken-rice-adult-dog-food-3kg','durable-rubber-bone-chew-toy','orthopedic-memory-foam-dog-bed',
   'adjustable-nylon-dog-collar','retractable-dog-leash-5m','oatmeal-soothing-dog-shampoo-500ml');
INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES
((SELECT id FROM products WHERE slug='premium-chicken-rice-adult-dog-food-3kg'),'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,food',1,0),
((SELECT id FROM products WHERE slug='durable-rubber-bone-chew-toy'),'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,toy',1,0),
((SELECT id FROM products WHERE slug='orthopedic-memory-foam-dog-bed'),'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,bed',1,0),
((SELECT id FROM products WHERE slug='adjustable-nylon-dog-collar'),'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,collar',1,0),
((SELECT id FROM products WHERE slug='retractable-dog-leash-5m'),'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,leash',1,0),
((SELECT id FROM products WHERE slug='oatmeal-soothing-dog-shampoo-500ml'),'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,bath',1,0);

-- Variants
DELETE pv FROM product_variants pv JOIN products p ON p.id = pv.product_id
 WHERE p.slug IN ('premium-chicken-rice-adult-dog-food-3kg','orthopedic-memory-foam-dog-bed','adjustable-nylon-dog-collar');
INSERT INTO product_variants (product_id, size, color, color_hex, price_diff, stock) VALUES
((SELECT id FROM products WHERE slug='premium-chicken-rice-adult-dog-food-3kg'),'3kg', NULL, NULL,    0.00, 40),
((SELECT id FROM products WHERE slug='premium-chicken-rice-adult-dog-food-3kg'),'7kg', NULL, NULL,  900.00, 20),
((SELECT id FROM products WHERE slug='orthopedic-memory-foam-dog-bed'),'S', 'Grey',  '#8A8D91',   0.00, 8),
((SELECT id FROM products WHERE slug='orthopedic-memory-foam-dog-bed'),'M', 'Grey',  '#8A8D91', 400.00, 9),
((SELECT id FROM products WHERE slug='orthopedic-memory-foam-dog-bed'),'L', 'Brown', '#6B4E36', 800.00, 8),
((SELECT id FROM products WHERE slug='adjustable-nylon-dog-collar'),'S', 'Red',   '#C1352B', 0.00, 30),
((SELECT id FROM products WHERE slug='adjustable-nylon-dog-collar'),'M', 'Blue',  '#2F5FA6', 0.00, 30),
((SELECT id FROM products WHERE slug='adjustable-nylon-dog-collar'),'L', 'Black', '#111111', 0.00, 30);

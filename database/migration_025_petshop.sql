-- ============================================================
--  migration_025_petshop.sql
--  Rebrand + catalogue swap: clothing (Novo Clothing) -> pet store (FURCIL)
--  Safe to run on the existing `cloudfashion` DB — NO schema changes.
--  Wipes the old clothing catalogue and seeds a pet-store catalogue.
--  Users, orders, addresses and coupons-history are preserved
--  (order_items keep their name/image snapshot; product_id -> NULL).
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---- Clear the old catalogue (children first) ----
DELETE FROM product_variants;
DELETE FROM product_images;
DELETE FROM reviews;
DELETE FROM wishlist;
DELETE FROM cart;
DELETE FROM recently_viewed;
DELETE FROM products;
DELETE FROM categories;

ALTER TABLE categories       AUTO_INCREMENT = 1;
ALTER TABLE products         AUTO_INCREMENT = 1;
ALTER TABLE product_images   AUTO_INCREMENT = 1;
ALTER TABLE product_variants AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  Pet categories  (ids 1..5 after the reset above)
-- ============================================================
INSERT INTO categories (name, slug, description, is_active) VALUES
('Dogs',       'dogs',       'Food, toys, beds, collars & grooming for dogs',            1),
('Cats',       'cats',       'Nutrition, litter, scratchers & toys for cats',            1),
('Birds',      'birds',      'Feed, cages, perches & supplements for birds',             1),
('Fish',       'fish',       'Fish food, tanks, filters & aquarium accessories',         1),
('Small Pets', 'small-pets', 'Hay, food & habitats for rabbits, guinea pigs & hamsters', 1);

-- ============================================================
--  Products
-- ============================================================
INSERT INTO products
(name, slug, category_id, brand, description, specifications, price, mrp, stock, is_featured, is_trending, rating_avg, rating_count, sold_count)
VALUES
-- ---------- DOGS (cat 1) ----------
('Premium Chicken & Rice Adult Dog Food 3kg','premium-chicken-rice-adult-dog-food-3kg',1,'FurFeast',
 'Complete, balanced nutrition for adult dogs with real chicken as the first ingredient. High protein, no artificial colours.',
 '{"Life Stage":"Adult","Flavour":"Chicken & Rice","Net Weight":"3kg","Type":"Dry Food"}',
 1249.00,1699.00,60,1,1,4.7,54,210),
('Durable Rubber Bone Chew Toy','durable-rubber-bone-chew-toy',1,'PawPlay',
 'Tough natural-rubber chew that soothes gums and keeps teeth clean. Bounces for fetch too.',
 '{"Material":"Natural Rubber","Size":"Medium","Use":"Chew / Fetch"}',
 349.00,599.00,120,0,1,4.5,38,320),
('Orthopedic Memory Foam Dog Bed','orthopedic-memory-foam-dog-bed',1,'SnugPaws',
 'Memory-foam base that supports joints, with a removable machine-washable cover.',
 '{"Fill":"Memory Foam","Cover":"Removable / Washable","Water Resistant":"Yes"}',
 2499.00,3999.00,25,1,0,4.8,22,85),
('Adjustable Nylon Dog Collar','adjustable-nylon-dog-collar',1,'TrailBuddy',
 'Weatherproof nylon collar with a quick-release buckle and reflective stitching for night walks.',
 '{"Material":"Nylon","Buckle":"Quick-Release","Reflective":"Yes"}',
 399.00,699.00,90,0,0,4.4,40,150),
('Retractable Dog Leash 5m','retractable-dog-leash-5m',1,'TrailBuddy',
 'One-hand brake and lock, tangle-free 5m tape for controlled walks.',
 '{"Length":"5m","Max Weight":"40kg","Lock":"One-Button"}',
 699.00,1099.00,45,0,1,4.6,29,130),
('Oatmeal Soothing Dog Shampoo 500ml','oatmeal-soothing-dog-shampoo-500ml',1,'PetPure',
 'Gentle oatmeal formula that calms itchy skin and leaves the coat soft and shiny. Paraben-free.',
 '{"Volume":"500ml","Skin":"Sensitive","Free From":"Parabens & SLS"}',
 449.00,699.00,70,0,0,4.5,17,95),

-- ---------- CATS (cat 2) ----------
('Ocean Fish Adult Cat Food 1.2kg','ocean-fish-adult-cat-food-1-2kg',2,'FurFeast',
 'Ocean-fish recipe rich in omega-3 for a healthy coat and taurine for heart & eye health.',
 '{"Life Stage":"Adult","Flavour":"Ocean Fish","Net Weight":"1.2kg","Type":"Dry Food"}',
 899.00,1299.00,55,1,1,4.6,47,180),
('Clumping Odour-Control Cat Litter 5kg','clumping-odour-control-cat-litter-5kg',2,'FreshDen',
 'Fast-clumping bentonite litter with 7-day odour lock and low dust.',
 '{"Type":"Bentonite Clumping","Net Weight":"5kg","Odour Control":"7 Days"}',
 599.00,899.00,80,1,0,4.5,33,160),
('Feather Teaser Wand Cat Toy','feather-teaser-wand-cat-toy',2,'PawPlay',
 'Interactive feather wand that triggers your cat''s natural hunting play.',
 '{"Material":"Feather & Wood","Length":"50cm","Use":"Interactive Play"}',
 249.00,449.00,130,0,0,4.4,21,240),
('Multi-Level Cat Scratching Post','multi-level-cat-scratching-post',2,'SnugPaws',
 'Sisal-wrapped posts with a cozy perch — saves your furniture and keeps claws healthy.',
 '{"Material":"Sisal & Plush","Height":"80cm","Levels":"3"}',
 1999.00,2999.00,20,0,1,4.7,26,70),
('Ceramic Cat Food & Water Bowl Set','ceramic-cat-food-water-bowl-set',2,'PetPure',
 'Whisker-friendly shallow ceramic bowls on a non-slip bamboo stand.',
 '{"Material":"Ceramic + Bamboo","Pieces":"2","Dishwasher Safe":"Yes"}',
 799.00,1199.00,40,0,0,4.6,19,60),
('Catnip Infused Mice Toy (Pack of 3)','catnip-infused-mice-toy-pack-of-3',2,'PawPlay',
 'Plush mice packed with premium catnip for hours of pounce-and-play.',
 '{"Pack":"3","Filling":"Catnip","Material":"Plush"}',
 299.00,499.00,100,0,0,4.3,24,210),

-- ---------- BIRDS (cat 3) ----------
('Premium Parrot & Cockatiel Seed Mix 2kg','premium-parrot-cockatiel-seed-mix-2kg',3,'WingWell',
 'Vitamin-enriched blend of seeds, grains and fruit bits for vibrant plumage and energy.',
 '{"Suitable For":"Parrots & Cockatiels","Net Weight":"2kg","Fortified":"Vitamins A, D3, E"}',
 749.00,1099.00,50,1,0,4.6,18,120),
('Stainless Steel Bird Cage (Medium)','stainless-steel-bird-cage-medium',3,'NestHaven',
 'Rust-proof steel cage with wide door, feeder cups and a slide-out tray for easy cleaning.',
 '{"Material":"Stainless Steel","Size":"Medium","Includes":"2 Feeder Cups + Tray"}',
 3499.00,4999.00,15,0,0,4.7,12,40),
('Wooden Bird Perch & Swing Set','wooden-bird-perch-swing-set',3,'WingWell',
 'Natural-wood perches and a swing that keep birds active and their feet healthy.',
 '{"Material":"Natural Wood","Pieces":"4","Fits":"Small–Medium Cages"}',
 499.00,799.00,60,0,0,4.4,16,90),
('Cuttlebone Calcium Supplement (Pack of 4)','cuttlebone-calcium-supplement-pack-of-4',3,'WingWell',
 'Natural cuttlebone for calcium and beak conditioning. Cage-clip included.',
 '{"Pack":"4","Nutrient":"Calcium","Includes":"Cage Clip"}',
 199.00,349.00,110,0,0,4.5,22,150),

-- ---------- FISH (cat 4) ----------
('Tropical Fish Colour Flakes 200g','tropical-fish-colour-flakes-200g',4,'AquaLife',
 'Daily flake food with colour-enhancing carotenoids for tropical community fish.',
 '{"Type":"Flakes","Net Weight":"200g","For":"Tropical Community Fish"}',
 349.00,549.00,90,1,0,4.6,28,200),
('20L Glass Aquarium Starter Kit','20l-glass-aquarium-starter-kit',4,'AquaLife',
 'Everything to get started — 20L curved-glass tank with hood, LED and filter.',
 '{"Capacity":"20L","Includes":"Hood + LED + Filter","Glass":"Curved Front"}',
 2999.00,4499.00,18,0,1,4.7,14,55),
('Aquarium Power Filter (Up to 100L)','aquarium-power-filter-up-to-100l',4,'AquaLife',
 '3-stage filtration with adjustable flow for crystal-clear, healthy water.',
 '{"Suitable Up To":"100L","Filtration":"3-Stage","Flow":"Adjustable"}',
 1299.00,1899.00,30,0,0,4.5,17,75),
('Submersible Aquarium LED Light Bar','submersible-aquarium-led-light-bar',4,'AquaLife',
 'Energy-efficient full-spectrum LED that brings out fish colour and supports plants.',
 '{"Type":"Full-Spectrum LED","Mount":"Submersible","Length":"30cm"}',
 899.00,1399.00,35,0,0,4.4,11,48),

-- ---------- SMALL PETS (cat 5) ----------
('Timothy Hay for Rabbits & Guinea Pigs 1kg','timothy-hay-rabbits-guinea-pigs-1kg',5,'MeadowMunch',
 'High-fibre sun-cured timothy hay — essential for digestion and dental health.',
 '{"Type":"Timothy Hay","Net Weight":"1kg","For":"Rabbits & Guinea Pigs"}',
 449.00,699.00,70,1,0,4.7,20,140),
('Silent-Spin Hamster Exercise Wheel','silent-spin-hamster-exercise-wheel',5,'TinyTrails',
 'Smooth solid-surface wheel with a silent bearing — safe for little feet, quiet at night.',
 '{"Diameter":"18cm","Surface":"Solid (Safe)","Noise":"Silent Bearing"}',
 599.00,899.00,45,0,0,4.5,15,85),
('Small Pet Wooden Hideout House','small-pet-wooden-hideout-house',5,'TinyTrails',
 'Chew-safe natural-wood hideout that gives small pets a cozy place to rest and gnaw.',
 '{"Material":"Chew-Safe Wood","For":"Hamsters / Guinea Pigs","Assembly":"Easy"}',
 699.00,1099.00,40,0,1,4.4,13,70),
('Rabbit & Guinea Pig Pellet Food 2kg','rabbit-guinea-pig-pellet-food-2kg',5,'MeadowMunch',
 'Fortified timothy-based pellets with vitamin C for guinea pigs and balanced fibre for rabbits.',
 '{"Type":"Pellets","Net Weight":"2kg","Added":"Vitamin C"}',
 799.00,1199.00,55,0,0,4.6,18,110);

-- ============================================================
--  Product images  (placehold.co = reliable branded placeholders;
--  replace with your own Cloudinary uploads from Admin > Products)
-- ============================================================
INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES
(1,'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,food',1,0),
(2,'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,toy',1,0),
(3,'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,bed',1,0),
(4,'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,collar',1,0),
(5,'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,leash',1,0),
(6,'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,bath',1,0),
(7,'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,food',1,0),
(8,'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,litter',1,0),
(9,'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,toy',1,0),
(10,'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,scratching,post',1,0),
(11,'https://placehold.co/800x800/e8e2d5/1c3025?text=pet,bowl',1,0),
(12,'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,toy,mouse',1,0),
(13,'https://placehold.co/800x800/e8e2d5/1c3025?text=parrot,seed',1,0),
(14,'https://placehold.co/800x800/e8e2d5/1c3025?text=bird,cage',1,0),
(15,'https://placehold.co/800x800/e8e2d5/1c3025?text=bird,perch',1,0),
(16,'https://placehold.co/800x800/e8e2d5/1c3025?text=bird,cuttlebone',1,0),
(17,'https://placehold.co/800x800/e8e2d5/1c3025?text=aquarium,fish,food',1,0),
(18,'https://placehold.co/800x800/e8e2d5/1c3025?text=aquarium,tank',1,0),
(19,'https://placehold.co/800x800/e8e2d5/1c3025?text=aquarium,filter',1,0),
(20,'https://placehold.co/800x800/e8e2d5/1c3025?text=aquarium,led',1,0),
(21,'https://placehold.co/800x800/e8e2d5/1c3025?text=rabbit,hay',1,0),
(22,'https://placehold.co/800x800/e8e2d5/1c3025?text=hamster,wheel',1,0),
(23,'https://placehold.co/800x800/e8e2d5/1c3025?text=hamster,house',1,0),
(24,'https://placehold.co/800x800/e8e2d5/1c3025?text=guinea,pig,food',1,0);

-- ============================================================
--  Variants  (pet-appropriate: sizes / pack weights / colours)
-- ============================================================
INSERT INTO product_variants (product_id, size, color, color_hex, price_diff, stock) VALUES
-- Dog food pack sizes
(1,'3kg', NULL, NULL,    0.00, 40),
(1,'7kg', NULL, NULL,  900.00, 20),
-- Orthopedic bed sizes/colours
(3,'S', 'Grey',  '#8A8D91',   0.00, 8),
(3,'M', 'Grey',  '#8A8D91', 400.00, 9),
(3,'L', 'Brown', '#6B4E36', 800.00, 8),
-- Collar sizes/colours
(4,'S', 'Red',   '#C1352B', 0.00, 30),
(4,'M', 'Blue',  '#2F5FA6', 0.00, 30),
(4,'L', 'Black', '#111111', 0.00, 30),
-- Cat food pack sizes
(7,'1.2kg', NULL, NULL,    0.00, 30),
(7,'3kg',   NULL, NULL, 1100.00, 25);

-- ============================================================
--  Coupons  (refresh to FURCIL codes)
-- ============================================================
DELETE FROM coupons WHERE code IN ('WELCOME10','FLAT500','FURCIL10','PAWS500');
INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, expires_at) VALUES
('FURCIL10', 'percentage', 10.00,  999.00, 500.00, 1000, DATE_ADD(NOW(), INTERVAL 90 DAY)),
('PAWS500',  'fixed',     500.00, 2999.00,   NULL,  500, DATE_ADD(NOW(), INTERVAL 30 DAY));

-- ============================================================
--  Rebrand the store settings (Novo Clothing -> FURCIL, pet copy)
--  Financial/bank/UPI/social values are left untouched — edit
--  those in Admin > Settings.
-- ============================================================
UPDATE settings SET `value` = 'FURCIL'                                   WHERE `key` = 'store_name';
UPDATE settings SET `value` = 'FURCIL'                                   WHERE `key` = 'bank_account_name';
UPDATE settings SET `value` = 'FURCIL'                                   WHERE `key` = 'upi_payee_name';
UPDATE settings SET `value` = 'Thank you for shopping with FURCIL!'      WHERE `key` = 'billing_footer_note';
UPDATE settings SET `value` = 'FURCIL — Pet Care, Perfected'             WHERE `key` = 'landing_hero_eyebrow';
UPDATE settings SET `value` = 'Everything your pet needs.'               WHERE `key` = 'landing_hero_title';
UPDATE settings SET `value` = 'Nutrition, comfort and play for dogs, cats, birds, fish & small pets — delivered across India.' WHERE `key` = 'landing_hero_subtitle';
UPDATE settings SET `value` = 'We care for every companion.'            WHERE `key` = 'landing_hero_accent';
UPDATE settings SET `value` = 'Shop Pet Essentials'                     WHERE `key` = 'landing_hero_cta';
UPDATE settings SET `value` = 'Our mission is simple — happier, healthier pets and the people who love them.' WHERE `key` = 'landing_story_quote';
UPDATE settings SET `value` = 'FREE SHIPPING OVER ₹1999 · EASY 7-DAY RETURNS · USE CODE FURCIL10' WHERE `key` = 'store_announcement';
-- Empty storefront_category = show ALL categories in the storefront nav
-- (a non-empty slug would scope the whole store to just that one category).
UPDATE settings SET `value` = ''                                         WHERE `key` = 'storefront_category';

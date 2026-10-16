-- ============================================================
--  migration_027_restore_categories.sql
--  Restores the pet categories + products that were removed
--  (Cats, Birds, Fish, Small Pets and their 18 products).
--  Non-destructive: Dogs and any admin-created categories are kept.
--  Idempotent: safe to run more than once (slug-keyed).
-- ============================================================

-- 1) Categories (slug is UNIQUE -> INSERT IGNORE won't duplicate)
INSERT IGNORE INTO categories (name, slug, description, is_active) VALUES
('Cats',       'cats',       'Nutrition, litter, scratchers & toys for cats',            1),
('Birds',      'birds',      'Feed, cages, perches & supplements for birds',             1),
('Fish',       'fish',       'Fish food, tanks, filters & aquarium accessories',         1),
('Small Pets', 'small-pets', 'Hay, food & habitats for rabbits, guinea pigs & hamsters', 1);

-- 2) Products (category_id resolved by slug; product slug is UNIQUE -> IGNORE)
INSERT IGNORE INTO products
(name, slug, category_id, brand, description, specifications, price, mrp, stock, is_featured, is_trending, rating_avg, rating_count, sold_count)
VALUES
-- CATS
('Ocean Fish Adult Cat Food 1.2kg','ocean-fish-adult-cat-food-1-2kg',(SELECT id FROM categories WHERE slug='cats'),'FurFeast',
 'Ocean-fish recipe rich in omega-3 for a healthy coat and taurine for heart & eye health.',
 '{"Life Stage":"Adult","Flavour":"Ocean Fish","Net Weight":"1.2kg","Type":"Dry Food"}',899.00,1299.00,55,1,1,4.6,47,180),
('Clumping Odour-Control Cat Litter 5kg','clumping-odour-control-cat-litter-5kg',(SELECT id FROM categories WHERE slug='cats'),'FreshDen',
 'Fast-clumping bentonite litter with 7-day odour lock and low dust.',
 '{"Type":"Bentonite Clumping","Net Weight":"5kg","Odour Control":"7 Days"}',599.00,899.00,80,1,0,4.5,33,160),
('Feather Teaser Wand Cat Toy','feather-teaser-wand-cat-toy',(SELECT id FROM categories WHERE slug='cats'),'PawPlay',
 'Interactive feather wand that triggers your cat''s natural hunting play.',
 '{"Material":"Feather & Wood","Length":"50cm","Use":"Interactive Play"}',249.00,449.00,130,0,0,4.4,21,240),
('Multi-Level Cat Scratching Post','multi-level-cat-scratching-post',(SELECT id FROM categories WHERE slug='cats'),'SnugPaws',
 'Sisal-wrapped posts with a cozy perch — saves your furniture and keeps claws healthy.',
 '{"Material":"Sisal & Plush","Height":"80cm","Levels":"3"}',1999.00,2999.00,20,0,1,4.7,26,70),
('Ceramic Cat Food & Water Bowl Set','ceramic-cat-food-water-bowl-set',(SELECT id FROM categories WHERE slug='cats'),'PetPure',
 'Whisker-friendly shallow ceramic bowls on a non-slip bamboo stand.',
 '{"Material":"Ceramic + Bamboo","Pieces":"2","Dishwasher Safe":"Yes"}',799.00,1199.00,40,0,0,4.6,19,60),
('Catnip Infused Mice Toy (Pack of 3)','catnip-infused-mice-toy-pack-of-3',(SELECT id FROM categories WHERE slug='cats'),'PawPlay',
 'Plush mice packed with premium catnip for hours of pounce-and-play.',
 '{"Pack":"3","Filling":"Catnip","Material":"Plush"}',299.00,499.00,100,0,0,4.3,24,210),
-- BIRDS
('Premium Parrot & Cockatiel Seed Mix 2kg','premium-parrot-cockatiel-seed-mix-2kg',(SELECT id FROM categories WHERE slug='birds'),'WingWell',
 'Vitamin-enriched blend of seeds, grains and fruit bits for vibrant plumage and energy.',
 '{"Suitable For":"Parrots & Cockatiels","Net Weight":"2kg","Fortified":"Vitamins A, D3, E"}',749.00,1099.00,50,1,0,4.6,18,120),
('Stainless Steel Bird Cage (Medium)','stainless-steel-bird-cage-medium',(SELECT id FROM categories WHERE slug='birds'),'NestHaven',
 'Rust-proof steel cage with wide door, feeder cups and a slide-out tray for easy cleaning.',
 '{"Material":"Stainless Steel","Size":"Medium","Includes":"2 Feeder Cups + Tray"}',3499.00,4999.00,15,0,0,4.7,12,40),
('Wooden Bird Perch & Swing Set','wooden-bird-perch-swing-set',(SELECT id FROM categories WHERE slug='birds'),'WingWell',
 'Natural-wood perches and a swing that keep birds active and their feet healthy.',
 '{"Material":"Natural Wood","Pieces":"4","Fits":"Small–Medium Cages"}',499.00,799.00,60,0,0,4.4,16,90),
('Cuttlebone Calcium Supplement (Pack of 4)','cuttlebone-calcium-supplement-pack-of-4',(SELECT id FROM categories WHERE slug='birds'),'WingWell',
 'Natural cuttlebone for calcium and beak conditioning. Cage-clip included.',
 '{"Pack":"4","Nutrient":"Calcium","Includes":"Cage Clip"}',199.00,349.00,110,0,0,4.5,22,150),
-- FISH
('Tropical Fish Colour Flakes 200g','tropical-fish-colour-flakes-200g',(SELECT id FROM categories WHERE slug='fish'),'AquaLife',
 'Daily flake food with colour-enhancing carotenoids for tropical community fish.',
 '{"Type":"Flakes","Net Weight":"200g","For":"Tropical Community Fish"}',349.00,549.00,90,1,0,4.6,28,200),
('20L Glass Aquarium Starter Kit','20l-glass-aquarium-starter-kit',(SELECT id FROM categories WHERE slug='fish'),'AquaLife',
 'Everything to get started — 20L curved-glass tank with hood, LED and filter.',
 '{"Capacity":"20L","Includes":"Hood + LED + Filter","Glass":"Curved Front"}',2999.00,4499.00,18,0,1,4.7,14,55),
('Aquarium Power Filter (Up to 100L)','aquarium-power-filter-up-to-100l',(SELECT id FROM categories WHERE slug='fish'),'AquaLife',
 '3-stage filtration with adjustable flow for crystal-clear, healthy water.',
 '{"Suitable Up To":"100L","Filtration":"3-Stage","Flow":"Adjustable"}',1299.00,1899.00,30,0,0,4.5,17,75),
('Submersible Aquarium LED Light Bar','submersible-aquarium-led-light-bar',(SELECT id FROM categories WHERE slug='fish'),'AquaLife',
 'Energy-efficient full-spectrum LED that brings out fish colour and supports plants.',
 '{"Type":"Full-Spectrum LED","Mount":"Submersible","Length":"30cm"}',899.00,1399.00,35,0,0,4.4,11,48),
-- SMALL PETS
('Timothy Hay for Rabbits & Guinea Pigs 1kg','timothy-hay-rabbits-guinea-pigs-1kg',(SELECT id FROM categories WHERE slug='small-pets'),'MeadowMunch',
 'High-fibre sun-cured timothy hay — essential for digestion and dental health.',
 '{"Type":"Timothy Hay","Net Weight":"1kg","For":"Rabbits & Guinea Pigs"}',449.00,699.00,70,1,0,4.7,20,140),
('Silent-Spin Hamster Exercise Wheel','silent-spin-hamster-exercise-wheel',(SELECT id FROM categories WHERE slug='small-pets'),'TinyTrails',
 'Smooth solid-surface wheel with a silent bearing — safe for little feet, quiet at night.',
 '{"Diameter":"18cm","Surface":"Solid (Safe)","Noise":"Silent Bearing"}',599.00,899.00,45,0,0,4.5,15,85),
('Small Pet Wooden Hideout House','small-pet-wooden-hideout-house',(SELECT id FROM categories WHERE slug='small-pets'),'TinyTrails',
 'Chew-safe natural-wood hideout that gives small pets a cozy place to rest and gnaw.',
 '{"Material":"Chew-Safe Wood","For":"Hamsters / Guinea Pigs","Assembly":"Easy"}',699.00,1099.00,40,0,1,4.4,13,70),
('Rabbit & Guinea Pig Pellet Food 2kg','rabbit-guinea-pig-pellet-food-2kg',(SELECT id FROM categories WHERE slug='small-pets'),'MeadowMunch',
 'Fortified timothy-based pellets with vitamin C for guinea pigs and balanced fibre for rabbits.',
 '{"Type":"Pellets","Net Weight":"2kg","Added":"Vitamin C"}',799.00,1199.00,55,0,0,4.6,18,110);

-- 3) Images (clear + re-add for these product slugs so re-runs stay clean)
DELETE pi FROM product_images pi JOIN products p ON p.id = pi.product_id
 WHERE p.slug IN ('ocean-fish-adult-cat-food-1-2kg','clumping-odour-control-cat-litter-5kg','feather-teaser-wand-cat-toy',
   'multi-level-cat-scratching-post','ceramic-cat-food-water-bowl-set','catnip-infused-mice-toy-pack-of-3',
   'premium-parrot-cockatiel-seed-mix-2kg','stainless-steel-bird-cage-medium','wooden-bird-perch-swing-set',
   'cuttlebone-calcium-supplement-pack-of-4','tropical-fish-colour-flakes-200g','20l-glass-aquarium-starter-kit',
   'aquarium-power-filter-up-to-100l','submersible-aquarium-led-light-bar','timothy-hay-rabbits-guinea-pigs-1kg',
   'silent-spin-hamster-exercise-wheel','small-pet-wooden-hideout-house','rabbit-guinea-pig-pellet-food-2kg');

INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES
((SELECT id FROM products WHERE slug='ocean-fish-adult-cat-food-1-2kg'),'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,food',1,0),
((SELECT id FROM products WHERE slug='clumping-odour-control-cat-litter-5kg'),'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,litter',1,0),
((SELECT id FROM products WHERE slug='feather-teaser-wand-cat-toy'),'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,toy',1,0),
((SELECT id FROM products WHERE slug='multi-level-cat-scratching-post'),'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,scratching,post',1,0),
((SELECT id FROM products WHERE slug='ceramic-cat-food-water-bowl-set'),'https://placehold.co/800x800/e8e2d5/1c3025?text=pet,bowl',1,0),
((SELECT id FROM products WHERE slug='catnip-infused-mice-toy-pack-of-3'),'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,toy,mouse',1,0),
((SELECT id FROM products WHERE slug='premium-parrot-cockatiel-seed-mix-2kg'),'https://placehold.co/800x800/e8e2d5/1c3025?text=parrot,seed',1,0),
((SELECT id FROM products WHERE slug='stainless-steel-bird-cage-medium'),'https://placehold.co/800x800/e8e2d5/1c3025?text=bird,cage',1,0),
((SELECT id FROM products WHERE slug='wooden-bird-perch-swing-set'),'https://placehold.co/800x800/e8e2d5/1c3025?text=bird,perch',1,0),
((SELECT id FROM products WHERE slug='cuttlebone-calcium-supplement-pack-of-4'),'https://placehold.co/800x800/e8e2d5/1c3025?text=bird,cuttlebone',1,0),
((SELECT id FROM products WHERE slug='tropical-fish-colour-flakes-200g'),'https://placehold.co/800x800/e8e2d5/1c3025?text=aquarium,fish,food',1,0),
((SELECT id FROM products WHERE slug='20l-glass-aquarium-starter-kit'),'https://placehold.co/800x800/e8e2d5/1c3025?text=aquarium,tank',1,0),
((SELECT id FROM products WHERE slug='aquarium-power-filter-up-to-100l'),'https://placehold.co/800x800/e8e2d5/1c3025?text=aquarium,filter',1,0),
((SELECT id FROM products WHERE slug='submersible-aquarium-led-light-bar'),'https://placehold.co/800x800/e8e2d5/1c3025?text=aquarium,led',1,0),
((SELECT id FROM products WHERE slug='timothy-hay-rabbits-guinea-pigs-1kg'),'https://placehold.co/800x800/e8e2d5/1c3025?text=rabbit,hay',1,0),
((SELECT id FROM products WHERE slug='silent-spin-hamster-exercise-wheel'),'https://placehold.co/800x800/e8e2d5/1c3025?text=hamster,wheel',1,0),
((SELECT id FROM products WHERE slug='small-pet-wooden-hideout-house'),'https://placehold.co/800x800/e8e2d5/1c3025?text=hamster,house',1,0),
((SELECT id FROM products WHERE slug='rabbit-guinea-pig-pellet-food-2kg'),'https://placehold.co/800x800/e8e2d5/1c3025?text=guinea,pig,food',1,0);

-- 4) Variants (cat food pack sizes) — clear + re-add
DELETE pv FROM product_variants pv JOIN products p ON p.id = pv.product_id
 WHERE p.slug = 'ocean-fish-adult-cat-food-1-2kg';
INSERT INTO product_variants (product_id, size, color, color_hex, price_diff, stock) VALUES
((SELECT id FROM products WHERE slug='ocean-fish-adult-cat-food-1-2kg'),'1.2kg', NULL, NULL,    0.00, 30),
((SELECT id FROM products WHERE slug='ocean-fish-adult-cat-food-1-2kg'),'3kg',   NULL, NULL, 1100.00, 25);

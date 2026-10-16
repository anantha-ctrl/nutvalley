-- ============================================================
--  migration_029_petcare_wellness_products.sql
--  Adds real products into the admin-created categories
--  "Pet Care" (slug pet-care) and "Pet Wellness" (slug pet-wellness).
--  Does NOT create Dogs/Cats/etc. — respects the current structure.
--  Idempotent (slug-keyed). NOTE: deleting a category deletes its products.
-- ============================================================

INSERT IGNORE INTO products
(name, slug, category_id, brand, description, specifications, price, mrp, stock, is_featured, is_trending, rating_avg, rating_count, sold_count)
VALUES
-- ---------- PET CARE ----------
('Complete Adult Dog Food 3kg','complete-adult-dog-food-3kg',(SELECT id FROM categories WHERE slug='pet-care'),'FurFeast',
 'Complete, balanced nutrition for adult dogs with real chicken. High protein, no artificial colours.',
 '{"Life Stage":"Adult","Flavour":"Chicken & Rice","Net Weight":"3kg","Type":"Dry Food"}',1249.00,1699.00,60,1,1,4.7,54,210),
('Clumping Cat Litter 5kg','clumping-cat-litter-5kg',(SELECT id FROM categories WHERE slug='pet-care'),'FreshDen',
 'Fast-clumping bentonite litter with 7-day odour lock and low dust.',
 '{"Type":"Bentonite Clumping","Net Weight":"5kg","Odour Control":"7 Days"}',599.00,899.00,80,1,0,4.5,33,160),
('Oatmeal Soothing Pet Shampoo 500ml','oatmeal-soothing-pet-shampoo-500ml',(SELECT id FROM categories WHERE slug='pet-care'),'PetPure',
 'Gentle oatmeal formula that calms itchy skin and leaves the coat soft and shiny. Paraben-free.',
 '{"Volume":"500ml","Skin":"Sensitive","Free From":"Parabens & SLS"}',449.00,699.00,70,0,1,4.5,17,95),
('Stainless Steel Pet Bowl Set','stainless-steel-pet-bowl-set',(SELECT id FROM categories WHERE slug='pet-care'),'PetPure',
 'Durable non-slip twin bowls for food and water — rust-proof and dishwasher safe.',
 '{"Material":"Stainless Steel","Pieces":"2","Dishwasher Safe":"Yes"}',799.00,1199.00,40,0,0,4.6,19,60),
-- ---------- PET WELLNESS ----------
('Multivitamin Supplement for Dogs & Cats','multivitamin-supplement-dogs-cats',(SELECT id FROM categories WHERE slug='pet-wellness'),'VitalPet',
 'Daily multivitamin with omega-3, biotin and antioxidants for coat, immunity and energy.',
 '{"Form":"Tablet","Count":"60","For":"Dogs & Cats"}',599.00,899.00,90,1,0,4.6,28,150),
('Dental Chews for Fresh Breath (Pack of 30)','dental-chews-fresh-breath-30',(SELECT id FROM categories WHERE slug='pet-wellness'),'FurFeast',
 'Vet-recommended daily chews that reduce plaque, tartar and bad breath.',
 '{"Pack":"30","Use":"Daily Dental Care","For":"Dogs"}',449.00,699.00,100,0,1,4.5,41,260),
('Hip & Joint Care Tablets','hip-joint-care-tablets',(SELECT id FROM categories WHERE slug='pet-wellness'),'VitalPet',
 'Glucosamine + chondroitin support for mobility and healthy joints in ageing pets.',
 '{"Form":"Tablet","Count":"90","Active":"Glucosamine + Chondroitin"}',899.00,1299.00,50,1,0,4.7,22,80),
('Calming Anxiety Relief Treats','calming-anxiety-relief-treats',(SELECT id FROM categories WHERE slug='pet-wellness'),'VitalPet',
 'Soft chews with chamomile and L-theanine to ease travel, thunder and separation anxiety.',
 '{"Form":"Soft Chew","Count":"60","Active":"Chamomile + L-Theanine"}',399.00,599.00,70,0,1,4.4,18,130);

-- Images
DELETE pi FROM product_images pi JOIN products p ON p.id = pi.product_id
 WHERE p.slug IN ('complete-adult-dog-food-3kg','clumping-cat-litter-5kg','oatmeal-soothing-pet-shampoo-500ml',
   'stainless-steel-pet-bowl-set','multivitamin-supplement-dogs-cats','dental-chews-fresh-breath-30',
   'hip-joint-care-tablets','calming-anxiety-relief-treats');
INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES
((SELECT id FROM products WHERE slug='complete-adult-dog-food-3kg'),'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,food',1,0),
((SELECT id FROM products WHERE slug='clumping-cat-litter-5kg'),'https://placehold.co/800x800/e8e2d5/1c3025?text=cat,litter',1,0),
((SELECT id FROM products WHERE slug='oatmeal-soothing-pet-shampoo-500ml'),'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,bath',1,0),
((SELECT id FROM products WHERE slug='stainless-steel-pet-bowl-set'),'https://placehold.co/800x800/e8e2d5/1c3025?text=pet,bowl',1,0),
((SELECT id FROM products WHERE slug='multivitamin-supplement-dogs-cats'),'https://placehold.co/800x800/e8e2d5/1c3025?text=pet,vitamin',1,0),
((SELECT id FROM products WHERE slug='dental-chews-fresh-breath-30'),'https://placehold.co/800x800/e8e2d5/1c3025?text=dog,dental,chew',1,0),
((SELECT id FROM products WHERE slug='hip-joint-care-tablets'),'https://placehold.co/800x800/e8e2d5/1c3025?text=pet,supplement',1,0),
((SELECT id FROM products WHERE slug='calming-anxiety-relief-treats'),'https://placehold.co/800x800/e8e2d5/1c3025?text=pet,treats',1,0);

-- Variant (dog food pack size)
DELETE pv FROM product_variants pv JOIN products p ON p.id = pv.product_id
 WHERE p.slug = 'complete-adult-dog-food-3kg';
INSERT INTO product_variants (product_id, size, color, color_hex, price_diff, stock) VALUES
((SELECT id FROM products WHERE slug='complete-adult-dog-food-3kg'),'3kg', NULL, NULL,   0.00, 40),
((SELECT id FROM products WHERE slug='complete-adult-dog-food-3kg'),'7kg', NULL, NULL, 900.00, 20);

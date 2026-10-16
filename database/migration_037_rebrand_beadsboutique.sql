-- 037: rebrand FURCIL -> Beadsboutique in stored data (settings, coupons, products)
--   Earlier migrations (025, 033) seeded FURCIL values; this replaces them in the live DB.

-- Coupon code + announcement that advertises it
UPDATE coupons  SET code = 'BEADS10' WHERE code = 'FURCIL10';
UPDATE settings SET `value` = REPLACE(`value`, 'FURCIL10', 'BEADS10');

-- Order number prefix (new orders: BB00001, BB00002…; existing order numbers unchanged)
UPDATE settings SET `value` = 'BB' WHERE `key` = 'order_prefix' AND `value` = 'FUR';

-- Every remaining brand mention in settings (store name, payee, footer, hero copy, emails…)
UPDATE settings SET `value` = REPLACE(`value`, 'furcilpets@gmail.com', 'beadsboutiquejewellery@gmail.com') WHERE `value` LIKE '%furcilpets@gmail.com%';
UPDATE settings SET `value` = REPLACE(`value`, 'furcil.com', 'beadsboutiquejewellery.com') WHERE `value` LIKE '%furcil.com%';
UPDATE settings SET `value` = REPLACE(`value`, 'furcil@', 'beadsboutique@')               WHERE `value` LIKE '%furcil@%';
UPDATE settings SET `value` = REPLACE(REPLACE(`value`, 'FURCIL™', 'Beadsboutique'), 'FURCIL', 'Beadsboutique') WHERE `value` LIKE '%FURCIL%';

-- Products
UPDATE products SET brand = 'Beadsboutique' WHERE brand = 'FURCIL';
UPDATE products SET name        = REPLACE(name, 'FURCIL', 'Beadsboutique')        WHERE name LIKE '%FURCIL%';
UPDATE products SET description = REPLACE(description, 'FURCIL', 'Beadsboutique') WHERE description LIKE '%FURCIL%';

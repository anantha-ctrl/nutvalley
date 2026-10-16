-- 033: online order numbers become sequential + FURCIL-prefixed (FUR00001, FUR00002…)
--   replacing the old CF + date + random format. Prefix is admin-editable here.
INSERT INTO settings (`key`,`value`) VALUES ('order_prefix','FUR')
ON DUPLICATE KEY UPDATE `value` = `value`;

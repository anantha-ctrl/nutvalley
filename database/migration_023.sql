-- ============================================================
-- Migration 023 — Storefront category scope (men-only store)
-- When `storefront_category` holds a category slug, the whole
-- storefront (listings, collections, filters, product pages, nav
-- categories) is limited to that category + its children. Other
-- products stay in the DB (admin-managed) but are hidden from
-- shoppers. Leave the value empty to show the full catalogue.
-- ============================================================

INSERT INTO settings (`key`, `value`) VALUES
    ('storefront_category', 'men')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

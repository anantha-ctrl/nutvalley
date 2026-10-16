-- Migration 005: "first order only" coupons (e.g. WELCOME10 for new customers).
-- When set, the coupon is only valid if the user has no previous orders.

ALTER TABLE coupons
    ADD COLUMN first_order_only TINYINT(1) NOT NULL DEFAULT 0 AFTER usage_limit;

-- WELCOME10 is the new-customer welcome offer: first order only.
UPDATE coupons SET first_order_only = 1 WHERE code = 'WELCOME10';

-- ============================================================
-- Migration 021 — Cashier role (billing-counter staff)
-- A cashier can sign in and use ONLY the billing/POS screen.
-- ============================================================

ALTER TABLE users
    MODIFY role ENUM('customer','admin','cashier') NOT NULL DEFAULT 'customer';

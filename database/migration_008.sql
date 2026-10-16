-- Migration 008: review moderation.
-- Admins can soft-hide a review (keeps the row, removes it from the storefront
-- and from the product's rating aggregate) without deleting it outright.

ALTER TABLE reviews ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER comment;

-- Migration 011: allow admins to manually adjust loyalty points.
-- Adds an 'adjust' transaction type so manual credits/debits from the admin
-- panel are recorded distinctly from earn/redeem/referral/signup.

ALTER TABLE loyalty_transactions
  MODIFY COLUMN type ENUM('earn','redeem','referral','signup','adjust') NOT NULL;

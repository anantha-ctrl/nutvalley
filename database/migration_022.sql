-- ============================================================
-- Migration 022 — Billing: Split payment (cash + card/UPI)
-- Replaces the "other" payment method with "split", where a bill
-- is settled partly in cash and partly by card/UPI. The two
-- portions are stored so the invoice can show the breakdown.
-- ============================================================

ALTER TABLE bills
  MODIFY payment_method ENUM('cash','card','upi','split') NOT NULL DEFAULT 'cash',
  ADD COLUMN split_cash    DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER change_due,
  ADD COLUMN split_digital DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER split_cash;

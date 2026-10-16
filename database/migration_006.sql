-- Migration 006: order fulfilment — shipment tracking fields.

ALTER TABLE orders
    ADD COLUMN carrier         VARCHAR(60) NULL AFTER status,
    ADD COLUMN tracking_number VARCHAR(80) NULL AFTER carrier;

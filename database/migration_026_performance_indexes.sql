-- Performance indexes for live admin lists and date-range reports.
ALTER TABLE orders ADD INDEX idx_orders_placed_payment (placed_at, payment_status, status);
ALTER TABLE bills ADD INDEX idx_bills_created_status (created_at, status);
ALTER TABLE order_items ADD INDEX idx_order_items_order_product (order_id, product_id);

-- Migration 007: order_items snapshots the product image at purchase time.
-- When Cloudinary isn't configured, images are stored inline as base64
-- data-URIs, which overflow varchar(500). Widen to MEDIUMTEXT.

ALTER TABLE order_items MODIFY image_url MEDIUMTEXT NULL;

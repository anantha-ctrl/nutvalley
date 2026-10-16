-- Migration 004: allow base64 image data-URIs to be stored when Cloudinary
-- is not configured. varchar(500) overflows for inline images, so widen the
-- image columns to MEDIUMTEXT (up to 16MB).

ALTER TABLE product_images MODIFY image_url MEDIUMTEXT NOT NULL;
ALTER TABLE categories     MODIFY image_url MEDIUMTEXT NULL;
ALTER TABLE banners        MODIFY image_url MEDIUMTEXT NOT NULL;

-- Migration 019: allow settings to hold large values (inline base64 images).
--   Landing images can be uploaded from the admin; when Cloudinary is not
--   configured they are stored inline as data URIs, so widen `value`.

ALTER TABLE settings MODIFY COLUMN `value` MEDIUMTEXT NOT NULL;

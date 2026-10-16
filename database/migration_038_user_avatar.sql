-- 038: profile photos. avatar_url was VARCHAR(500) (Google photo URLs only); widen it so an
--   uploaded photo can be stored inline (small resized WebP data URI) when Cloudinary is
--   not configured. Cloudinary uploads still store just the URL.
ALTER TABLE users MODIFY avatar_url MEDIUMTEXT NULL;

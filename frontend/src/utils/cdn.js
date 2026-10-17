// Cloudinary delivery optimisation.
//
// Uploaded images are stored as full-size originals (banners are ~2.4 MB PNGs
// that take 5–8 s to load). Inserting a transformation into the URL makes
// Cloudinary serve a resized WebP/AVIF instead (~10× smaller), cached on its CDN.

const UPLOAD = '/image/upload/';
// Already transformed? (first path segment after /upload/ contains a "x_" param)
const HAS_TRANSFORM = /\/image\/upload\/(?:[a-z]{1,3}_[^/]+,?)+\//;

/** Optimised URL for a Cloudinary image; any other URL is returned unchanged. */
export function cdn(url, width = 1400) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes(UPLOAD)) return url;
  if (HAS_TRANSFORM.test(url)) return url;
  return url.replace(UPLOAD, `${UPLOAD}f_auto,q_auto,c_limit,w_${width}/`);
}

/** Recursively optimise every Cloudinary image URL inside an API payload. */
export function optimizeImages(data, depth = 0) {
  if (depth > 8 || data == null) return data;
  if (typeof data === 'string') return cdn(data);
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) data[i] = optimizeImages(data[i], depth + 1);
    return data;
  }
  if (typeof data === 'object') {
    for (const k of Object.keys(data)) data[k] = optimizeImages(data[k], depth + 1);
  }
  return data;
}

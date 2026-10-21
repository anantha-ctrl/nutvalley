// Products without an uploaded photo show their category's banner instead of
// a blank placeholder (keys are category slugs; files live in public/Banner).
const CATEGORY_IMAGES = {
  bangles: 'Bangles.png', bracelet: 'Bracelet.png', earrings: 'Earrings.png',
  harams: 'Harams.png', jummka: 'Jhumka.png', jhumka: 'Jhumka.png',
  'long-chain': 'Long Chain.png', necklace: 'Necklace.png',
  pendants: 'Pendants.png', tikka: 'Tikka.png',
};

export const fallbackImage = (product = {}) => {
  const slug = String(product.category_slug || '').replace(/-[a-z0-9]{4}$/i, '');
  const file = CATEGORY_IMAGES[product.category_slug] || CATEGORY_IMAGES[slug] || 'Product1.png';
  return `/Banner/${encodeURIComponent(file)}`;
};

export const productImage = (product = {}) => product.image || fallbackImage(product);

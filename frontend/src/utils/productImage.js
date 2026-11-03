// Products without an uploaded photo show a labelled placeholder for their
// category instead of a blank image (keys are category slugs).
const CATEGORY_LABELS = {
  almonds: 'Almonds', cashews: 'Cashews', pistachios: 'Pistachios', walnuts: 'Walnuts',
  dates: 'Dates', 'dried-fruits': 'Dried Fruits', seeds: 'Seeds', 'gift-boxes': 'Gift Box',
};

export const fallbackImage = (product = {}) => {
  const slug = String(product.category_slug || '').replace(/-[a-z0-9]{4}$/i, '');
  const label = CATEGORY_LABELS[product.category_slug] || CATEGORY_LABELS[slug] || 'NutValley';
  return `https://placehold.co/800x800/fbf6ea/1a4d23?text=${encodeURIComponent(label)}`;
};

export const productImage = (product = {}) => product.image || fallbackImage(product);

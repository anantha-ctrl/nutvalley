// Curated imagery + copy for the landing experience.
// Placeholder images: placehold.co + i.pravatar.cc (avatars) — reliable, no API key.
// Swap for your own uploads via Admin → Settings.

const PH = (w, h, text) => `https://placehold.co/${w}x${h}/f6e6e4/3a0d14?text=${encodeURIComponent(text)}`;

export const IMG = {
  hero: PH(1400, 1000, 'Beaded Jewellery'),
  intro: PH(1000, 1250, 'Handcrafted Beads'),
  men: PH(1000, 1250, 'Necklaces'),
  newArrival: PH(1600, 1000, 'New Arrivals'),
  story: PH(1200, 1000, 'Our Story'),
};

// Fallback set (used only if /api/categories is unreachable).
export const CATEGORIES = [
  { name: 'Necklaces', to: '/category/necklaces', img: PH(700, 700, 'Necklaces') },
  { name: 'Bracelets', to: '/category/bracelets', img: PH(700, 700, 'Bracelets') },
  { name: 'Earrings', to: '/category/earrings', img: PH(700, 700, 'Earrings') },
  { name: 'Rings', to: '/category/rings', img: PH(700, 700, 'Rings') },
];

export const SEASONS = [
  { name: 'Necklaces', tone: 'Layered strands, chokers & statement pieces', img: PH(900, 900, 'Necklaces') },
  { name: 'Bracelets', tone: 'Stackable beads, charms & stretch bands', img: PH(900, 900, 'Bracelets') },
  { name: 'Earrings', tone: 'Studs, drops, jhumkas & hoops', img: PH(900, 900, 'Earrings') },
  { name: 'Rings', tone: 'Dainty beaded rings for every finger', img: PH(900, 900, 'Rings') },
  { name: 'Anklets', tone: 'Light, playful anklets for everyday wear', img: PH(900, 900, 'Anklets') },
];

export const TESTIMONIALS = [
  { name: 'Aarohi Menon', role: 'Verified Buyer', quote: 'The beaded necklace I ordered is even prettier in person — beautifully finished and delivered fast.', img: 'https://i.pravatar.cc/200?img=45' },
  { name: 'Kavya Rao', role: 'Repeat Customer', quote: 'I stack their bracelets every day. They hold their colour and the packaging feels like a gift.', img: 'https://i.pravatar.cc/200?img=47' },
  { name: 'Meera Nair', role: 'Gifted a Set', quote: 'Bought earrings for my sister and she loved them. Handmade quality at a fair price.', img: 'https://i.pravatar.cc/200?img=32' },
  { name: 'Diya Sharma', role: 'Verified Buyer', quote: 'Lightweight, comfortable and so unique. Beadsboutique is my go-to for everyday jewellery.', img: 'https://i.pravatar.cc/200?img=44' },
];

export const INSTAGRAM = [
  PH(500, 500, 'Necklace'),
  PH(500, 500, 'Bracelet'),
  PH(500, 500, 'Earrings'),
  PH(500, 500, 'Ring'),
  PH(500, 500, 'Anklet'),
  PH(500, 500, 'Beads'),
  PH(500, 500, 'Gift Set'),
  PH(500, 500, 'Handmade'),
];

// Curated imagery + copy for the landing experience.
// Placeholder images: placehold.co + i.pravatar.cc (avatars) — reliable, no API key.
// Swap for your own uploads via Admin → Settings.

const PH = (w, h, text) => `https://placehold.co/${w}x${h}/fbf6ea/1a4d23?text=${encodeURIComponent(text)}`;

export const IMG = {
  hero: PH(1400, 1000, 'Premium Nuts & Dry Fruits'),
  intro: PH(1000, 1250, 'Packed Fresh'),
  men: PH(1000, 1250, 'Cashews'),
  newArrival: PH(1600, 1000, 'New Arrivals'),
  story: PH(1200, 1000, 'Our Story'),
};

// Fallback set (used only if /api/categories is unreachable).
export const CATEGORIES = [
  { name: 'Almonds', to: '/category/almonds', img: PH(700, 700, 'Almonds') },
  { name: 'Cashews', to: '/category/cashews', img: PH(700, 700, 'Cashews') },
  { name: 'Pistachios', to: '/category/pistachios', img: PH(700, 700, 'Pistachios') },
  { name: 'Dates', to: '/category/dates', img: PH(700, 700, 'Dates') },
];

export const SEASONS = [
  { name: 'Almonds', tone: 'California & Mamra almonds, rich and crunchy', img: PH(900, 900, 'Almonds') },
  { name: 'Cashews', tone: 'Whole W240 & W320 cashews, plain and roasted', img: PH(900, 900, 'Cashews') },
  { name: 'Pistachios', tone: 'Roasted & salted Iranian pistachios', img: PH(900, 900, 'Pistachios') },
  { name: 'Dates', tone: 'Soft Medjool, Ajwa & Kimia dates', img: PH(900, 900, 'Dates') },
  { name: 'Seeds', tone: 'Chia, flax, pumpkin & sunflower seeds', img: PH(900, 900, 'Seeds') },
];

export const TESTIMONIALS = [
  { name: 'Aarohi Menon', role: 'Verified Buyer', quote: 'The almonds are big, crunchy and so fresh — you can tell they were packed recently. Delivered fast too.', img: 'https://i.pravatar.cc/200?img=45' },
  { name: 'Kavya Rao', role: 'Repeat Customer', quote: 'My family finishes a pack of cashews every week. Great quality and the zip-lock packing keeps them fresh.', img: 'https://i.pravatar.cc/200?img=47' },
  { name: 'Meera Nair', role: 'Gifted a Box', quote: 'Ordered Diwali gift boxes for my office and everyone loved them. Premium quality at a fair price.', img: 'https://i.pravatar.cc/200?img=32' },
  { name: 'Diya Sharma', role: 'Verified Buyer', quote: 'Healthy, tasty and honestly priced. NutValley is my go-to for everyday dry fruits.', img: 'https://i.pravatar.cc/200?img=44' },
];

export const INSTAGRAM = [
  PH(500, 500, 'Almonds'),
  PH(500, 500, 'Cashews'),
  PH(500, 500, 'Pistachios'),
  PH(500, 500, 'Walnuts'),
  PH(500, 500, 'Dates'),
  PH(500, 500, 'Raisins'),
  PH(500, 500, 'Gift Box'),
  PH(500, 500, 'Seeds'),
];

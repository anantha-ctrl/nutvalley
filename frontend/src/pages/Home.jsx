import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Truck, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import { SectionTitle, Skeleton } from '../components/ui';
import Seo from '../components/Seo';
import RecentlyViewed from '../components/RecentlyViewed';
import OffersStrip from '../components/OffersStrip';

const SLIDES = [
  { title: 'Handstrung Necklaces', subtitle: 'Layered & Luminous', cta: 'Shop Necklaces', to: '/category/necklaces',
    img: 'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Necklaces' },
  { title: 'Stack & Shine', subtitle: 'Beaded Bracelets', cta: 'Shop Bracelets', to: '/category/bracelets',
    img: 'https://placehold.co/1600x900/f6e6e4/3a0d14?text=Bracelets' },
  { title: 'Fresh Beadwork', subtitle: 'New Arrivals', cta: 'Shop New In', to: '/shop?sort=newest',
    img: 'https://placehold.co/1600x900/f6e6e4/3a0d14?text=New+Arrivals' },
];

export default function Home() {
  const [slide, setSlide] = useState(0);
  const [slides, setSlides] = useState(SLIDES);
  const [cats, setCats] = useState([]);
  const [data, setData] = useState({ featured: null, trending: null, newArrivals: null, best: null });

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    // Banners are admin-managed; fall back to defaults if none/none-active.
    api.get('/api/banners').then((r) => {
      const b = r.data.data;
      if (b?.length) {
        setSlides(b.map((x) => ({ title: x.title, subtitle: x.subtitle, cta: x.cta_label, to: x.cta_link || '/shop', img: x.image_url })));
      }
    }).catch(() => {});
    api.get('/api/categories').then((r) => setCats(r.data.data)).catch(() => {});
    const load = (key, url) => api.get(url).then((r) => setData((d) => ({ ...d, [key]: r.data.data }))).catch(() => {});
    load('featured', '/api/products/featured?limit=8');
    load('trending', '/api/products/trending?limit=8');
    load('newArrivals', '/api/products/new-arrivals?limit=8');
    load('best', '/api/products/best-sellers?limit=4');
  }, []);

  return (
    <div>
      <Seo />
      {/* HERO SLIDER */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={slide} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
            <img src={slides[slide].img} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent" />
          </motion.div>
        </AnimatePresence>
        <div className="relative mx-auto flex h-full max-w-7xl items-center px-6">
          <motion.div key={`txt-${slide}`} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="max-w-xl text-white">
            <p className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-gold">
              <Sparkles size={16} /> {slides[slide].subtitle}
            </p>
            <h1 className="font-display text-5xl font-bold leading-tight sm:text-7xl">{slides[slide].title}</h1>
            <p className="mt-4 text-gray-300">Handcrafted beaded jewellery for every day and every occasion.</p>
            <Link to={slides[slide].to} className="btn-gold mt-8">{slides[slide].cta} <ArrowRight size={18} /></Link>
          </motion.div>
        </div>
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-8 bg-gold' : 'w-3 bg-white/40'}`} />
          ))}
        </div>
      </section>

      {/* PERKS */}
      <section className="border-b border-black/5 dark:border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 lg:grid-cols-4">
          {[
            [Truck, 'Free Shipping', 'On orders over ₹1999'],
            [RefreshCw, 'Easy Returns', '7-day return policy'],
            [ShieldCheck, 'Secure Payments', 'Razorpay protected'],
            [Sparkles, 'Premium Quality', 'Handcrafted pieces'],
          ].map(([Icon, t, s]) => (
            <div key={t} className="flex items-center gap-3">
              <div className="rounded-full bg-gold/10 p-3 text-gold"><Icon size={22} /></div>
              <div><p className="font-semibold">{t}</p><p className="text-xs text-gray-400">{s}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle eyebrow="Browse" title="Shop by Category" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {cats.map((c, i) => (
            <Link key={c.id} to={`/category/${c.slug}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl">
              {/* Use the admin-uploaded category image; fall back to a curated
                  placeholder only when the category has no image set. */}
              <img src={c.image_url || CAT_IMG[i % CAT_IMG.length]} alt={c.name}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <p className="font-display text-xl font-semibold">{c.name}</p>
                <p className="text-xs text-gold">{c.product_count} items</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Carousel title="New Arrivals" eyebrow="Just In" products={data.newArrivals} to="/shop?sort=newest" />

      <OffersStrip />

      {/* PROMO BANNER */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="relative overflow-hidden rounded-3xl bg-hero-gradient p-10 text-white sm:p-16">
          <div className="relative z-10 max-w-lg">
            <p className="text-sm uppercase tracking-[0.3em] text-gold">Limited Offer</p>
            <h3 className="mt-2 font-display text-4xl font-bold">Up to 40% Off</h3>
            <p className="mt-2 text-gray-300">Save big on selected jewellery. Use code <b className="text-gold">BEADS500</b>.</p>
            <Link to="/shop?on_sale=1&sort=discount" className="btn-gold mt-6">Shop the Sale <ArrowRight size={18} /></Link>
          </div>
          <Sparkles className="absolute -right-6 -top-6 h-48 w-48 text-gold/10" />
        </div>
      </section>

      <RecentlyViewed />

      <Carousel title="Trending Now" eyebrow="Hot Picks" products={data.trending} to="/shop?sort=popularity" />
      <Carousel title="Featured Collection" eyebrow="Curated" products={data.featured} to="/shop" />

      {/* BEST SELLERS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle eyebrow="Customer Favourites" title="Best Sellers"
          action={<Link to="/shop?sort=popularity" className="btn-outline !py-2 text-sm">View All</Link>} />
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {(data.best || Array(4).fill(null)).map((p, i) => p ? <ProductCard key={p.id} product={p} /> : <Skeleton key={i} />)}
        </div>
      </section>
    </div>
  );
}

const CAT_IMG = [
  'https://placehold.co/500x600/f6e6e4/3a0d14?text=Necklaces',
  'https://placehold.co/500x600/f6e6e4/3a0d14?text=Bracelets',
  'https://placehold.co/500x600/f6e6e4/3a0d14?text=Earrings',
  'https://placehold.co/500x600/f6e6e4/3a0d14?text=Rings',
  'https://placehold.co/500x600/f6e6e4/3a0d14?text=Anklets',
];

function Carousel({ title, eyebrow, products, to }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <SectionTitle eyebrow={eyebrow} title={title}
        action={<Link to={to} className="btn-outline !py-2 text-sm">View All <ArrowRight size={16} /></Link>} />
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {(products || Array(4).fill(null)).map((p, i) => p ? <ProductCard key={p.id} product={p} /> : <Skeleton key={i} />)}
      </div>
    </section>
  );
}

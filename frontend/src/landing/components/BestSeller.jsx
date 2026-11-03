import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';
import api from '../../api/client';
import { discountPct } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import Reveal from '../lib/Reveal';
import QuickViewModal from '../../components/QuickViewModal';
import NutVisual from '../three/NutVisual';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const EASE = [0.22, 1, 0.36, 1];

export default function BestSeller() {
  const [products, setProducts] = useState(null);
  const [quick, setQuick] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => api.get('/api/products/best-sellers?limit=8')
      .then((r) => { if (active) setProducts(r.data.data); })
      .catch(() => { if (active) setProducts([]); });
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  return (
    <section className="bg-luxe-bg pt-8 pb-12 dark:bg-ink sm:pt-10 sm:pb-16">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-10 lg:px-12">
        <div className="mb-12 text-center">
          <Reveal><p className="mb-4 text-xs uppercase tracking-[0.4em] text-luxe-bronze">Most loved</p></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-display text-4xl font-bold text-luxe-ink dark:text-white sm:text-5xl">Best sellers</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-4 max-w-xl text-luxe-ink/60 dark:text-white/60">The products our community keeps coming back for — trusted, tried and loved.</p>
          </Reveal>
        </div>

        {products === null ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-luxe bg-luxe-ink/5" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-luxe-ink/50">Best sellers are on their way. Check back soon.</p>
        ) : (
          // Flex (not grid) so a short list centres instead of hugging the left column.
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-6 sm:gap-5">
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                className="w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.9375rem)]"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: (i % 4) * 0.08, ease: EASE }}
              >
                <LuxeCard product={p} onQuickView={() => setQuick(p.slug)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {quick && <QuickViewModal slug={quick} onClose={() => setQuick(null)} />}
    </section>
  );
}

function LuxeCard({ product, onQuickView }) {
  const { add, loading } = useCart();
  const { has, toggle } = useWishlist();
  const wished = has(product.id);
  const off = discountPct(product.price, product.mrp);

  return (
    <div className="group relative">
      <div className="relative overflow-hidden rounded-luxe bg-white shadow-luxe-sm dark:bg-ink-soft">
        <Link to={`/product/${product.slug}`} className="block aspect-[3/4] overflow-hidden">
          <NutVisual
            src={product.image} label={`${product.category_slug || ''} ${product.name}`} alt={product.name}
            className="h-full w-full"
            imgClassName="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
          />
        </Link>

        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-luxe-ink px-2 py-0.5 text-[10px] sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[11px] font-semibold text-white">
            −{off}%
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={() => toggle(product)}
          aria-label="Wishlist"
          className={`absolute right-2 top-2 flex h-8 w-8 items-center sm:right-3 sm:top-3 sm:h-10 sm:w-10 justify-center rounded-full backdrop-blur-md transition ${
            wished ? 'bg-luxe-gold text-luxe-ink' : 'bg-white/80 text-luxe-ink hover:bg-white'
          }`}
        >
          <Heart size={16} className={wished ? 'fill-current' : ''} />
        </button>

        {/* Hover action bar */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex translate-y-4 gap-1.5 sm:inset-x-3 sm:bottom-3 sm:gap-2 opacity-0 transition-all duration-500 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <button
            onClick={() => add(product, null, 1)}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-luxe-ink py-2 text-xs font-semibold sm:gap-2 sm:py-3 sm:text-sm text-white transition hover:bg-luxe-cream hover:text-luxe-ink disabled:opacity-60"
          >
            <ShoppingBag size={15} /> Add
          </button>
          <button
            onClick={onQuickView}
            aria-label="Quick view"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-luxe-ink sm:h-11 sm:w-11 shadow-luxe-sm transition hover:bg-luxe-cream hover:text-luxe-ink"
          >
            <Eye size={17} />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 px-0.5 sm:mt-4 sm:px-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/product/${product.slug}`} className="text-sm font-medium text-luxe-ink line-clamp-1 hover:text-luxe-bronze sm:text-base dark:text-white">
            {product.name}
          </Link>
          {product.rating_avg > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-luxe-ink/60 dark:text-white/60">
              <Star size={12} className="fill-luxe-gold text-luxe-gold" /> {product.rating_avg.toFixed(1)}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 sm:mt-1.5">
          <span className="text-sm font-semibold text-luxe-ink dark:text-white sm:text-base">{inr(product.price)}</span>
          {off > 0 && <span className="text-xs text-luxe-ink/40 line-through sm:text-sm dark:text-white/40">{inr(product.mrp)}</span>}
        </div>
      </div>
    </div>
  );
}

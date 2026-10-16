import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import Reveal from '../lib/Reveal';
import api from '../../api/client';
import { inr } from '../../utils/format';

const IMG_BASE = api.defaults.baseURL || '';
const imgSrc = (p) =>
  p.image && !String(p.image).startsWith('data:') ? p.image : `${IMG_BASE}/api/products/${p.id}/thumb`;

export default function InstagramGallery() {
  const [items, setItems] = useState([]);
  const trackRef = useRef(null);
  const hover = useRef(false);
  const reduce = useReducedMotion();

  // Live, real product looks (best sellers) — shoppable gallery.
  useEffect(() => {
    api.get('/api/products/best-sellers')
      .then((r) => setItems(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => setItems([]));
  }, []);

  const scrollByCards = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  useEffect(() => {
    if (reduce || items.length < 3) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el || hover.current) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
      else scrollByCards(1);
    }, 3000);
    return () => clearInterval(id);
  }, [reduce, items]);

  if (items.length === 0) return null;

  return (
    <section className="bg-luxe-bg py-24 dark:bg-ink sm:py-28">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-12">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4 text-center sm:text-left">
          <div className="w-full sm:w-auto">
            <Reveal><p className="mb-4 text-xs uppercase tracking-[0.4em] text-luxe-bronze">Shop the look</p></Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-display text-4xl font-bold text-luxe-ink dark:text-white sm:text-5xl">Styled by you</h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="flex items-center gap-3">
              <button onClick={() => scrollByCards(-1)} aria-label="Previous"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-luxe-ink/15 text-luxe-ink transition hover:border-luxe-gold hover:bg-luxe-gold dark:border-white/20 dark:text-white">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => scrollByCards(1)} aria-label="Next"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-luxe-ink/15 text-luxe-ink transition hover:border-luxe-gold hover:bg-luxe-gold dark:border-white/20 dark:text-white">
                <ChevronRight size={18} />
              </button>
            </div>
          </Reveal>
        </div>

        {/* Auto-sliding shoppable gallery */}
        <div
          ref={trackRef}
          onMouseEnter={() => { hover.current = true; }}
          onMouseLeave={() => { hover.current = false; }}
          className="scrollbar-none -mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-2 pb-2"
        >
          {items.map((p) => (
            <Link
              key={p.id}
              data-card
              to={`/product/${p.slug}`}
              className="group relative block aspect-[4/5] w-[62%] shrink-0 snap-start overflow-hidden rounded-luxe sm:w-[38%] lg:w-[24%] xl:w-[19%]"
            >
              <img src={imgSrc(p)} alt={p.name} loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-luxe-ink/80 via-transparent to-transparent opacity-90" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="line-clamp-1 text-sm font-semibold text-white">{p.name}</p>
                <p className="text-xs font-semibold text-luxe-gold">{inr(p.price)}</p>
              </div>
              <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-md transition group-hover:bg-luxe-gold group-hover:text-luxe-ink group-hover:opacity-100">
                <ShoppingBag size={16} />
              </div>
            </Link>
          ))}
          <div className="w-1 shrink-0" />
        </div>
      </div>
    </section>
  );
}

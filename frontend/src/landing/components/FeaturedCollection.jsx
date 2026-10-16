import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Reveal from '../lib/Reveal';
import api from '../../api/client';
import { inr } from '../../utils/format';

const IMG_BASE = api.defaults.baseURL || '';
// Heavy base64 images stream via the cached passthrough; URL images stay direct.
const imgSrc = (p) =>
  p.image && !String(p.image).startsWith('data:') ? p.image : `${IMG_BASE}/api/products/${p.id}/thumb`;

export default function FeaturedCollection() {
  const [items, setItems] = useState([]);
  const trackRef = useRef(null);
  const hover = useRef(false);
  const reduce = useReducedMotion();

  // Live featured products (admin flags them under Admin → Products).
  useEffect(() => {
    api.get('/api/products/featured')
      .then((r) => setItems(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => setItems([]));
  }, []);

  const scrollByCards = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const amount = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  useEffect(() => {
    if (reduce || items.length < 3) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el || hover.current) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
      else scrollByCards(1);
    }, 3400);
    return () => clearInterval(id);
  }, [reduce, items]);

  if (items.length === 0) return null; // nothing featured yet

  return (
    <section className="overflow-hidden bg-luxe-ink py-24 text-white sm:py-28">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Reveal><p className="mb-4 text-xs uppercase tracking-[0.4em] text-luxe-gold">Curated capsules</p></Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-display text-4xl font-bold sm:text-5xl">Featured collections</h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="flex items-center gap-3">
              <p className="mr-2 hidden max-w-xs text-sm text-white/50 sm:block">Auto-sliding — a piece for every mood.</p>
              <button onClick={() => scrollByCards(-1)} aria-label="Previous"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition hover:border-luxe-gold hover:bg-luxe-gold hover:text-luxe-ink">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => scrollByCards(1)} aria-label="Next"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition hover:border-luxe-gold hover:bg-luxe-gold hover:text-luxe-ink">
                <ChevronRight size={18} />
              </button>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Auto-sliding rail */}
      <div
        ref={trackRef}
        onMouseEnter={() => { hover.current = true; }}
        onMouseLeave={() => { hover.current = false; }}
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-4 sm:px-10 lg:px-12"
      >
        {items.map((p, i) => (
          <Link
            key={p.id}
            data-card
            to={`/product/${p.slug}`}
            className="group relative w-[78vw] shrink-0 snap-start overflow-hidden rounded-luxe-lg sm:w-[46vw] lg:w-[30vw]"
          >
            <div className="aspect-[3/4] overflow-hidden">
              <img src={imgSrc(p)} alt={p.name} loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[1000ms] ease-out group-hover:scale-110" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-luxe-ink/90 via-luxe-ink/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7">
              <p className="mb-1 text-xs uppercase tracking-[0.3em] text-luxe-gold">Collection {String(i + 1).padStart(2, '0')}</p>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-1 font-display text-2xl font-bold sm:text-3xl">{p.name}</h3>
                  <p className="mt-1 text-sm text-white/80">
                    <span className="font-semibold text-luxe-gold">{inr(p.price)}</span>
                    {p.discount_pct > 0 && <span className="ml-2 text-white/50 line-through">{inr(p.mrp)}</span>}
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition group-hover:bg-luxe-gold group-hover:text-luxe-ink">
                  <ArrowUpRight size={18} />
                </span>
              </div>
            </div>
          </Link>
        ))}
        <div className="w-2 shrink-0" />
      </div>
    </section>
  );
}

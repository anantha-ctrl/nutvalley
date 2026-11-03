import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Reveal from '../lib/Reveal';
import api from '../../api/client';
import { inr } from '../../utils/format';
import NutVisual from '../three/NutVisual';

const IMG_BASE = api.defaults.baseURL || '';
// Heavy base64 images stream via the cached passthrough; URL images stay direct.
const PLACEHOLDER = 'https://placehold.co/600x800/fbf6ea/1a4d23?text=NutValley';
const imgSrc = (p) =>
  !p.image ? PLACEHOLDER
    : String(p.image).startsWith('data:') ? `${IMG_BASE}/api/products/${p.id}/thumb` : p.image;

// Rail gutter that lines the first card up with the 1400px heading container.
const GUTTER = 'px-6 sm:px-10 lg:px-[max(3rem,calc((100vw-1400px)/2+3rem))] lg:scroll-pl-[max(3rem,calc((100vw-1400px)/2+3rem))]';

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
  // A rail only makes sense once it can actually scroll; a few products sit centred.
  const rail = items.length >= 3;

  return (
    <section data-nav="light" className="overflow-hidden bg-luxe-bg py-12 text-luxe-ink sm:py-16">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-12">
        <div className={`mb-10 flex flex-wrap items-end gap-6 ${rail ? 'justify-between' : 'justify-center text-center'}`}>
          <div>
            <Reveal><p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-luxe-gold">Curated capsules</p></Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-display text-4xl font-bold sm:text-5xl">Featured collections</h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-3 max-w-md text-sm text-luxe-ink/60">Hand-picked favourites — a flavour for every mood.</p>
            </Reveal>
          </div>
          {rail && <Reveal delay={0.1}>
            <div className="flex items-center gap-3">
              <button onClick={() => scrollByCards(-1)} aria-label="Previous"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-luxe-ink/20 bg-white transition hover:border-luxe-ink hover:bg-luxe-cream">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => scrollByCards(1)} aria-label="Next"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-luxe-ink/20 bg-white transition hover:border-luxe-ink hover:bg-luxe-cream">
                <ChevronRight size={18} />
              </button>
            </div>
          </Reveal>}
        </div>
      </div>

      {/* Auto-sliding rail */}
      <div
        ref={trackRef}
        onMouseEnter={() => { hover.current = true; }}
        onMouseLeave={() => { hover.current = false; }}
        className={`scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-6 pt-1 ${GUTTER} ${rail ? '' : 'justify-center'}`}
      >
        {items.map((p, i) => (
          <Link
            key={p.id}
            data-card
            to={`/product/${p.slug}`}
            className="group flex w-[72vw] max-w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-luxe border border-luxe-line bg-white shadow-luxe-sm transition duration-500 hover:-translate-y-1 hover:shadow-luxe sm:w-[300px]"
          >
            {/* Photo stays unobstructed — product posters carry their own artwork */}
            <div className="relative aspect-square overflow-hidden">
              <NutVisual src={p.image && imgSrc(p)} label={`${p.category_slug || ''} ${p.name}`} alt={p.name} dark={i % 2 === 0}
                className="h-full w-full" imgClassName="object-cover transition-transform duration-[1000ms] ease-out group-hover:scale-105" />
              {p.discount_pct > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-luxe-gold px-3 py-1 text-[11px] font-bold text-white shadow">
                  {Math.round(p.discount_pct)}% OFF
                </span>
              )}
            </div>
            <div className="flex flex-1 items-end justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-luxe-gold">Collection {String(i + 1).padStart(2, '0')}</p>
                <h3 className="line-clamp-1 font-display text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm">
                  <span className="font-semibold">{inr(p.price)}</span>
                  {p.discount_pct > 0 && <span className="ml-2 text-luxe-ink/40 line-through">{inr(p.mrp)}</span>}
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-luxe-ink/5 transition group-hover:bg-luxe-cream group-hover:text-luxe-ink">
                <ArrowUpRight size={18} />
              </span>
            </div>
          </Link>
        ))}
        {rail && <div className="w-2 shrink-0" />}
      </div>
    </section>
  );
}

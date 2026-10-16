import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Reveal from '../lib/Reveal';
import api from '../../api/client';
import { CATEGORIES } from '../lib/content';

// Hardcoded editorial set as a graceful fallback if the API is unreachable.
const FALLBACK = CATEGORIES.map((c) => ({ name: c.name, to: c.to, img: c.img }));

const countLabel = (n) => (n == null ? null : n > 0 ? `${n} ${n === 1 ? 'piece' : 'pieces'}` : 'Coming soon');

export default function CategorySection() {
  const [cats, setCats] = useState(null);
  const trackRef = useRef(null);
  const hover = useRef(false);
  const reduce = useReducedMotion();

  // Live categories from the DB (admin-managed under Admin → Categories).
  useEffect(() => {
    api.get('/api/categories')
      .then((r) => {
        const list = (r.data.data || []).map((c) => ({
          name: c.name,
          to: `/category/${c.slug}`,
          img: c.image_url,
          count: c.product_count != null ? Number(c.product_count) : null,
        }));
        setCats(list.length ? list : FALLBACK);
      })
      .catch(() => setCats(FALLBACK));
  }, []);

  const scrollByCards = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const gap = parseFloat(getComputedStyle(el).columnGap) || 20;
    const amount = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  // Auto-advance one card at a time; loop back at the end; pause on hover/touch.
  useEffect(() => {
    if (reduce || !cats || cats.length < 3) return undefined;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el || hover.current || el.scrollWidth <= el.clientWidth + 8) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollByCards(1);
      }
    }, 3500);
    return () => clearInterval(id);
  }, [reduce, cats]);

  const items = cats || FALLBACK;

  return (
    <section className="bg-luxe-bg py-20 dark:bg-ink sm:py-24">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-12">
        {/* Heading — centred, with controls tucked to the right on desktop */}
        <div className="relative mb-12 text-center">
          <Reveal><p className="mb-3 text-xs uppercase tracking-[0.4em] text-luxe-bronze">Explore</p></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-display text-4xl font-bold text-luxe-ink dark:text-white sm:text-5xl">Shop by category</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mx-auto mt-4 flex items-center justify-center gap-3 text-luxe-gold">
              <span className="h-px w-10 bg-current opacity-50" />
              <span className="h-1.5 w-1.5 rotate-45 bg-current" />
              <span className="h-px w-10 bg-current opacity-50" />
            </div>
          </Reveal>

          <div className="mt-6 flex items-center justify-center gap-3 lg:absolute lg:bottom-0 lg:right-0 lg:mt-0">
            <button onClick={() => scrollByCards(-1)} aria-label="Previous categories"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-luxe-ink/15 text-luxe-ink transition hover:border-luxe-gold hover:bg-luxe-gold hover:text-white dark:border-white/20 dark:text-white">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scrollByCards(1)} aria-label="Next categories"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-luxe-ink/15 text-luxe-ink transition hover:border-luxe-gold hover:bg-luxe-gold hover:text-white dark:border-white/20 dark:text-white">
              <ChevronRight size={18} />
            </button>
            <Link to="/shop" className="group ml-1 inline-flex items-center gap-1.5 text-sm font-semibold text-luxe-ink dark:text-white">
              View all
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Sliding rail of arch-framed categories; soft fade at both edges */}
        <div
          ref={trackRef}
          onMouseEnter={() => { hover.current = true; }}
          onMouseLeave={() => { hover.current = false; }}
          onTouchStart={() => { hover.current = true; }}
          className="scrollbar-none -mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-4 pt-2 sm:-mx-10 sm:px-10 lg:-mx-12 lg:px-12"
          style={{
            maskImage: 'linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)',
          }}
        >
          {items.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              data-card
              className="group w-[44%] shrink-0 snap-start text-center sm:w-[30%] md:w-[23%] lg:w-[18.5%] xl:w-[15.6%]"
            >
              {/* Arch frame: thin gold keyline sitting just inside the photo */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-b-2xl rounded-t-full bg-white shadow-luxe-sm transition-shadow duration-500 group-hover:shadow-luxe dark:bg-white/5">
                {c.img ? (
                  <img
                    src={c.img} alt={c.name} loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-cream to-luxe-line font-display text-5xl text-luxe-bronze">
                    {c.name?.[0]}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-2 rounded-b-xl rounded-t-full border border-white/60 transition-colors duration-500 group-hover:border-luxe-gold/80" />
                <div className="absolute inset-0 bg-luxe-ink/0 transition-colors duration-500 group-hover:bg-luxe-ink/10" />
              </div>

              <h3 className="mt-4 font-display text-lg font-semibold text-luxe-ink transition-colors group-hover:text-luxe-gold dark:text-white sm:text-xl">
                {c.name}
              </h3>
              {countLabel(c.count) && (
                <p className={`mt-0.5 text-xs tracking-wide ${c.count > 0 ? 'text-luxe-ink/55 dark:text-white/55' : 'italic text-luxe-bronze/80'}`}>
                  {countLabel(c.count)}
                </p>
              )}
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-luxe-gold opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100">
                Shop <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Reveal from '../lib/Reveal';
import NutVisual from '../three/NutVisual';
import api from '../../api/client';
import { CATEGORIES } from '../lib/content';

const EASE = [0.22, 1, 0.36, 1];

// Hardcoded set as a graceful fallback if the API is unreachable.
const FALLBACK = CATEGORIES.map((c) => ({ name: c.name, slug: c.to.split('/').pop(), to: c.to, img: c.img }));

export default function CategorySection() {
  const [cats, setCats] = useState(null);
  const reduce = useReducedMotion();

  // Live categories from the DB (admin-managed under Admin → Categories).
  useEffect(() => {
    api.get('/api/categories')
      .then((r) => {
        const list = (r.data.data || []).map((c) => ({
          name: c.name,
          slug: c.slug,
          to: `/category/${c.slug}`,
          img: c.image_url,
        }));
        setCats(list.length ? list : FALLBACK);
      })
      .catch(() => setCats(FALLBACK));
  }, []);

  const items = cats || FALLBACK;
  // One "half" of the rail must be wider than the widest screen, otherwise the
  // rail ends mid-screen (empty space on the right). With only a few categories,
  // repeat them until a half has at least MIN_HALF cards.
  const MIN_HALF = 8;
  const half = [];
  while (items.length && half.length < MIN_HALF) half.push(...items);
  // The half is rendered twice and slid by -50%, so the loop is seamless.
  const loop = reduce ? items : [...half, ...half];
  const realCount = items.length; // only the first N cards are focusable; the rest are visual repeats
  // Up to 4 categories fit on screen → show them static & centred.
  // More than that → auto-scrolling rail.
  const STATIC_MAX = 4;
  const scroll = items.length > STATIC_MAX;

  return (
    <section className="relative overflow-hidden bg-luxe-bg py-12 dark:bg-ink sm:py-16">
      {/* soft golden aura behind the rail */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,151,28,0.14),transparent_65%)]" />

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-10 lg:px-12">
        <div className="mb-8 flex flex-col items-center gap-5 sm:mb-14 sm:gap-6 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
          <div>
            <Reveal><p className="mb-3 text-xs uppercase tracking-[0.4em] text-luxe-bronze">Explore the valley</p></Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-display text-4xl font-bold text-luxe-ink dark:text-white sm:text-6xl">
                Shop by <span className="bg-gold-sheen bg-clip-text text-transparent">category</span>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-3 max-w-lg text-sm text-luxe-ink/60 sm:mt-4 sm:text-base dark:text-white/60">
                From creamy cashews to sun-ripened dates — every pack sorted by hand and sealed fresh.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <Link to="/shop" className="group inline-flex items-center gap-2 rounded-full border border-luxe-ink/15 px-5 py-2.5 text-sm sm:px-6 sm:py-3 font-semibold text-luxe-ink transition hover:border-luxe-ink hover:bg-luxe-cream hover:text-luxe-ink dark:border-white/20 dark:text-white">
              View all products
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </div>

      {/* Mobile: two-per-row grid — cards rise in as they scroll into view */}
      <div className="relative grid grid-cols-2 gap-3 px-4 sm:hidden">
        {items.map((c, i) => (
          <motion.div
            key={c.to}
            initial={reduce ? false : { opacity: 0, y: 48, scale: 0.92 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, delay: (i % 2) * 0.12, ease: EASE }}
          >
            <Link
              to={c.to}
              aria-label={c.name}
              className="group relative block overflow-hidden rounded-2xl shadow-luxe-sm ring-1 ring-luxe-ink/5 transition-transform active:scale-[0.97]"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <NutVisual
                  src={c.img} label={`${c.slug} ${c.name}`} alt={c.name} dark={i % 2 === 1}
                  className="h-full w-full"
                  imgClassName="object-cover"
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Tablet & up, few categories: static, centred row */}
      {!scroll && (
        <div className="relative mx-auto hidden max-w-[1400px] flex-wrap justify-center gap-6 px-10 py-4 sm:flex lg:px-12">
          {items.map((c, i) => (
            <motion.div
              key={c.to}
              initial={reduce ? false : { opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
              className="w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[300px]"
            >
              <Link
                to={c.to}
                aria-label={c.name}
                className="group relative block overflow-hidden rounded-[28px] shadow-luxe-sm ring-1 ring-luxe-ink/5 transition-shadow duration-500 hover:shadow-luxe"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <NutVisual
                    src={c.img} label={`${c.slug} ${c.name}`} alt={c.name} dark={i % 2 === 1}
                    className="h-full w-full"
                    imgClassName="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tablet & up, many categories: auto-scrolling, full-width rail — pauses on hover */}
      {scroll && <div className={`relative hidden sm:block ${reduce ? 'scrollbar-none overflow-x-auto' : 'overflow-hidden'} [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]`}>
        <div
          className={`flex w-max py-4 ${reduce ? 'px-6' : 'animate-marquee hover:[animation-play-state:paused]'}`}
          style={reduce ? undefined : { animationDuration: `${half.length * 5}s` }}
        >
          {loop.map((c, i) => (
            <Link
              key={`${c.to}-${i}`}
              to={c.to}
              aria-label={c.name}
              aria-hidden={i >= realCount ? true : undefined}
              tabIndex={i >= realCount ? -1 : undefined}
              // margin (not flex gap) so each half is exactly 50% wide → no jump at the loop point
              className="group relative mr-4 block shrink-0 overflow-hidden rounded-[28px] sm:mr-6 shadow-luxe-sm ring-1 ring-luxe-ink/5 transition-shadow duration-500 hover:shadow-luxe sm:w-[36vw] md:w-[28vw] lg:w-[300px]"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <NutVisual
                  src={c.img} label={`${c.slug} ${c.name}`} alt={c.name} dark={i % 2 === 1}
                  className="h-full w-full"
                  imgClassName="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>}
    </section>
  );
}

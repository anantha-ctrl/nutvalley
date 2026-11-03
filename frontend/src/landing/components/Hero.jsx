import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Leaf, Truck, ShieldCheck } from 'lucide-react';
import { MaskReveal } from '../lib/Reveal';
import MagneticButton from '../lib/MagneticButton';
import { IMG } from '../lib/content';
import api from '../../api/client';
import { isRealImage } from '../three/NutVisual';

const EASE = [0.22, 1, 0.36, 1];

const DEFAULTS = {
  hero_eyebrow: 'Premium Nuts & Dry Fruits',
  hero_title: 'Nature\'s finest, packed fresh.',
  hero_accent: 'Healthy snacking made easy.',
  hero_subtitle: 'Almonds, cashews, pistachios, walnuts, dates & more — delivered across India.',
  hero_cta: 'Shop Now',
  hero_cta_link: '/shop',
};

export default function Hero({ content }) {
  const c = { ...DEFAULTS, ...(content || {}) };
  // Live, admin-managed hero slides (Admin → Banners). null = still loading.
  const [slides, setSlides] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => api.get('/api/banners')
      .then((r) => { if (active) setSlides(Array.isArray(r.data.data) ? r.data.data : []); })
      // A failed refresh keeps the banners already on screen; only a failed FIRST
      // load (nothing shown yet) falls back to the hero background.
      .catch(() => { if (active) setSlides((prev) => prev ?? []); });
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  // The photo hero always opens the page. Admin banners that carry a real
  // photo (seed placeholders are skipped) follow it as a 3D offers carousel.
  const offers = (slides || []).filter((b) => isRealImage(b.image_url));
  return (
    <>
      <PhotoHero c={c} />
      {offers.length > 0 && <HeroCarousel slides={offers} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Auto-sliding banner carousel (real-time from /api/banners)          */
/* ------------------------------------------------------------------ */
function HeroCarousel({ slides }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const n = slides.length;
  const go = (idx) => setI(((idx % n) + n) % n);

  // Always auto-advance (reduced-motion only flattens the 3D effect). Keyed on `i` so a
  // manual arrow/dot click restarts the countdown instead of jumping again right after.
  useEffect(() => {
    if (n < 2) return;
    const id = setTimeout(() => setI((p) => (p + 1) % n), 4500);
    return () => clearTimeout(id);
  }, [i, n]);

  useEffect(() => { if (i >= n) setI(0); }, [n]); // keep index valid if slides change

  // Shortest circular distance from the active slide, e.g. for n=6: −3…3.
  const offsetOf = (idx) => {
    let off = idx - i;
    if (off > n / 2) off -= n;
    else if (off < -n / 2) off += n;
    return off;
  };

  return (
    // On sm+ the whole hero (card + copy + button + dots) is exactly one screen tall,
    // so nothing needs a scroll. Top padding clears the fixed 72px header.
    <section
      data-nav="hero"
      className="relative flex flex-col items-center overflow-hidden bg-[#fbf6ea] pb-12 pt-28 dark:bg-[#fbf6ea] sm:h-[100svh] sm:min-h-[560px] sm:pb-5 sm:pt-[84px]"
    >
      {/* ambient glow (radial gradient — a blurred box shows hard edges in some browsers) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(201,151,28,0.16),transparent_60%)]" />

      {/* 3D stage. Banners are 16:9 artwork with the logo baked in, so the card keeps
          that ratio (nothing cropped) and the copy sits BELOW it, never on top.
          On sm+ the stage takes whatever height the copy leaves (flex-1) and is a size
          container, so the card is sized to fit BOTH its width and that height. */}
      <div
        className="relative flex w-full items-center justify-center sm:min-h-0 sm:flex-1 sm:[container-type:size]"
        style={{ perspective: '1900px' }}
      >
        <div
          className="relative aspect-[16/9] w-[min(92vw,1320px)] sm:w-[min(80cqw,1320px,calc(100cqh*16/9))]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {slides.map((b, idx) => {
            const off = offsetOf(idx);
            const abs = Math.abs(off);
            const hidden = abs > 1;
            return (
              <motion.div
                key={b.id ?? idx}
                className="absolute inset-0 overflow-hidden rounded-[26px] shadow-luxe will-change-transform"
                style={{ transformStyle: 'preserve-3d', zIndex: 20 - abs, pointerEvents: hidden ? 'none' : 'auto' }}
                initial={false}
                animate={{
                  x: `${off * 56}%`,
                  z: reduce ? 0 : -abs * 220,
                  rotateY: reduce ? 0 : off * -34,
                  scale: off === 0 ? 1 : 0.84,
                  opacity: hidden ? 0 : off === 0 ? 1 : 0.55,
                }}
                transition={{ duration: 0.85, ease: EASE }}
                onClick={() => off !== 0 && go(idx)}
                role={off !== 0 ? 'button' : undefined}
              >
                <motion.img
                  src={b.image_url || IMG.hero}
                  alt={b.title || ''}
                  className="h-full w-full object-cover object-center"
                  animate={{ scale: !reduce && off === 0 ? 1.04 : 1 }}
                  transition={{ duration: 6, ease: 'linear' }}
                />
              </motion.div>
            );
          })}

          {/* Dots sit on the card's bottom edge — saves a row below so the image can be bigger */}
          {n > 1 && (
            <div
              className="absolute bottom-3 left-1/2 z-30 flex items-center gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur-sm sm:bottom-4"
              style={{ transform: 'translateX(-50%) translateZ(1px)' }}
            >
              {slides.map((_, idx) => (
                <button
                  key={idx} onClick={() => go(idx)} aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === i ? 'w-7 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Arrows — vertically centred on the card */}
        {n > 1 && (
          <>
            <button
              onClick={() => go(i - 1)} aria-label="Previous slide"
              className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full border border-luxe-ink/10 bg-white/80 p-2.5 text-luxe-ink shadow-luxe-sm backdrop-blur-sm transition hover:border-luxe-ink/30 hover:bg-[#fcf3e4] sm:left-6"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => go(i + 1)} aria-label="Next slide"
              className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full border border-luxe-ink/10 bg-white/80 p-2.5 text-luxe-ink shadow-luxe-sm backdrop-blur-sm transition hover:border-luxe-ink/30 hover:bg-[#fcf3e4] sm:right-6"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Copy for the active slide — below the card so it never covers the artwork */}
      <div className="relative z-10 mt-5 w-full shrink-0 px-6 sm:mt-4">
        {/* Every slide's copy is stacked in one grid cell and cross-faded, so this block
            always has the height of the tallest copy — the card above never jumps. */}
        <div className="grid">
          {slides.map((b, idx) => (
            <SlideCopy key={b.id ?? idx} b={b} active={idx === i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SlideCopy({ b, active }) {
  // Fade out fast, fade the next slide's copy in with a light stagger.
  const anim = (delay) => ({
    initial: false,
    animate: active ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 },
    transition: active ? { delay, duration: 0.6, ease: EASE } : { duration: 0.25 },
  });
  const Title = active ? motion.h1 : motion.p; // one <h1> on the page

  // Compact on purpose: stacked + centred on mobile, one row (title/subtitle | button)
  // on sm+, so the banner above gets as much of the screen as possible.
  return (
    <div
      aria-hidden={!active}
      inert={active ? undefined : ''} // React 18: keeps hidden slides' buttons out of tab order
      className={`mx-auto flex max-w-4xl flex-col items-center gap-4 text-center text-ink [grid-area:1/1] sm:flex-row sm:justify-center sm:gap-10 sm:text-left ${active ? '' : 'pointer-events-none'}`}
    >
      <div>
        <Title {...anim(0.08)} className="font-display text-3xl font-bold leading-tight sm:text-4xl">
          {b.title}
        </Title>
        {b.subtitle && (
          <motion.p {...anim(0.16)} className="mt-1 text-sm text-ink/70 sm:text-base">
            {b.subtitle}
          </motion.p>
        )}
      </div>

      {b.cta_label && b.cta_link && (
        <motion.div {...anim(0.24)} className="shrink-0">
          <MagneticButton
            to={b.cta_link}
            className="group inline-flex items-center gap-2 rounded-full border border-ink bg-ink px-7 py-3.5 text-sm font-semibold text-white shadow-luxe transition hover:border-luxe-ink hover:bg-[#fcf3e4] hover:text-luxe-ink"
          >
            {b.cta_label}
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </MagneticButton>
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Photo hero — one screen tall: headline left, arch showcase right   */
/* ------------------------------------------------------------------ */
const PERKS = [
  [Leaf, 'Handpicked & fresh'],
  [ShieldCheck, 'No preservatives'],
  [Truck, 'Delivered across India'],
];

function PhotoHero({ c }) {
  const reduce = useReducedMotion();
  const [tiles, setTiles] = useState([]);

  // Real category photos (Admin → Categories) feed the showcase; placeholders are skipped.
  useEffect(() => {
    api.get('/api/categories')
      .then((r) => setTiles(
        (r.data.data || [])
          .filter((cat) => isRealImage(cat.image_url))
          .slice(0, 6)
          .map((cat) => ({ name: cat.name, img: cat.image_url, to: `/category/${cat.slug}` })),
      ))
      .catch(() => setTiles([]));
  }, []);

  const rise = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.8, ease: EASE },
  });

  return (
    // lg+: exactly one screen (top padding clears the fixed 72px header).
    <section data-nav="hero" className="relative overflow-hidden bg-luxe-bg dark:bg-luxe-bg lg:h-[100svh] lg:min-h-[620px]">
      <div className="pointer-events-none absolute -bottom-48 -left-40 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(26,77,35,0.10),transparent_65%)]" />

      <div className="relative mx-auto grid h-full max-w-[1400px] grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 pb-14 pt-28 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-12 lg:pb-8 lg:pt-[88px]">
        {/* Copy */}
        <div className="min-w-0 text-luxe-ink">
          <motion.p {...rise(0.05)} className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-luxe-gold/30 bg-white/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.3em] text-luxe-bronze">
            <Sparkles size={14} className="text-luxe-gold" /> {c.hero_eyebrow}
          </motion.p>

          <h1 className="font-display text-[10vw] font-bold leading-[1.05] sm:text-5xl xl:text-[3.6rem]">
            <MaskReveal lines={[c.hero_title]} delay={0.15} />
            <span className="mt-1 block bg-gold-sheen bg-clip-text text-transparent">
              <MaskReveal lines={[c.hero_accent]} delay={0.35} />
            </span>
          </h1>

          <motion.p {...rise(0.6)} className="mt-5 max-w-md text-base text-luxe-ink/65 sm:text-lg">
            {c.hero_subtitle}
          </motion.p>

          <motion.div {...rise(0.75)} className="mt-7 flex flex-wrap items-center gap-4">
            <MagneticButton
              to={c.hero_cta_link || '/shop'}
              className="group inline-flex items-center gap-2 rounded-full border border-luxe-ink bg-luxe-ink px-8 py-4 text-sm font-semibold text-white shadow-luxe transition hover:bg-[#fcf3e4] hover:text-luxe-ink"
            >
              {c.hero_cta}
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </MagneticButton>
            <MagneticButton
              to="/category/cashews"
              strength={0.25}
              className="rounded-full border border-luxe-ink/15 bg-white/60 px-8 py-4 text-sm font-semibold text-luxe-ink transition hover:border-luxe-ink hover:bg-[#fcf3e4]"
            >
              Shop Cashews
            </MagneticButton>
          </motion.div>

          <motion.ul {...rise(0.9)} className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-luxe-ink/70">
            {PERKS.map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-luxe-gold/15 text-luxe-gold"><Icon size={15} /></span>
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        <HeroShowcase tiles={tiles} reduce={reduce} />
      </div>
    </section>
  );
}

function HeroShowcase({ tiles, reduce }) {
  const [active, setActive] = useState(0);
  const n = tiles.length;

  // Auto-rotate; keyed on `active` so a thumbnail click restarts the timer.
  useEffect(() => {
    if (n < 2) return;
    const id = setTimeout(() => setActive((p) => (p + 1) % n), 3800);
    return () => clearTimeout(id);
  }, [active, n]);

  useEffect(() => { if (active >= n) setActive(0); }, [n]);

  const cur = tiles[active];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.25, duration: 1, ease: EASE }}
      className="relative mx-auto flex w-full items-center justify-center py-6"
    >
      {/* Gold disc + dashed ring behind the arch */}
      <div className="absolute aspect-square h-[min(52svh,470px)] max-h-[calc(100vw-4rem)] rounded-full bg-[radial-gradient(circle_at_35%_30%,#f3d98a,#c9971c_70%)] opacity-90" />
      <div className="absolute aspect-square h-[min(62svh,560px)] max-h-[calc(100vw-2.5rem)] rounded-full border border-dashed border-luxe-gold/50" />

      {/* Arch frame — height-driven so it always fits the screen */}
      <div className="relative aspect-[4/5] h-[min(62svh,540px)] max-h-[calc((100vw-2.5rem)*1.25)] overflow-hidden rounded-b-[36px] rounded-t-full border-[6px] border-white bg-[#1a4d23] shadow-luxe">
        <AnimatePresence initial={false}>
          {cur && (
            <motion.img
              key={cur.img}
              src={cur.img}
              alt={cur.name}
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: EASE }}
            />
          )}
        </AnimatePresence>
        {cur && (
          <Link
            to={cur.to}
            className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 text-luxe-ink backdrop-blur transition hover:bg-white"
          >
            <span className="font-display text-lg font-bold">{cur.name}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-luxe-gold text-ink"><ArrowRight size={16} /></span>
          </Link>
        )}
      </div>

      {/* Round thumbnails along the right edge */}
      {n > 1 && (
        <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 flex-col gap-3 sm:flex">
          {tiles.map((t, i) => (
            <button
              key={t.to}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show ${t.name}`}
              className={`h-14 w-14 overflow-hidden rounded-full border-[3px] shadow-luxe-sm transition-all duration-300 ${i === active ? 'scale-110 border-luxe-gold' : 'border-white opacity-70 hover:opacity-100'}`}
            >
              <img src={t.img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Floating trust badge */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8, ease: EASE }}
        className="absolute left-0 top-[18%] flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-luxe ring-1 ring-luxe-ink/5"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-luxe-gold/15 text-luxe-gold"><Leaf size={18} /></span>
        <div className="leading-tight">
          <p className="font-display text-base font-bold text-luxe-ink">100% Natural</p>
          <p className="text-xs text-luxe-ink/55">Sorted by hand</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

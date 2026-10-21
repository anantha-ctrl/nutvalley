import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { MaskReveal } from '../lib/Reveal';
import MagneticButton from '../lib/MagneticButton';
import { IMG } from '../lib/content';
import api from '../../api/client';

const EASE = [0.22, 1, 0.36, 1];

const DEFAULTS = {
  hero_eyebrow: 'Handcrafted Jewellery',
  hero_title: 'Handcrafted beads, made to shine.',
  hero_accent: 'Jewellery made for you.',
  hero_subtitle: 'Necklaces, bracelets, earrings, rings & anklets — delivered across India.',
  hero_cta: 'Shop Jewellery',
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

  // Banners (Admin → Banners) win: any active banner → the banner carousel.
  // The Hero background image (Admin → Settings) is shown ONLY when there are no banners.
  // While banners are still loading, show a plain backdrop so the hero image never
  // flashes before the banners appear.
  if (slides === null) {
    return <section data-nav="hero" aria-hidden="true" className="h-[510px] bg-[#fbf4f2] sm:h-[100svh] sm:min-h-[560px]" />;
  }
  if (slides.length > 0) return <HeroCarousel slides={slides} />;
  return <EditorialHero c={c} />;
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
      className="relative flex flex-col items-center overflow-hidden bg-[#fbf4f2] pb-12 pt-28 dark:bg-[#fbf4f2] sm:h-[100svh] sm:min-h-[560px] sm:pb-5 sm:pt-[84px]"
    >
      {/* ambient glow (radial gradient — a blurred box shows hard edges in some browsers) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(196,154,108,0.16),transparent_60%)]" />

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
              className="absolute left-2 top-1/2 z-30 -translate-y-1/2 rounded-full border border-luxe-ink/10 bg-white/80 p-2.5 text-luxe-ink shadow-luxe-sm backdrop-blur-sm transition hover:border-luxe-gold hover:bg-luxe-gold sm:left-6"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => go(i + 1)} aria-label="Next slide"
              className="absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-full border border-luxe-ink/10 bg-white/80 p-2.5 text-luxe-ink shadow-luxe-sm backdrop-blur-sm transition hover:border-luxe-gold hover:bg-luxe-gold sm:right-6"
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
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white shadow-luxe transition hover:bg-luxe-gold hover:text-ink"
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
/* Editorial single hero — fallback when no banners are configured     */
/* ------------------------------------------------------------------ */
function EditorialHero({ c }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-40%']);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const onMove = (e) => {
    const { innerWidth: w, innerHeight: h } = window;
    setMx((e.clientX / w - 0.5) * 40);
    setMy((e.clientY / h - 0.5) * 40);
  };

  return (
    <section ref={ref} data-nav="hero-dark" onMouseMove={onMove} className="relative h-[100svh] min-h-[620px] overflow-hidden bg-[#fbf4f2] dark:bg-[#fbf4f2]">
      <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-0">
        <img src={c.hero_image || IMG.hero} alt="" className="h-full w-full object-cover object-[center_30%]" />
      </motion.div>

      <motion.div style={{ x: sx, y: sy }} className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[22%] h-72 w-72 animate-blob rounded-full bg-luxe-gold/25 blur-[90px]" />
        <div className="absolute bottom-[12%] right-[14%] h-80 w-80 animate-blob rounded-full bg-luxe-bronze/25 blur-[100px] [animation-delay:-6s]" />
      </motion.div>

      <motion.div style={{ y: textY, opacity: fade }} className="relative z-10 mx-auto flex h-full max-w-[1400px] items-center px-6 sm:px-10 lg:px-12">
        <div className="max-w-3xl pt-16 text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-6 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-luxe-gold"
          >
            <Sparkles size={15} /> {c.hero_eyebrow}
          </motion.p>

          <h1 className="font-display text-[13vw] font-bold leading-[0.92] sm:text-7xl lg:text-8xl">
            <MaskReveal lines={[c.hero_title]} delay={0.25} />
            <span className="mt-2 block bg-gold-sheen bg-clip-text text-transparent">
              <MaskReveal lines={[c.hero_accent]} delay={0.5} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8 }}
            className="mt-8 max-w-md text-base text-white/75 sm:text-lg"
          >
            {c.hero_subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15, duration: 0.8, ease: EASE }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <MagneticButton
              to={c.hero_cta_link || '/shop'}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-ink shadow-luxe transition hover:bg-luxe-gold"
            >
              {c.hero_cta}
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </MagneticButton>
            <MagneticButton
              to="/category/necklace"
              strength={0.25}
              className="rounded-full border border-white/40 px-8 py-4 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Shop Necklaces
            </MagneticButton>
          </motion.div>
        </div>
      </motion.div>

      <motion.div style={{ opacity: fade }} className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/70">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <span className="relative flex h-10 w-6 justify-center rounded-full border border-white/40">
            <motion.span
              className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </div>
      </motion.div>
    </section>
  );
}

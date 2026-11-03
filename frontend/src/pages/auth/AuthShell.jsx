import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Leaf, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import Logo from '../../components/Logo';
import NutVisual, { isRealImage } from '../../landing/three/NutVisual';
import api from '../../api/client';

const IMG_BASE = api.defaults.baseURL || '';
// Heavy base64 product images stream via the cached thumb passthrough.
const productImg = (p) => (String(p.image).startsWith('data:') ? `${IMG_BASE}/api/products/${p.id}/thumb` : p.image);

// Until real photos load (or if the store only has placeholders) the arch shows a 3D nut render.
const FALLBACK = [{ img: null, text: 'Premium nuts & dry fruits, packed fresh for you.' }];

const TRUST = [
  [Leaf, 'Handpicked & fresh'],
  [ShieldCheck, 'No preservatives'],
  [Truck, 'Delivered across India'],
];

const TABS = [['/login', 'Sign in'], ['/register', 'Create account']];

/** Labelled form row used by the auth forms (label left, optional link/aside right). */
export function Field({ label, aside, children }) {
  return (
    <div className="block">
      <span className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-luxe-ink/80 dark:text-white/70">
        {label}
        {aside}
      </span>
      {children}
    </div>
  );
}

export default function AuthShell({ title, subtitle, children, footer }) {
  const { pathname } = useLocation();
  const [i, setI] = useState(0);
  const [slides, setSlides] = useState(FALLBACK);
  const showTabs = TABS.some(([to]) => to === pathname);

  // Pull live product photos (then brand banners) for the panel — placeholders are skipped.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pRes, bRes] = await Promise.allSettled([
          api.get('/api/products?limit=8'),
          api.get('/api/banners'),
        ]);
        const out = [];
        if (pRes.status === 'fulfilled') {
          const d = pRes.value.data.data;
          (Array.isArray(d) ? d : d.products || []).forEach((p) => {
            if (isRealImage(p.image)) out.push({ img: productImg(p), text: p.name });
          });
        }
        if (bRes.status === 'fulfilled') {
          (bRes.value.data.data || []).forEach((b) => {
            if (isRealImage(b.image_url)) out.push({ img: b.image_url, text: b.subtitle || b.title || '' });
          });
        }
        if (alive && out.length) { setSlides(out.slice(0, 6)); setI(0); }
      } catch { /* keep fallback */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[i] || slides[0];

  return (
    <div className="nv-auth min-h-screen bg-[#fcf3e4] dark:bg-ink lg:grid lg:grid-cols-[1fr_1.05fr] lg:gap-4 lg:p-4">
      {/* ── Left: framed brand panel (desktop) ── */}
      <aside className="relative hidden overflow-hidden rounded-[32px] bg-hero-gradient text-white lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col">
        {/* texture: gold glow + dotted grain */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-luxe-gold/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-black/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="relative flex items-center justify-between px-10 pt-9">
          <Link to="/"><Logo white className="h-16" /></Link>
        </div>

        {/* Arched, rotating product frame (sized off the viewport so it never collapses) */}
        <div className="relative flex flex-1 items-center justify-center px-10">
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute aspect-square h-[min(calc(100vh-330px),540px)] rounded-full border border-dashed border-luxe-gold/40"
          />
          <div className="relative">
            <div className="relative aspect-[4/5] h-[min(calc(100vh-380px),460px)] min-h-[260px] overflow-hidden rounded-t-full rounded-b-[28px] border-4 border-[#fcf3e4] bg-[#fcf3e4] shadow-2xl">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0"
                >
                  <NutVisual src={slide.img} kind={slide.img ? undefined : 'mix'} label={slide.text} alt=""
                    className="h-full w-full" imgClassName="object-cover" w={600} h={750} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* floating chips, pinned to the arch */}
            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-14 top-[18%] xl:-left-28 flex items-center gap-3 whitespace-nowrap rounded-2xl bg-[#fcf3e4] px-4 py-3 text-luxe-ink shadow-xl"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-luxe-gold/20 text-luxe-gold"><Leaf size={17} /></span>
              <span className="leading-tight">
                <span className="block font-display text-sm font-bold">100% Natural</span>
                <span className="text-xs text-luxe-ink/60">Sorted by hand</span>
              </span>
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-10 bottom-[12%] xl:-right-24 flex items-center gap-2 whitespace-nowrap rounded-full bg-luxe-gold px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-luxe-ink shadow-xl"
            >
              <Sparkles size={14} /> Fresh stock weekly
            </motion.div>
          </div>
        </div>

        <div className="relative px-10 pb-9">
          <h2 className="font-display text-4xl font-bold leading-tight xl:text-[44px]">
            Nature's finest,<br /><span className="text-luxe-gold">one handful at a time.</span>
          </h2>
          <div className="mt-4 flex items-end justify-between gap-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-sm text-sm text-white/70"
              >
                {slide.text || 'Premium nuts & dry fruits, packed fresh for you.'}
              </motion.p>
            </AnimatePresence>
            <div className="flex shrink-0 gap-2">
              {slides.map((_, n) => (
                <button key={n} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`}
                  className={`h-1.5 rounded-full transition-all ${n === i ? 'w-7 bg-luxe-gold' : 'w-2 bg-white/30 hover:bg-white/60'}`} />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right: form ── */}
      <main className="relative flex min-h-screen flex-col lg:min-h-0">
        {/* Mobile brand band */}
        <div className="relative overflow-hidden rounded-b-[28px] bg-hero-gradient px-5 pb-7 pt-5 text-white shadow-luxe-sm lg:hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-luxe-gold/25 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/80"><ArrowLeft size={16} /> Home</Link>
            <Link to="/"><Logo white className="h-12" /></Link>
          </div>
          <h2 className="relative mt-5 font-display text-[26px] font-bold leading-tight sm:text-3xl">
            Nature's finest,<br /><span className="text-luxe-gold">one handful at a time.</span>
          </h2>
        </div>

        <div className="hidden items-center justify-between px-10 pt-6 lg:flex">
          <Link to="/" className="group inline-flex items-center gap-2 text-sm font-medium text-luxe-ink/70 transition hover:text-luxe-ink dark:text-white/70">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-luxe-ink/15 transition group-hover:border-luxe-ink group-hover:bg-white">
              <ArrowLeft size={16} />
            </span>
            Back to store
          </Link>
        </div>

        <div className="flex flex-1 items-start justify-center px-5 pb-6 pt-7 sm:items-center sm:px-8 sm:py-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md sm:rounded-[28px] sm:border sm:border-luxe-line sm:bg-white sm:p-9 sm:shadow-luxe dark:sm:border-white/10 dark:sm:bg-ink-soft"
          >
            {showTabs && (
              <div className="mb-7 grid grid-cols-2 rounded-full border border-luxe-line bg-white p-1 text-sm font-semibold sm:mb-8 sm:border-0 sm:bg-[#fcf3e4] dark:bg-white/5">
                {TABS.map(([to, label]) => (
                  <Link key={to} to={to} replace
                    className={`relative rounded-full py-2.5 text-center transition ${pathname === to ? 'text-white' : 'text-luxe-ink/60 hover:text-luxe-ink dark:text-white/60'}`}>
                    {pathname === to && (
                      <motion.span layoutId="auth-tab" transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-luxe-ink shadow-luxe-sm" />
                    )}
                    <span className="relative">{label}</span>
                  </Link>
                ))}
              </div>
            )}

            <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-luxe-gold">
              <span className="h-px w-6 bg-luxe-gold" /> NutValley
            </p>
            <h1 className="font-display text-[28px] font-bold leading-tight text-luxe-ink dark:text-white sm:text-[34px]">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-luxe-ink/60 dark:text-white/60">{subtitle}</p>}

            <div className="mt-6 sm:mt-7">{children}</div>

            {footer && <div className="mt-7 border-t border-luxe-line pt-5 text-center text-sm text-luxe-ink/60 dark:border-white/10 dark:text-white/60">{footer}</div>}
          </motion.div>
        </div>

        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-5 pb-8 text-xs text-luxe-ink/60 dark:text-white/50">
          {TRUST.map(([Icon, label]) => (
            <li key={label} className="flex items-center gap-1.5"><Icon size={14} className="text-luxe-gold" /> {label}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}

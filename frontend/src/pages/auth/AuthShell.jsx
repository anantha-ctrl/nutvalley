import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import Logo from '../../components/Logo';
import api from '../../api/client';

// Fallback panel (used only until real brand/product imagery loads from the DB).
const FALLBACK = [
  { img: 'https://placehold.co/1200x1600/f6e6e4/3a0d14?text=Beadsboutique', text: 'Handcrafted beaded jewellery, curated for you.' },
  { img: 'https://placehold.co/1200x1600/f6e6e4/3a0d14?text=Jewellery', text: 'Necklaces, bracelets & earrings — delivered with care.' },
];

export default function AuthShell({ title, subtitle, children, footer }) {
  const [i, setI] = useState(0);
  const [slides, setSlides] = useState(FALLBACK);

  // Pull live brand banners + product images from the backend for the panel.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [bRes, pRes] = await Promise.allSettled([
          api.get('/api/banners'),
          api.get('/api/products?limit=6'),
        ]);
        const out = [];
        if (bRes.status === 'fulfilled') {
          (bRes.value.data.data || []).forEach((b) => {
            if (b.image_url) out.push({ img: b.image_url, text: b.subtitle || b.title || '' });
          });
        }
        if (pRes.status === 'fulfilled') {
          const d = pRes.value.data.data;
          (Array.isArray(d) ? d : d.products || []).forEach((p) => {
            if (p.image) out.push({ img: p.image, text: p.name });
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

  return (
    <div className="ios-auth grid min-h-screen lg:grid-cols-2">
      {/* Left: rotating imagery */}
      <div className="relative hidden overflow-hidden lg:block">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={i}
            src={(slides[i] || slides[0]).img}
            alt=""
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />

        <div className="absolute inset-x-12 bottom-12 text-white">
          <Link to="/" className="inline-block"><Logo white className="h-16" /></Link>
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-3 max-w-sm text-gray-300"
            >
              {(slides[i] || slides[0]).text || 'Handcrafted beaded jewellery, curated for you.'}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* progress dots */}
        <div className="absolute bottom-6 right-12 flex gap-2">
          {slides.map((_, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`}
              className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-gold' : 'w-2 bg-white/40 hover:bg-white/70'}`} />
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div className="relative flex items-center justify-center bg-[#f2f2f7] px-5 py-16 dark:bg-black">
        {/* iOS navigation-bar style back button */}
        <Link
          to="/"
          className="absolute left-3 top-4 inline-flex items-center rounded-lg px-2 py-1.5 text-[17px] text-gold transition active:opacity-50"
        >
          <ChevronLeft size={26} strokeWidth={2.4} className="-ml-1.5" /> Home
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="mb-8 flex justify-center lg:hidden">
            <Logo className="h-12" />
          </Link>
          {/* iOS "Large Title" */}
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[17px] leading-snug text-gray-500 dark:text-gray-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-[15px] text-gray-500">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}

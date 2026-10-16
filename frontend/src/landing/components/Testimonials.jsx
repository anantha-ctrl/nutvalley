import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import Reveal from '../lib/Reveal';
import { TESTIMONIALS } from '../lib/content';

export default function Testimonials() {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);

  const go = useCallback((step) => {
    setDir(step);
    setI((p) => (p + step + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => go(1), 5000);
    return () => clearInterval(t);
  }, [paused, go]);

  const t = TESTIMONIALS[i];

  return (
    <section className="relative overflow-hidden bg-luxe-ink py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute right-[10%] top-[15%] h-72 w-72 rounded-full bg-luxe-gold/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[8%] h-72 w-72 rounded-full bg-luxe-bronze/15 blur-[100px]" />

      <div className="relative mx-auto max-w-3xl px-6 text-center sm:px-10">
        <Reveal><p className="mb-10 text-xs uppercase tracking-[0.5em] text-luxe-gold">Loved by many</p></Reveal>

        <div
          className="relative min-h-[280px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <AnimatePresence mode="wait" custom={dir}>
            <motion.figure
              key={i}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-2xl rounded-luxe-lg border border-white/10 bg-white/5 p-8 backdrop-blur-xl sm:p-12"
            >
              <Quote size={34} className="mx-auto mb-6 text-luxe-gold" />
              <blockquote className="font-display text-2xl leading-relaxed sm:text-3xl">“{t.quote}”</blockquote>
              <figcaption className="mt-8 flex items-center justify-center gap-3">
                <img src={t.img} alt={t.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-luxe-gold/40" />
                <div className="text-left">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-white/50">{t.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex items-center justify-center gap-4">
          <button onClick={() => go(-1)} aria-label="Previous"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 transition hover:border-luxe-gold hover:text-luxe-gold">
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, n) => (
              <button key={n} onClick={() => { setDir(n > i ? 1 : -1); setI(n); }} aria-label={`Go to ${n + 1}`}
                className={`h-1.5 rounded-full transition-all ${n === i ? 'w-8 bg-luxe-gold' : 'w-2 bg-white/30'}`} />
            ))}
          </div>
          <button onClick={() => go(1)} aria-label="Next"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 transition hover:border-luxe-gold hover:text-luxe-gold">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

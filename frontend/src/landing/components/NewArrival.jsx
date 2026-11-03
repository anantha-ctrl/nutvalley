import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { MaskReveal } from '../lib/Reveal';
import MagneticButton from '../lib/MagneticButton';
import NutVisual from '../three/NutVisual';
import api from '../../api/client';
import { inr } from '../../utils/format';

const IMG_BASE = api.defaults.baseURL || '';
// Heavy base64 images stream via the cached passthrough; URL images stay direct.
const thumb = (p) => (p.image && String(p.image).startsWith('data:') ? `${IMG_BASE}/api/products/${p.id}/thumb` : p.image);

const RIBBON = 'New arrival ✦ Fresh stock ✦ New season ✦ Just landed ✦ ';
const RING = 'NEW ARRIVAL ✦ FRESH STOCK ✦ NEW SEASON ✦ ';

export default function NewArrival({ image }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [drops, setDrops] = useState([]);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-5%', '5%']);

  // Live: the three newest products in the store.
  useEffect(() => {
    api.get('/api/products/new-arrivals?limit=3')
      .then((r) => setDrops(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => setDrops([]));
  }, []);

  return (
    <section ref={ref} className="relative bg-luxe-bg px-4 py-12 dark:bg-ink sm:px-8 sm:py-16 lg:px-12 lg:py-12">
      <div className="mx-auto grid max-w-[1400px] items-stretch gap-8 lg:grid-cols-2 lg:gap-12">
        {/* ── Medallion panel ── */}
        <div className="relative flex min-h-[460px] items-center justify-center overflow-hidden rounded-[32px] bg-hero-gradient px-6 pb-20 pt-12 shadow-luxe sm:min-h-[560px] sm:rounded-[40px] lg:min-h-0 lg:pb-16 lg:pt-8">
          <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-luxe-gold/25 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />

          <div className="relative aspect-square w-full max-w-[420px] lg:max-w-[380px]">
            {/* rotating text ring */}
            <motion.svg
              viewBox="0 0 400 400" aria-hidden
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 h-full w-full"
            >
              <defs><path id="na-ring" d="M200,200 m-182,0 a182,182 0 1,1 364,0 a182,182 0 1,1 -364,0" /></defs>
              {/* textLength = ring circumference (2π·182) so the text wraps the circle exactly, no clipping */}
              <text className="fill-luxe-gold font-sans text-[15px] font-bold">
                <textPath href="#na-ring" textLength="1140" lengthAdjust="spacing">{RING.repeat(2)}</textPath>
              </text>
            </motion.svg>
            {/* medallion */}
            <motion.div style={{ y }} className="absolute inset-[13%] overflow-hidden rounded-full bg-luxe-cream shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-4 ring-luxe-gold/70">
              <NutVisual src={image} kind="mix" alt="New arrivals" w={800} h={800}
                className="h-full w-full" imgClassName="object-cover" />
            </motion.div>
            {/* sticker */}
            <motion.span
              initial={{ scale: 0, rotate: -30 }} whileInView={{ scale: 1, rotate: -12 }} viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.3 }}
              className="absolute right-[4%] top-[6%] flex h-20 w-20 flex-col items-center justify-center rounded-full bg-luxe-gold text-center font-display text-luxe-ink shadow-luxe sm:h-24 sm:w-24"
            >
              <Sparkles size={16} />
              <span className="mt-0.5 text-sm font-bold leading-tight sm:text-base">Fresh<br />drop</span>
            </motion.span>
          </div>

          {/* gold ribbon marquee */}
          <div className="absolute inset-x-0 bottom-6 -rotate-2 overflow-hidden bg-luxe-gold py-3 shadow-luxe">
            <div className={`flex w-max whitespace-nowrap text-sm font-bold uppercase tracking-[0.3em] text-luxe-ink ${reduce ? '' : 'animate-marquee'}`}
              style={reduce ? undefined : { animationDuration: '22s' }}>
              <span>{RIBBON.repeat(4)}</span><span aria-hidden>{RIBBON.repeat(4)}</span>
            </div>
          </div>
        </div>

        {/* ── Copy + live fresh drops ── */}
        <div className="flex flex-col justify-center py-2 text-luxe-ink dark:text-white">
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-4 flex items-center gap-3 text-xs lg:mb-3 font-semibold uppercase tracking-[0.4em] text-luxe-gold"
          >
            <span className="h-px w-10 bg-luxe-gold" /> Just landed
          </motion.p>
          <h2 className="font-display text-5xl font-bold leading-[0.95] sm:text-6xl">
            <MaskReveal lines={['The New']} />
            <span className="text-luxe-gold"><MaskReveal lines={['Arrival.']} delay={0.1} /></span>
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="mt-5 max-w-md text-base lg:mt-4 text-luxe-ink/65 dark:text-white/65 sm:text-lg"
          >
            Fresh arrivals across nuts, dry fruits, seeds and gift boxes. New flavours you'll love.
          </motion.p>

          {drops.length > 0 && (
            <div className="mt-8 lg:mt-6">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-luxe-ink/45 dark:text-white/45">Fresh drops</p>
              <ul className="space-y-3 lg:space-y-2">
                {drops.map((p, i) => (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: 0.25 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link to={`/product/${p.slug}`}
                      className="group flex items-center gap-4 rounded-2xl border border-luxe-line bg-white p-2.5 pr-4 lg:p-2 lg:pr-4 transition hover:-translate-y-0.5 hover:border-luxe-ink/30 hover:bg-luxe-cream hover:shadow-luxe-sm dark:border-white/10 dark:bg-white/5">
                      <span className="h-16 w-16 lg:h-14 lg:w-14 shrink-0 overflow-hidden rounded-xl bg-luxe-cream">
                        <NutVisual src={thumb(p)} label={`${p.category_slug || ''} ${p.name}`} alt={p.name}
                          className="h-full w-full" imgClassName="object-cover" w={160} h={160} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-lg font-bold">{p.name}</span>
                        <span className="text-sm">
                          <span className="font-semibold">{inr(p.price)}</span>
                          {p.mrp > p.price && <span className="ml-2 text-luxe-ink/40 line-through dark:text-white/40">{inr(p.mrp)}</span>}
                        </span>
                      </span>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-luxe-ink text-white transition group-hover:bg-luxe-gold group-hover:text-luxe-ink">
                        <ArrowUpRight size={18} />
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="mt-9 lg:mt-6"
          >
            <MagneticButton
              to="/shop"
              className="group inline-flex items-center gap-2 rounded-full border border-luxe-ink bg-luxe-ink px-9 py-4 lg:py-3.5 text-sm font-semibold text-white transition hover:bg-luxe-cream hover:text-luxe-ink"
            >
              Shop New In
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </MagneticButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

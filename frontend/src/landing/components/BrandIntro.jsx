import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Reveal, { MaskReveal } from '../lib/Reveal';
import Tilt3D from '../lib/Tilt3D';
import { IMG } from '../lib/content';

// Live numbers from /api/landing (real DB counts). A stat is only shown once it
// has something to say — e.g. the rating appears after the first visible review.
function liveStats(stats) {
  if (!stats) return [];
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+` : String(n));
  return [
    stats.customers > 0 && [fmt(stats.customers), stats.customers === 1 ? 'Happy customer' : 'Happy customers'],
    stats.products > 0 && [fmt(stats.products), 'Handcrafted pieces'],
    stats.avg_rating && stats.reviews > 0
      ? [`${stats.avg_rating}★`, `Rating · ${fmt(stats.reviews)} review${stats.reviews === 1 ? '' : 's'}`]
      : stats.categories > 0 && [fmt(stats.categories), 'Collections'],
  ].filter(Boolean);
}

export default function BrandIntro({ image, stats }) {
  const items = liveStats(stats);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section ref={ref} className="relative overflow-hidden bg-luxe-bg py-20 dark:bg-ink sm:py-24 lg:py-28">
      <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-12">
        <div>
          <Reveal>
            <p className="mb-6 text-xs uppercase tracking-[0.4em] text-luxe-bronze">Our Philosophy</p>
          </Reveal>
          <h2 className="font-display text-4xl font-bold leading-[1.05] text-luxe-ink dark:text-white sm:text-6xl">
            <MaskReveal lines={['Loved in India.']} />
            <span className="text-luxe-bronze"><MaskReveal lines={['Made to be worn.']} delay={0.12} /></span>
          </h2>
          <Reveal delay={0.15}>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-luxe-ink/70 dark:text-white/70">
              Every necklace, bracelet, earring and anklet is strung by hand from beads chosen for colour,
              texture and shine. No mass production. No filler. Just pieces you'll reach for every day.
            </p>
          </Reveal>
          {items.length > 0 && <Reveal delay={0.25}>
            <div className="mt-10 flex flex-wrap gap-10">
              {items.map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-3xl font-bold text-luxe-ink dark:text-white">{n}</p>
                  <p className="mt-1 text-sm text-luxe-ink/50 dark:text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>}
        </div>

        <Reveal delay={0.1} className="relative">
          <Tilt3D max={8} glare className="group rounded-luxe-lg">
            <div className="relative overflow-hidden rounded-luxe-lg shadow-luxe">
              <motion.img style={{ y }} src={image || IMG.intro} alt="Beadsboutique handcrafted jewellery"
                className="aspect-square w-full scale-110 object-cover" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
            </div>
          </Tilt3D>
          {/* floating accent card */}
          {/* <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="absolute -bottom-6 -left-4 rounded-luxe bg-white/80 p-5 backdrop-blur-xl shadow-luxe-sm dark:bg-ink-soft/90 sm:-left-8"
          >
            <p className="font-display text-lg text-luxe-ink dark:text-white">Slow-made</p>
            <p className="text-sm text-luxe-ink/50 dark:text-white/50">Crafted, not churned</p>
          </motion.div> */}
        </Reveal>
      </div>
    </section>
  );
}

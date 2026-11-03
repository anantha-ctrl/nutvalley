import { motion } from 'framer-motion';
import { Hand, Leaf, PackageCheck, Sparkles } from 'lucide-react';
import Reveal, { MaskReveal } from '../lib/Reveal';
import Tilt3D from '../lib/Tilt3D';
import NutVisual from '../three/NutVisual';

// Live numbers from /api/landing (real DB counts). A stat is only shown once it
// has something to say — the customer count waits until it is worth showing,
// and the rating appears after the first visible review.
function liveStats(stats) {
  if (!stats) return [];
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+` : String(n));
  return [
    stats.customers >= 100 && [fmt(stats.customers), 'Happy customers'],
    stats.products > 0 && [fmt(stats.products), 'Premium products'],
    stats.categories > 0 && [fmt(stats.categories), 'Collections'],
    stats.avg_rating && stats.reviews > 0
      && [`${stats.avg_rating}★`, `${fmt(stats.reviews)} review${stats.reviews === 1 ? '' : 's'}`],
  ].filter(Boolean).slice(0, 3);
}

const PROMISES = [
  [Hand, 'Hand-sorted', 'Picked for size & crunch'],
  [Leaf, 'No preservatives', 'Nothing added, ever'],
  [PackageCheck, 'Packed fresh', 'Sealed to lock in taste'],
];

export default function BrandIntro({ image, stats }) {
  const items = liveStats(stats);

  return (
    <section className="relative overflow-hidden bg-luxe-bg py-12 dark:bg-ink sm:py-16">
      {/* soft gold aura */}
      <div className="pointer-events-none absolute -right-40 top-1/4 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(201,151,28,0.16),transparent_65%)]" />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-14 px-5 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-12">
        <div>
          <Reveal>
            <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-luxe-gold">
              <span className="h-px w-10 bg-luxe-gold" /> Our philosophy
            </p>
          </Reveal>
          <h2 className="font-display text-4xl font-bold leading-[1.05] text-luxe-ink dark:text-white sm:text-6xl">
            <MaskReveal lines={['Loved in India.']} />
            <span className="text-luxe-gold"><MaskReveal lines={['Packed fresh.']} delay={0.12} /></span>
          </h2>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-luxe-ink/70 dark:text-white/70 sm:text-lg">
              Every almond, cashew, pistachio and date is sorted by hand and chosen for size, crunch
              and natural taste. No preservatives. No filler. Just pure, wholesome nuts you'll reach for every day.
            </p>
          </Reveal>

          {/* Promise cards */}
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {PROMISES.map(([Icon, title, sub], i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="group flex items-center gap-3 rounded-2xl border border-luxe-line bg-white p-4 transition hover:-translate-y-1 hover:border-luxe-ink/50 hover:shadow-luxe-sm sm:flex-col sm:items-start dark:border-white/10 dark:bg-white/5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-luxe-ink text-luxe-gold transition group-hover:bg-luxe-cream group-hover:text-luxe-ink">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-display text-base font-bold text-luxe-ink dark:text-white">{title}</span>
                  <span className="text-xs text-luxe-ink/55 dark:text-white/55">{sub}</span>
                </span>
              </motion.div>
            ))}
          </div>

          {items.length > 0 && <Reveal delay={0.3}>
            <div className="mt-8 flex flex-wrap divide-x divide-luxe-line dark:divide-white/10">
              {items.map(([n, l], i) => (
                <div key={l} className={i === 0 ? 'pr-8' : 'px-8'}>
                  <p className="font-display text-3xl font-bold text-luxe-ink dark:text-white">{n}</p>
                  <p className="mt-0.5 text-xs uppercase tracking-[0.15em] text-luxe-ink/50 dark:text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>}
        </div>

        {/* Framed brand visual */}
        <Reveal delay={0.1} className="relative mx-auto w-full max-w-[440px] lg:mr-3">
          {/* gold frame, evenly spaced around the card */}
          <div className="pointer-events-none absolute -inset-3 rounded-[40px] border border-luxe-gold/50" />
          <Tilt3D max={6} glare className="group relative rounded-[30px]">
            <div className="relative overflow-hidden rounded-[30px] bg-luxe-ink shadow-luxe">
              <NutVisual src={image} kind="mix" alt="NutValley premium nuts and dry fruits" dark w={800} h={1000}
                className="aspect-[4/5] w-full" imgClassName="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]" />
              <div className="absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10" />
            </div>
          </Tilt3D>

          {/* floating badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="absolute -left-3 top-8 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-luxe sm:-left-8 dark:bg-ink-soft"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-luxe-gold text-luxe-ink"><Sparkles size={18} /></span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold text-luxe-ink dark:text-white">Premium grade</span>
              <span className="text-xs text-luxe-ink/55 dark:text-white/55">Sorted by hand</span>
            </span>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

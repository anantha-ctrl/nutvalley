import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, HeartPulse, Sparkles, Gift, Truck, ShieldCheck, ArrowRight, ArrowUpRight, Sprout, Hand, PackageCheck } from 'lucide-react';
import Seo from '../../components/Seo';
import NutVisual from '../../landing/three/NutVisual';
import Reveal, { MaskReveal } from '../../landing/lib/Reveal';
import api from '../../api/client';

const VALUES = [
  { Icon: Leaf, title: 'Handpicked & fresh', text: 'Every batch is sorted by hand and packed fresh, in small lots.' },
  { Icon: HeartPulse, title: 'Naturally healthy', text: 'No added colours or preservatives — just wholesome nuts, seeds and dry fruits.' },
  { Icon: Sparkles, title: 'Premium grades', text: 'Only the best grades — W240 cashews, California almonds, Iranian pistachios and more.' },
  { Icon: Gift, title: 'Gift-ready boxes', text: 'Beautiful gift boxes for festivals, weddings and corporate gifting.' },
  { Icon: Truck, title: 'Delivered across India', text: 'Air-tight, moisture-proof packing shipped safely to your doorstep.' },
  { Icon: ShieldCheck, title: 'Secure shopping', text: 'Safe payments and friendly support whenever you need help.' },
];

const STEPS = [
  [Sprout, 'Sourced', 'Chosen for size, crunch and natural taste.'],
  [Hand, 'Hand-sorted', 'Every batch checked by hand, in small lots.'],
  [PackageCheck, 'Packed fresh', 'Sealed air-tight to lock in flavour.'],
  [Truck, 'Delivered', 'Shipped safely to your doorstep.'],
];

// Fallback when the categories API is unreachable — NutVisual renders a nut for each.
const COLLECTIONS = [
  ['Almonds', 'almonds'],
  ['Cashews', 'cashews'],
  ['Pistachios', 'pistachios'],
  ['Walnuts', 'walnuts'],
  ['Dates', 'dates'],
  ['Dried Fruits', 'dried-fruits'],
  ['Seeds', 'seeds'],
  ['Gift Boxes', 'gift-boxes'],
].map(([name, slug]) => ({ name, slug, img: null }));

// Same live numbers the landing BrandIntro shows; hidden until they are meaningful.
function liveStats(stats) {
  if (!stats) return [];
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+` : String(n));
  return [
    stats.customers >= 100 && [fmt(stats.customers), 'Happy customers'],
    stats.products > 0 && [fmt(stats.products), 'Premium products'],
    stats.categories > 0 && [fmt(stats.categories), 'Collections'],
  ].filter(Boolean);
}

const Eyebrow = ({ children, light = false, center = false }) => (
  <p className={`mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-luxe-gold ${center ? 'justify-center' : ''}`}>
    <span className={`h-px w-10 ${light ? 'bg-luxe-gold/70' : 'bg-luxe-gold'}`} /> {children}
    {center && <span className="h-px w-10 bg-luxe-gold" />}
  </p>
);

export default function About() {
  const [content, setContent] = useState(null); // admin-editable landing images + stats
  const [cats, setCats] = useState(COLLECTIONS);

  useEffect(() => {
    api.get('/api/landing').then((r) => setContent(r.data.data)).catch(() => {});
    api.get('/api/categories')
      .then((r) => {
        const list = (r.data.data || []).map((c) => ({ name: c.name, slug: c.slug, img: c.image_url }));
        if (list.length) setCats(list.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  const stats = liveStats(content?.stats);

  return (
    <div className="bg-luxe-bg text-luxe-ink dark:bg-ink dark:text-white">
      <Seo title="About Us" description="NutValley — premium almonds, cashews, pistachios, walnuts, dates, dried fruits and seeds, packed fresh in India." />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(201,151,28,0.16),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-5 py-12 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-12 lg:py-16">
          <div>
            <Reveal><Eyebrow>Our story</Eyebrow></Reveal>
            <h1 className="font-display text-5xl font-bold leading-[0.98] sm:text-6xl lg:text-7xl">
              <MaskReveal lines={['Freshness']} />
              <span className="text-luxe-gold"><MaskReveal lines={['you can taste.']} delay={0.1} /></span>
            </h1>
            <Reveal delay={0.2}>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-luxe-ink/70 dark:text-white/70 sm:text-lg">
                At NutValley, we believe healthy snacking should be simple, honest and delicious.
                Every pack is filled with premium nuts and dry fruits, picked for freshness and flavour.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/shop" className="group inline-flex items-center gap-2 rounded-full bg-luxe-ink px-8 py-4 text-sm font-semibold text-white transition hover:bg-luxe-gold hover:text-luxe-ink">
                  Shop Now <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-luxe-ink/20 px-8 py-4 text-sm font-semibold transition hover:border-luxe-ink hover:bg-luxe-cream dark:border-white/20 dark:hover:bg-white/5">
                  Contact Us
                </Link>
              </div>
            </Reveal>
            {stats.length > 0 && (
              <Reveal delay={0.4}>
                <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-luxe-line pt-6 dark:border-white/10">
                  {stats.map(([n, label]) => (
                    <div key={label}>
                      <dt className="font-display text-3xl font-bold text-luxe-gold">{n}</dt>
                      <dd className="mt-1 text-xs uppercase tracking-[0.2em] text-luxe-ink/55 dark:text-white/55">{label}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>

          <Reveal delay={0.15}>
            <div className="relative mx-auto w-full max-w-[460px]">
              {/* offset gold frame behind the photo */}
              <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[36px] border-2 border-luxe-gold/60" />
              {/* natural aspect (h-auto) — the admin image is a portrait poster, so never crop it */}
              <NutVisual src={content?.intro_image} kind="mix" alt="NutValley premium nuts and dry fruits" w={1000} h={1250}
                className="relative block h-auto w-full overflow-hidden rounded-[36px] shadow-luxe" imgClassName="object-contain" />
              {/* badge sits top-left so it never covers the poster's tagline at the bottom */}
              <div className="absolute -left-4 top-8 flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-luxe dark:bg-ink sm:-left-10">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-luxe-gold/15 text-luxe-gold"><Leaf size={20} /></span>
                <span>
                  <span className="block font-display text-lg font-bold leading-tight">100% natural</span>
                  <span className="text-xs text-luxe-ink/55 dark:text-white/55">No preservatives, ever</span>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Story (dark band) ── */}
      <section className="relative mt-8 overflow-hidden bg-hero-gradient text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-5 py-14 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-20">
          <Reveal className="order-last lg:order-first">
            {/* natural aspect (h-auto) so the admin poster is never cropped */}
            <NutVisual src={content?.newarrival_image} kind="mix" dark alt="Fresh nuts and dry fruits" w={1000} h={1000}
              className="mx-auto block h-auto w-full max-w-[520px] overflow-hidden rounded-[32px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10" imgClassName="object-contain" />
          </Reveal>
          <div>
            <Reveal><Eyebrow light>How it started</Eyebrow></Reveal>
            <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              <MaskReveal lines={['Packed fresh,']} />
              <span className="text-luxe-gold"><MaskReveal lines={['in small batches.']} delay={0.1} /></span>
            </h2>
            <Reveal delay={0.2}>
              <div className="mt-6 space-y-4 leading-relaxed text-white/75">
                <p>Every pack begins with carefully sourced nuts and dry fruits — chosen for size, crunch and natural taste.</p>
                <p>We started NutValley with a simple belief: good food should be pure, affordable and something the whole family can enjoy every day.</p>
                <p>From everyday almonds and cashews to festive gift boxes, each order is sorted, packed and sealed with care, so it reaches you as fresh as the day it was packed.</p>
              </div>
              <p className="mt-8 border-l-2 border-luxe-gold pl-5 font-display text-xl italic text-white">
                Premium nuts. Packed fresh. Delivered with care.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section className="mx-auto max-w-[1400px] px-5 py-12 sm:px-10 sm:py-16 lg:px-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 0.08}>
              <div className="relative h-full rounded-[24px] border border-luxe-line bg-white p-6 dark:border-white/10 dark:bg-white/5">
                <span className="absolute right-5 top-4 font-display text-4xl font-bold text-luxe-ink/[0.07] dark:text-white/10">0{i + 1}</span>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-luxe-ink text-luxe-gold"><Icon size={20} /></span>
                <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
                <p className="mt-1 text-sm text-luxe-ink/60 dark:text-white/60">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Promises ── */}
      <section className="bg-luxe-cream/60 py-12 dark:bg-white/[0.02] sm:py-16">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-10 lg:px-12">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <Reveal><Eyebrow center>Why NutValley</Eyebrow></Reveal>
            <h2 className="font-display text-4xl font-bold sm:text-5xl"><MaskReveal lines={['What we promise']} /></h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map(({ Icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 3) * 0.08}>
                <div className="group h-full rounded-[24px] border border-luxe-line bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-luxe-ink/25 hover:shadow-luxe-sm dark:border-white/10 dark:bg-white/5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-luxe-gold/15 text-luxe-gold transition group-hover:bg-luxe-gold group-hover:text-luxe-ink">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-luxe-ink/60 dark:text-white/60">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Collections ── */}
      <section className="mx-auto max-w-[1400px] px-5 py-12 sm:px-10 sm:py-16 lg:px-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Reveal><Eyebrow>Explore</Eyebrow></Reveal>
            <h2 className="font-display text-4xl font-bold sm:text-5xl"><MaskReveal lines={['Our collections']} /></h2>
          </div>
          <Link to="/shop" className="group inline-flex items-center gap-2 text-sm font-semibold text-luxe-ink underline-offset-4 hover:underline dark:text-white">
            Shop all <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cats.map(({ name, slug, img }, i) => (
            <Reveal key={slug} delay={(i % 4) * 0.06}>
              <Link to={`/category/${slug}`} className="group relative block overflow-hidden rounded-[24px]">
                <NutVisual src={img} label={name} alt={name} w={600} h={750}
                  className="aspect-[4/5] w-full" imgClassName="object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-luxe-ink/85 via-luxe-ink/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 sm:p-5">
                  <span className="font-display text-lg font-bold text-white sm:text-xl">{name}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition group-hover:bg-luxe-gold group-hover:text-luxe-ink">
                    <ArrowUpRight size={16} />
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-[1400px] px-5 pb-16 sm:px-10 lg:px-12">
        <div className="relative overflow-hidden rounded-[32px] bg-hero-gradient px-6 py-14 text-center text-white shadow-luxe sm:rounded-[40px] md:py-20">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-luxe-gold/25 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-4xl font-bold sm:text-5xl">
              Snack better, <span className="text-luxe-gold">every day.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Whether it's your daily handful or a thoughtful festive gift, we're here to help.
            </p>
            <Link to="/shop" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-luxe-gold px-9 py-4 text-sm font-semibold text-luxe-ink transition hover:bg-white">
              Start Shopping <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

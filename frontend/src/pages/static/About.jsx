import { Link } from 'react-router-dom';
import { Gem, HandHeart, Sparkles, Gift, Truck, ShieldCheck, ArrowRight } from 'lucide-react';
import Seo from '../../components/Seo';

const banner = (file) => `/Banner/${encodeURIComponent(file)}`;

const VALUES = [
  { Icon: HandHeart, title: 'Handcrafted with care', text: 'Every piece is designed and finished by hand, in small batches.' },
  { Icon: Gem, title: 'Quality materials', text: 'Kemp stones, pearls, crystals and antique-finish metal chosen for lasting shine.' },
  { Icon: Sparkles, title: 'Traditional meets modern', text: 'Temple, antique and Victorian styles made comfortable for everyday wear.' },
  { Icon: Gift, title: 'Gift-ready packaging', text: 'Packed beautifully, ready for weddings, festivals and special moments.' },
  { Icon: Truck, title: 'Delivered across India', text: 'Carefully packed and shipped safely to your doorstep.' },
  { Icon: ShieldCheck, title: 'Secure shopping', text: 'Safe payments and friendly support whenever you need help.' },
];

const COLLECTIONS = [
  ['Bangles', 'bangles', 'Bangles.png'],
  ['Necklace', 'necklace', 'Necklace.png'],
  ['Harams', 'harams', 'Harams.png'],
  ['Jhumka', 'jummka', 'Jhumka.png'],
  ['Earrings', 'earrings', 'Earrings.png'],
  ['Pendants', 'pendants', 'Pendants.png'],
  ['Long Chain', 'long-chain', 'Long Chain.png'],
  ['Tikka', 'tikka', 'Tikka.png'],
];

export default function About() {
  return (
    <div>
      <Seo title="About Us" description="Beadsboutique Jewellery — handcrafted bangles, necklaces, harams, jhumkas and more, made with care in India." />

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Our Story</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
            Jewellery that feels <span className="text-gold">personal</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-500 dark:text-gray-300">
            At Beadsboutique, we believe beautiful jewellery doesn't have to be expensive or mass-produced.
            Every piece is made to be worn, loved and gifted.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop" className="btn-gold">Shop the Collection <ArrowRight size={18} /></Link>
            <Link to="/contact" className="btn-outline">Contact Us</Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gold/10" />
          <img src={banner('Brand-intro.png')} alt="Beadsboutique handcrafted jewellery"
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl" />
        </div>
      </section>

      {/* Story */}
      <section className="bg-gold/5">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:gap-16">
          <img src={banner('Handmade Antique Bangles.png')} alt="Handmade antique bangles" loading="lazy"
            className="order-last aspect-[4/3] w-full rounded-3xl object-cover shadow-lg lg:order-first" />
          <div className="space-y-5 leading-relaxed text-gray-500 dark:text-gray-300">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">How it started</p>
            <h2 className="font-display text-3xl font-bold text-luxe-ink dark:text-white">Made in small batches, with love</h2>
            <p>
              Every piece begins with carefully chosen stones, pearls, beads and metal — picked for colour,
              texture and the way they catch the light.
            </p>
            <p>
              We started Beadsboutique with a simple belief: jewellery should feel personal, be comfortable
              to wear and still make you smile when you look in the mirror.
            </p>
            <p>
              From bridal harams and temple necklaces to everyday jhumkas and bangles, each design is finished
              with care, so no two collections are quite the same.
            </p>
            <p className="font-medium text-luxe-ink dark:text-white">
              Handcrafted beads. Made to be worn, loved and gifted.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Why Beadsboutique</p>
          <h2 className="mt-3 font-display text-3xl font-bold">What we promise</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-white/5">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Collections */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Explore</p>
          <h2 className="mt-3 font-display text-3xl font-bold">Our collections</h2>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {COLLECTIONS.map(([name, slug, img]) => (
            <Link key={slug} to={`/category/${slug}`} className="group relative overflow-hidden rounded-2xl">
              <img src={banner(img)} alt={name} loading="lazy"
                className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-4 font-display text-lg font-semibold text-white">{name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="rounded-3xl bg-ink px-6 py-12 text-center text-white md:py-16">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Find a piece that feels like you</h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-300">
            Whether you're dressing up for an occasion or looking for a thoughtful gift, we're here to help.
          </p>
          <Link to="/shop" className="btn-gold mt-8">Start Shopping <ArrowRight size={18} /></Link>
        </div>
      </section>
    </div>
  );
}

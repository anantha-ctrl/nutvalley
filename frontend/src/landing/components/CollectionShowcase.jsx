import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { MaskReveal } from '../lib/Reveal';
import MagneticButton from '../lib/MagneticButton';
import Tilt3D from '../lib/Tilt3D';
import NutVisual from '../three/NutVisual';

/**
 * Editorial collection block (e.g. the Cashews story). Reusable — flip
 * `reverse` and swap content for any collection. The visual is a 4:5 poster,
 * shown whole (no zoom/parallax crop).
 */
export default function CollectionShowcase({
  index = '01', eyebrow, title, description, image, to, cta, reverse = false, accent = 'text-luxe-gold', dark = false,
}) {
  return (
    <section
      data-nav={dark ? 'dark' : undefined}
      className={`relative overflow-hidden pt-12 pb-8 sm:pt-16 sm:pb-10 ${dark ? 'bg-luxe-ink text-white' : 'bg-luxe-bg text-luxe-ink dark:bg-ink dark:text-white'}`}
    >
      {/* oversized ghost index behind the copy */}
      <span aria-hidden className={`pointer-events-none absolute top-6 select-none font-display text-[38vw] font-bold leading-none opacity-[0.04] lg:text-[26vw] ${reverse ? 'right-0' : 'left-0'}`}>
        {index}
      </span>

      <div className={`relative mx-auto grid max-w-[1400px] items-center gap-14 px-5 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-12 ${reverse ? 'lg:[direction:rtl]' : ''}`}>
        {/* Text */}
        <div className={reverse ? 'lg:[direction:ltr]' : ''}>
          <div className="mb-6 flex items-center gap-4">
            <span className={`flex h-12 w-12 items-center justify-center rounded-full border font-display text-lg font-bold ${dark ? 'border-white/20' : 'border-luxe-ink/15'}`}>
              {index}
            </span>
            <span className="h-px w-10 bg-luxe-gold" />
            <span className={`text-xs font-semibold uppercase tracking-[0.4em] ${accent}`}>{eyebrow}</span>
          </div>
          <h2 className="font-display text-5xl font-bold leading-[0.98] sm:text-7xl">
            <MaskReveal lines={title.slice(0, -1)} />
            <span className="text-luxe-gold"><MaskReveal lines={title.slice(-1)} delay={0.1} /></span>
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className={`mt-7 max-w-md text-base leading-relaxed sm:text-lg ${dark ? 'text-white/70' : 'text-luxe-ink/70 dark:text-white/70'}`}
          >
            {description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-10"
          >
            <MagneticButton
              to={to}
              className={`group inline-flex items-center gap-2 rounded-full border px-8 py-4 text-sm font-semibold transition ${
                dark
                  ? 'border-white bg-white text-ink hover:bg-luxe-cream'
                  : 'border-luxe-ink bg-luxe-ink text-white hover:bg-luxe-cream hover:text-luxe-ink'
              }`}
            >
              {cta}
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </MagneticButton>
          </motion.div>
        </div>

        {/* Poster (4:5, shown whole) */}
        <div className={`relative mx-auto w-full max-w-[440px] ${reverse ? 'lg:[direction:ltr] lg:ml-3' : 'lg:mr-3'}`}>
          {/* gold frame, evenly spaced around the card */}
          <div className="pointer-events-none absolute -inset-3 rounded-[40px] border border-luxe-gold/50" />
          <Tilt3D max={6} glare className="group relative rounded-[30px]">
            <motion.div
              initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[30px] bg-white shadow-luxe"
            >
              <NutVisual src={image} label={eyebrow} alt={eyebrow} w={800} h={1000}
                className="aspect-[4/5] w-full" imgClassName="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]" />
              <div className="absolute inset-0 rounded-[30px] ring-1 ring-inset ring-black/5" />
            </motion.div>
          </Tilt3D>

          {/* round shop link, tucked inside the poster corner */}
          <Link
            to={to}
            aria-label={cta}
            className="absolute bottom-4 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-luxe-gold text-luxe-ink shadow-luxe ring-4 ring-white/70 transition hover:scale-105 hover:bg-luxe-cream"
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}

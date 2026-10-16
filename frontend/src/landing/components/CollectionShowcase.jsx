import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { MaskReveal } from '../lib/Reveal';
import MagneticButton from '../lib/MagneticButton';
import Tilt3D from '../lib/Tilt3D';

/**
 * Full-screen editorial collection block (e.g. the Men story). Reusable —
 * flip `reverse` and swap content for any collection.
 */
export default function CollectionShowcase({
  index = '01', eyebrow, title, description, image, to, cta, reverse = false, accent = 'text-luxe-gold', dark = false,
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden py-16 sm:py-20 ${dark ? 'bg-luxe-ink text-white' : 'bg-luxe-bg text-luxe-ink dark:bg-ink dark:text-white'}`}
    >
      <div className={`mx-auto grid max-w-[1400px] items-center gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:px-12 ${reverse ? 'lg:[direction:rtl]' : ''}`}>
        {/* Text */}
        <div className={reverse ? 'lg:[direction:ltr]' : ''}>
          <div className="mb-6 flex items-center gap-4">
            <span className={`font-display text-5xl font-bold opacity-20`}>{index}</span>
            <span className={`text-xs uppercase tracking-[0.4em] ${accent}`}>{eyebrow}</span>
          </div>
          <h2 className="font-display text-5xl font-bold leading-[0.98] sm:text-7xl">
            <MaskReveal lines={title} />
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className={`mt-7 max-w-md text-lg leading-relaxed ${dark ? 'text-white/70' : 'text-luxe-ink/70 dark:text-white/70'}`}
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
              className={`group inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition ${
                dark ? 'bg-white text-ink hover:bg-luxe-gold' : 'bg-ink text-white hover:bg-luxe-bronze'
              }`}
            >
              {cta}
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </MagneticButton>
          </motion.div>
        </div>

        {/* Image */}
        <div className={reverse ? 'lg:[direction:ltr]' : ''}>
          <Tilt3D max={8} glare className="group">
            <motion.div
              initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-luxe-lg shadow-luxe"
            >
              <motion.img style={{ y, scale }} src={image} alt={eyebrow}
                className="aspect-square w-full object-cover" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
            </motion.div>
          </Tilt3D>
        </div>
      </div>
    </section>
  );
}

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { MaskReveal } from '../lib/Reveal';
import MagneticButton from '../lib/MagneticButton';
import { IMG } from '../lib/content';

export default function NewArrival({ image }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1.2, 1]);

  return (
    <section ref={ref} data-nav="dark" className="relative h-[92vh] min-h-[560px] overflow-hidden">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <img src={image || IMG.newArrival} alt="New arrivals" className="h-full w-full object-cover" />
      </motion.div>
      {/* Bottom shade for mobile (copy sits low), side shade on desktop (copy sits left) */}
      <div className="absolute inset-0 bg-gradient-to-t from-luxe-ink/90 via-luxe-ink/40 to-luxe-ink/10 sm:bg-gradient-to-r sm:from-luxe-ink/85 sm:via-luxe-ink/45 sm:to-transparent" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col items-start justify-end px-6 pb-16 text-white sm:justify-center sm:px-10 sm:pb-0 lg:px-12">
        <motion.p
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-5 text-xs font-semibold uppercase tracking-[0.5em] text-white/85"
        >
          Just landed
        </motion.p>
        <h2 className="max-w-4xl font-display text-[12vw] font-bold leading-[0.9] sm:text-7xl lg:text-8xl">
          <MaskReveal lines={['The New Arrival']} />
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="mt-6 max-w-lg text-lg text-white/85"
        >
          Fresh arrivals across necklaces, bracelets, earrings and more. New pieces you'll love.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="mt-10"
        >
          <MagneticButton
            to="/shop"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-sm font-semibold text-ink transition hover:bg-luxe-gold"
          >
            Shop New In
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
}

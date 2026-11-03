import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MaskReveal } from '../lib/Reveal';

const DEFAULT_QUOTE = 'Our mission is simple — pure, fresh nuts and dry fruits that make every day a little healthier.';

function Word({ word, progress, start, end }) {
  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  return <motion.span style={{ opacity }} className="inline-block">{word}&nbsp;</motion.span>;
}

export default function BrandStory({ quote }) {
  const WORDS = (quote || DEFAULT_QUOTE).split(' ');
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.35'] });

  return (
    <section ref={ref} className="relative overflow-hidden bg-luxe-bg py-16 dark:bg-ink sm:py-20">
      {/* soft gradient light */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,151,28,0.14),transparent_55%)]" />

      <div className="relative mx-auto max-w-5xl px-6 text-center sm:px-10">
        <motion.p
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-10 text-xs uppercase tracking-[0.5em] text-luxe-bronze"
        >
          The NutValley Story
        </motion.p>

        {/* word-by-word fill on scroll */}
        <h2 className="font-display text-3xl font-bold leading-[1.25] text-luxe-ink dark:text-white sm:text-5xl sm:leading-[1.25]">
          {WORDS.map((w, i) => (
            <Word key={i} word={w} progress={scrollYProgress} start={i / WORDS.length} end={(i + 1) / WORDS.length} />
          ))}
        </h2>

        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mx-auto mt-12 h-px w-24 bg-gold-sheen"
        />
        <MaskReveal
          lines={['— Chosen with care, loved every day.']}
          className="mt-8 block text-sm uppercase tracking-[0.3em] text-luxe-ink/50 dark:text-white/50"
        />
      </div>
    </section>
  );
}

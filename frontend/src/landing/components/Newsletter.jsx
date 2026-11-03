import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Check, Mail, Sparkles, Gift, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { MaskReveal } from '../lib/Reveal';

const PERKS = [
  [Sparkles, 'First look at new arrivals'],
  [Gift, 'Member-only offers'],
  [Leaf, 'Seasonal gifting ideas'],
];

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/api/newsletter', { email });
      setDone(true);
      toast.success('Welcome to the NutValley family!');
    } catch (err) { toast.error(err.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <section className="relative bg-luxe-bg px-4 pb-16 pt-4 dark:bg-ink sm:px-8 lg:px-12">
      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 overflow-hidden rounded-[32px] border border-luxe-line bg-white px-6 py-12 shadow-luxe-sm dark:border-white/10 dark:bg-white/5 sm:rounded-[40px] sm:px-12 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-16">
        {/* soft gold glow + big envelope watermark */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-luxe-gold/15 blur-3xl" />
        <Mail aria-hidden className="pointer-events-none absolute -bottom-10 -right-6 h-56 w-56 rotate-[-12deg] text-luxe-ink/[0.04]" strokeWidth={1.2} />

        <div className="relative">
          <p className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-luxe-gold">
            <span className="h-px w-10 bg-luxe-gold" /> Join the NutValley family
          </p>
          <h2 className="font-display text-4xl font-bold leading-tight text-luxe-ink dark:text-white sm:text-5xl">
            <MaskReveal lines={['Be first to the']} />
            <span className="text-luxe-gold"><MaskReveal lines={['next harvest.']} delay={0.1} /></span>
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="mt-4 max-w-md text-luxe-ink/60 dark:text-white/60"
          >
            New arrivals, seasonal offers and gifting ideas — straight to your inbox. No spam, ever.
          </motion.p>
        </div>

        <div className="relative">
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 rounded-2xl border border-luxe-ink/15 bg-luxe-cream px-6 py-5 font-medium text-luxe-ink"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-luxe-ink text-luxe-gold"><Check size={18} /></span>
              You're on the list. Watch your inbox.
            </motion.div>
          ) : (
            <motion.form
              onSubmit={submit}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="flex flex-col gap-2 rounded-2xl border border-luxe-line bg-luxe-cream p-2 sm:flex-row sm:rounded-full dark:border-white/10 dark:bg-white/5"
            >
              <div className="relative flex-1">
                <Mail size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-luxe-ink/40" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com" aria-label="Email address"
                  className="w-full rounded-full bg-transparent py-3.5 pl-12 pr-4 text-luxe-ink outline-none placeholder:text-luxe-ink/40 dark:text-white"
                />
              </div>
              <button
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-luxe-ink bg-luxe-ink px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-luxe-cream hover:text-luxe-ink disabled:opacity-60"
              >
                {loading ? 'Joining…' : <>Subscribe <Send size={15} /></>}
              </button>
            </motion.form>
          )}

          <ul className="mt-5 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
            {PERKS.map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-2 text-xs font-medium text-luxe-ink/70 dark:text-white/70">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-luxe-gold/15 text-luxe-gold"><Icon size={14} /></span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { MaskReveal } from '../lib/Reveal';

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
      toast.success('Welcome to the list ✨');
    } catch (err) { toast.error(err.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <section data-nav="dark" className="relative overflow-hidden bg-luxe-ink py-24 text-white sm:py-32">
      {/* gradient lighting */}
      {/* radial gradients rather than blurred boxes, which leave hard edges when clipped */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(196,154,108,0.18),transparent_45%),radial-gradient(circle_at_85%_100%,rgba(160,98,72,0.22),transparent_40%)]" />

      <div className="relative mx-auto max-w-3xl px-6 text-center sm:px-10">
        <p className="mb-6 text-xs uppercase tracking-[0.5em] text-luxe-gold">Join the atelier</p>
        <h2 className="font-display text-4xl font-bold leading-tight sm:text-6xl">
          <MaskReveal lines={['Be first to the', 'next arrival.']} />
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="mx-auto mt-6 max-w-md text-white/60"
        >
          New arrivals, styling tips and members-only offers — straight to your inbox.
        </motion.p>

        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="mx-auto mt-10 flex max-w-md items-center justify-center gap-2 rounded-full border border-luxe-gold/40 bg-luxe-gold/10 px-6 py-4 text-luxe-gold"
          >
            <Check size={18} /> You're on the list. Watch your inbox.
          </motion.div>
        ) : (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-6 py-4 text-white outline-none backdrop-blur-md transition placeholder:text-white/40 focus:border-luxe-gold"
            />
            <button
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-luxe-ink transition hover:bg-luxe-gold disabled:opacity-60"
            >
              {loading ? 'Joining…' : <>Subscribe <Send size={15} /></>}
            </button>
          </motion.form>
        )}
      </div>
    </section>
  );
}

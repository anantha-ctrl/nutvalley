import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NotifyStock({ productId }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/api/notify-stock', { product_id: productId, email });
      toast.success(data.message);
      setDone(true);
    } catch (err) { toast.error(err.message); }
  };

  if (done) {
    return (
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
        <Check size={18} /> We'll email you the moment it's back in stock.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium"><Bell size={16} className="text-gold" /> Out of stock — get notified when it's back</p>
      <div className="flex gap-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email" className="input !py-2.5 text-sm" />
        <button className="btn-gold !px-4 !py-2.5 text-sm whitespace-nowrap">Notify Me</button>
      </div>
    </form>
  );
}

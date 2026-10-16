import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useStore } from '../../context/StoreContext';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const info = useStore();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/api/contact', form); toast.success('Message sent! We\'ll be in touch.'); setForm({ name: '', email: '', subject: '', message: '' }); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Get in touch</p>
      <h1 className="mt-2 font-display text-4xl font-bold">Contact Beadsboutique</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div className="space-y-6">
          {[[Mail, 'Email', info.email], [Phone, 'Phone', info.phone], [MapPin, 'Studio', info.address]].map(([Icon, t, v]) => (
            <div key={t} className="flex items-center gap-4">
              <div className="rounded-full bg-gold/10 p-3 text-gold"><Icon size={22} /></div>
              <div><p className="text-sm text-gray-400">{t}</p><p className="font-medium">{v}</p></div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <input required className="input" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="email" required className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea required rows={4} className="input" placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <button disabled={loading} className="btn-gold w-full">{loading ? 'Sending…' : 'Send Message'}</button>
        </form>
      </div>
    </div>
  );
}

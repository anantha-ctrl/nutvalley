import { useEffect, useState } from 'react';
import { Tag, Copy, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, dateFmt } from '../utils/format';
import { SectionTitle } from './ui';

export default function OffersStrip() {
  const [offers, setOffers] = useState([]);
  const [copied, setCopied] = useState(null);

  useEffect(() => { api.get('/api/offers').then((r) => setOffers(r.data.data)).catch(() => {}); }, []);
  if (offers.length === 0) return null;

  const copy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code); toast.success(`Code ${code} copied`);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const label = (o) =>
    o.type === 'percentage'
      ? `${Number(o.value)}% OFF${o.max_discount ? ` up to ${inr(o.max_discount)}` : ''}`
      : `${inr(o.value)} OFF`;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle eyebrow="Save More" title="Available Offers" />
      <div className="flex gap-4 overflow-x-auto pb-2">
        {offers.map((o) => (
          <div key={o.code} className="relative flex min-w-[260px] items-center gap-4 rounded-2xl border border-dashed border-gold/40 bg-gold/5 p-5">
            {Number(o.first_order_only) === 1 && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                <Sparkles size={10} /> 1ST ORDER
              </span>
            )}
            <div className="rounded-xl bg-gold/15 p-3 text-gold"><Tag size={22} /></div>
            <div className="flex-1">
              <p className="font-display text-lg font-bold">{label(o)}</p>
              <p className="text-xs text-gray-400">
                {Number(o.min_order) > 0 ? `On orders above ${inr(o.min_order)}` : 'On all orders'}
              </p>
              <button onClick={() => copy(o.code)}
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-gold/40 px-2.5 py-1 text-xs font-semibold text-gold hover:bg-gold/10">
                {copied === o.code ? <Check size={12} /> : <Copy size={12} />} {o.code}
              </button>
              {o.expires_at && (
                <p className="mt-2 text-[11px] text-gray-400">Valid till {dateFmt(o.expires_at)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

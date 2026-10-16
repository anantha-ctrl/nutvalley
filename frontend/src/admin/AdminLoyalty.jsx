import { useEffect, useState } from 'react';
import { Gift, Search, Coins, TrendingDown, X, Plus, Minus, Settings, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner, Empty } from '../components/ui';

const RULE_FIELDS = [
  ['loyalty_earn_rate_pct',  'Earn rate', '% of subtotal earned as points', '%', 1],
  ['loyalty_earn_cap',       'Max points / order', 'Cap on points earned per order (single or bulk)', 'pts', 1],
  ['loyalty_point_value',    'Point value', 'Rupee value of 1 point (e.g. 0.5 = 2 pts per ₹1)', '₹', 0.05],
  ['loyalty_redeem_cap_pct', 'Redeem cap', 'Max share of an order payable with points', '%', 1],
];

function RulesPanel({ settings, onSaved }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(settings); }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/api/admin/loyalty/settings', form);
      toast.success(data.message);
      onSaved(data.data);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Settings size={18} className="text-gold" />
        <h2 className="font-semibold">Program rules</h2>
        <span className="text-xs text-gray-400">— applies in real time to checkout &amp; earning</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RULE_FIELDS.map(([key, label, hint, unit, step]) => (
          <label key={key} className="block">
            <span className="text-sm font-medium">{label}</span>
            <div className="relative mt-1">
              <input type="number" min="0" step={step} value={form[key] ?? ''} className="input pr-12"
                onChange={(e) => setForm({ ...form, [key]: e.target.value === '' ? '' : Number(e.target.value) })} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>
            </div>
            <span className="mt-1 block text-xs text-gray-400">{hint}</span>
          </label>
        ))}
      </div>
      <button disabled={saving} onClick={save}
        className="btn-gold mt-5 inline-flex !px-5 !py-2.5 text-sm">
        <Save size={15} /> {saving ? 'Saving…' : 'Save rules'}
      </button>
    </div>
  );
}

const TYPE_BADGE = {
  earn:     'bg-emerald-500/10 text-emerald-600',
  redeem:   'bg-rose-500/10 text-rose-500',
  referral: 'bg-violet-500/10 text-violet-600',
  signup:   'bg-sky-500/10 text-sky-600',
  adjust:   'bg-amber-500/10 text-amber-600',
};

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}><Icon size={18} /></div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function AdminLoyalty() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null); // customer detail drawer

  const load = () => api.get('/api/admin/loyalty').then((r) => setData(r.data.data)).catch(() => setData({ customers: [], stats: {}, settings: {} }));
  useEffect(() => { load(); }, []);

  if (!data) return <Spinner />;
  const { customers, stats, settings } = data;
  const shown = customers.filter((c) =>
    `${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Loyalty</h1>
        <p className="text-xs text-gray-400">
          Earn {settings.loyalty_earn_rate_pct}% (max {settings.loyalty_earn_cap} pts/order) · Redeem up to {settings.loyalty_redeem_cap_pct}%
        </p>
      </div>

      {/* editable rules */}
      <RulesPanel settings={settings} onSaved={(s) => setData((d) => ({ ...d, settings: s }))} />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Coins} label="Points issued" value={stats.issued?.toLocaleString()} tint="bg-emerald-500/10 text-emerald-600" />
        <Stat icon={TrendingDown} label="Points redeemed" value={stats.redeemed?.toLocaleString()} tint="bg-rose-500/10 text-rose-500" />
        <Stat icon={Gift} label="Outstanding balance" value={stats.outstanding?.toLocaleString()} tint="bg-amber-500/10 text-amber-600" />
      </div>

      {/* search */}
      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…"
          className="input pl-9" />
      </div>

      {shown.length === 0 ? (
        <Empty icon={Gift} title="No customers" subtitle="Customer points will show up here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-black/5 text-left text-xs uppercase text-gray-400 dark:border-white/10">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Earned</th>
                <th className="px-4 py-3 text-right">Redeemed</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">+{c.total_earned}</td>
                  <td className="px-4 py-3 text-right text-rose-500">-{c.total_redeemed}</td>
                  <td className="px-4 py-3 text-right font-bold">{c.loyalty_points}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setActive(c)} className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:border-gold hover:text-gold dark:border-white/10">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && <CustomerDrawer customer={active} onClose={() => setActive(null)} onChanged={load} />}
    </div>
  );
}

function CustomerDrawer({ customer, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get(`/api/admin/loyalty/${customer.id}`).then((r) => setDetail(r.data.data));
  useEffect(() => { load(); }, [customer.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const adjust = async (sign) => {
    const n = parseInt(points, 10);
    if (!n || n <= 0) return toast.error('Enter a positive number');
    setSaving(true);
    try {
      const { data } = await api.post(`/api/admin/loyalty/${customer.id}/adjust`, { points: sign * n, note });
      toast.success(data.message);
      setPoints(''); setNote('');
      await load();
      onChanged();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-ink">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">{customer.name}</h2>
            <p className="text-xs text-gray-400">{customer.email}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>

        <div className="mt-4 rounded-2xl bg-gold/10 p-4 text-center">
          <p className="text-xs text-gray-500">Current balance</p>
          <p className="font-display text-3xl font-bold text-gold">{detail?.user.loyalty_points ?? customer.loyalty_points}</p>
          <p className="mt-1 text-xs text-gray-400">points</p>
        </div>

        {/* manual adjust */}
        <div className="mt-5 space-y-2">
          <p className="text-sm font-semibold">Adjust points</p>
          <div className="flex gap-2">
            <input type="number" min="1" value={points} onChange={(e) => setPoints(e.target.value)}
              placeholder="Amount" className="input w-28" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)" className="input flex-1" />
          </div>
          <div className="flex gap-2">
            <button disabled={saving} onClick={() => adjust(1)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50">
              <Plus size={15} /> Credit
            </button>
            <button disabled={saving} onClick={() => adjust(-1)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50">
              <Minus size={15} /> Deduct
            </button>
          </div>
        </div>

        {/* history */}
        <div className="mt-6">
          <p className="text-sm font-semibold">Transaction history</p>
          {!detail ? <div className="py-6"><Spinner /></div> : detail.history.length === 0 ? (
            <p className="mt-2 text-xs text-gray-400">No transactions yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {detail.history.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl border border-black/5 px-3 py-2 dark:border-white/10">
                  <div>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${TYPE_BADGE[t.type] || 'bg-gray-500/10 text-gray-500'}`}>{t.type}</span>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{t.note || (t.order_number ? `Order ${t.order_number}` : '—')}</p>
                    <p className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`font-bold ${t.points >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {t.points >= 0 ? '+' : ''}{t.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

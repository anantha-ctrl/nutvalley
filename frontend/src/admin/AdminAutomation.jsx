import { useEffect, useState } from 'react';
import { Mail, Play, Save, Clock, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner, Checkbox } from '../components/ui';

const STATUS_STYLE = {
  sent:    'bg-emerald-500/15 text-emerald-500',
  pending: 'bg-amber-500/15 text-amber-500',
  failed:  'bg-rose-500/15 text-rose-500',
  skipped: 'bg-gray-500/15 text-gray-400',
};

const fmt = (d) => (d ? new Date(d.replace(' ', 'T')).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const TYPE_LABEL = {
  order_confirmation: 'Order confirmation',
  welcome: 'Welcome',
  feeding_guide: 'Storage & freshness guide',
  check_in: 'Check-in',
  review_request: 'Review request',
  reorder_reminder: 'Reorder reminder',
};

export default function AdminAutomation() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = () => api.get('/api/admin/automation').then((r) => setData(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  // Poll real-time automation queue stats & activity log every 10s
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (!data) return <Spinner />;

  const toggleMaster = async (v) => {
    setData((d) => ({ ...d, master_enabled: v }));
    try {
      await api.put('/api/admin/automation', { master_enabled: v });
      toast.success(`Automation turned ${v ? 'On' : 'Off'}`);
      load();
    } catch (e) {
      toast.error(e.message || 'Could not update toggle');
    }
  };
  const setStep = (type, key, val) =>
    setData((d) => ({ ...d, steps: d.steps.map((s) => (s.type === type ? { ...s, [key]: val } : s)) }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/automation', {
        master_enabled: data.master_enabled,
        steps: data.steps.filter((s) => !s.fixed).map((s) => ({ type: s.type, enabled: s.enabled, offset: Number(s.offset) || 0 })),
      });
      toast.success('Automation settings saved');
      load();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await api.post('/api/admin/automation/run');
      const s = r.data.data;
      toast.success(`Processed ${s.processed} · sent ${s.sent}${s.failed ? ` · failed ${s.failed}` : ''}`);
      load();
    } catch (e) { toast.error(e.message); } finally { setRunning(false); }
  };

  const kpis = [
    ['Sent', data.stats.sent, CheckCircle2, 'text-emerald-500'],
    ['Pending', data.stats.pending, Clock, 'text-amber-500'],
    ['Due now', data.stats.due, Send, 'text-gold'],
    ['Failed', data.stats.failed, AlertTriangle, 'text-rose-500'],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold"><Mail size={22} className="text-gold" /> Mail Automation</h1>
          <p className="mt-1 text-sm text-gray-400">Lifecycle email drip — triggered by real order events, sent from the DB queue.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={data.master_enabled} onChange={(e) => toggleMaster(e.target.checked)} />
            Automation {data.master_enabled ? 'On' : 'Off'}
          </label>
          <button onClick={runNow} disabled={running} className="btn-outline flex items-center gap-2 !py-2">
            <Play size={15} /> {running ? 'Running…' : 'Run due now'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(([label, val, Icon, color]) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <Icon size={22} className={color} />
            <div>
              <p className="text-2xl font-bold">{val}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sequence config */}
      <div className="card space-y-1 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Drip sequence</h3>
          <button onClick={save} disabled={saving} className="btn-gold flex items-center gap-2 !py-2">
            <Save size={15} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-400">Delivery-anchored steps send N days after the order is delivered. Order confirmation is immediate and always on.</p>

        <div className="divide-y divide-black/5 dark:divide-white/10">
          {data.steps.map((s, i) => (
            <div key={s.type} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">{i + 1}</span>
              <div className="min-w-[160px] flex-1">
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-gray-400">{s.trigger}</p>
              </div>

              {s.fixed ? (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">Immediate · always on</span>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0"
                      className="input !w-20 !py-1.5 text-center text-sm"
                      value={s.offset}
                      onChange={(e) => setStep(s.type, 'offset', e.target.value)}
                    />
                    <span className="text-xs text-gray-400">days after delivery</span>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={s.enabled} onChange={(e) => setStep(s.type, 'enabled', e.target.checked)} />
                    {s.enabled ? 'On' : 'Off'}
                  </label>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live queue log */}
      <div className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Recent activity</h3>
          <button onClick={load} className="text-sm text-gold hover:underline">Refresh</button>
        </div>
        {data.log.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No automated emails yet. They queue when an order is marked <b>delivered</b>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Order</th><th className="py-2 pr-3">Scheduled</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.log.map((r) => (
                  <tr key={r.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-3 font-medium">{TYPE_LABEL[r.type] || r.type}</td>
                    <td className="py-2 pr-3 text-gray-500 dark:text-gray-300">{r.customer || '—'}<br /><span className="text-xs text-gray-400">{r.email}</span></td>
                    <td className="py-2 pr-3 text-gray-500 dark:text-gray-300">{r.order_number || '—'}</td>
                    <td className="py-2 pr-3 text-gray-500 dark:text-gray-300">{r.status === 'sent' ? fmt(r.sent_at) : fmt(r.scheduled_at)}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status] || ''}`}>{r.status}</span>
                      {r.error && <span className="ml-1 text-xs text-rose-400" title={r.error}>⚠</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

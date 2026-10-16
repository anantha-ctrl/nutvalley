import { useEffect, useMemo, useState } from 'react';
import {
  FileText, Search, Printer, Eye, X, Globe, Store, RefreshCw, Receipt, Trash2, Pencil, Undo2, Redo2,
} from 'lucide-react';
import api from '../api/client';
import { inr, dateFmt } from '../utils/format';
import { printInvoice, printBill } from '../utils/invoice';
import { Spinner, Empty } from '../components/ui';
import toast from 'react-hot-toast';

const money = (n) => inr(n);

// Status pill colours across both channels.
const STATUS = {
  pending: 'bg-amber-500/10 text-amber-600',
  processing: 'bg-blue-500/10 text-blue-600',
  packed: 'bg-indigo-500/10 text-indigo-600',
  shipped: 'bg-cyan-500/10 text-cyan-600',
  delivered: 'bg-emerald-500/10 text-emerald-600',
  cancelled: 'bg-rose-500/10 text-rose-500',
  paid: 'bg-emerald-500/10 text-emerald-600',
  void: 'bg-rose-500/10 text-rose-500',
};

export default function AdminInvoices() {
  const [data, setData] = useState(null);
  const [billConfig, setBillConfig] = useState({});
  const [tab, setTab] = useState('all'); // all | online | counter
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null); // invoice being viewed
  const [refreshing, setRefreshing] = useState(false);

  const load = (silent) => {
    if (!silent) setData(null);
    setRefreshing(true);
    return api.get('/api/admin/invoices')
      .then((r) => setData(r.data.data))
      .catch(() => setData({ invoices: [], stats: {} }))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    load(false);
    // Store header/footer for counter-bill invoices.
    api.get('/api/admin/billing/config').then((r) => setBillConfig(r.data.data)).catch(() => {});
  }, []);

  // Poll the backend so newly-created online invoices appear quickly.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 30000);
    return () => clearInterval(t);
  }, []);

  const shown = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.invoices.filter((i) =>
      (tab === 'all' || i.source === tab) &&
      (!term || `${i.number} ${i.customer} ${i.email}`.toLowerCase().includes(term)));
  }, [data, tab, q]);

  const removeInvoice = async (invoice) => {
    const label = invoice.source === 'online' ? 'cancelled order' : 'counter bill';
    if (!window.confirm(`Delete ${label} ${invoice.number}? This cannot be undone.`)) return;
    try {
      try {
        await api.post(`/api/admin/invoices/${invoice.source}/${invoice.id}/delete`, { _method: 'DELETE' });
      } catch {
        await api.delete(`/api/admin/invoices/${invoice.source}/${invoice.id}`);
      }
      if (active?.source === invoice.source && active?.id === invoice.id) setActive(null);
      toast.success('Invoice deleted');
      await load(true);
    } catch (e) { toast.error(e.message); }
  };

  if (!data) return <Spinner />;
  const s = data.stats || {};

  const TABS = [['all', 'All'], ['online', 'Online']];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <FileText className="text-gold" /> Invoices
        </h1>
        <button onClick={() => load(false)} disabled={refreshing} className="btn-outline !py-2 text-sm disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat icon={FileText} label="Total invoices" value={s.total ?? 0} tint="bg-gold/10 text-gold" />
        <Stat icon={Globe} label="Online orders" value={s.online ?? 0} tint="bg-cyan-500/10 text-cyan-600" />
        <Stat icon={Receipt} label="Revenue" value={money(s.revenue)} tint="bg-emerald-500/10 text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === k ? 'bg-gold text-ink' : 'border border-black/10 dark:border-white/10'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative ml-auto max-w-xs flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice # or customer…"
            className="input !py-2 pl-9 text-sm" />
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty icon={FileText} title="No invoices" subtitle="Online orders and counter bills will appear here." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-white/10">
              <tr>
                <th className="p-3">Order / Bill No.</th><th className="p-3">Source</th><th className="p-3">Customer</th>
                <th className="p-3 text-center">Items</th><th className="p-3 text-right">Total</th>
                <th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {shown.map((i) => (
                <tr key={`${i.source}-${i.id}`} className={i.status === 'void' || i.status === 'cancelled' ? 'opacity-60' : ''}>
                  <td className="p-3 font-mono text-xs font-semibold">{i.number}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${i.source === 'online' ? 'bg-cyan-500/10 text-cyan-600' : 'bg-violet-500/10 text-violet-600'}`}>
                      {i.source === 'online' ? <Globe size={11} /> : <Store size={11} />}
                      {i.source === 'online' ? 'Online' : 'Counter'}
                    </span>
                  </td>
                  <td className="p-3">{i.customer}</td>
                  <td className="p-3 text-center">{i.items}</td>
                  <td className="p-3 text-right font-semibold">{money(i.total)}</td>
                  <td className="p-3 capitalize">{i.payment_method}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS[i.status] || 'bg-gray-500/10 text-gray-500'}`}>{i.status}</span></td>
                  <td className="p-3 whitespace-nowrap text-gray-400">{dateFmt(i.date)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setActive(i)} title="View" className="rounded-lg p-2 text-gold hover:bg-gold/10"><Eye size={15} /></button>
                      {i.source === 'online' && <button onClick={() => setActive(i)} title="Update invoice" className="rounded-lg p-2 text-blue-500 hover:bg-blue-500/10"><Pencil size={15} /></button>}
                      <PrintButton invoice={i} config={billConfig} />
                      <button onClick={() => removeInvoice(i)} title="Delete invoice"
                        className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && <InvoiceModal invoice={active} config={billConfig} onClose={() => setActive(null)} onUpdated={() => load(true)} />}
    </div>
  );
}

/** Fetches the full record for either channel and prints it. */
async function fetchFull(invoice) {
  if (invoice.source === 'online') {
    const { data } = await api.get(`/api/admin/invoices/order/${invoice.id}`);
    return data.data;
  }
  const { data } = await api.get(`/api/admin/billing/${invoice.id}`);
  return data.data;
}

function PrintButton({ invoice, config }) {
  const [busy, setBusy] = useState(false);
  const print = async () => {
    setBusy(true);
    try {
      const full = await fetchFull(invoice);
      invoice.source === 'online' ? printInvoice(full) : printBill(full, config);
    } finally { setBusy(false); }
  };
  return (
    <button onClick={print} disabled={busy} title="Print invoice"
      className="rounded-lg p-2 text-gray-500 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10">
      <Printer size={15} className={busy ? 'animate-pulse' : ''} />
    </button>
  );
}

function InvoiceModal({ invoice, config, onClose, onUpdated }) {
  const [full, setFull] = useState(null);
  const [status, setStatus] = useState(invoice.status);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyBusy, setHistoryBusy] = useState('');
  useEffect(() => { fetchFull(invoice).then(setFull).catch(() => setFull(false)); }, [invoice]);

  const isOnline = invoice.source === 'online';
  const items = full?.items || [];
  const number = full?.order_number || full?.bill_number || invoice.number;
  const update = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/orders/${invoice.id}/status`, { status, carrier, tracking_number: tracking });
      toast.success('Invoice updated');
      onUpdated?.();
      onClose();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };
  const historyAction = async (action) => {
    setHistoryBusy(action);
    try { await api.post(`/api/admin/orders/${invoice.id}/status/${action}`); toast.success(action === 'undo' ? 'Update undone' : 'Update redone'); onUpdated?.(); const r = await fetchFull(invoice); setFull(r); setStatus(r.status); setCarrier(r.carrier || ''); setTracking(r.tracking_number || ''); }
    catch (e) { toast.error(e.message); } finally { setHistoryBusy(''); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md p-0">
        <div className="flex items-center justify-between border-b border-black/5 p-4 dark:border-white/10">
          <h3 className="flex items-center gap-2 font-semibold">
            {isOnline ? <Globe size={17} className="text-cyan-600" /> : <Store size={17} className="text-violet-600" />} {number}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>

        {!full ? (full === false ? <p className="p-6 text-sm text-rose-500">Could not load this invoice.</p> : <div className="p-8"><Spinner /></div>) : (
          <>
            <div className="max-h-[60vh] overflow-y-auto p-4 text-sm">
              {isOnline && (
                <div className="mb-4 space-y-2 rounded-xl bg-black/[.03] p-3 dark:bg-white/[.05]">
                  <div className="flex items-center justify-between font-semibold"><span className="flex items-center gap-2"><Pencil size={14} className="text-gold" /> Update order</span><span className="flex gap-1"><button onClick={() => historyAction('undo')} disabled={!!historyBusy} title="Undo" className="rounded-lg p-1.5 text-gray-500 hover:bg-black/5 disabled:opacity-40"><Undo2 size={15} /></button><button onClick={() => historyAction('redo')} disabled={!!historyBusy} title="Redo" className="rounded-lg p-1.5 text-gray-500 hover:bg-black/5 disabled:opacity-40"><Redo2 size={15} /></button></span></div>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="input !py-2 text-sm">
                    {['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier" className="input !py-2 text-sm" />
                    <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className="input !py-2 text-sm" />
                  </div>
                </div>
              )}
              <p className="mb-3 text-xs text-gray-400">
                {dateFmt(isOnline ? full.placed_at : full.created_at)}
                {' · '}{invoice.customer}
                {full.cashier && <> · by {full.cashier}</>}
                <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 capitalize dark:bg-white/10">{isOnline ? 'Online' : 'Counter'}</span>
              </p>
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-2">
                    <span className="min-w-0 flex-1 pr-2">
                      {it.product_name}
                      {it.size ? <span className="text-gray-400"> ({it.size}{it.color ? `, ${it.color}` : ''})</span> : null}
                      <span className="text-gray-400"> × {it.quantity}</span>
                    </span>
                    <span className="font-medium">{money(it.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t border-black/5 pt-3 dark:border-white/10">
                <Row label="Subtotal" value={money(full.subtotal)} />
                {full.discount > 0 && <Row label="Discount" value={`− ${money(full.discount)}`} accent="text-rose-500" />}
                {isOnline
                  ? <Row label="Shipping" value={full.shipping_fee ? money(full.shipping_fee) : 'Free'} />
                  : full.tax_amount > 0 && <Row label={`Tax (${full.tax_pct}%)`} value={money(full.tax_amount)} />}
                <div className="flex justify-between pt-1 text-base font-bold"><span>Total</span><span className="text-gold">{money(full.total)}</span></div>
                <Row label={`Payment (${full.payment_method})`} value={isOnline ? full.payment_status : money(full.paid)} />
                {!isOnline && full.payment_method === 'split' && (
                  <>
                    <Row label="— Cash" value={money(full.split_cash)} />
                    <Row label="— Card / UPI" value={money(full.split_digital)} />
                  </>
                )}
              </div>
            </div>
            <div className={`grid gap-2 border-t border-black/5 p-4 dark:border-white/10 ${isOnline ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]' : 'grid-cols-[1fr_auto]'}`}>
              {isOnline && <button onClick={update} disabled={saving} className="btn-gold min-w-0 justify-center whitespace-nowrap px-3 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save update'}</button>}
              <button onClick={() => (isOnline ? printInvoice(full) : printBill(full, config))} className="btn-gold min-w-0 justify-center whitespace-nowrap px-3 text-sm">
                <Printer size={16} /> <span>Print invoice</span>
              </button>
              <button onClick={onClose} className="rounded-xl border border-black/10 px-4 text-sm whitespace-nowrap dark:border-white/10">Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const Row = ({ label, value, accent }) => (
  <div className="flex justify-between text-gray-500 dark:text-gray-300">
    <span className="capitalize">{label}</span><span className={accent || ''}>{value}</span>
  </div>
);

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

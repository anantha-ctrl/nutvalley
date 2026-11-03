import { useCallback, useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Download, RefreshCw } from 'lucide-react';
import api from '../api/client';
import { inr } from '../utils/format';
import { exportCsv } from '../utils/csv';
import { Spinner } from '../components/ui';

const fmt = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

// Tooltip styling — dark panel with light, readable text in both themes.
const TOOLTIP = { background: '#23602e', border: '1px solid #c9971c44', borderRadius: 12 };
const LABEL = { color: '#ffffff', fontWeight: 600, marginBottom: 2 };
const ITEM = { color: '#e3bd5b' };

const STATUS_COLORS = {
  pending: '#f59e0b', processing: '#3b82f6', packed: '#6366f1',
  shipped: '#06b6d4', delivered: '#10b981', cancelled: '#f43f5e',
};
const CAT_COLORS = ['#c9971c', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const PRESETS = [
  ['7d', 'Last 7 days', () => [fmt(daysAgo(6)), fmt(new Date())]],
  ['30d', 'Last 30 days', () => [fmt(daysAgo(29)), fmt(new Date())]],
  ['90d', 'Last 90 days', () => [fmt(daysAgo(89)), fmt(new Date())]],
  ['month', 'This month', () => { const d = new Date(); return [fmt(new Date(d.getFullYear(), d.getMonth(), 1)), fmt(new Date())]; }],
];

export default function AdminReports() {
  const [tab, setTab] = useState('sales');
  const [from, setFrom] = useState(fmt(daysAgo(29)));
  const [to, setTo] = useState(fmt(new Date()));
  const [preset, setPreset] = useState('30d');
  const [sales, setSales] = useState(null);
  const [products, setProducts] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent) => {
    if (!silent) { setSales(null); setProducts(null); setCustomers(null); }
    setRefreshing(true);
    const qs = `?from=${from}&to=${to}`;
    try {
      const [s, p, c] = await Promise.all([
        api.get(`/api/admin/reports/sales${qs}`),
        api.get(`/api/admin/reports/products${qs}`),
        api.get(`/api/admin/reports/customers${qs}`),
      ]);
      setSales(s.data.data); setProducts(p.data.data); setCustomers(c.data.data);
    } catch { /* interceptor handles auth */ } finally { setRefreshing(false); }
  }, [from, to]);

  useEffect(() => { load(false); }, [load]);

  // Keep report cards and charts synced with the backend/database.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 30000);
    return () => clearInterval(t);
  }, [load]);

  const applyPreset = (key, fn) => { const [f, t] = fn(); setPreset(key); setFrom(f); setTo(t); };

  const TABS = [['sales', 'Sales'], ['products', 'Top Products'], ['customers', 'Top Customers']];

  const exportCurrent = () => {
    if (tab === 'sales' && sales) exportCsv('sales-report', sales.daily);
    if (tab === 'products' && products) exportCsv('product-report', products);
    if (tab === 'customers' && customers) exportCsv('customer-report', customers);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <button onClick={() => load(false)} disabled={refreshing} className="btn-outline !py-2 text-sm disabled:opacity-50">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCurrent} className="btn-outline !py-2 text-sm"><Download size={16} /> Export CSV</button>
        </div>
      </div>

      {/* Date range controls */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([k, label, fn]) => (
            <button key={k} onClick={() => applyPreset(k, fn)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${preset === k ? 'bg-gold text-ink' : 'border border-black/10 dark:border-white/10'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPreset(''); }} className="input !py-1.5 text-sm" />
          <span className="text-gray-400">–</span>
          <input type="date" value={to} min={from} max={fmt(new Date())} onChange={(e) => { setTo(e.target.value); setPreset(''); }} className="input !py-1.5 text-sm" />
        </div>
      </div>

      <div className="flex gap-2">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${tab === k ? 'bg-gold text-ink' : 'glass'}`}>{l}</button>
        ))}
      </div>

      {tab === 'sales' && (!sales ? <Spinner /> : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total Revenue" value={inr(sales.total_revenue)} hint="Online + counter" />
            <Stat label="Online Revenue" value={inr(sales.online_revenue)} />
            <Stat label="Counter Revenue" value={inr(sales.counter_revenue)} hint={`${sales.counter_bills} bill${sales.counter_bills === 1 ? '' : 's'}`} />
            <Stat label="Items Sold" value={sales.items_sold} />
            <Stat label="Total Orders" value={sales.total_orders} />
            <Stat label="Avg Order Value" value={inr(sales.avg_order_value)} />
            <Stat label="New Customers" value={sales.new_customers} />
            <Stat label="Coupons Used" value={sales.coupons_used} />
          </div>

          <div className="card p-6">
            <h3 className="mb-4 font-semibold">Daily Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sales.daily.map((d) => ({ day: d.day.slice(5), revenue: Number(d.revenue) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="day" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip contentStyle={TOOLTIP} labelStyle={LABEL} itemStyle={ITEM} formatter={(v) => inr(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#c9971c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="mb-4 font-semibold">Orders by Status</h3>
              {sales.status_breakdown.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sales.status_breakdown.map((s) => ({ ...s, count: Number(s.count) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="status" stroke="#888" fontSize={11} />
                    <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#c9971c18' }} contentStyle={TOOLTIP} labelStyle={LABEL} itemStyle={ITEM} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {sales.status_breakdown.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.status] || '#c9971c'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card p-6">
              <h3 className="mb-4 font-semibold">Revenue by Category</h3>
              {sales.category_breakdown.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sales.category_breakdown.map((c) => ({ ...c, revenue: Number(c.revenue) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis type="number" stroke="#888" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                    <YAxis type="category" dataKey="category" stroke="#888" fontSize={11} width={80} />
                    <Tooltip cursor={{ fill: '#c9971c18' }} contentStyle={TOOLTIP} labelStyle={LABEL} itemStyle={ITEM} formatter={(v) => inr(v)} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                      {sales.category_breakdown.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Payment method breakdown */}
          <div className="card p-6">
            <h3 className="mb-4 font-semibold">Payment Methods</h3>
            {sales.payment_breakdown.length === 0 ? <Empty /> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sales.payment_breakdown.map((pm) => (
                  <div key={pm.method} className="rounded-xl border border-black/5 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-wider text-gold">{(pm.method || '—').toUpperCase()}</p>
                    <p className="mt-1 text-xl font-bold">{inr(pm.revenue)}</p>
                    <p className="text-xs text-gray-400">{pm.orders} order{Number(pm.orders) === 1 ? '' : 's'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {tab === 'products' && (!products ? <Spinner /> : (
        <Table head={['Product', 'Brand', 'Units Sold', 'Revenue', 'Stock']}
          rows={products.map((p) => [p.name, p.brand || '—', p.units_sold, inr(p.revenue), p.stock])} />
      ))}

      {tab === 'customers' && (!customers ? <Spinner /> : (
        <Table head={['Customer', 'Email', 'Orders', 'Total Spent']}
          rows={customers.map((c) => [c.name, c.email, c.orders, inr(c.total_spent)])} />
      ))}
    </div>
  );
}

const Stat = ({ label, value, hint }) => (
  <div className="card p-6">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="mt-1 text-3xl font-bold">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-gold">{hint}</p>}
  </div>
);

const Empty = () => <p className="py-12 text-center text-sm text-gray-400">No data in this range</p>;

const Table = ({ head, rows }) => (
  <div className="card overflow-x-auto">
    <table className="w-full min-w-[560px] text-sm">
      <thead className="text-left text-gray-400">
        <tr className="border-b border-black/5 dark:border-white/10">{head.map((h) => <th key={h} className="p-4">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-black/5 last:border-0 dark:border-white/10">
            {r.map((c, j) => <td key={j} className={`p-4 ${j === 0 ? 'font-medium' : ''}`}>{c}</td>)}
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={head.length} className="p-8 text-center text-gray-400">No data yet</td></tr>}
      </tbody>
    </table>
  </div>
);

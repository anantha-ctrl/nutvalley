import { useEffect, useState } from 'react';
import { Search, Save, AlertTriangle, PackageCheck, PackageX, Boxes } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner } from '../components/ui';

export default function AdminInventory() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [edits, setEdits] = useState({}); // id -> { stock, low_stock_alert }

  const load = () => api.get('/api/admin/inventory').then((r) => { setItems(r.data.data); setEdits({}); }).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!items) return <Spinner />;

  const filtered = items.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const stats = {
    total: items.length,
    inStock: items.filter((p) => p.stock > p.low_stock_alert).length,
    low: items.filter((p) => p.stock > 0 && p.stock <= p.low_stock_alert).length,
    out: items.filter((p) => p.stock === 0).length,
  };

  const valOf = (p, key) => (edits[p.id]?.[key] ?? p[key]);
  const setEdit = (id, key, value) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], [key]: value === '' ? '' : Math.max(0, parseInt(value, 10) || 0) } }));
  const dirty = (p) => edits[p.id] && (Number(valOf(p, 'stock')) !== p.stock || Number(valOf(p, 'low_stock_alert')) !== p.low_stock_alert);

  const save = async (p) => {
    try {
      await api.put(`/api/admin/inventory/${p.id}`, {
        stock: Number(valOf(p, 'stock')), low_stock_alert: Number(valOf(p, 'low_stock_alert')),
      });
      toast.success(`${p.name} updated`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const statusBadge = (p) => {
    if (p.stock === 0) return <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs text-rose-500">Out of Stock</span>;
    if (p.stock <= p.low_stock_alert) return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-500">Low Stock</span>;
    return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-500">In Stock</span>;
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Inventory</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Boxes} label="Total Products" value={stats.total} accent="text-gold" />
        <Stat icon={PackageCheck} label="In Stock" value={stats.inStock} accent="text-emerald-500" />
        <Stat icon={AlertTriangle} label="Low Stock" value={stats.low} accent="text-amber-500" />
        <Stat icon={PackageX} label="Out of Stock" value={stats.out} accent="text-rose-500" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input className="input !py-2 pl-9 text-sm" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="p-4">Product</th><th>Category</th><th>Sold</th>
              <th>Stock</th><th>Low-stock at</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={p.image} className="h-11 w-9 rounded-lg object-cover" alt="" />
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.brand}</p>
                    </div>
                  </div>
                </td>
                <td className="text-gray-400">{p.category}</td>
                <td>{p.sold_count}</td>
                <td>
                  <input type="number" min="0" value={valOf(p, 'stock')} onChange={(e) => setEdit(p.id, 'stock', e.target.value)}
                    className={`input !w-20 !py-1.5 text-sm ${p.stock === 0 ? 'text-rose-500' : p.stock <= p.low_stock_alert ? 'text-amber-500' : ''}`} />
                </td>
                <td>
                  <input type="number" min="0" value={valOf(p, 'low_stock_alert')} onChange={(e) => setEdit(p.id, 'low_stock_alert', e.target.value)}
                    className="input !w-20 !py-1.5 text-sm" />
                </td>
                <td>{statusBadge(p)}</td>
                <td>
                  {dirty(p) && (
                    <button onClick={() => save(p)} className="btn-gold !px-3 !py-1.5 text-xs"><Save size={14} /> Save</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">No products found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value, accent }) => (
  <div className="card flex items-center gap-4 p-5">
    <div className={`rounded-xl bg-black/5 p-3 dark:bg-white/5 ${accent}`}><Icon size={22} /></div>
    <div><p className="text-sm text-gray-400">{label}</p><p className="text-2xl font-bold">{value}</p></div>
  </div>
);

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, dateFmt } from '../utils/format';
import { Spinner, Checkbox } from '../components/ui';

const blank = { code: '', type: 'percentage', value: '', min_order: 0, max_discount: '', usage_limit: '', first_order_only: 0, expires_at: '', is_active: 1 };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState(null);
  const [form, setForm] = useState(blank);
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);

  const load = () => api.get('/api/admin/coupons').then((r) => setCoupons(r.data.data)).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const resetForm = () => { setForm(blank); setEditId(null); setShow(false); };

  const startAdd = () => { setForm(blank); setEditId(null); setShow((s) => editId ? true : !s); };

  const startEdit = (c) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      min_order: c.min_order ?? 0,
      max_discount: c.max_discount ?? '',
      usage_limit: c.usage_limit ?? '',
      first_order_only: c.first_order_only ?? 0,
      expires_at: c.expires_at ? String(c.expires_at).slice(0, 10) : '',
      is_active: c.is_active ?? 1,
    });
    setShow(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/api/admin/coupons/${editId}`, form);
        toast.success('Coupon updated');
      } else {
        await api.post('/api/admin/coupons', form);
        toast.success('Coupon created');
      }
      resetForm();
      load();
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Could not save coupon'); }
  };
  const del = async (id) => {
    if (!confirm('Delete coupon?')) return;
    try {
      try {
        await api.post(`/api/admin/coupons/${id}/delete`, { _method: 'DELETE' });
      } catch (e1) {
        await api.delete(`/api/admin/coupons/${id}`);
      }
      toast.success('Deleted');
      if (editId === id) resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not delete coupon');
    }
  };

  if (!coupons) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Coupons</h1>
        <button onClick={startAdd} className="btn-gold !py-2 text-sm"><Plus size={16} /> Add Coupon</button>
      </div>

      {show && (
        <form onSubmit={save} className="card grid gap-4 p-6 sm:grid-cols-3">
          <div className="flex items-center justify-between sm:col-span-3">
            <h2 className="font-semibold">{editId ? `Edit coupon ${form.code}` : 'New coupon'}</h2>
            <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-gray-400 hover:bg-black/5 dark:hover:bg-white/10" aria-label="close"><X size={16} /></button>
          </div>
          <input required disabled={!!editId} title={editId ? 'Coupon code cannot be changed' : ''}
            className="input uppercase disabled:opacity-60" placeholder="CODE" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed (₹)</option>
          </select>
          <input type="number" required className="input" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <input type="number" className="input" placeholder="Min order ₹" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
          <input type="number" className="input" placeholder="Max discount ₹ (optional)" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
          <input type="number" className="input" placeholder="Usage limit (optional)" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
          <input type="date" className="input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-3">
            <Checkbox checked={!!Number(form.first_order_only)} onChange={(e) => setForm({ ...form, first_order_only: e.target.checked ? 1 : 0 })} />
            First order only <span className="text-gray-400">— valid only on a new customer's first order</span>
          </label>
          <button className="btn-gold sm:col-span-3">{editId ? 'Save Changes' : 'Create Coupon'}</button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="p-4">Code</th><th>Discount</th><th>Min Order</th><th>Used</th><th>Expires</th><th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="p-4 font-mono font-semibold text-gold">{c.code}</td>
                <td>{c.type === 'percentage' ? `${c.value}%` : inr(c.value)}</td>
                <td>{inr(c.min_order)}</td>
                <td>{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                <td className="text-gray-400">{c.expires_at ? dateFmt(c.expires_at) : '—'}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(c)} className="rounded-lg p-2 hover:bg-gold/10" aria-label="edit"><Pencil size={16} /></button>
                    <button onClick={() => del(c.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10" aria-label="delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

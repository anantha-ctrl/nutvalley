import { useEffect, useState } from 'react';
import { UserPlus, Trash2, KeyRound, Ban, Check, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr } from '../utils/format';
import { Spinner, Empty } from '../components/ui';

const blank = { name: '', email: '', password: '' };

export default function AdminStaff() {
  const [cashiers, setCashiers] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/api/admin/staff').then((r) => setCashiers(r.data.data)).catch(() => setCashiers([]));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/admin/staff', form);
      toast.success('Cashier account created');
      setForm(blank);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const toggleBlock = async (c) => {
    try {
      await api.put(`/api/admin/staff/${c.id}`, { status: c.status === 'blocked' ? 'active' : 'blocked' });
      toast.success(c.status === 'blocked' ? 'Cashier unblocked' : 'Cashier blocked');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const resetPassword = async (c) => {
    const pw = prompt(`New password for ${c.name} (min 6 characters):`);
    if (!pw) return;
    try {
      try {
        await api.post(`/api/admin/staff/${c.id}`, { password: pw, _method: 'PUT' });
      } catch {
        await api.put(`/api/admin/staff/${c.id}`, { password: pw });
      }
      toast.success('Password updated');
    } catch (e) { toast.error(e.message); }
  };

  const del = async (c) => {
    if (!confirm(`Remove cashier ${c.name}? Their past bills are kept.`)) return;
    try {
      try {
        await api.post(`/api/admin/staff/${c.id}/delete`, { _method: 'DELETE' });
      } catch {
        await api.delete(`/api/admin/staff/${c.id}`);
      }
      toast.success('Cashier removed');
      load();
    } catch (e) { toast.error(e.message); }
  };

  if (!cashiers) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Cashiers</h1>
        <p className="text-sm text-gray-400">Create logins that can access the billing counter only.</p>
      </div>

      {/* Create form */}
      <form onSubmit={create} className="card grid gap-4 p-6 sm:grid-cols-4">
        <input required className="input sm:col-span-1" placeholder="Full name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <input required type="email" className="input sm:col-span-1" placeholder="Email (login)" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <input required type="text" className="input sm:col-span-1" placeholder="Password (6+ chars)" value={form.password} onChange={(e) => set('password', e.target.value)} />
        <button disabled={saving} className="btn-gold justify-center disabled:opacity-50">
          <UserPlus size={16} /> {saving ? 'Creating…' : 'Add cashier'}
        </button>
      </form>

      {/* List */}
      {cashiers.length === 0 ? (
        <Empty icon={Receipt} title="No cashiers yet" subtitle="Add one above — they'll sign in and land straight on the billing screen." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-white/10">
              <tr>
                <th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Bills</th>
                <th className="p-3">Sales</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {cashiers.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-gray-500 dark:text-gray-300">{c.email}</td>
                  <td className="p-3">{c.bills}</td>
                  <td className="p-3 font-semibold">{inr(c.sales)}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === 'blocked' ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
                      {c.status === 'blocked' ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => resetPassword(c)} title="Reset password" className="rounded-lg p-2 hover:bg-gold/10"><KeyRound size={15} /></button>
                      <button onClick={() => toggleBlock(c)} title={c.status === 'blocked' ? 'Unblock' : 'Block'}
                        className={`rounded-lg p-2 ${c.status === 'blocked' ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'}`}>
                        {c.status === 'blocked' ? <Check size={15} /> : <Ban size={15} />}
                      </button>
                      <button onClick={() => del(c)} title="Remove" className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

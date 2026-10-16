import { useEffect, useState } from 'react';
import { Undo2, Check, X, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr } from '../utils/format';
import { Spinner, Empty } from '../components/ui';

const STATUS_COLOR = {
  requested: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-sky-500/10 text-sky-500',
  rejected: 'bg-rose-500/10 text-rose-500',
  refunded: 'bg-emerald-500/10 text-emerald-500',
};

export default function AdminReturns() {
  const [returns, setReturns] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = () => api.get('/api/admin/returns').then((r) => setReturns(r.data.data)).catch(() => setReturns([]));
  useEffect(() => { load(); }, []);

  const act = async (rt, status) => {
    let note = null;
    if (status === 'rejected') {
      note = prompt('Reason for rejection (optional):') || '';
    }
    if (status === 'refunded' && !confirm('Mark as refunded? This restocks the items and marks the order returned + refunded.')) return;
    try {
      await api.put(`/api/admin/returns/${rt.id}`, { status, admin_note: note });
      toast.success(`Return ${status}`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  if (!returns) return <Spinner />;

  const shown = returns.filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Returns &amp; Refunds</h1>
        <div className="flex flex-wrap gap-2">
          {['all', 'requested', 'approved', 'rejected', 'refunded'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${filter === f ? 'bg-gold text-ink' : 'border border-black/10 dark:border-white/10'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty icon={Undo2} title="No return requests" subtitle="Customer return requests will appear here." />
      ) : (
        <div className="space-y-3">
          {shown.map((rt) => (
            <div key={rt.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{rt.order_number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[rt.status]}`}>{rt.status}</span>
                    <span className="text-sm text-gray-400">{inr(rt.total)}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">Reason: {rt.reason}</p>
                  {rt.admin_note && <p className="mt-1 text-sm text-gray-400">Note: {rt.admin_note}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    {rt.user_name} · {rt.user_email} · {new Date(rt.created_at).toLocaleDateString()} · payment {rt.payment_status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rt.status === 'requested' && (
                    <>
                      <button onClick={() => act(rt, 'approved')} className="btn-outline !py-1.5 text-sm !border-sky-500/50 !text-sky-500">
                        <Check size={14} /> Approve
                      </button>
                      <button onClick={() => act(rt, 'rejected')} className="btn-outline !py-1.5 text-sm !border-rose-500/50 !text-rose-500">
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                  {(rt.status === 'requested' || rt.status === 'approved') && (
                    <button onClick={() => act(rt, 'refunded')} className="btn-gold !py-1.5 text-sm">
                      <IndianRupee size={14} /> Refund &amp; restock
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

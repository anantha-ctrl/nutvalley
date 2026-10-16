import { useEffect, useState } from 'react';
import { Star, Eye, EyeOff, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner, Empty } from '../components/ui';

export default function AdminReviews() {
  const [reviews, setReviews] = useState(null);
  const [filter, setFilter] = useState('all'); // all | visible | hidden

  const load = () => api.get('/api/admin/reviews').then((r) => setReviews(r.data.data)).catch(() => setReviews([]));
  useEffect(() => { load(); }, []);

  const toggleHide = async (rv) => {
    try {
      try {
        await api.post(`/api/admin/reviews/${rv.id}`, { is_hidden: rv.is_hidden ? 0 : 1, _method: 'PUT' });
      } catch {
        await api.put(`/api/admin/reviews/${rv.id}`, { is_hidden: rv.is_hidden ? 0 : 1 });
      }
      toast.success(rv.is_hidden ? 'Review restored' : 'Review hidden');
      load();
    } catch (e) { toast.error(e.message); }
  };

  const del = async (id) => {
    if (!confirm('Delete this review permanently?')) return;
    try {
      try {
        await api.post(`/api/admin/reviews/${id}/delete`, { _method: 'DELETE' });
      } catch {
        await api.delete(`/api/admin/reviews/${id}`);
      }
      toast.success('Review deleted');
      load();
    } catch (e) { toast.error(e.message); }
  };

  if (!reviews) return <Spinner />;

  const shown = reviews.filter((r) =>
    filter === 'all' ? true : filter === 'visible' ? !r.is_hidden : r.is_hidden);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Reviews</h1>
        <div className="flex gap-2">
          {['all', 'visible', 'hidden'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${filter === f ? 'bg-gold text-ink' : 'border border-black/10 dark:border-white/10'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty icon={Star} title="No reviews" subtitle="Customer reviews will appear here once orders are delivered and rated." />
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r.id} className={`card p-5 ${r.is_hidden ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={15} className={n <= r.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-300 dark:text-gray-600'} />
                      ))}
                    </div>
                    {r.is_hidden === 1 && <span className="rounded bg-rose-500/10 px-2 py-0.5 text-xs text-rose-500">Hidden</span>}
                  </div>
                  {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                  {r.comment && <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{r.comment}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    {r.user_name} · {r.user_email} · on <span className="font-medium">{r.product_name}</span> · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleHide(r)} title={r.is_hidden ? 'Restore' : 'Hide'}
                    className="rounded-lg p-2 hover:bg-gold/10">
                    {r.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => del(r.id)} title="Delete"
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

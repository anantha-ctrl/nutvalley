import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ShoppingCart, AlertTriangle, UserPlus, PackageSearch,
  Check, Undo2, Trash2, CheckCheck,
} from 'lucide-react';
import api from '../api/client';
import { timeAgo } from '../utils/format';

const ICON = {
  order: { Icon: ShoppingCart, color: 'text-blue-500 bg-blue-500/15' },
  stock: { Icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/15' },
  customer: { Icon: UserPlus, color: 'text-emerald-500 bg-emerald-500/15' },
  restock: { Icon: PackageSearch, color: 'text-gold bg-gold/15' },
};

export default function NotificationBell() {
  const [data, setData] = useState({ count: 0, total: 0, items: [] });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  const fetchNotifs = () => {
    if (document.visibilityState !== 'visible') return Promise.resolve();
    return api.get('/api/admin/notifications', { timeout: 5000 })
      .then((r) => setData(r.data.data)).catch(() => {});
  };

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000); // live while the tab is visible
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => { clearInterval(t); document.removeEventListener('mousedown', onClick); };
  }, []);

  const go = (link) => { setOpen(false); navigate(link); };

  // Optimistically update locally, then persist; refetch keeps it in sync.
  const setState = (key, status) => {
    setData((d) => {
      let items = d.items;
      if (status === 'dismissed') {
        items = items.filter((n) => n.key !== key);
      } else {
        items = items.map((n) => (n.key === key ? { ...n, read: status === 'read' } : n));
      }
      const count = items.filter((n) => !n.read).length;
      return { ...d, items, count, total: items.length };
    });
    api.post('/api/admin/notifications/state', { key, status })
      .then(fetchNotifs)
      .catch(fetchNotifs);
  };

  const markAllRead = () => {
    const keys = data.items.filter((n) => !n.read).map((n) => n.key);
    if (!keys.length) return;
    setData((d) => ({ ...d, items: d.items.map((n) => ({ ...n, read: true })), count: 0 }));
    api.post('/api/admin/notifications/read-all', { keys }).then(fetchNotifs).catch(fetchNotifs);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-full p-2 hover:bg-gold/10" aria-label="notifications">
        <Bell size={20} />
        {data.count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {data.count > 9 ? '9+' : data.count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-[60] md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-96">
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-glass dark:border-white/10 dark:bg-ink-soft">
            <div className="flex items-center justify-between gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
              <p className="font-semibold">Notifications</p>
              <div className="flex items-center gap-2">
                {data.count > 0 && (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-500">{data.count} new</span>
                )}
                {data.count > 0 && (
                  <button onClick={markAllRead}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gold transition hover:bg-gold/10"
                    title="Mark all as read">
                    <CheckCheck size={14} /> Mark all
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {data.items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-400">You're all caught up 🎉</p>
              ) : (
                data.items.map((n) => {
                  const { Icon, color } = ICON[n.type] || ICON.order;
                  return (
                    <div key={n.key}
                      className={`group flex items-start gap-3 border-b border-black/5 px-4 py-3 transition last:border-0 dark:border-white/10 ${
                        n.read ? 'opacity-60' : 'bg-gold/[0.04]'
                      }`}>
                      <span className={`mt-0.5 shrink-0 rounded-lg p-2 ${color}`}><Icon size={15} /></span>

                      <button onClick={() => go(n.link)} className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-1.5">
                          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
                          <span className={`block truncate text-sm ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
                        </span>
                        <span className="block truncate text-xs text-gray-400">{n.desc}</span>
                        {n.time && <span className="mt-0.5 block text-[10px] text-gray-400">{timeAgo(n.time)}</span>}
                      </button>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          onClick={() => setState(n.key, n.read ? 'unread' : 'read')}
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-emerald-500/15 hover:text-emerald-500"
                          title={n.read ? 'Mark as unread' : 'Mark as read'}>
                          {n.read ? <Undo2 size={15} /> : <Check size={15} />}
                        </button>
                        <button
                          onClick={() => setState(n.key, 'dismissed')}
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-500/15 hover:text-rose-500"
                          title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

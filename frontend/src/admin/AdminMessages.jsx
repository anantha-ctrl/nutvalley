import { useEffect, useState } from 'react';
import { Mail, MailOpen, Trash2, Reply } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner, Empty } from '../components/ui';

export default function AdminMessages() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all'); // all | unread

  const load = () => api.get('/api/admin/messages').then((r) => setData(r.data.data)).catch(() => setData({ messages: [], unread: 0 }));
  useEffect(() => { load(); }, []);

  // Poll for new messages every 15s in real time
  useEffect(() => {
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const setRead = async (m, read) => {
    try {
      await api.put(`/api/admin/messages/${m.id}`, { is_read: read ? 1 : 0 });
      toast.success(read ? 'Marked as read' : 'Marked as unread');
      load();
    } catch (e) {
      toast.error(e.message || 'Could not update message');
    }
  };

  const del = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      try {
        await api.post(`/api/admin/messages/${id}/delete`, { _method: 'DELETE' });
      } catch {
        await api.delete(`/api/admin/messages/${id}`);
      }
      toast.success('Message deleted');
      load();
    } catch (e) {
      toast.error(e.message || 'Could not delete message');
    }
  };

  if (!data) return <Spinner />;
  const shown = data.messages.filter((m) => (filter === 'unread' ? !m.is_read : true));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">
          Messages {data.unread > 0 && <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-xs text-ink">{data.unread} new</span>}
        </h1>
        <div className="flex gap-2">
          {['all', 'unread'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${filter === f ? 'bg-gold text-ink' : 'border border-black/10 dark:border-white/10'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty icon={Mail} title="No messages" subtitle="Contact form submissions will appear here." />
      ) : (
        <div className="space-y-3">
          {shown.map((m) => (
            <div key={m.id} className={`card p-5 ${m.is_read ? 'opacity-70' : 'border-l-4 border-l-gold'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!m.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />}
                    <p className="font-semibold">{m.subject || 'New message'}</p>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-300 whitespace-pre-wrap">{m.message}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {m.name} · {m.email} · {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message'))}`}
                    title="Reply by email" onClick={() => setRead(m, true)}
                    className="rounded-lg p-2 text-gold hover:bg-gold/10"><Reply size={16} /></a>
                  <button onClick={() => setRead(m, !m.is_read)} title={m.is_read ? 'Mark unread' : 'Mark read'}
                    className="rounded-lg p-2 hover:bg-gold/10">
                    {m.is_read ? <Mail size={16} /> : <MailOpen size={16} />}
                  </button>
                  <button onClick={() => del(m.id)} title="Delete"
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

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner, Checkbox } from '../components/ui';

const blank = { id: null, title: '', subtitle: '', cta_label: '', cta_link: '', image_url: '', sort_order: 0, is_active: 1 };

export default function AdminBanners() {
  const [banners, setBanners] = useState(null);
  const [form, setForm] = useState(blank);
  const [show, setShow] = useState(false);

  const load = () => api.get('/api/admin/banners').then((r) => setBanners(r.data.data)).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(timer);
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('image_url', reader.result);
    reader.readAsDataURL(file);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        try {
          await api.post(`/api/admin/banners/${form.id}`, { ...form, _method: 'PUT' });
        } catch {
          await api.put(`/api/admin/banners/${form.id}`, form);
        }
      } else {
        await api.post('/api/admin/banners', form);
      }
      toast.success('Saved');
      setForm(blank); setShow(false); load();
    } catch (err) { toast.error(err.message); }
  };

  const edit = (b) => { setForm(b); setShow(true); };
  const del = async (id) => {
    if (!confirm('Delete banner?')) return;
    try {
      try {
        await api.post(`/api/admin/banners/${id}/delete`, { _method: 'DELETE' });
      } catch (e1) {
        await api.delete(`/api/admin/banners/${id}`);
      }
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not delete banner');
    }
  };

  if (!banners) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Homepage Banners</h1>
          <p className="text-sm text-gray-400">Manage the hero slider shown on the storefront.</p>
        </div>
        <button onClick={() => { setForm(blank); setShow(true); }} className="btn-gold !py-2 text-sm"><Plus size={16} /> Add Banner</button>
      </div>

      {show && (
        <form onSubmit={save} className="card grid gap-4 p-6 sm:grid-cols-2">
          <input required className="input" placeholder="Title (e.g. Handcrafted Necklaces)" value={form.title} onChange={(e) => set('title', e.target.value)} />
          <input className="input" placeholder="Subtitle (e.g. Premium food & treats)" value={form.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} />
          <input className="input" placeholder="Button label (e.g. Shop Men)" value={form.cta_label || ''} onChange={(e) => set('cta_label', e.target.value)} />
          <input className="input" placeholder="Button link (e.g. /category/men)" value={form.cta_link || ''} onChange={(e) => set('cta_link', e.target.value)} />
          <input className="input sm:col-span-2" placeholder="Image URL" value={typeof form.image_url === 'string' && !form.image_url.startsWith('data:') ? form.image_url : ''} onChange={(e) => set('image_url', e.target.value)} />
          <div className="flex items-center gap-3 sm:col-span-2">
            <label className="btn-outline !py-2 cursor-pointer text-sm"><ImageIcon size={16} /> Upload Image
              <input type="file" accept="image/*" hidden onChange={onFile} />
            </label>
            {form.image_url && <img src={form.image_url} alt="" className="h-12 w-20 rounded-lg object-cover" />}
          </div>
          <input type="number" className="input" placeholder="Sort order" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!Number(form.is_active)} onChange={(e) => set('is_active', e.target.checked ? 1 : 0)} /> Active
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button className="btn-gold">{form.id ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setShow(false)} className="btn-outline">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((b) => (
          <div key={b.id} className="card overflow-hidden">
            <div className="relative aspect-[16/9]">
              <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
              {!b.is_active && <span className="absolute right-2 top-2 rounded-full bg-gray-900/70 px-2 py-0.5 text-xs text-white">Hidden</span>}
            </div>
            <div className="p-4">
              <p className="text-xs uppercase tracking-widest text-gold">{b.subtitle}</p>
              <p className="font-semibold">{b.title}</p>
              <p className="mt-1 text-xs text-gray-400">{b.cta_label} → {b.cta_link}</p>
              <div className="mt-3 flex gap-1">
                <button onClick={() => edit(b)} className="rounded-lg p-2 hover:bg-gold/10"><Pencil size={16} /></button>
                <button onClick={() => del(b.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

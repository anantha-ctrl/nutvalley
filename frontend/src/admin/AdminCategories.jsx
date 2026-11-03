import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ImagePlus, X, Link2, EyeOff, Search, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner, Checkbox } from '../components/ui';

const BLANK = { id: null, name: '', description: '', image_url: '', parent_id: '', is_active: 1 };
const isImageUrl = (v) => /^https?:\/\/\S+$/i.test(v) || /^data:image\//i.test(v);
// placehold.co images are seed placeholders, not real photos — show the branded tile instead.
const hasPhoto = (v) => !!v && !/placehold\.co/i.test(v);
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const Stat = ({ label, value }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3.5 py-1.5 shadow-sm dark:border-white/10 dark:bg-white/5">
    <b className="font-display text-base text-forest dark:text-white">{value}</b>
    <span className="text-gray-400">{label}</span>
  </span>
);

/**
 * Scale an uploaded photo down to fit 900×1200 (never up) and re-encode as WebP
 * (JPEG fallback) so the stored image stays small. Category cards on the store
 * are shown in a 3:4 portrait arch frame.
 */
function prepareImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, 900 / img.naturalWidth, 1200 / img.naturalHeight);
        if (scale === 1 && file.size < 400 * 1024) { resolve(reader.result); return; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let url = canvas.toDataURL('image/webp', 0.85);
        if (!url.startsWith('data:image/webp')) {
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          url = canvas.toDataURL('image/jpeg', 0.85);
        }
        resolve(url);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminCategories() {
  const [cats, setCats] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [urlInput, setUrlInput] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  const load = () => api.get('/api/admin/categories').then((r) => setCats(r.data.data)).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(timer);
  }, []);

  const open = (data) => {
    setForm(data);
    setUrlInput(data.image_url && /^https?:/i.test(data.image_url) ? data.image_url : '');
    setShow(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.image_url && !isImageUrl(form.image_url)) { toast.error('Image URL must start with http:// or https://'); return; }
    setSaving(true);
    try {
      if (form.id) {
        try {
          await api.post(`/api/admin/categories/${form.id}`, { ...form, _method: 'PUT' });
        } catch {
          await api.put(`/api/admin/categories/${form.id}`, form);
        }
      } else {
        await api.post('/api/admin/categories', form);
      }
      toast.success(form.id ? 'Category updated' : 'Category created');
      setShow(false); setForm(BLANK); setUrlInput('');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image too large (max 10 MB)'); return; }
    try {
      const url = await prepareImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      setUrlInput('');
    } catch {
      toast.error('Could not read that image');
    }
  };

  const applyUrl = () => {
    const v = urlInput.trim();
    if (!v) return;
    if (!/^https?:\/\/\S+$/i.test(v)) { toast.error('Paste a full image link starting with http:// or https://'); return; }
    setForm((f) => ({ ...f, image_url: v }));
  };

  const edit = (c) => open({
    id: c.id, name: c.name, description: c.description || '', image_url: c.image_url || '',
    parent_id: c.parent_id || '', is_active: c.is_active != null ? Number(c.is_active) : 1,
  });

  const del = async (id) => {
    if (!confirm('Delete category? Products in it will be removed.')) return;
    try {
      try {
        await api.post(`/api/admin/categories/${id}/delete`, { _method: 'DELETE' });
      } catch (e1) {
        await api.delete(`/api/admin/categories/${id}`);
      }
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete category');
    }
  };

  if (!cats) return <Spinner />;

  const term = q.trim().toLowerCase();
  const shown = term
    ? cats.filter((c) => `${c.name} ${c.slug} ${c.description || ''}`.toLowerCase().includes(term))
    : cats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Categories</h1>
          <p className="text-sm text-gray-400">Shown on the home page "Shop by category" and in the store menu</p>
        </div>
        <button onClick={() => open(BLANK)} className="btn-gold !py-2 text-sm"><Plus size={16} /> Add</button>
      </div>

      {show && (
        <form onSubmit={save} className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{form.id ? `Edit “${form.name}”` : 'New category'}</h2>
            <button type="button" onClick={() => setShow(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close"><X size={18} /></button>
          </div>

          <div className="grid gap-6 md:grid-cols-[200px_1fr]">
            {/* Image — 3:4 preview, upload from device or paste a link */}
            <div>
              <p className="mb-1.5 text-sm text-gray-400">Image</p>
              <div className="relative aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-b-xl rounded-t-full border border-black/10 bg-cream dark:border-white/10 dark:bg-white/5">
                {form.image_url ? (
                  <>
                    <img src={form.image_url} alt="Category" className="h-full w-full object-cover"
                      onError={() => toast.error('That image could not be loaded — check the link')} />
                    <button type="button" onClick={() => { setForm({ ...form, image_url: '' }); setUrlInput(''); }}
                      className="absolute bottom-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-rose-500" aria-label="Remove image">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 text-gold hover:bg-gold/5">
                    <ImagePlus size={22} />
                    <span className="text-xs font-semibold">Upload</span>
                    <span className="text-[10px] text-gray-400">3:4 portrait</span>
                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                  </label>
                )}
              </div>
              {form.image_url && (
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-gold hover:underline">
                  <ImagePlus size={13} /> Replace image
                  <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                </label>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Name *</label>
                <input required className="input" placeholder="e.g. Almonds" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Image URL</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="url" className="input pl-10" placeholder="https://… paste an image link"
                      value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                      onBlur={applyUrl}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }} />
                  </div>
                  <button type="button" onClick={applyUrl} className="btn-outline !px-4 !py-2 text-sm">Use</button>
                </div>
                <p className="mt-1 text-xs text-gray-400">Upload from your device or paste a link — portrait 3:4 (e.g. 900 × 1200 px) looks best.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Parent category</label>
                  <select className="input" value={form.parent_id}
                    onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                    <option value="">Top-level (no parent)</option>
                    {cats.filter((c) => c.id !== form.id).map((c) => (
                      <option key={c.id} value={c.id}>Under: {c.name}</option>
                    ))}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 self-end pb-3 text-sm">
                  <Checkbox checked={!!Number(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} />
                  Show on store
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Description</label>
                <textarea rows={3} className="input" placeholder="Short line shown with the category"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="flex gap-3">
                <button disabled={saving} className="btn-gold">{saving ? 'Saving…' : form.id ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShow(false)} className="btn-outline">Cancel</button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Summary + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 text-sm">
          <Stat label="Categories" value={cats.length} />
          <Stat label="Live on store" value={cats.filter((c) => Number(c.is_active)).length} />
          <Stat label="Products" value={cats.reduce((s, c) => s + (Number(c.product_count) || 0), 0)} />
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input !py-2.5 pl-10 text-sm" placeholder="Search categories…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {shown.map((c) => {
          const count = Number(c.product_count) || 0;
          const active = !!Number(c.is_active);
          return (
            <div key={c.id} className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-luxe-sm dark:border-white/10 dark:bg-white/5">
              {/* Cover — real photo, or a branded tile when it's only a placeholder */}
              <div className="relative aspect-[16/10] overflow-hidden">
                {hasPhoto(c.image_url) ? (
                  <img src={c.image_url} alt={c.name} loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="relative flex h-full w-full flex-col items-center justify-center bg-hero-gradient text-center">
                    <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-gold/20 blur-2xl" />
                    <span className="font-display text-5xl font-bold text-gold">{initials(c.name)}</span>
                    <span className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/60">No photo yet</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${active
                  ? 'bg-white/95 text-forest' : 'bg-gray-900/80 text-white'}`}>
                  {active ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live</> : <><EyeOff size={12} /> Hidden</>}
                </span>
                <span className="absolute bottom-3 right-3 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm">
                  {count > 0 ? `${count} product${count === 1 ? '' : 's'}` : 'Empty'}
                </span>
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <h3 className="truncate font-display text-lg font-bold">{c.name}</h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    /{c.slug}{c.parent_name ? ` · under ${c.parent_name}` : ''}
                  </p>
                  <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-gray-500 dark:text-gray-300">
                    {c.description || <span className="italic text-gray-400">No description</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2 border-t border-black/5 pt-3 dark:border-white/10">
                  <button onClick={() => edit(c)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-forest/5 px-3 py-2 text-sm font-semibold text-forest transition hover:bg-forest hover:text-white dark:bg-white/10 dark:text-white">
                    <Pencil size={15} /> Edit
                  </button>
                  <a href={`/category/${c.slug}`} target="_blank" rel="noreferrer" title="View on store" aria-label={`View ${c.name} on store`}
                    className="rounded-xl p-2.5 text-gray-500 transition hover:bg-gold/10 hover:text-gold">
                    <ExternalLink size={16} />
                  </a>
                  <button onClick={() => del(c.id)} title="Delete" aria-label={`Delete ${c.name}`}
                    className="rounded-xl p-2.5 text-rose-500 transition hover:bg-rose-500/10">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Quick "add" tile at the end of the grid */}
        {!q && (
          <button onClick={() => open(BLANK)}
            className="flex min-h-[18rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold/40 text-gold transition hover:border-gold hover:bg-gold/5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10"><Plus size={22} /></span>
            <span className="font-semibold">Add category</span>
          </button>
        )}
        {q && shown.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-gray-400">No categories match “{q}”.</p>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner, Checkbox } from '../components/ui';

const blank = {
  name: '', category_id: '', brand: '', description: '', price: '', mrp: '',
  stock: 0, low_stock_alert: 5, is_featured: 0, is_trending: 0, is_active: 1,
  is_returnable: 1, is_free_shipping: 1, shipping_fee: 0,
};

export default function AdminProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(blank);
  const [images, setImages] = useState([]); // {url}
  const dragImg = useRef(null);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    api.get('/api/admin/categories').then((r) => setCats(r.data.data)).catch(() => {});
    if (editing) {
      // Load product via admin list; fetch single via public slug not available by id, so use list.
      api.get('/api/admin/products').then((r) => {
        const p = r.data.data.find((x) => String(x.id) === String(id));
        if (p) {
          setForm({
            name: p.name, category_id: '', brand: p.brand || '', description: '', price: p.price,
            mrp: p.mrp, stock: p.stock, low_stock_alert: p.low_stock_alert ?? 5,
            is_featured: p.is_featured, is_trending: p.is_trending, is_active: p.is_active,
            is_returnable: p.is_returnable != null ? p.is_returnable : 1,
            is_free_shipping: p.is_free_shipping != null ? p.is_free_shipping : 1,
            shipping_fee: p.shipping_fee || 0,
          });
          // Pull full detail (category, description, images) from public endpoint
          api.get(`/api/products/${p.slug}`).then((d) => {
            const f = d.data.data;
            setForm((s) => ({
              ...s,
              category_id: f.category_id,
              description: f.description || '',
              is_free_shipping: f.is_free_shipping != null ? f.is_free_shipping : (f.shipping_fee > 0 ? 0 : 1),
              shipping_fee: f.shipping_fee || 0,
            }));
            setImages((f.images || []).map((i) => ({ url: i.image_url })));
          }).catch(() => {});
        } else {
          toast.error('Product not found');
        }
        setLoading(false);
      }).catch(() => { setLoading(false); });
    }
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const files = [...e.target.files];
    e.target.value = ''; // allow picking the same file again
    for (const file of files) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name}: not an image`); continue; }
      try {
        const img = await prepareImage(file);
        setImages((prev) => [...prev, img]);
        if (!img.ok) {
          toast(`${file.name} is ${img.w}×${img.h} — not 3:4 portrait, so the shop will crop its edges.`, { icon: '⚠️', duration: 6000 });
        }
      } catch {
        toast.error(`${file.name}: could not read image`);
      }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      images: images.map((i) => i.url),
    };
    try {
      const currentUser = JSON.parse(localStorage.getItem('cf_user') || 'null');
      if (currentUser?.role !== 'admin') {
        throw new Error('Admin permission required. Please sign in with an admin account.');
      }
      if (editing) {
        try {
          await api.post(`/api/admin/products/${id}`, { ...payload, _method: 'PUT' });
        } catch {
          await api.put(`/api/admin/products/${id}`, payload);
        }
      } else {
        await api.post('/api/admin/products', payload);
      }
      toast.success(editing ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <Spinner />;

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold">{editing ? 'Edit' : 'New'} Product</h1>

      <div className="card space-y-4 p-6">
        <Field label="Name"><input required className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select required className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">Select…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand"><input className="input" value={form.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
        </div>
        <Field label="Description"><textarea rows={3} className="input" value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Price (₹)"><input type="number" required className="input" value={form.price} onChange={(e) => set('price', e.target.value)} /></Field>
          <Field label="MRP (₹)"><input type="number" required className="input" value={form.mrp} onChange={(e) => set('mrp', e.target.value)} /></Field>
          <Field label="Stock"><input type="number" className="input" value={form.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
          <Field label="Low-stock at"><input type="number" className="input" value={form.low_stock_alert} onChange={(e) => set('low_stock_alert', e.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Toggle label="Active" v={form.is_active} on={(v) => set('is_active', v)} />
          <Toggle label="Featured" v={form.is_featured} on={(v) => set('is_featured', v)} />
          <Toggle label="Trending" v={form.is_trending} on={(v) => set('is_trending', v)} />
          <Toggle label="Returnable" v={form.is_returnable} on={(v) => set('is_returnable', v)} />
          <Toggle label="Free Shipping" v={form.is_free_shipping} on={(v) => set('is_free_shipping', v)} />
        </div>
        {!form.is_free_shipping && (
          <div className="max-w-xs pt-1">
            <Field label="Custom Shipping Fee (₹)">
              <input type="number" min="0" className="input" placeholder="e.g. 49" value={form.shipping_fee} onChange={(e) => set('shipping_fee', e.target.value)} />
            </Field>
          </div>
        )}
        <p className="text-xs text-gray-400">
          Turn <b>Free Shipping</b> on for items delivered free. If turned off, you can set a custom shipping fee (₹) for this product or rely on the store base fee.
        </p>
      </div>

      {/* Images */}
      <div className="card space-y-3 p-6">
        <h3 className="font-semibold">Images</h3>
        <p className="text-xs text-gray-400">
          Upload <b>3:4 portrait</b> images — ideally <b>1200 × 1600 px</b> (JPG / PNG / WebP) with the jewellery
          centred on a plain background. The shop shows every product photo in 3:4, so other shapes get their edges
          cropped (the billing counter also crops to a square). Large photos are resized automatically.
          Drag to reorder — the first image is the primary.
        </p>
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={i} draggable
              onDragStart={() => (dragImg.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const from = dragImg.current;
                if (from == null || from === i) return;
                const next = [...images];
                const [moved] = next.splice(from, 1);
                next.splice(i, 0, moved);
                setImages(next);
                dragImg.current = null;
              }}
              className="relative aspect-[3/4] w-24 cursor-grab active:cursor-grabbing">
              <img src={img.url} className="h-full w-full rounded-lg object-cover" alt="" />
              {img.ok === false && (
                <span title={`${img.w}×${img.h} — not 3:4, edges will be cropped in the shop`}
                  className="absolute left-1 top-1 rounded bg-amber-500/90 px-1 text-[9px] font-bold text-white">NOT 3:4</span>
              )}
              {i === 0 && <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gold/90 py-0.5 text-center text-[9px] font-bold text-ink">PRIMARY</span>}
              <button type="button" onClick={() => setImages(images.filter((_, x) => x !== i))}
                className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white"><X size={12} /></button>
            </div>
          ))}
          <label className="flex aspect-[3/4] w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gold/40 text-gold">
            <Plus /><span className="text-[10px] font-semibold">3:4</span>
            <input type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
          </label>
        </div>
        <input className="input text-sm" placeholder="…or paste an image URL and press Enter"
          onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value) { e.preventDefault(); setImages([...images, { url: e.target.value }]); e.target.value = ''; } }} />
      </div>

      <div className="flex gap-3">
        <button className="btn-gold">{editing ? 'Update Product' : 'Create Product'}</button>
        <button type="button" onClick={() => navigate('/admin/products')} className="btn-outline">Cancel</button>
      </div>
    </form>
  );
}

const Field = ({ label, children }) => (<div><label className="mb-1 block text-sm text-gray-400">{label}</label>{children}</div>);
const Toggle = ({ label, v, on }) => (
  <label className="flex cursor-pointer items-center gap-2">
    <Checkbox checked={!!Number(v)} onChange={(e) => on(e.target.checked ? 1 : 0)} /> {label}
  </label>
);

// Product photos are shown 3:4 portrait across the shop (cards, product page, quick view).
const MAX_W = 1200, MAX_H = 1600, RATIO = 3 / 4, RATIO_TOLERANCE = 0.03;

/**
 * Reads an uploaded photo, scales it down to fit 1200×1600 (never up) and re-encodes it
 * (WebP, or JPEG on a white background where WebP encoding isn't supported) so the
 * data-URI stored with the product stays small. Returns { url, w, h, ok } where `ok`
 * says whether the ORIGINAL photo is ~3:4 portrait.
 */
function prepareImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        const ok = Math.abs(w / h - RATIO) <= RATIO_TOLERANCE;
        const scale = Math.min(1, MAX_W / w, MAX_H / h);
        if (scale === 1 && file.size < 400 * 1024) { resolve({ url: reader.result, w, h, ok }); return; }

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let url = canvas.toDataURL('image/webp', 0.85);
        if (!url.startsWith('data:image/webp')) { // no WebP encoder: flatten onto white, use JPEG
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          url = canvas.toDataURL('image/jpeg', 0.85);
        }
        resolve({ url, w, h, ok });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

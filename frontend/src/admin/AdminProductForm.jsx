import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Plus, Trash2, X } from 'lucide-react';
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
  const [variants, setVariants] = useState([]); // {qty, unit, pack, price, mrp, stock}
  const dragImg = useRef(null);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    api.get('/api/admin/categories').then((r) => setCats(r.data.data)).catch(() => {});
    if (editing) {
      // Admin endpoint returns the full product (inactive ones too) with images + variants.
      api.get(`/api/admin/products/${id}`).then((r) => {
        const p = r.data.data;
        setForm({
          name: p.name, category_id: p.category_id, brand: p.brand || '', description: p.description || '',
          price: p.price, mrp: p.mrp, stock: p.stock, low_stock_alert: p.low_stock_alert ?? 5,
          is_featured: p.is_featured, is_trending: p.is_trending, is_active: p.is_active,
          is_returnable: p.is_returnable != null ? p.is_returnable : 1,
          is_free_shipping: p.is_free_shipping != null ? p.is_free_shipping : (p.shipping_fee > 0 ? 0 : 1),
          shipping_fee: p.shipping_fee || 0,
        });
        setImages((p.images || []).map((url) => ({ url })));
        setVariants((p.variants || []).map(fromVariant));
        setLoading(false);
      }).catch(() => { toast.error('Product not found'); setLoading(false); });
    }
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setVariant = (i, k, v) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const addVariant = () => setVariants((vs) => {
    // Suggest the next common pack size after the last row.
    const next = PRESETS[vs.length] || { qty: '', unit: 'g' };
    return [...vs, { ...next, pack: '', price: '', mrp: '', stock: '' }];
  });
  const removeVariant = (i) => setVariants((vs) => vs.filter((_, j) => j !== i));

  // With variants, the product's own price / MRP / stock come from them:
  // the cheapest pack is the "from" price shown on cards, stock is the total.
  const filled = variants.filter((v) => v.qty !== '' && v.price !== '');
  const derived = filled.length > 0 && (() => {
    const cheapest = filled.reduce((a, b) => (Number(b.price) < Number(a.price) ? b : a));
    return {
      price: cheapest.price,
      mrp: cheapest.mrp !== '' ? cheapest.mrp : cheapest.price,
      stock: filled.reduce((s, v) => s + (Number(v.stock) || 0), 0),
    };
  })();

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
    const rows = variants.filter((v) => v.qty !== '' || v.price !== '');
    const bad = rows.find((v) => !(Number(v.qty) > 0) || !(Number(v.price) > 0));
    if (bad) { toast.error('Each variant needs a size and a price.'); return; }
    if (rows.some((v) => v.mrp !== '' && Number(v.mrp) < Number(v.price))) {
      toast.error('Variant MRP cannot be lower than its price.'); return;
    }
    const labels = rows.map(variantLabel);
    if (new Set(labels).size !== labels.length) { toast.error('Two variants have the same size and pack.'); return; }

    const payload = {
      ...form,
      ...(derived || {}),
      images: images.map((i) => i.url),
      variants: rows.map((v) => ({
        size: variantLabel(v),
        price: v.price,
        mrp: v.mrp === '' ? null : v.mrp,
        stock: Number(v.stock) || 0,
      })),
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
          <Field label="Price (₹)"><input type="number" required className="input disabled:opacity-60" disabled={!!derived}
            value={derived ? derived.price : form.price} onChange={(e) => set('price', e.target.value)} /></Field>
          <Field label="MRP (₹)"><input type="number" required className="input disabled:opacity-60" disabled={!!derived}
            value={derived ? derived.mrp : form.mrp} onChange={(e) => set('mrp', e.target.value)} /></Field>
          <Field label="Stock"><input type="number" className="input disabled:opacity-60" disabled={!!derived}
            value={derived ? derived.stock : form.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
          <Field label="Low-stock at"><input type="number" className="input" value={form.low_stock_alert} onChange={(e) => set('low_stock_alert', e.target.value)} /></Field>
        </div>
        {derived && (
          <p className="-mt-1 text-xs text-gray-400">
            Price, MRP and stock are filled from the <b>variants</b> below — the cheapest pack is the "from" price, stock is the total.
          </p>
        )}
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

      {/* Variants — pack sizes, each with its own price / MRP / stock */}
      <div className="card space-y-3 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Variants <span className="font-normal text-gray-400">(Size / Pack / Price / MRP)</span></h3>
          <button type="button" onClick={addVariant} className="btn-outline !px-4 !py-2 text-sm"><Plus size={16} /> Add variant</button>
        </div>
        <p className="text-xs text-gray-400">
          Add one row per pack the customer can choose — e.g. <b>250 g</b>, <b>500 g</b>, <b>1 kg</b>. <b>Pack</b> is optional
          (Pouch, Jar, Gift Box, Pack of 2…). Leave MRP empty to use the price (no discount shown).
        </p>

        {variants.length === 0 ? (
          <button type="button" onClick={addVariant}
            className="w-full rounded-xl border-2 border-dashed border-gold/40 py-6 text-sm font-semibold text-gold transition hover:bg-gold/5">
            + Add the first pack size
          </button>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[1.4fr_1.4fr_1fr_1fr_0.8fr_auto] gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400 sm:grid">
              <span>Size</span><span>Pack</span><span>Price (₹)</span><span>MRP (₹)</span><span>Stock</span><span className="w-9" />
            </div>
            {variants.map((v, i) => {
              const off = Number(v.mrp) > Number(v.price) && Number(v.price) > 0
                ? Math.round((1 - Number(v.price) / Number(v.mrp)) * 100) : 0;
              return (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-black/5 p-2 sm:grid-cols-[1.4fr_1.4fr_1fr_1fr_0.8fr_auto] sm:border-0 sm:p-0">
                  <div className="flex">
                    <input type="number" min="0" step="any" className="input rounded-r-none" placeholder="500" aria-label="Size"
                      value={v.qty} onChange={(e) => setVariant(i, 'qty', e.target.value)} />
                    <select className="input w-20 shrink-0 rounded-l-none border-l-0 !pr-7" aria-label="Unit"
                      value={v.unit} onChange={(e) => setVariant(i, 'unit', e.target.value)}>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                  <input className="input" list="nv-pack-types" placeholder="e.g. Pouch" aria-label="Pack"
                    value={v.pack} onChange={(e) => setVariant(i, 'pack', e.target.value)} />
                  <input type="number" min="0" step="any" className="input" placeholder="Price" aria-label="Price"
                    value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} />
                  <div className="relative">
                    <input type="number" min="0" step="any" className="input" placeholder="MRP" aria-label="MRP"
                      value={v.mrp} onChange={(e) => setVariant(i, 'mrp', e.target.value)} />
                    {off > 0 && <span className="absolute -top-2 right-2 rounded bg-gold px-1 text-[10px] font-bold text-ink">-{off}%</span>}
                  </div>
                  <input type="number" min="0" className="input" placeholder="Stock" aria-label="Stock"
                    value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} />
                  <button type="button" onClick={() => removeVariant(i)} title="Remove variant" aria-label="Remove variant"
                    className="flex h-full min-h-[44px] w-9 items-center justify-center justify-self-end rounded-lg text-rose-500 transition hover:bg-rose-500/10">
                    <Trash2 size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <datalist id="nv-pack-types">
          {PACK_TYPES.map((t) => <option key={t} value={t} />)}
        </datalist>
      </div>

      {/* Images */}
      <div className="card space-y-3 p-6">
        <h3 className="font-semibold">Images</h3>
        <p className="text-xs text-gray-400">
          Upload <b>3:4 portrait</b> images — ideally <b>1200 × 1600 px</b> (JPG / PNG / WebP) with the product
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
        {images.length > 0 && (
          <div className="space-y-1.5">
            {images.map((img, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-16 shrink-0 font-semibold text-gray-500">{i === 0 ? 'Primary' : `Image ${i + 1}`}</span>
                {img.url.startsWith('data:') ? (
                  <span className="text-gray-400">New upload — gets its Cloudinary URL when you save the product.</span>
                ) : (
                  <>
                    <input readOnly value={img.url} onFocus={(e) => e.target.select()} className="input py-1.5 text-xs" />
                    <button type="button" title="Copy URL"
                      onClick={() => navigator.clipboard.writeText(img.url).then(() => toast.success('URL copied'), () => {})}
                      className="shrink-0 rounded-lg p-2 text-gold hover:bg-gold/10"><Copy size={14} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
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

// ── Variants (pack sizes) ──
// Stored in product_variants.size as one label the shop shows on its pack chips,
// e.g. "500 g" or "1 kg · Jar". Parsed back into qty / unit / pack for editing.
const PRESETS = [{ qty: '250', unit: 'g' }, { qty: '500', unit: 'g' }, { qty: '1', unit: 'kg' }];
const PACK_TYPES = ['Pouch', 'Jar', 'Box', 'Gift Box', 'Pack of 2', 'Pack of 3', 'Pack of 5'];

const variantLabel = (v) => `${Number(v.qty)} ${v.unit}${v.pack.trim() ? ` · ${v.pack.trim()}` : ''}`;

function fromVariant(row) {
  const m = String(row.size || '').match(/^\s*([\d.]+)\s*(kg|g)\b\s*(?:[·x×\-|]\s*)?(.*)$/i);
  return {
    qty: m ? m[1] : '',
    unit: m ? m[2].toLowerCase() : 'g',
    pack: m ? m[3].trim() : String(row.size || ''),
    price: row.price != null ? String(Number(row.price)) : '',
    mrp: row.mrp != null ? String(Number(row.mrp)) : '',
    stock: row.stock != null ? String(row.stock) : '',
  };
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

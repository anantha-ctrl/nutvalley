import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Download, Upload, FileSpreadsheet, Eye, EyeOff, QrCode, X, Printer, Filter } from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr } from '../utils/format';
import { exportCsv, exportExcel, exportPdf, parseCsv } from '../utils/csv';
import { Spinner, Checkbox } from '../components/ui';

const NO_FILTERS = { category: '', status: '', stock: '', tag: '' };

export default function AdminProducts() {
  const [products, setProducts] = useState(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const [qrProduct, setQrProduct] = useState(null); // product whose QR label is open
  const [exportOpen, setExportOpen] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get('/api/admin/products').then((r) => { setProducts(r.data.data); }).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(timer);
  }, []);

  // ---- CSV bulk upload ----
  // Same fields as the Add Product form (incl. pack-size variants). Rows whose name
  // matches an existing product update it on upload, so the sheet also bulk-edits.
  const TEMPLATE_COLS = [
    'name', 'category', 'variants', 'price', 'mrp', 'stock', 'low_stock_alert', 'brand', 'description',
    'specifications', 'images', 'active', 'featured', 'trending', 'returnable', 'free_shipping', 'shipping_fee',
  ];
  const downloadTemplate = () => {
    exportCsv('nutvalley-products-template', [
      {
        // With variants, price / mrp / stock are filled from the packs (cheapest price, total stock).
        name: 'California Almonds', category: 'Almonds',
        variants: '250 g = 299 / 399 / 20 | 500 g = 549 / 699 / 15 | 1 kg = 999 / 1299 / 10',
        price: '', mrp: '', stock: '', low_stock_alert: '5',
        brand: 'NutValley', description: 'Premium crunchy California almonds, packed fresh.',
        specifications: 'Origin: California | Shelf life: 6 months | Storage: Cool & dry place',
        images: 'https://your-site.com/images/almonds-1.jpg | https://your-site.com/images/almonds-2.jpg',
        active: 'yes', featured: 'yes', trending: 'no', returnable: 'yes', free_shipping: 'yes', shipping_fee: '',
      },
      {
        name: 'Medjool Dates', category: 'Dates',
        variants: '500 g · Box = 499 / 649 / 30 | 1 kg · Gift Box = 949 / 1199 / 12',
        price: '', mrp: '', stock: '', low_stock_alert: '5',
        brand: 'NutValley', description: 'Soft, caramel-sweet Medjool dates.',
        specifications: 'Origin: Jordan',
        images: 'https://your-site.com/images/medjool.jpg',
        active: 'yes', featured: 'no', trending: 'yes', returnable: 'no', free_shipping: 'no', shipping_fee: '49',
      },
      {
        // No variants: a single price / mrp / stock.
        name: 'Chia Seeds 250g', category: 'Seeds', variants: '', price: '349', mrp: '399', stock: '30', low_stock_alert: '',
        brand: '', description: '', specifications: '', images: '',
        active: '', featured: '', trending: '', returnable: '', free_shipping: '', shipping_fee: '',
      },
    ], TEMPLATE_COLS);
    toast('Variants: "size = price / mrp / stock", separate packs with "|". Leave price/mrp/stock empty when variants are filled.', { icon: '📄', duration: 8000 });
  };

  const onFilePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) { toast.error('CSV is empty or has no data rows'); return; }
      const { data } = await api.post('/api/admin/products/import', { rows });
      const { created, updated, failed, errors, new_categories } = data.data;
      if (created) toast.success(`${created} new product(s) added`);
      if (updated) toast.success(`${updated} existing product(s) updated`);
      if (new_categories?.length) toast(`New categor${new_categories.length > 1 ? 'ies' : 'y'} created: ${new_categories.join(', ')}`, { icon: '🏷️' });
      if (failed) toast.error(`${failed} row(s) skipped${errors?.[0] ? ` — e.g. ${errors[0]}` : ''}`);
      if (!created && !updated && !failed) toast('Nothing to import');
      load();
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      try {
        await api.post(`/api/admin/products/${id}/delete`, { _method: 'DELETE' });
      } catch (e1) {
        await api.delete(`/api/admin/products/${id}`);
      }
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete product');
    }
  };

  const bulk = async (action) => {
    if (action === 'delete' && !confirm(`Delete ${selected.length} product(s)?`)) return;
    try {
      const { data } = await api.post('/api/admin/products/bulk', { ids: selected, action });
      toast.success(`${data.data.affected} product(s) updated`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  if (!products) return <Spinner />;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const isFreeShip = (p) => Number(p.is_free_shipping ?? (p.shipping_fee > 0 ? 0 : 1)) === 1;
  const stockState = (p) => (Number(p.stock) <= 0 ? 'out' : Number(p.stock) <= Number(p.low_stock_alert ?? 5) ? 'low' : 'in');
  const filtered = products.filter((p) => {
    const term = q.trim().toLowerCase();
    if (term && !`${p.name} ${p.brand || ''} ${p.category || ''}`.toLowerCase().includes(term)) return false;
    if (filters.category && p.category !== filters.category) return false;
    if (filters.status === 'active' && !Number(p.is_active)) return false;
    if (filters.status === 'hidden' && Number(p.is_active)) return false;
    if (filters.stock && stockState(p) !== filters.stock) return false;
    if (filters.tag === 'featured' && !Number(p.is_featured)) return false;
    if (filters.tag === 'trending' && !Number(p.is_trending)) return false;
    if (filters.tag === 'free_ship' && !isFreeShip(p)) return false;
    if (filters.tag === 'paid_ship' && isFreeShip(p)) return false;
    if (filters.tag === 'returnable' && !Number(p.is_returnable)) return false;
    if (filters.tag === 'no_return' && Number(p.is_returnable)) return false;
    return true;
  });
  const filterCount = Object.values(filters).filter(Boolean).length;
  const setFilter = (key) => (e) => { setFilters((f) => ({ ...f, [key]: e.target.value })); setSelected([]); };
  const allSelected = filtered.length > 0 && filtered.every((p) => selected.includes(p.id));
  const toggleAll = () => setSelected(allSelected ? [] : filtered.map((p) => p.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const exportRows = () => filtered.map((p) => ({ // exports what the filters show
      id: p.id, name: p.name, brand: p.brand, category: p.category,
      price: p.price, mrp: p.mrp, stock: p.stock, sold: p.sold_count, active: p.is_active ? 'yes' : 'no',
      returnable: Number(p.is_returnable) ? 'yes' : 'no',
    }));
  const exportColumns = [
    { key: 'id', label: 'ID' }, { key: 'name', label: 'Product' }, { key: 'brand', label: 'Brand' },
    { key: 'category', label: 'Category' }, { key: 'price', label: 'Price' }, { key: 'mrp', label: 'MRP' },
    { key: 'stock', label: 'Stock' }, { key: 'sold', label: 'Sold' }, { key: 'active', label: 'Active' },
    { key: 'returnable', label: 'Returnable' },
  ];
  const doExport = (format) => {
    const rows = exportRows();
    if (!rows.length) { toast.error('No products to export'); return; }
    if (format === 'excel') exportExcel('products', rows, exportColumns);
    else if (format === 'pdf') exportPdf('Products', rows, exportColumns);
    else exportCsv('products', rows, exportColumns);
    setExportOpen(false);
  };

  // Generate every product's QR onto ONE printable sheet — no downloading one
  // label at a time. `list` = the products to label (all filtered, or selected).
  const printQrLabels = async (list) => {
    if (!list.length) { toast.error('No products to label'); return; }
    const t = toast.loading(`Generating ${list.length} QR label(s)…`);
    try {
      const labels = await Promise.all(list.map(async (p) => ({
        ...p,
        dataUrl: await QRCode.toDataURL(`${window.location.origin}/product/${p.slug}`,
          { width: 320, margin: 1, errorCorrectionLevel: 'M' }),
      })));
      const w = window.open('', '_blank', 'width=900,height=1000');
      if (!w) { toast.error('Allow pop-ups to print'); return; }
      const cards = labels.map((p) => `
        <div class="label">
          <img src="${p.dataUrl}" alt="QR">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="price">${escapeHtml(inr(p.price))}</div>
          <div class="slug">${escapeHtml(p.slug)}</div>
        </div>`).join('');
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR Labels (${labels.length})</title>
        <style>
          *{font-family:'Segoe UI',Arial,sans-serif;box-sizing:border-box}
          body{margin:0;padding:12px}
          .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
          .label{text-align:center;border:1px solid #ddd;border-radius:10px;padding:12px;page-break-inside:avoid;width:280px}
          img{width:150px;height:150px}
          .name{font-weight:700;font-size:12px;margin:6px 0 2px;line-height:1.2}
          .price{color:#9c7414;font-weight:700;font-size:13px}
          .slug{color:#999;font-size:9px;margin-top:3px;word-break:break-all}
          @media print{@page{margin:10mm}}
        </style></head><body onload="window.print()">
        <div class="grid">${cards}</div>
        </body></html>`);
      w.document.close();
    } catch {
      toast.error('Could not generate QR labels');
    } finally {
      toast.dismiss(t);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFilePicked} className="hidden" />
          <button onClick={downloadTemplate} className="btn-outline !py-2 text-sm" title="Download a sample CSV to fill in">
            <FileSpreadsheet size={16} /> Template
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-outline !py-2 text-sm disabled:opacity-50">
            <Upload size={16} /> {importing ? 'Importing…' : 'Bulk Upload'}
          </button>
          <div className="relative">
            <button onClick={() => setExportOpen((open) => !open)} className="btn-outline !py-2 text-sm" aria-haspopup="menu" aria-expanded={exportOpen}>
              <Download size={16} /> Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 z-20 mt-2 min-w-36 overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-gray-900" role="menu">
                <button onClick={() => doExport('excel')} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gold/10" role="menuitem">Excel (.xls)</button>
                <button onClick={() => doExport('pdf')} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gold/10" role="menuitem">PDF (Print)</button>
                <button onClick={() => doExport('csv')} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gold/10" role="menuitem">CSV (.csv)</button>
              </div>
            )}
          </div>
          <button onClick={() => printQrLabels(filtered)} className="btn-outline !py-2 text-sm" title="Print QR labels for all products">
            <QrCode size={16} /> QR Labels
          </button>
          <Link to="/admin/products/new" className="btn-gold !py-2 text-sm"><Plus size={16} /> Add Product</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="input !py-2 pl-9 text-sm" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-400"><Filter size={15} /> Filter</div>
        <select className="input !w-auto !py-2 text-sm" value={filters.category} onChange={setFilter('category')} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input !w-auto !py-2 text-sm" value={filters.status} onChange={setFilter('status')} aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>
        <select className="input !w-auto !py-2 text-sm" value={filters.stock} onChange={setFilter('stock')} aria-label="Stock">
          <option value="">Any stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <select className="input !w-auto !py-2 text-sm" value={filters.tag} onChange={setFilter('tag')} aria-label="More filters">
          <option value="">More…</option>
          <option value="featured">Featured</option>
          <option value="trending">Trending</option>
          <option value="free_ship">Free shipping</option>
          <option value="paid_ship">Paid shipping</option>
          <option value="returnable">Returnable</option>
          <option value="no_return">No return</option>
        </select>
        {(filterCount > 0 || q) && (
          <button onClick={() => { setFilters(NO_FILTERS); setQ(''); }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gold">
            <X size={14} /> Clear
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400">{filtered.length} of {products.length} products</span>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gold/10 p-3 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <button onClick={() => bulk('activate')} className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-gold/15"><Eye size={14} /> Activate</button>
          <button onClick={() => bulk('deactivate')} className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-gold/15"><EyeOff size={14} /> Hide</button>
          <button onClick={() => printQrLabels(products.filter((p) => selected.includes(p.id)))} className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-gold/15"><QrCode size={14} /> QR Labels</button>
          <button onClick={() => bulk('delete')} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-rose-500 hover:bg-rose-500/10"><Trash2 size={14} /> Delete</button>
          <button onClick={() => setSelected([])} className="ml-auto text-gray-400 hover:text-gold">Clear</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="text-left text-gray-400">
            <tr className="border-b border-black/5 dark:border-white/10">
              <th className="p-4"><Checkbox checked={allSelected} onChange={toggleAll} /></th>
              <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className={`border-b border-black/5 last:border-0 dark:border-white/10 ${selected.includes(p.id) ? 'bg-gold/5' : ''}`}>
                <td className="p-4"><Checkbox checked={selected.includes(p.id)} onChange={() => toggleOne(p.id)} /></td>
                <td>
                  <div className="flex items-center gap-3">
                    <img src={p.image} className="h-12 w-10 rounded-lg object-cover" alt="" />
                    <div><p className="font-medium">{p.name}</p><p className="text-xs text-gray-400">{p.brand}</p></div>
                  </div>
                </td>
                <td>{p.category}</td>
                <td className="font-semibold">{inr(p.price)}</td>
                <td><span className={p.stock <= 5 ? 'text-rose-500' : ''}>{p.stock}</span></td>
                <td>
                  <div className="flex flex-col items-start gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? 'bg-emerald-500/15 text-emerald-500' : 'bg-gray-500/15 text-gray-400'}`}>
                      {p.is_active ? 'Active' : 'Hidden'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${Number(p.is_returnable) ? 'bg-sky-500/15 text-sky-500' : 'bg-rose-500/15 text-rose-500'}`}>
                      {Number(p.is_returnable) ? 'Returnable' : 'No return'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${Number(p.is_free_shipping ?? (p.shipping_fee > 0 ? 0 : 1)) ? 'bg-teal-500/15 text-teal-500' : 'bg-amber-500/15 text-amber-500'}`}>
                      {Number(p.is_free_shipping ?? (p.shipping_fee > 0 ? 0 : 1)) ? 'Free Ship' : `Ship ₹${p.shipping_fee || 0}`}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => setQrProduct(p)} title="QR label" className="rounded-lg p-2 hover:bg-gold/10"><QrCode size={16} /></button>
                    <Link to={`/admin/products/${p.id}/edit`} className="rounded-lg p-2 hover:bg-gold/10"><Pencil size={16} /></Link>
                    <button onClick={() => remove(p.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrProduct && <QrLabelModal product={qrProduct} onClose={() => setQrProduct(null)} />}
    </div>
  );
}

/** Generates a scannable QR label (encodes the product URL) for the in-store billing scanner. */
function QrLabelModal({ product, onClose }) {
  const [dataUrl, setDataUrl] = useState('');
  const [copies, setCopies] = useState(1); // how many identical labels to print
  const value = `${window.location.origin}/product/${product.slug}`;

  useEffect(() => {
    QRCode.toDataURL(value, { width: 512, margin: 1, errorCorrectionLevel: 'M' })
      .then(setDataUrl)
      .catch(() => toast.error('Could not generate QR code'));
  }, [value]);

  const printLabel = () => {
    if (!dataUrl) return;
    const n = Math.max(1, Math.min(500, Number(copies) || 1)); // clamp 1–500
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) { toast.error('Allow pop-ups to print'); return; }
    const card = `
      <div class="label">
        <img src="${dataUrl}" alt="QR">
        <div class="name">${escapeHtml(product.name)}</div>
        <div class="price">${escapeHtml(inr(product.price))}</div>
        <div class="slug">${escapeHtml(product.slug)}</div>
      </div>`;
    const cards = Array.from({ length: n }, () => card).join('');
    // Single copy prints centred; multiple copies tile onto one printable sheet.
    const layout = n === 1
      ? 'body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}'
      : 'body{margin:0;padding:12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}';
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(product.name)} — ${n} label(s)</title>
      <style>
        *{font-family:'Segoe UI',Arial,sans-serif;box-sizing:border-box}
        ${layout}
        .label{text-align:center;border:1px solid #ddd;border-radius:10px;padding:12px;page-break-inside:avoid;width:280px}
        img{width:${n === 1 ? 200 : 150}px;height:${n === 1 ? 200 : 150}px}
        .name{font-weight:700;font-size:${n === 1 ? 15 : 12}px;margin:6px 0 2px;line-height:1.2}
        .price{color:#9c7414;font-weight:700;font-size:${n === 1 ? 16 : 13}px}
        .slug{color:#999;font-size:${n === 1 ? 10 : 9}px;margin-top:3px;word-break:break-all}
        @media print{@page{margin:10mm}}
      </style></head><body onload="window.print()">
      ${n === 1 ? cards : `<div class="grid">${cards}</div>`}
      </body></html>`);
    w.document.close();
  };

  const downloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${product.slug}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-xs p-0">
        <div className="flex items-center justify-between border-b border-black/5 p-4 dark:border-white/10">
          <h3 className="flex items-center gap-2 font-semibold"><QrCode size={17} className="text-gold" /> QR Label</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="p-5 text-center">
          <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-xl bg-white p-3">
            {dataUrl ? <img src={dataUrl} alt="Product QR" className="h-full w-full" /> : <Spinner />}
          </div>
          <p className="mt-3 font-medium">{product.name}</p>
          <p className="text-sm font-semibold text-gold">{inr(product.price)}</p>
          <p className="mt-1 break-all text-[11px] text-gray-400">Scans to add this product at billing.</p>

          {/* How many identical labels to print (e.g. one per physical item). */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-300">Copies to print</label>
            <input type="number" min="1" max="500" value={copies}
              onChange={(e) => setCopies(e.target.value)}
              className="input !h-9 !w-20 !py-0 text-center text-sm" />
          </div>
        </div>
        <div className="flex gap-2 border-t border-black/5 p-4 dark:border-white/10">
          <button onClick={printLabel} disabled={!dataUrl} className="btn-gold flex-1 justify-center disabled:opacity-50">
            <Printer size={16} /> Print {Math.max(1, Math.min(500, Number(copies) || 1))}
          </button>
          <button onClick={downloadPng} disabled={!dataUrl} className="rounded-xl border border-black/10 px-4 text-sm disabled:opacity-50 dark:border-white/10" title="Download PNG"><Download size={16} /></button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

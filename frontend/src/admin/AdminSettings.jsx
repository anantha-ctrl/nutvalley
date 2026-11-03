import { useEffect, useMemo, useState } from 'react';
import {
  Save, Store, Mail, Megaphone, Share2, Sparkles, Image as ImageIcon, Upload, CreditCard, Wallet, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner } from '../components/ui';

// Field: [key, label, placeholder / hint, type, help?]
// type: text | email | number | decimal | textarea | image | url
const SECTIONS = [
  {
    id: 'brand', title: 'Brand', icon: Store, desc: 'Store name and logo shown in the header, footer and admin.',
    fields: [
      ['store_name', 'Store name', 'NutValley', 'text'],
      ['store_logo', 'Store logo', 'Transparent PNG · wide ~240×80', 'image', 'Shown in header, footer & admin panel.'],
    ],
  },
  {
    id: 'contact', title: 'Contact', icon: Mail, desc: 'Details customers see on the Contact page.',
    fields: [
      ['store_contact_email', 'Contact email', 'nutsvally@gmail.com', 'email'],
      ['store_contact_phone', 'Contact phone', '+91 98765 43210', 'text'],
      ['store_address', 'Store address', 'Chennai, Tamil Nadu, India', 'textarea'],
      ['store_contact_to', 'Message inbox', 'you@gmail.com', 'email', 'Contact Us form messages are emailed here.'],
    ],
  },
  {
    id: 'shipping', title: 'Announcement & shipping', icon: Megaphone, desc: 'Top bar message and delivery charges.',
    fields: [
      ['store_announcement', 'Top announcement bar', 'FREE SHIPPING OVER ₹999 · Fresh stock every week', 'text', 'Leave empty to hide the bar.'],
      ['store_free_shipping_min', 'Free shipping over (₹)', '999', 'number'],
      ['store_base_shipping', 'Flat shipping fee (₹)', '79', 'number', 'Charged when the order is below the free-shipping amount.'],
    ],
  },
  {
    id: 'payments', title: 'Payments (UPI & bank)', icon: Wallet, desc: 'Shown at checkout for online payment. Leave UPI ID empty to turn UPI off.',
    fields: [
      ['upi_id', 'UPI ID', 'nutvalley@okaxis', 'text'],
      ['upi_payee_name', 'Payee name', 'NutValley', 'text', 'Defaults to the store name.'],
      ['upi_qr_image', 'UPI QR code', 'Square PNG · 600×600', 'image'],
      ['bank_account_name', 'Account holder name', 'NutValley Foods', 'text'],
      ['bank_account_number', 'Account number', '123456789012', 'text'],
      ['bank_ifsc', 'IFSC code', 'SBIN0001234', 'text'],
      ['bank_name', 'Bank name', 'State Bank of India', 'text'],
    ],
  },
  {
    id: 'orders', title: 'Orders', icon: CreditCard, desc: 'Order numbering. Customers pay by UPI only.',
    fields: [
      ['order_prefix', 'Order number prefix', 'NV', 'text'],
    ],
  },
  {
    id: 'social', title: 'Social & WhatsApp', icon: Share2, desc: 'Leave a field empty to hide its icon.',
    fields: [
      ['store_instagram', 'Instagram URL', 'https://instagram.com/nutvalley', 'url'],
      ['store_facebook', 'Facebook URL', 'https://facebook.com/nutvalley', 'url'],
      ['store_twitter', 'Twitter / X URL', 'https://x.com/nutvalley', 'url'],
      ['store_whatsapp', 'WhatsApp number', '919876543210', 'text', 'Country code + number, no "+" or spaces.'],
    ],
  },
  {
    id: 'home', title: 'Homepage text', icon: Sparkles, desc: 'Headline and copy on the homepage hero and brand story.',
    fields: [
      ['landing_hero_eyebrow', 'Hero small label', 'NutValley — Premium Nuts & Dry Fruits', 'text'],
      ['landing_hero_title', 'Hero headline — line 1', 'Nature\'s finest, packed fresh.', 'text'],
      ['landing_hero_accent', 'Hero headline — line 2 (gold)', 'Healthy snacking made easy.', 'text'],
      ['landing_hero_subtitle', 'Hero subtitle', 'Almonds, cashews, pistachios, walnuts, dates & more — delivered across India.', 'textarea'],
      ['landing_hero_cta', 'Hero button text', 'Shop Now', 'text'],
      ['landing_hero_cta_link', 'Hero button link', '/shop', 'text'],
      ['landing_story_quote', 'Brand-story quote', 'Our mission is simple — pure, fresh nuts and dry fruits…', 'textarea'],
    ],
  },
  {
    id: 'images', title: 'Homepage images', icon: ImageIcon, desc: 'Upload or paste a URL. Empty = default image.',
    fields: [
      ['landing_img_intro', 'Brand-intro image', 'Portrait 4:5 · 1000×1250', 'image'],
      ['landing_img_men', 'Featured collection image (Cashews block)', 'Portrait 4:5 · 1000×1250', 'image'],
      ['landing_img_newarrival', 'New-arrival image (round frame)', 'Square 1:1 · 1000×1000 · subject centred', 'image'],
    ],
  },
];

function ImageField({ value, onChange, hint }) {
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('Image too large (max 3 MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-black/15 bg-[repeating-conic-gradient(#f3f3f3_0%_25%,#fff_0%_50%)] bg-[length:14px_14px] p-1.5 dark:border-white/15">
        {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          : <ImageIcon size={20} className="text-gray-300" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gold/50 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/10">
            <Upload size={13} /> {value ? 'Replace' : 'Upload'}
            <input type="file" accept="image/*" hidden onChange={pick} />
          </label>
          {value && (
            <button type="button" onClick={() => onChange('')}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 dark:border-white/10">
              Remove
            </button>
          )}
          {hint && <span className="text-xs text-gray-400">{hint}</span>}
        </div>
        <input className="input mt-2 !py-1.5 text-xs" placeholder="…or paste an image URL"
          value={value?.startsWith('data:') ? '' : (value || '')}
          onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null); // last saved values, to detect unsaved changes
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    api.get('/api/admin/settings')
      .then((r) => { setForm(r.data.data); setSaved(r.data.data); })
      .catch(() => { setForm({}); setSaved({}); });
  }, []);

  const changed = useMemo(() => {
    if (!form || !saved) return [];
    return Object.keys(form).filter((k) => String(form[k] ?? '') !== String(saved[k] ?? ''));
  }, [form, saved]);

  const set = (key, v) => setForm((f) => ({ ...f, [key]: v }));

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      let res;
      try {
        res = await api.put('/api/admin/settings', form);
      } catch {
        res = await api.post('/api/admin/settings', { ...form, _method: 'PUT' });
      }
      const next = res.data?.data || form;
      setForm(next);
      setSaved(next);
      toast.success('Settings saved — changes are live on the storefront.');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Spinner />;

  const section = SECTIONS.find((s) => s.id === active) || SECTIONS[0];
  const dirtyIn = (s) => s.fields.some(([key]) => changed.includes(key));

  return (
    <form onSubmit={save} className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Store Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Manage your store details, payments, shipping and homepage content.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[250px_1fr]">
        {/* Section nav — horizontal chips on mobile, vertical list on desktop */}
        <nav className="card scrollbar-none flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-24 lg:flex-col">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const on = s.id === active;
            return (
              <button
                key={s.id} type="button" onClick={() => setActive(s.id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${on ? 'bg-gold/15 font-semibold text-gold' : 'text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5'}`}
              >
                <Icon size={17} />
                <span className="whitespace-nowrap">{s.title}</span>
                {dirtyIn(s) && <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />}
              </button>
            );
          })}
        </nav>

        {/* Active section */}
        <section className="card p-6 sm:p-8">
          <div className="mb-6 flex items-start gap-3 border-b border-black/5 pb-5 dark:border-white/10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><section.icon size={19} /></span>
            <div>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="text-sm text-gray-400">{section.desc}</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {section.fields.map(([key, label, ph, type, help]) => {
              const wide = type === 'image' || type === 'textarea' || key === 'store_announcement';
              return (
                <div key={key} className={wide ? 'sm:col-span-2' : ''}>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor={`set-${key}`}>{label}</label>
                  {type === 'image' ? (
                    <ImageField hint={ph} value={form[key] ?? ''} onChange={(v) => set(key, v)} />
                  ) : type === 'textarea' ? (
                    <textarea id={`set-${key}`} rows={3} className="input" placeholder={ph}
                      value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
                  ) : (
                    <input id={`set-${key}`}
                      type={type === 'email' ? 'email' : type === 'url' ? 'url' : (type === 'number' || type === 'decimal') ? 'number' : 'text'}
                      min={type === 'number' || type === 'decimal' ? '0' : undefined}
                      step={type === 'decimal' ? '0.01' : undefined}
                      className="input" placeholder={ph}
                      value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
                  )}
                  {help && <p className="mt-1 text-xs text-gray-400">{help}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 z-30">
        <div className="card flex items-center justify-end gap-3 !bg-white/95 px-5 py-3 shadow-xl backdrop-blur dark:!bg-gray-900/95">
          <span className={`mr-auto text-sm ${changed.length ? 'text-amber-500' : 'text-gray-400'}`}>
            {changed.length ? `${changed.length} unsaved change${changed.length > 1 ? 's' : ''}` : 'All changes saved'}
          </span>
          {changed.length > 0 && (
            <button type="button" onClick={() => setForm(saved)} className="btn-outline !px-4 !py-2 text-sm">
              <RotateCcw size={15} /> Discard
            </button>
          )}
          <button disabled={saving || !changed.length} className="btn-gold inline-flex !px-5 !py-2 text-sm disabled:opacity-50">
            <Save size={15} /> {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </form>
  );
}

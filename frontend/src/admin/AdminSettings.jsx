import { useEffect, useState } from 'react';
import { Save, Store, Mail, Megaphone, Share2, Sparkles, Image as ImageIcon, Upload, Receipt, QrCode, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Spinner } from '../components/ui';

// [key, label, placeholder, type]
const SECTIONS = [
  ['Brand', Store, [
    ['store_name', 'Store name', 'Beadsboutique', 'text'],
    ['store_logo', 'Store logo', 'Transparent PNG · wide ~240×80 · shown in header, footer & admin', 'image'],
  ]],
  ['Contact (shown on Contact page)', Mail, [
    ['store_contact_email', 'Contact email', 'beadsboutiquejewellery@gmail.com', 'email'],
    ['store_contact_phone', 'Contact phone', '+91 98765 43210', 'text'],
    ['store_address', 'Studio / address', 'Bengaluru, India', 'text'],
    ['store_contact_to', 'Message inbox (Contact Us emails delivered here)', 'you@gmail.com', 'email'],
  ]],
  ['Announcement & shipping', Megaphone, [
    ['store_announcement', 'Top announcement bar (leave empty to hide)', 'FREE SHIPPING OVER ₹1999 · …', 'text'],
    ['store_free_shipping_min', 'Free shipping over (₹)', '1999', 'number'],
    ['store_base_shipping', 'Flat shipping fee (₹)', '79', 'number'],
  ]],
  ['Social & WhatsApp (leave empty to hide)', Share2, [
    ['store_instagram', 'Instagram URL', 'https://instagram.com/…', 'text'],
    ['store_facebook', 'Facebook URL', 'https://facebook.com/…', 'text'],
    ['store_twitter', 'Twitter / X URL', 'https://x.com/…', 'text'],
    ['store_whatsapp', 'WhatsApp number (intl, no +)', '919876543210', 'text'],
  ]],
  ['Homepage — landing hero & story', Sparkles, [
    ['landing_hero_eyebrow', 'Hero eyebrow (small label)', 'Beadsboutique — Est. Elegance', 'text'],
    ['landing_hero_title', 'Hero headline — line 1', 'Handcrafted beads, made to shine.', 'text'],
    ['landing_hero_accent', 'Hero headline — line 2 (gold)', 'We create confidence.', 'text'],
    ['landing_hero_subtitle', 'Hero subtitle', 'Necklaces, bracelets, earrings and more…', 'textarea'],
    ['landing_hero_cta', 'Hero button text', 'Explore Collection', 'text'],
    ['landing_hero_cta_link', 'Hero button link', '/shop', 'text'],
    ['landing_story_quote', 'Brand-story quote', 'Jewellery that feels personal, every single day…', 'textarea'],
  ]],
  ['Homepage — images (upload or paste URL; empty = default)', ImageIcon, [
    ['landing_img_hero', 'Hero background image (shown only when there are no active banners)', 'Landscape 16:9 · 1920×1080 · keep subject centred', 'image'],
    ['landing_img_intro', 'Brand-intro image', 'Portrait 4:5 · 1000×1250', 'image'],
    ['landing_img_men', 'Featured collection image (Necklaces block)', 'Portrait 4:5 · 1000×1250', 'image'],
    ['landing_img_newarrival', 'New-arrival banner image', 'Landscape 16:9 · 1920×1080 · keep subject centred', 'image'],
  ]],
  ['Orders & payment rules', CreditCard, [
    ['order_prefix', 'Order number prefix', 'BB', 'text'],
    ['cod_max_amount', 'COD available up to (₹) — above this, online payment only', '1000', 'number'],
  ]],
  ['Billing / POS (in-store invoice)', Receipt, [
    ['billing_tax_pct', 'Default tax / GST (%)', '0', 'number'],
    ['billing_invoice_prefix', 'Invoice number prefix', 'INV', 'text'],
    ['billing_footer_note', 'Invoice footer note', 'Thank you for shopping with Beadsboutique!', 'text'],
  ]],
  ['Online payment — UPI / QR (customers pay & upload proof; you approve)', QrCode, [
    ['upi_id', 'UPI ID (leave empty to disable online payment)', 'beadsboutique@okaxis', 'text'],
    ['upi_payee_name', 'Payee name shown to customer', 'Beadsboutique', 'text'],
    ['upi_qr_image', 'Custom QR image (optional — auto-generated with amount if empty)', 'Square · 600×600 · your printed UPI QR', 'image'],
    ['bank_account_name', 'Bank account holder name (optional)', 'Beadsboutique', 'text'],
    ['bank_account_number', 'Bank account number (optional)', '1234567890', 'text'],
    ['bank_ifsc', 'Bank IFSC (optional)', 'HDFC0001234', 'text'],
    ['bank_name', 'Bank name (optional)', 'HDFC Bank', 'text'],
  ]],
];

function ImageField({ label, value, onChange, hint }) {
  const pick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('Image too large (max 3 MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-gray-400">Recommended: {hint}</span>}
      <div className="mt-1 flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/10">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center text-gray-300"><ImageIcon size={18} /></span>}
        </div>
        <div className="flex-1">
          <div className="flex gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gold/50 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/10">
              <Upload size={13} /> Upload
              <input type="file" accept="image/*" hidden onChange={pick} />
            </label>
            {value && (
              <button type="button" onClick={() => onChange('')}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 dark:border-white/10">
                Remove
              </button>
            )}
          </div>
          <input className="input mt-2 !py-1.5 text-xs" placeholder="…or paste an image URL"
            value={value?.startsWith('data:') ? '' : (value || '')}
            onChange={(e) => onChange(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/api/admin/settings').then((r) => setForm(r.data.data)).catch(() => setForm({})); }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      try {
        res = await api.put('/api/admin/settings', form);
      } catch (e1) {
        res = await api.post('/api/admin/settings', { ...form, _method: 'PUT' });
      }
      setForm(res.data?.data || form);
      toast.success((res.data?.message || 'Settings saved') + ' — changes are live on the storefront.');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Store Settings</h1>

      <form onSubmit={save} className="space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {SECTIONS.map(([title, Icon, fields]) => (
            <div key={title} className="card space-y-4 p-6">
              <div className="flex items-center gap-2 text-gold">
                <Icon size={18} />
                <h2 className="font-semibold">{title}</h2>
              </div>
              {fields.map(([key, label, ph, type]) =>
                type === 'image' ? (
                  <ImageField key={key} label={label} hint={ph} value={form[key] ?? ''}
                    onChange={(v) => setForm({ ...form, [key]: v })} />
                ) : (
                  <label key={key} className="block">
                    <span className="text-sm font-medium">{label}</span>
                    {type === 'textarea' ? (
                      <textarea rows={2} className="input mt-1" placeholder={ph}
                        value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    ) : (
                      <input type={type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'}
                        min={type === 'number' ? '0' : undefined} className="input mt-1" placeholder={ph}
                        value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    )}
                  </label>
                )
              )}
            </div>
          ))}
        </div>

        <button disabled={saving} className="btn-gold inline-flex !px-5 !py-2.5 text-sm">
          <Save size={15} /> {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}

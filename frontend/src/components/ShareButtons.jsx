import { useState } from 'react';
import { Link2, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, discountPct } from '../utils/format';

// Official brand marks (simple-icons paths, 24×24, currentColor) — lucide has no
// WhatsApp logo and its Facebook/Twitter icons are deprecated outlines.
const Brand = ({ d, size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={d} /></svg>
);
const WHATSAPP = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';
const FACEBOOK = 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z';
const X_LOGO = 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z';

const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

// Cloudinary serves .webp by default; share sheets (Instagram, WhatsApp) want JPG.
const jpgUrl = (src) =>
  src && src.includes('res.cloudinary.com') && src.includes('/image/upload/')
    ? src.replace('/image/upload/', '/image/upload/f_jpg,q_auto,w_1200/').replace(/\.(webp|avif|heic)$/i, '.jpg')
    : src;

export default function ShareButtons({ product }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');
  if (!product) return null;

  // Backend share page: carries Open Graph tags (photo, name, price) so WhatsApp /
  // Facebook / X render a rich preview, then redirects visitors to the product.
  const shareUrl = `${api.defaults.baseURL}/share/product/${encodeURIComponent(product.slug)}`;
  const pct = product.discount_pct ?? discountPct(product.price, product.mrp);
  const blurb = (product.description || '').replace(/\s+/g, ' ').trim();
  const caption = [
    `✨ ${product.name}`,
    `💰 ${inr(product.price)}${Number(product.mrp) > Number(product.price) ? ` (MRP ${inr(product.mrp)} · ${pct}% off)` : ''}`,
    blurb ? (blurb.length > 140 ? `${blurb.slice(0, 140)}…` : blurb) : '',
    `🛍️ Shop now: ${shareUrl}`,
  ].filter(Boolean).join('\n');
  const imageSrc = jpgUrl(product.images?.[0]?.image_url || product.image);

  const imageFile = async () => {
    if (!imageSrc) return null;
    const res = await fetch(imageSrc, { mode: 'cors' });
    if (!res.ok) throw new Error('image');
    const blob = await res.blob();
    const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    return new File([blob], `${product.slug}.${type.split('/')[1] || 'jpg'}`, { type });
  };

  // Phones: share the actual photo + details through the OS share sheet
  // (lists WhatsApp, Instagram, etc.). Returns false when not supported.
  const nativeShare = async () => {
    if (!navigator.share || !isTouch()) return false;
    try {
      const file = await imageFile().catch(() => null);
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: product.name, text: caption });
      } else {
        await navigator.share({ title: product.name, text: caption, url: shareUrl });
      }
    } catch { /* user cancelled */ }
    return true;
  };

  const run = (key, fn) => async () => {
    setBusy(key);
    try { await fn(); } finally { setBusy(''); }
  };

  const shareWhatsApp = run('wa', async () => {
    if (await nativeShare()) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank', 'noopener,noreferrer');
  });

  const shareFacebook = run('fb', async () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer,width=640,height=560');
  });

  const shareX = run('x', async () => {
    const text = `${product.name} — ${inr(product.price)}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer,width=640,height=560');
  });

  // Instagram has no web share URL. Phones: share sheet with the photo (Story/Post/DM).
  // Desktop: download the photo + copy the caption, then open Instagram to post it.
  const shareInstagram = run('ig', async () => {
    if (await nativeShare()) return;
    try {
      const file = await imageFile();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { toast.error('Could not download the photo'); }
    try { await navigator.clipboard.writeText(caption); } catch { /* ignore */ }
    toast.success('Photo downloaded & caption copied — upload it on Instagram and paste the caption', { duration: 5000 });
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true); toast.success('Product details & link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error('Could not copy'); }
  };

  const btn = 'flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-gray-500 transition disabled:opacity-60 dark:border-white/10';
  const spin = <Loader2 size={16} className="animate-spin" />;

  return (
    <div className="mt-6 flex items-center gap-3 border-t border-black/5 pt-5 dark:border-white/10">
      <span className="text-sm text-gray-400">Share:</span>
      <button type="button" onClick={shareWhatsApp} disabled={!!busy} aria-label="Share on WhatsApp" title="Share on WhatsApp"
        className={`${btn} hover:border-[#25D366] hover:bg-[#25D366] hover:text-white`}>
        {busy === 'wa' ? spin : <Brand d={WHATSAPP} />}
      </button>
      <button type="button" onClick={shareFacebook} disabled={!!busy} aria-label="Share on Facebook" title="Share on Facebook"
        className={`${btn} hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white`}>
        <Brand d={FACEBOOK} />
      </button>
      <button type="button" onClick={shareX} disabled={!!busy} aria-label="Share on X (Twitter)" title="Share on X (Twitter)"
        className={`${btn} hover:border-black hover:bg-black hover:text-white`}>
        <Brand d={X_LOGO} />
      </button>
      <button type="button" onClick={shareInstagram} disabled={!!busy} aria-label="Share on Instagram" title="Share on Instagram"
        className={`${btn} hover:border-transparent hover:bg-gradient-to-tr hover:from-[#FEDA75] hover:via-[#D62976] hover:to-[#4F5BD5] hover:text-white`}>
        {busy === 'ig' ? spin : (
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" /><circle cx="12" cy="12" r="4.3" /><circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>
      <button type="button" onClick={copy} aria-label="Copy details & link" title="Copy details & link"
        className={`${btn} hover:border-gold hover:text-gold`}>
        {copied ? <Check size={16} className="text-emerald-500" /> : <Link2 size={16} />}
      </button>
    </div>
  );
}

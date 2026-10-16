import { useState } from 'react';
import { Facebook, Twitter, MessageCircle, Link2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareButtons({ title }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = encodeURIComponent(`Check out "${title}" on Beadsboutique`);
  const enc = encodeURIComponent(url);

  const links = [
    { icon: MessageCircle, label: 'WhatsApp', href: `https://wa.me/?text=${text}%20${enc}`, color: 'hover:text-[#25D366]' },
    { icon: Facebook, label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, color: 'hover:text-[#1877F2]' },
    { icon: Twitter, label: 'Twitter', href: `https://twitter.com/intent/tweet?text=${text}&url=${enc}`, color: 'hover:text-sky-500' },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error('Could not copy'); }
  };

  return (
    <div className="mt-6 flex items-center gap-3 border-t border-black/5 pt-5 dark:border-white/10">
      <span className="text-sm text-gray-400">Share:</span>
      {links.map(({ icon: Icon, label, href, color }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
          className={`rounded-full border border-black/10 p-2 text-gray-500 transition dark:border-white/10 ${color}`}>
          <Icon size={16} />
        </a>
      ))}
      <button onClick={copy} aria-label="Copy link"
        className="rounded-full border border-black/10 p-2 text-gray-500 transition hover:text-gold dark:border-white/10">
        {copied ? <Check size={16} className="text-emerald-500" /> : <Link2 size={16} />}
      </button>
    </div>
  );
}

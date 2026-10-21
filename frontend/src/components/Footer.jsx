import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Send, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useStore } from '../context/StoreContext';
import Logo from './Logo';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [cats, setCats] = useState([]);
  const store = useStore();

  // Shop links come live from the DB categories (respects the storefront scope,
  // e.g. a men-only store) — no dead links to categories that don't exist.
  useEffect(() => { api.get('/api/categories').then((r) => setCats(r.data.data)).catch(() => {}); }, []);

  // Only show socials that have a real URL configured in admin settings.
  const SOCIALS = [
    { Icon: Instagram, label: 'Instagram', url: store.instagram },
    { Icon: Facebook, label: 'Facebook', url: store.facebook },
    { Icon: Twitter, label: 'Twitter / X', url: store.twitter },
  ].filter((s) => s.url && s.url !== '#');

  const CONTACTS = [
    { Icon: Phone, value: store.phone, href: store.phone && `tel:${store.phone.replace(/\s/g, '')}` },
    { Icon: Mail, value: store.email, href: store.email && `mailto:${store.email}` },
    { Icon: MapPin, value: store.address },
  ].filter((c) => c.value);

  const subscribe = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/newsletter', { email });
      toast.success(`Subscribed! Welcome to ${store.name}.`);
      setEmail('');
    } catch (err) { toast.error(err.message); }
  };

  return (
    <footer className="mt-16 bg-ink pb-16 text-gray-300 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        {/* Brand + contact */}
        <div className="lg:col-span-4">
          <Logo white className="h-14" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
            Handcrafted beaded jewellery — necklaces, bracelets, earrings and more, made with care.
          </p>
          {CONTACTS.length > 0 && (
            <ul className="mt-5 space-y-2.5 text-sm">
              {CONTACTS.map(({ Icon, value, href }) => (
                <li key={value} className="flex items-start gap-3 text-gray-400">
                  <Icon size={16} className="mt-0.5 shrink-0 text-gold" />
                  {href ? <a href={href} className="break-all hover:text-gold">{value}</a> : <span>{value}</span>}
                </li>
              ))}
            </ul>
          )}
          {SOCIALS.length > 0 && (
            <div className="mt-5 flex gap-3">
              {SOCIALS.map(({ Icon, label, url }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                  className="rounded-full border border-white/10 p-2 transition hover:border-gold hover:text-gold"><Icon size={18} /></a>
              ))}
            </div>
          )}
        </div>

        {/* Categories in two short columns instead of one long list */}
        <FooterCol title="Shop" className="lg:col-span-3">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <FLink to="/shop">All Products</FLink>
            {cats.map((c) => (
              <FLink key={c.id} to={`/category/${c.slug}`}>{c.name}</FLink>
            ))}
          </ul>
        </FooterCol>

        <FooterCol title="Company" className="lg:col-span-2">
          <ul className="space-y-2.5 text-sm">
            <FLink to="/about">About Us</FLink>
            <FLink to="/contact">Contact</FLink>
            <FLink to="/privacy">Privacy Policy</FLink>
            <FLink to="/terms">Terms & Conditions</FLink>
            <FLink to="/shipping">Shipping Policy</FLink>
            <FLink to="/returns">Returns & Refund</FLink>
          </ul>
        </FooterCol>

        <FooterCol title="Newsletter" className="lg:col-span-3">
          <p className="mb-4 text-sm leading-relaxed text-gray-400">Get early access to new drops & exclusive offers.</p>
          <form onSubmit={subscribe} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 focus-within:border-gold">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email" aria-label="Email address"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none" />
            <button aria-label="Subscribe" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-ink transition hover:brightness-110">
              <Send size={16} />
            </button>
          </form>
        </FooterCol>
      </div>

      {/* Bottom bar — right padding keeps it clear of the floating WhatsApp button */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-5 text-xs text-gray-500 md:flex-row md:justify-between md:pr-24">
          <p>© {new Date().getFullYear()} {store.name}. All rights reserved.</p>
          <p>Designed & Developed by <a href="https://cloudhawk.in/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gold">CloudHawk</a></p>
        </div>
      </div>
    </footer>
  );
}

const FooterCol = ({ title, className = '', children }) => (
  <div className={className}>
    <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gold">{title}</h4>
    {children}
  </div>
);
const FLink = ({ to, children }) => (
  <li><Link to={to} className="text-gray-400 transition hover:text-gold">{children}</Link></li>
);

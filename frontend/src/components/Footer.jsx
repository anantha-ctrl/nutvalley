import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Send } from 'lucide-react';
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

  const subscribe = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/newsletter', { email });
      toast.success(`Subscribed! Welcome to ${store.name}.`);
      setEmail('');
    } catch (err) { toast.error(err.message); }
  };

  return (
    <footer className="mt-20 border-t border-black/5 bg-ink pb-16 text-gray-300 dark:border-white/10 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo white className="h-14" />
          <p className="mt-4 text-sm text-gray-400">Handcrafted beaded jewellery — necklaces, bracelets, earrings and more, made with care.</p>
          <div className="mt-5 flex gap-3">
            {SOCIALS.map(({ Icon, label, url }) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                className="rounded-full border border-white/10 p-2 hover:border-gold hover:text-gold"><Icon size={18} /></a>
            ))}
          </div>
        </div>

        <FooterCol title="Shop">
          <FLink to="/shop">All Products</FLink>
          {cats.map((c) => (
            <FLink key={c.id} to={`/category/${c.slug}`}>{c.name}</FLink>
          ))}
        </FooterCol>

        <FooterCol title="Company">
          <FLink to="/about">About Us</FLink>
          <FLink to="/contact">Contact</FLink>
          <FLink to="/privacy">Privacy Policy</FLink>
          <FLink to="/terms">Terms & Conditions</FLink>
          <FLink to="/shipping">Shipping Policy</FLink>
          <FLink to="/returns">Returns & Refund</FLink>
        </FooterCol>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gold">Newsletter</h4>
          <p className="mb-3 text-sm text-gray-400">Get early access to drops & exclusive offers.</p>
          <form onSubmit={subscribe} className="flex gap-2">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email" className="input !bg-white/5 !py-2 text-sm" />
            <button className="btn-gold !px-3 !py-2"><Send size={16} /></button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} {store.name}. All rights reserved. Designed and Developed By <a href="https://cloudhawk.in/">CloudHawk</a>.
      </div>
    </footer>
  );
}

const FooterCol = ({ title, children }) => (
  <div>
    <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gold">{title}</h4>
    <ul className="space-y-2.5 text-sm">{children}</ul>
  </div>
);
const FLink = ({ to, children }) => (
  <li><Link to={to} className="text-gray-400 hover:text-gold">{children}</Link></li>
);

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, ShoppingBag, User, Menu, X, Sun, Moon, ChevronDown, LogOut, Package, Gift, LayoutDashboard } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/client';
import Logo from '../../components/Logo';

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { count: wish } = useWishlist();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [acc, setAcc] = useState(false);
  const accRef = useRef(null);

  // Nav links are driven live from the DB categories (respects the storefront
  // scope, e.g. a men-only store) — "Collections" always leads the list.
  const [cats, setCats] = useState([]);
  useEffect(() => {
    let active = true;
    const load = () => api.get('/api/categories').then((r) => {
      if (active) setCats(Array.isArray(r.data.data) ? r.data.data : []);
    }).catch(() => {});
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const LINKS = [['Collections', '/shop'], ...cats.map((c) => [c.name, `/category/${c.slug}`])];

  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);

  // Close the account dropdown on an outside click.
  useEffect(() => {
    const onClick = (e) => { if (accRef.current && !accRef.current.contains(e.target)) setAcc(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const accountLinks = user
    ? [
      ['Profile', '/profile', User],
      ['My Orders', '/orders', Package],
      ['Wishlist', '/wishlist', Heart],
      ...(user.role === 'admin' ? [['Admin Panel', '/admin', LayoutDashboard]] : []),
    ]
    : [
      ['Sign in', '/login', User],
      ['Create account', '/register', User],
    ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 border-b border-luxe-ink/10 bg-white/95 shadow-[0_8px_30px_-16px_rgba(17,17,17,0.18)] backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-ink/95"
    >
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <Link to="/" aria-label="Beadsboutique home" className="shrink-0">
          <Logo white={theme === 'dark'} className="h-10" />
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-9 text-luxe-ink lg:flex dark:text-white">
          {LINKS.map(([label, to]) => (
            <li key={label}>
              <Link
                to={to}
                className="group relative text-sm font-medium tracking-wide"
              >
                {label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-luxe-gold transition-all duration-300 group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Icons */}
        <div className="flex items-center gap-1 text-luxe-ink sm:gap-2 dark:text-white">
          <Link to="/shop" className="hidden rounded-full p-2.5 transition hover:bg-black/5 sm:block dark:hover:bg-white/10" aria-label="Search"><Search size={19} /></Link>
          <Link to="/wishlist" className="relative rounded-full p-2.5 transition hover:bg-black/5 dark:hover:bg-white/10" aria-label="Wishlist">
            <Heart size={19} />
            {wish > 0 && <Badge>{wish}</Badge>}
          </Link>
          <Link to="/cart" className="relative rounded-full p-2.5 transition hover:bg-black/5 dark:hover:bg-white/10" aria-label="Cart">
            <ShoppingBag size={19} />
            {count > 0 && <Badge>{count}</Badge>}
          </Link>
          {/* Account dropdown */}
          <div className="relative hidden sm:block" ref={accRef}>
            <button onClick={() => setAcc((o) => !o)}
              className="flex items-center gap-1 rounded-full p-2.5 transition hover:bg-black/5 dark:hover:bg-white/10" aria-label="Account">
              {user ? <Avatar user={user} size={26} /> : <User size={19} />}
              <ChevronDown size={14} className={`transition ${acc ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {acc && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-black/5 bg-white p-1.5 text-sm text-luxe-ink shadow-luxe dark:border-white/10 dark:bg-ink dark:text-white"
                >
                  {user && (
                    <div className="border-b border-black/5 px-3 py-2 dark:border-white/10">
                      <p className="truncate font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-gray-400">{user.email}</p>
                    </div>
                  )}
                  {accountLinks.map(([label, to, Icon]) => (
                    <Link key={label} to={to} onClick={() => setAcc(false)}
                      className="mt-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-luxe-gold/15">
                      <Icon size={16} className="text-luxe-bronze" /> {label}
                    </Link>
                  ))}
                  {user && (
                    <button onClick={() => { setAcc(false); logout(); navigate('/'); }}
                      className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-rose-500 transition hover:bg-rose-500/10">
                      <LogOut size={16} /> Logout
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setOpen(true)} className="rounded-full p-2.5 transition hover:bg-black/5 dark:hover:bg-white/10 lg:hidden" aria-label="Menu"><Menu size={20} /></button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-white p-8 shadow-2xl dark:bg-ink"
            >
              <div className="flex items-center justify-between">
                <Logo className="h-9" />
                <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-black/5" aria-label="Close"><X size={22} /></button>
              </div>
              <ul className="mt-12 space-y-1">
                {LINKS.map(([label, to], i) => (
                  <motion.li key={label}
                    initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}>
                    <Link to={to} onClick={() => setOpen(false)}
                      className="block border-b border-luxe-line py-4 font-display text-2xl text-luxe-ink dark:border-white/10 dark:text-white">
                      {label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <Link to={user ? '/profile' : '/login'} onClick={() => setOpen(false)}
                className="mt-auto rounded-full bg-luxe-ink py-3.5 text-center text-sm font-semibold text-white">
                {user ? 'My Account' : 'Sign in'}
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function Badge({ children }) {
  return (
    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-luxe-gold px-1 text-[10px] font-bold text-luxe-ink">
      {children}
    </span>
  );
}

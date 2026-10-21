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

  const zone = useNavZone();
  const look = {
    // Over the hero: no bar at all. The carousel hero is always blush, so ink text;
    // the editorial (photo) hero is dark, so white text.
    hero: { bar: 'border-transparent bg-transparent', tone: 'text-luxe-ink', white: false },
    'hero-dark': { bar: 'border-transparent bg-transparent', tone: 'text-white', white: true },
    // Over a dark (maroon / photo) section: a matching frosted maroon bar.
    dark: {
      bar: 'border-white/10 bg-luxe-ink/85 shadow-[0_8px_30px_-16px_rgba(0,0,0,0.5)] backdrop-blur-xl',
      tone: 'text-white', white: true,
    },
    // Over a light section: frosted white (frosted ink in dark theme).
    light: {
      bar: 'border-luxe-ink/10 bg-white/85 shadow-[0_8px_30px_-16px_rgba(17,17,17,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-ink/85',
      tone: 'text-luxe-ink dark:text-white', white: theme === 'dark',
    },
  }[zone] || {};

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow,color] duration-300 ${look.bar}`}
    >
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <Link to="/" aria-label="Beadsboutique home" className="shrink-0">
          <Logo white={look.white} className="h-10" />
        </Link>

        {/* Desktop links */}
        <ul className={`mx-6 hidden min-w-0 items-center gap-6 whitespace-nowrap transition-colors duration-300 xl:flex 2xl:gap-9 ${look.tone}`}>
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
        <div className={`flex items-center gap-1 transition-colors duration-300 sm:gap-2 ${look.tone}`}>
          <Link to="/shop" className="hidden rounded-full p-2.5 transition hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)] sm:block" aria-label="Search"><Search size={19} /></Link>
          <Link to="/wishlist" className="relative rounded-full p-2.5 transition hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]" aria-label="Wishlist">
            <Heart size={19} />
            {wish > 0 && <Badge>{wish}</Badge>}
          </Link>
          <Link to="/cart" className="relative rounded-full p-2.5 transition hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]" aria-label="Cart">
            <ShoppingBag size={19} />
            {count > 0 && <Badge>{count}</Badge>}
          </Link>
          {/* Account dropdown */}
          <div className="relative hidden sm:block" ref={accRef}>
            <button onClick={() => setAcc((o) => !o)}
              className="flex items-center gap-1 rounded-full p-2.5 transition hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]" aria-label="Account">
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
          <button onClick={() => setOpen(true)} className="rounded-full p-2.5 transition hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)] xl:hidden" aria-label="Menu"><Menu size={20} /></button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 xl:hidden"
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

/**
 * Which kind of section is directly under the fixed header: 'hero', 'hero-dark',
 * 'dark' or 'light'. Sections opt in with a data-nav attribute; anything unmarked
 * counts as light. Re-checked on scroll/resize (one rAF per frame at most).
 */
function useNavZone() {
  const [zone, setZone] = useState('hero');
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      // Probe just below the 72px header bar, in the middle of the page.
      const hit = document.elementsFromPoint(window.innerWidth / 2, 74)
        .find((el) => !el.closest('header'));
      setZone(hit?.closest('[data-nav]')?.dataset.nav || 'light');
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    // The hero swaps from its loading placeholder to the carousel after the
    // banners arrive, so re-probe whenever the page's layout changes.
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);
  return zone;
}

function Badge({ children }) {
  return (
    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-luxe-gold px-1 text-[10px] font-bold text-luxe-ink">
      {children}
    </span>
  );
}

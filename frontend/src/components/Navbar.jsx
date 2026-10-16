import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Heart, User, Menu, X, Sun, Moon, LayoutDashboard, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useStore } from '../context/StoreContext';
import api from '../api/client';
import { inr } from '../utils/format';
import Logo from './Logo';

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { announcement } = useStore();
  const [cats, setCats] = useState([]);
  const [openMenu, setOpenMenu] = useState(false);
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { api.get('/api/categories').then((r) => setCats(r.data.data)).catch(() => {}); }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/products?search=${encodeURIComponent(q)}&per_page=6`)
        .then((r) => { setSuggestions(r.data.data.products); setShowSuggest(true); })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpenMenu(false);
    setShowSuggest(false);
    navigate(`/shop?search=${encodeURIComponent(q)}`);
  };

  const goToProduct = (slug) => {
    setShowSuggest(false);
    setQ('');
    setOpenMenu(false);
    navigate(`/product/${slug}`);
  };

  const SuggestList = (
    showSuggest && suggestions.length > 0 && (
      <div className="absolute left-0 right-0 top-full z-50 mt-2">
        <div className="card max-h-96 overflow-y-auto p-2">
          {suggestions.map((p) => (
            <button key={p.id} onMouseDown={() => goToProduct(p.slug)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-gold/10">
              <img src={p.image} alt="" className="h-12 w-10 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-gray-400">{p.brand}</p>
              </div>
              <span className="text-sm font-semibold">{inr(p.price)}</span>
            </button>
          ))}
          <button onMouseDown={submitSearch} className="mt-1 w-full rounded-xl p-2 text-center text-sm font-medium text-gold hover:bg-gold/10">
            See all results for “{q}”
          </button>
        </div>
      </div>
    )
  );

  return (
    <header className="sticky top-0 z-50">
      {announcement && (
        <div className="bg-ink text-center text-xs tracking-widest text-gold py-1.5">
          {announcement}
        </div>
      )}
      <nav className="glass border-b border-black/5 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4">
          <button className="-ml-1 p-1 lg:hidden" onClick={() => setOpenMenu(true)} aria-label="menu"><Menu /></button>

          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Logo className="h-9 sm:h-11" />
          </Link>

          {/* Desktop nav — categories straight from the DB, no fake submenus */}
          <ul className="ml-6 hidden items-center gap-6 lg:flex">
            {cats.map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.slug}`} className="text-sm font-medium hover:text-gold transition">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>

          <form onSubmit={submitSearch} className="relative ml-auto hidden flex-1 max-w-xs md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jewellery…"
              onFocus={() => suggestions.length && setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              className="input !py-2 pl-10 text-sm" />
            {SuggestList}
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2 md:ml-2">
            <Link to="/wishlist" className="relative rounded-full p-2 hover:bg-gold/10" aria-label="wishlist">
              <Heart size={20} />
              {wishCount > 0 && <Badge>{wishCount}</Badge>}
            </Link>
            <Link to="/cart" className="relative rounded-full p-2 hover:bg-gold/10" aria-label="cart">
              <ShoppingBag size={20} />
              {count > 0 && <Badge>{count}</Badge>}
            </Link>

            {/* Mobile: compact account icon (full menu lives in the hamburger drawer) */}
            <Link to={user ? '/profile' : '/login'} className="rounded-full p-2 hover:bg-gold/10 lg:hidden" aria-label="account">
              {user ? <Avatar user={user} size={24} /> : <User size={20} />}
            </Link>

            {user ? (
              <div className="group relative hidden lg:block">
                <button className="flex items-center gap-2 rounded-full p-1.5 hover:bg-gold/10"><Avatar user={user} size={28} /></button>
                <div className="invisible absolute right-0 top-full w-48 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
                  <div className="card p-2 text-sm">
                    <p className="px-3 py-2 font-semibold">{user.name}</p>
                    <Dropdown to="/profile">My Profile</Dropdown>
                    <Dropdown to="/orders">My Orders</Dropdown>
                    <Dropdown to="/wishlist">Wishlist</Dropdown>
                    {isAdmin && (
                      <Dropdown to="/admin"><span className="flex items-center gap-2"><LayoutDashboard size={14}/>Admin</span></Dropdown>
                    )}
                    <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-rose-500 hover:bg-rose-500/10">
                      <LogOut size={14}/> Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" className="hidden btn-gold !px-4 !py-2 text-sm lg:inline-flex">Login</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {openMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenMenu(false)} />
          <div className="absolute left-0 top-0 flex h-full w-[82%] max-w-xs flex-col overflow-y-auto bg-white p-6 dark:bg-ink">
            <div className="mb-5 flex items-center justify-between">
              <Logo className="h-9" />
              <button onClick={() => setOpenMenu(false)} aria-label="close menu"><X /></button>
            </div>

            {/* Search */}
            <form onSubmit={submitSearch} className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jewellery…"
                className="input !py-2.5 pl-10 text-sm" />
              {SuggestList}
            </form>

            {/* Categories */}
            <p className="mb-1 text-xs uppercase tracking-widest text-gold">Shop</p>
            <ul className="space-y-1">
              {cats.map((c) => (
                <li key={c.id}>
                  <Link to={`/category/${c.slug}`} onClick={() => setOpenMenu(false)} className="block rounded-lg px-2 py-2 font-medium hover:bg-gold/10">{c.name}</Link>
                </li>
              ))}
              <li><Link to="/shop" onClick={() => setOpenMenu(false)} className="block rounded-lg px-2 py-2 hover:bg-gold/10">All Products</Link></li>
            </ul>

            {/* Account */}
            <div className="mt-5 border-t border-black/5 pt-5 dark:border-white/10">
              {user ? (
                <>
                  <p className="mb-1 px-2 text-xs uppercase tracking-widest text-gold">Hi, {user.name.split(' ')[0]}</p>
                  <ul className="space-y-1">
                    <DrawerLink to="/profile" close={() => setOpenMenu(false)}>My Profile</DrawerLink>
                    <DrawerLink to="/orders" close={() => setOpenMenu(false)}>My Orders</DrawerLink>
                    <DrawerLink to="/wishlist" close={() => setOpenMenu(false)}>Wishlist</DrawerLink>
                    {isAdmin && <DrawerLink to="/admin" close={() => setOpenMenu(false)}>Admin Dashboard</DrawerLink>}
                  </ul>
                  <button onClick={() => { logout(); setOpenMenu(false); }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-rose-500 hover:bg-rose-500/10">
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login" onClick={() => setOpenMenu(false)} className="btn-gold w-full text-sm">Login</Link>
                  <Link to="/register" onClick={() => setOpenMenu(false)} className="btn-outline w-full text-sm">Create Account</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

const Badge = ({ children }) => (
  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
    {children}
  </span>
);

const Dropdown = ({ to, children }) => (
  <Link to={to} className="block rounded-lg px-3 py-2 hover:bg-gold/10">{children}</Link>
);

const DrawerLink = ({ to, close, children }) => (
  <li><Link to={to} onClick={close} className="block rounded-lg px-2 py-2 hover:bg-gold/10">{children}</Link></li>
);

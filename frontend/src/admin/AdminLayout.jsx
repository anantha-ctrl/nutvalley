import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Ticket, Boxes, BarChart3,
  Image as ImageIcon, Star, Undo2, Gift, Mail, MailCheck, LogOut, Menu, X, Sun, Moon,
  User, Settings, KeyRound, ChevronDown, Receipt, UserCog, FileText,
  Search, ChevronLeft, Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';

// Grouped navigation sections
const NAV_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [
      ['/admin', LayoutDashboard, 'Dashboard', true],
    ],
  },
  {
    label: 'STORE',
    items: [
      ['/admin/products', Package, 'Products'],
      ['/admin/categories', Tags, 'Categories'],
      ['/admin/inventory', Boxes, 'Inventory'],
      ['/admin/banners', ImageIcon, 'Banners'],
    ],
  },
  {
    label: 'SALES',
    items: [
      ['/admin/orders', ShoppingCart, 'Orders'],
      ['/admin/invoices', FileText, 'Invoices'],
      ['/admin/returns', Undo2, 'Returns'],
      ['/admin/coupons', Ticket, 'Coupons'],
    ],
  },
  {
    label: 'CUSTOMERS',
    items: [
      ['/admin/customers', Users, 'Customers'],
      ['/admin/reviews', Star, 'Reviews'],
      ['/admin/messages', Mail, 'Messages'],
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      ['/admin/reports', BarChart3, 'Reports'],
      ['/admin/automation', MailCheck, 'Automation'],
      ['/admin/settings', Settings, 'Settings'],
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  // Desktop sidebar collapse — remembered per browser.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('bb_admin_sidebar') === 'collapsed'; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed((c) => {
    try { localStorage.setItem('bb_admin_sidebar', c ? 'open' : 'collapsed'); } catch { /* ignore */ }
    return !c;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/'); };

  // Close account dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
        setSearchQuery('');
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Search: flatten all nav items for filtering
  const allNavItems = NAV_GROUPS.flatMap((g) => g.items.map(([to, , label]) => ({ to, label })));
  const filteredItems = searchQuery.trim()
    ? allNavItems.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Get breadcrumb from current path (incl. routes not listed in the sidebar)
  const breadcrumbItems = [
    ...allNavItems,
    { to: '/admin/billing', label: 'Billing' },
    { to: '/admin/loyalty', label: 'Loyalty' },
    { to: '/admin/cashiers', label: 'Cashiers' },
  ];
  const currentItem = breadcrumbItems.find((n) => {
    if (n.to === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(n.to);
  });
  const breadcrumb = currentItem?.label || 'Dashboard';

  const ACCOUNT_LINKS = [
    ['/profile?tab=profile', User, 'Profile'],
    ['/admin/settings', Settings, 'Settings'],
    ['/profile?tab=password', KeyRound, 'Change Password'],
  ];

  // `mini` = icon-only rail (desktop collapsed). The mobile drawer always renders full.
  const renderSidebar = (mini, mobile = false) => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={`flex items-center ${mini ? 'justify-center px-2 py-5' : 'justify-between px-5 py-5'}`}>
        <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3">
          {mini ? (
            <img src="/icon-64.png" alt="NutValley" className="h-10 w-10 rounded-xl bg-white object-contain p-0.5 shadow-glow" />
          ) : (
            <>
              <Logo white className="h-14" />
              <span className="leading-tight">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-light/80">Admin</span>
                <span className="block text-xs text-white/50">Control panel</span>
              </span>
            </>
          )}
        </Link>
        {mobile && (
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav groups — the only scrolling region */}
      <nav className={`sidebar-scroll flex-1 overflow-y-auto pb-4 ${mini ? 'px-2.5' : 'px-3'}`}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi ? 'mt-5' : 'mt-1'}>
            {mini
              ? (gi > 0 && <div className="mx-3 mb-3 border-t border-white/10" />)
              : <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map(([to, Icon, label, end]) => (
                <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                  aria-label={mini ? label : undefined} title={mini ? label : undefined}
                  className={({ isActive }) =>
                    `group/nav relative flex items-center rounded-xl text-[13.5px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-gold to-gold-dark text-white shadow-[0_6px_18px_-6px_rgba(201,151,28,0.7)]'
                        : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                    } ${mini ? 'mx-auto h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5'}`
                  }
                >
                  <Icon size={mini ? 20 : 18} className="shrink-0" />
                  {!mini && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: signed-in user + store / logout */}
      <div className={`border-t border-white/10 ${mini ? 'space-y-2 p-2.5' : 'p-3'}`}>
        {mini ? (
          <>
            <Link to="/profile" title={user?.name} className="flex justify-center"><Avatar user={user} size={36} /></Link>
            <Link to="/" title="View store" aria-label="View store" className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"><Store size={18} /></Link>
            <button onClick={handleLogout} title="Logout" aria-label="Logout" className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-rose-300 transition hover:bg-rose-500/15"><LogOut size={18} /></button>
          </>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5">
            <Link to="/profile" onClick={() => setOpen(false)}><Avatar user={user} size={38} /></Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="text-[11px] capitalize text-white/45">{user?.role || 'admin'}</p>
            </div>
            <Link to="/" title="View store" aria-label="View store" className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"><Store size={17} /></Link>
            <button onClick={handleLogout} title="Logout" aria-label="Logout" className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-500/15"><LogOut size={17} /></button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 text-ink dark:bg-ink dark:text-gray-100">
      {/* Desktop sidebar */}
      <aside className={`sticky top-0 z-40 hidden h-screen shrink-0 self-start bg-gradient-to-b from-ink via-ink to-forest-deep text-white transition-[width] duration-300 ease-out lg:block ${collapsed ? 'w-[84px]' : 'w-64'}`}>
        {renderSidebar(collapsed)}

        {/* Floating collapse toggle on the sidebar edge */}
        <button onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3.5 top-[34px] z-50 flex h-7 w-7 items-center justify-center rounded-full border border-gold/40 bg-white text-gold shadow-luxe-sm transition hover:scale-110 hover:bg-gold hover:text-white dark:bg-ink-soft">
          <ChevronLeft size={16} strokeWidth={2.5} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Mobile drawer */}
      {/* Closed drawer is `inert` (not aria-hidden): hidden from assistive tech AND unfocusable,
          so a link focused inside it before closing can't trigger the aria-hidden focus warning.
          React 18 only forwards `inert` as a string attribute. */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} inert={open ? undefined : ''}>
        <div className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
        <aside className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-gradient-to-b from-ink via-ink to-forest-deep text-white shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          {renderSidebar(false, true)}
        </aside>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 px-4 py-3 dark:border-white/10 lg:px-8">
          {/* Mobile menu button */}
          <button className="-ml-1 p-1 lg:hidden" onClick={() => setOpen(true)} aria-label="menu"><Menu /></button>

          {/* Mobile logo */}
          <Link to="/admin" className="lg:hidden">
            <Logo className="h-12" />
          </Link>

          {/* Desktop: breadcrumb (the sidebar is toggled from the round button on its edge) */}
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm text-gray-400">Admin</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold">{breadcrumb}</span>
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {/* Search */}
            <div className="relative" ref={searchRef}>
              <button onClick={() => { setSearchOpen((o) => !o); setSearchQuery(''); }}
                className="hidden items-center gap-2 rounded-xl border border-black/10 px-3 py-1.5 text-sm text-gray-400 transition hover:border-gold/30 hover:text-gold dark:border-white/10 sm:flex">
                <Search size={15} />
                <span className="hidden md:inline">Search...</span>
                <kbd className="ml-2 hidden rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 dark:bg-white/10 md:inline">⌘K</kbd>
              </button>
              {/* Mobile search icon */}
              <button onClick={() => { setSearchOpen((o) => !o); setSearchQuery(''); }}
                className="rounded-full p-2 hover:bg-gold/10 sm:hidden" aria-label="search">
                <Search size={18} />
              </button>

              {searchOpen && (
                <div className="fixed inset-x-3 top-16 z-[70] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
                  <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-glass dark:border-white/10 dark:bg-ink-soft">
                    <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
                      <Search size={16} className="text-gray-400" />
                      <input
                        type="text" autoFocus value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search pages..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      />
                      <kbd className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] text-gray-400 dark:bg-white/10">ESC</kbd>
                    </div>
                    {searchQuery.trim() && (
                      <div className="max-h-64 overflow-y-auto p-2">
                        {filteredItems.length === 0 ? (
                          <p className="px-3 py-4 text-center text-sm text-gray-400">No results found</p>
                        ) : (
                          filteredItems.map((item) => (
                            <Link key={item.to} to={item.to}
                              onClick={() => setSearchOpen(false)}
                              className="block rounded-xl px-3 py-2 text-sm transition hover:bg-gold/10">
                              {item.label}
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link to="/" className="hidden rounded-full px-3 py-1.5 text-sm text-gray-500 transition hover:text-gold dark:text-gray-400 sm:inline-flex">
              View Store
            </Link>
            <NotificationBell />
            <div className="relative pl-1" ref={menuRef}>
              <button onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-gold/10">
                <Avatar user={user} size={36} />
                <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
                <ChevronDown size={16} className={`hidden text-gray-400 transition sm:block ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="card absolute right-0 top-full mt-2 w-52 overflow-hidden p-1.5 text-sm shadow-xl">
                  <div className="border-b border-black/5 px-3 py-2 dark:border-white/10">
                    <p className="font-semibold">{user?.name}</p>
                    <p className="truncate text-xs text-gray-400">{user?.email}</p>
                  </div>
                  {ACCOUNT_LINKS.map(([to, Icon, label]) => (
                    <Link key={label} to={to} onClick={() => setMenuOpen(false)}
                      className="mt-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-gold/10">
                      <Icon size={16} className="text-gray-400" /> {label}
                    </Link>
                  ))}
                  <button onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-rose-500 transition hover:bg-rose-500/10">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

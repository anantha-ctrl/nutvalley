import { NavLink } from 'react-router-dom';
import { Home, Search, Heart, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';

/**
 * App-style bottom navigation — phones only (hidden on md+).
 */
export default function MobileTabBar() {
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { user } = useAuth();

  const tabs = [
    { to: '/', icon: Home, label: 'Home', end: true },
    { to: '/shop', icon: Search, label: 'Shop' },
    { to: '/wishlist', icon: Heart, label: 'Wishlist', badge: wishCount },
    { to: '/cart', icon: ShoppingBag, label: 'Cart', badge: count },
    { to: user ? '/profile' : '/login', icon: User, label: 'Account' },
  ];

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-black/5 pb-[env(safe-area-inset-bottom)] dark:border-white/10 md:hidden">
      <div className="flex items-stretch justify-around">
        {tabs.map(({ to, icon: Icon, label, end, badge }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                isActive ? 'text-gold' : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            <span className="relative">
              <Icon size={22} />
              {badge > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">
                  {badge}
                </span>
              )}
            </span>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

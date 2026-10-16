import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import AdminBilling from './AdminBilling';

/**
 * Billing-counter shell for cashiers — the only screen they can reach.
 * Reuses the full billing/POS component; the layout just wraps it with a
 * minimal header (brand, cashier name, theme toggle, logout).
 */
export default function CashierLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 text-ink dark:bg-ink dark:text-gray-100">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 px-4 py-3 dark:border-white/10 lg:px-8">
        <Logo className="h-9" />
        <span className="hidden items-center gap-2 font-display text-lg font-semibold sm:flex">
          <Receipt size={18} className="text-gold" /> Billing Counter
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-400">Cashier</p>
          </div>
          <Avatar user={user} size={36} />
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-rose-500 transition hover:bg-rose-500/10">
            <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="p-4 lg:p-8"><AdminBilling /></main>
    </div>
  );
}

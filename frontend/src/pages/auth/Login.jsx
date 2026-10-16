import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import PasswordInput from '../../components/PasswordInput';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(localStorage.getItem('cf_remember') !== '0');
  const [loading, setLoading] = useState(false);

  const goAfterLogin = (user) =>
    navigate(
      user.role === 'admin' ? '/admin'
        : user.role === 'cashier' ? '/cashier'
        : location.state?.from?.pathname || '/',
    );

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem('cf_remember', remember ? '1' : '0');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      goAfterLogin(user);
    } catch (err) {
      if (err.errors?.needs_verification) {
        toast('Please verify your email');
        navigate('/verify-otp', { state: { email: form.email } });
      } else toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue shopping your favourite pieces"
      footer={<>Don't have an account? <Link to="/register" className="font-semibold text-gold">Create one</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {/* iOS-style grouped fields: one rounded card, hairline divider between rows */}
        <div className="ios-group ios-group-icons">
          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" required autoComplete="email" className="input pl-11" placeholder="Email address"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <PasswordInput required icon={Lock} autoComplete="current-password" placeholder="Password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        <div className="flex items-center justify-between px-1">
          <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-gray-600 dark:text-gray-300">
            <input type="checkbox" role="switch" checked={remember} onChange={(e) => setRemember(e.target.checked)}
              className="ios-switch" />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-[15px] text-gold">Forgot password?</Link>
        </div>

        <button disabled={loading} className="btn-gold w-full">{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </AuthShell>
  );
}

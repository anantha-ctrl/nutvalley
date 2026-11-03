import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell, { Field } from './AuthShell';
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
    <AuthShell title="Welcome back" subtitle="Sign in to continue shopping your favourite nuts & dry fruits."
      footer={<>New to NutValley? <Link to="/register" className="font-semibold text-luxe-ink underline decoration-luxe-gold decoration-2 underline-offset-4 dark:text-white">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email address">
          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-luxe-ink/40" />
            <input type="email" required autoComplete="email" className="input pl-11" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </Field>

        <Field label="Password"
          aside={<Link to="/forgot-password" className="text-[13px] font-semibold text-luxe-gold hover:underline">Forgot?</Link>}>
          <PasswordInput required icon={Lock} autoComplete="current-password" placeholder="Enter your password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-luxe-ink/70 dark:text-white/70">
          <input type="checkbox" role="switch" checked={remember} onChange={(e) => setRemember(e.target.checked)}
            className="ios-switch" />
          Keep me signed in
        </label>

        <button disabled={loading} className="btn-gold group w-full">
          {loading ? 'Signing in…' : <>Sign in <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>}
        </button>
      </form>
    </AuthShell>
  );
}

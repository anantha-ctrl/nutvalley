import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell, { Field } from './AuthShell';
import PasswordInput from '../../components/PasswordInput';
import PasswordStrength from '../../components/PasswordStrength';
import { useAuth } from '../../context/AuthContext';

const ICON = 'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-luxe-ink/40';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', password_confirmation: '',
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(form.phone)) return toast.error('Enter a valid 10-digit mobile number');
    if (form.password !== form.password_confirmation) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Check your email for the OTP.');
      navigate('/verify-otp', { state: { email: form.email } });
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join NutValley for member-only offers on nuts & dry fruits."
      footer={<>Already a member? <Link to="/login" className="font-semibold text-luxe-ink underline decoration-luxe-gold decoration-2 underline-offset-4 dark:text-white">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name">
          <div className="relative">
            <User size={18} className={ICON} />
            <input required autoComplete="name" className="input pl-11" placeholder="Your name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
        </Field>
        <Field label="Email address">
          <div className="relative">
            <Mail size={18} className={ICON} />
            <input type="email" required autoComplete="email" className="input pl-11" placeholder="you@example.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </Field>
        <Field label="Mobile number">
          <div className="relative">
            <Phone size={18} className={ICON} />
            <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-[15px] text-luxe-ink/60">+91</span>
            <input type="tel" required inputMode="numeric" autoComplete="tel-national" maxLength={10}
              pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit mobile number"
              className="input pl-[4.75rem]" placeholder="98765 43210" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          </div>
        </Field>
        <Field label="Password">
          <PasswordInput required icon={Lock} autoComplete="new-password" placeholder="Min 6 characters" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <PasswordStrength value={form.password} />
        </Field>
        <Field label="Confirm password">
          <PasswordInput required icon={Lock} autoComplete="new-password" placeholder="Re-enter password" value={form.password_confirmation}
            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
          {form.password_confirmation && (
            <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${form.password === form.password_confirmation ? 'text-green-600' : 'text-red-500'}`}>
              {form.password === form.password_confirmation
                ? <><Check size={13} /> Passwords match</>
                : <><X size={13} /> Passwords don’t match</>}
            </p>
          )}
        </Field>
        <button disabled={loading} className="btn-gold group !mt-6 w-full">
          {loading ? 'Creating…' : <>Create account <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>}
        </button>
      </form>
    </AuthShell>
  );
}

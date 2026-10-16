import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import PasswordInput from '../../components/PasswordInput';
import api from '../../api/client';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);

  const token = params.get('token');
  const email = params.get('email');

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { email, token, ...form });
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  if (!token || !email) {
    return (
      <AuthShell title="Invalid link" subtitle="This reset link is invalid or expired.">
        <Link to="/forgot-password" className="btn-gold w-full">Request a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set new password" subtitle={`for ${email}`}
      footer={<Link to="/login" className="font-semibold text-gold">Back to login</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <PasswordInput required placeholder="New password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <PasswordInput required placeholder="Confirm new password" value={form.password_confirmation}
          onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
        <button disabled={loading} className="btn-gold w-full">{loading ? 'Resetting…' : 'Reset Password'}</button>
      </form>
    </AuthShell>
  );
}

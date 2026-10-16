import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import api from '../../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/api/auth/forgot-password', { email }); setSent(true); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell title="Reset password" subtitle="We'll email you a secure reset link"
      footer={<Link to="/login" className="font-semibold text-gold">Back to login</Link>}>
      {sent ? (
        <div className="card p-6 text-center">
          <p className="text-gray-300">If an account exists for <b>{email}</b>, a reset link is on its way.</p>
          <p className="mt-3 text-xs text-gray-400">Dev mode: check <code>backend/storage/mail.log</code></p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input type="email" required className="input" placeholder="Email address" value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <button disabled={loading} className="btn-gold w-full">{loading ? 'Sending…' : 'Send Reset Link'}</button>
        </form>
      )}
    </AuthShell>
  );
}

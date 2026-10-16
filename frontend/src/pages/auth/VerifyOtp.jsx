import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export default function VerifyOtp() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email;
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const refs = useRef([]);

  useEffect(() => { if (!email) navigate('/register'); }, [email]);
  useEffect(() => { const t = timer > 0 && setInterval(() => setTimer((s) => s - 1), 1000); return () => clearInterval(t); }, [timer]);

  const onChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits]; next[i] = val; setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };
  const onKey = (i, e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus(); };

  const submit = async (e) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      const user = await verifyOtp(email, otp);
      toast.success('Email verified!');
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const resend = async () => {
    try { await api.post('/api/auth/resend-otp', { email }); toast.success('OTP resent'); setTimer(30); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <AuthShell title="Verify your email" subtitle={`Enter the 6-digit code sent to ${email || ''}`}>
      <form onSubmit={submit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input key={i} ref={(el) => (refs.current[i] = el)} inputMode="numeric" maxLength={1} value={d}
              onChange={(e) => onChange(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
              className="input h-14 w-full text-center text-2xl font-bold" />
          ))}
        </div>
        <button disabled={loading} className="btn-gold w-full">{loading ? 'Verifying…' : 'Verify'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-400">
        Didn't receive it?{' '}
        {timer > 0 ? <span>Resend in {timer}s</span> : <button onClick={resend} className="font-semibold text-gold">Resend OTP</button>}
      </p>
      <p className="mt-3 rounded-xl bg-gold/5 p-3 text-center text-xs text-gray-400">
        Dev mode: OTP is written to <code>backend/storage/mail.log</code>
      </p>
    </AuthShell>
  );
}

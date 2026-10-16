import { createContext, useContext, useEffect, useState } from 'react';
import api, { isTokenExpired } from '../api/client';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Only treat the session as authenticated if BOTH a token and a user exist.
    // (Prevents a "logged in with no token" state that cascades into 401s.)
    if (!localStorage.getItem('cf_token')) {
      localStorage.removeItem('cf_user');
      return null;
    }
    try { return JSON.parse(localStorage.getItem('cf_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Re-validate with the server and adopt the FRESH token it returns (sliding
  // session). Keeps an active user logged in indefinitely; only a server 401
  // (token truly dead) ends the session.
  const syncSession = () => {
    const token = localStorage.getItem('cf_token');
    if (!token || isTokenExpired()) return Promise.resolve();
    return api.get('/api/auth/me')
      .then((res) => {
        const { token: fresh, ...userData } = res.data.data;
        persist(fresh || token, userData); // roll the 7-day window forward
      })
      .catch((err) => {
        // /me is the source of truth: a 401 means the server definitively
        // rejected the token -> clear the session so the user lands on /login.
        // Any other error (offline / 5xx) is transient -> keep the cached user.
        if (err?.response?.status === 401) logout();
      });
  };

  useEffect(() => {
    const token = localStorage.getItem('cf_token');
    if (!token) { setLoading(false); return; }
    if (isTokenExpired()) { logout(); setLoading(false); return; }

    syncSession().finally(() => setLoading(false));

    // Keep the session warm: refresh the token periodically and whenever the
    // user returns to the tab, so a long-open admin panel never lapses.
    const interval = setInterval(syncSession, 30 * 60 * 1000); // every 30 min
    const onFocus = () => syncSession();
    window.addEventListener('focus', onFocus);

    // A 401 anywhere in the app dispatches this event; reset auth state so
    // ProtectedRoute can redirect to /login instead of looping on failed calls.
    const onForcedLogout = () => logout();
    window.addEventListener('cf:logout', onForcedLogout);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('cf:logout', onForcedLogout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (token, userData) => {
    localStorage.setItem('cf_token', token);
    localStorage.setItem('cf_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    persist(data.data.token, data.data.user);
    return data.data.user;
  };

  const loginWithGoogle = async (accessToken) => {
    const { data } = await api.post('/api/auth/google', { access_token: accessToken });
    persist(data.data.token, data.data.user);
    return data.data.user;
  };

  const register = (payload) => api.post('/api/auth/register', payload).then((r) => r.data);

  const verifyOtp = async (email, otp) => {
    const { data } = await api.post('/api/auth/verify-otp', { email, otp });
    persist(data.data.token, data.data.user);
    return data.data.user;
  };

  const logout = () => {
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_user');
    setUser(null);
  };

  const updateUser = (patch) => {
    setUser((u) => {
      const next = { ...u, ...patch };
      localStorage.setItem('cf_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithGoogle, register, verifyOtp, logout, updateUser, isAdmin: user?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
}

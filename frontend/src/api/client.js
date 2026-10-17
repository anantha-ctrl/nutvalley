import axios from 'axios';
import { optimizeImages } from '../utils/cdn';

// Resolve one API origin for every page. A production build must set
// VITE_API_URL (for example https://novoclothing.in/backend); when omitted,
// use the same-origin /backend endpoint so local and deployed builds cannot
// accidentally call a different project's database.
const configuredApiURL = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const apiBaseURL = configuredApiURL || `${window.location.origin}/backend`;


const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request & set method override headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const method = (config.method || 'get').toUpperCase();
  if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
    config.headers['X-HTTP-Method-Override'] = method;
  }

  // Saves that carry an inline image (product photos, logo / landing images, UPI QR,
  // banners, payment screenshots) are pushed to Cloudinary before the server replies,
  // which easily takes longer than the default 8s — give them up to 2 minutes.
  if (config.data && config.timeout === 8000) {
    const body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
    if (body.includes('data:image') || body.length > 200 * 1024) config.timeout = 120000;
  }
  return config;
});

/**
 * Returns true only when the stored JWT is missing or its `exp` is in the past.
 * Used to decide whether a 401 is a genuine session expiry (log the user out)
 * versus a transient/server hiccup (keep the session — the token is still good).
 */
export function isTokenExpired() {
  const token = localStorage.getItem('cf_token');
  if (!token) return true;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part));
    // small skew allowance so we don't drop a session a second early
    return !payload.exp || payload.exp * 1000 < Date.now() - 5000;
  } catch {
    return true; // unparseable token = treat as expired
  }
}

const forceLogout = () => {
  localStorage.removeItem('cf_token');
  localStorage.removeItem('cf_user');
  // Tell AuthContext to clear React state; ProtectedRoute then redirects to /login.
  window.dispatchEvent(new Event('cf:logout'));
};

// Normalize errors + handle 401 globally + auto-fallback for blocked PUT/DELETE (403/404/405)
api.interceptors.response.use(
  (res) => {
    // Storefront: serve every Cloudinary image resized + WebP/AVIF (≈10× lighter).
    // Admin responses are left untouched so edit forms never save rewritten URLs.
    const url = res.config?.url || '';
    if (!url.startsWith('/api/admin') && res.data && typeof res.data === 'object') {
      optimizeImages(res.data);
    }
    return res;
  },
  async (error) => {
    const status = error.response?.status;
    const originalConfig = error.config || {};
    const method = (originalConfig.method || '').toLowerCase();

    // Auto-fallback: if the webserver blocks PUT/PATCH/DELETE with 403/404/405, retry transparently as POST
    if ((status === 403 || status === 404 || status === 405) && ['delete', 'put', 'patch'].includes(method) && !originalConfig._retriedAsPost) {
      originalConfig._retriedAsPost = true;
      originalConfig.method = 'post';
      originalConfig.headers = originalConfig.headers || {};
      originalConfig.headers['X-HTTP-Method-Override'] = method.toUpperCase();

      let url = originalConfig.url || '';
      if (method === 'delete') {
        if (url === '/api/cart') {
          url = '/api/cart/clear';
        } else if (!url.endsWith('/delete')) {
          url = `${url}/delete`;
        }
      }
      originalConfig.url = url;

      if (originalConfig.data && typeof originalConfig.data === 'string') {
        try {
          const parsed = JSON.parse(originalConfig.data);
          parsed._method = method.toUpperCase();
          originalConfig.data = JSON.stringify(parsed);
        } catch {
          // ignore JSON parse error
        }
      } else if (originalConfig.data && typeof originalConfig.data === 'object') {
        originalConfig.data._method = method.toUpperCase();
      } else {
        originalConfig.data = { _method: method.toUpperCase() };
      }

      try {
        return await api.request(originalConfig);
      } catch (retryError) {
        error = retryError;
      }
    }

    const currentStatus = error.response?.status;
    const url = error.config?.url || '';

    if (currentStatus === 401 && !url.includes('/auth/login')) {
      if (isTokenExpired() || url.includes('/auth/me')) {
        // Definitive: the token is gone/expired, or /me itself (the source of
        // truth) rejected it. End the session immediately.
        forceLogout();
      } else {
        // The token still LOOKS valid but a call 401'd — likely transient (a
        // race, a backgrounded poll, a brief hiccup). Do NOT nuke the session
        // on a single failure (that caused "Authentication required" mid-edit).
        // Verify against /me: only log out if the server truly rejects it.
        api.get('/api/auth/me').catch((e) => {
          if (e?.response?.status === 401) forceLogout();
        });
      }
    }

    let message = error.response?.data?.message;
    if (!message) {
      if (error.code === 'ECONNABORTED') message = 'The server took too long to respond — please check your connection and try again.';
      else if (!error.response) message = 'Cannot reach the server — check that Apache/XAMPP is running and you are online.';
      else if (currentStatus === 413) message = 'Upload too large — use a smaller image.';
      else message = `Something went wrong (error ${currentStatus})`;
    }
    return Promise.reject({ ...error, message, errors: error.response?.data?.errors });
  }
);

export default api;

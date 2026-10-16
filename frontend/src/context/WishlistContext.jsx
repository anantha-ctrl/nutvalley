import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();
export const useWishlist = () => useContext(WishlistContext);

const GKEY = 'cf_guest_wishlist';
const readGuest = () => { try { return JSON.parse(localStorage.getItem(GKEY)) || []; } catch { return []; } };
const writeGuest = (list) => localStorage.setItem(GKEY, JSON.stringify(list));

const slim = (p) => ({
  id: p.id, name: p.name, slug: p.slug, brand: p.brand, price: p.price, mrp: p.mrp,
  rating_avg: p.rating_avg, discount_pct: p.discount_pct,
  image: p.image || p.images?.[0]?.image_url || null,
});

export function WishlistProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState(readGuest());
  const merged = useRef(false);

  const isAuthed = () => user && localStorage.getItem('cf_token');

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!user) { setItems(readGuest()); return; }
    try { const { data } = await api.get('/api/wishlist'); setItems(data.data); } catch { /* ignore */ }
  }, [user, authLoading]);

  // On login: merge the guest wishlist into the account. On logout: show guest list.
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (!merged.current) {
        merged.current = true;
        const guest = readGuest();
        if (guest.length) {
          Promise.all(guest.map((p) => api.post('/api/wishlist', { product_id: p.id }).catch(() => {})))
            .then(() => { writeGuest([]); refresh(); });
          return;
        }
      }
      refresh();
    } else {
      merged.current = false;
      setItems(readGuest());
    }
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const ids = new Set(items.map((i) => i.id));
  const has = (productId) => ids.has(productId);

  const toggle = async (product) => {
    const id = typeof product === 'object' ? product.id : product;

    if (isAuthed()) {
      try {
        if (has(id)) {
          try {
            await api.post(`/api/wishlist/${id}/delete`, { _method: 'DELETE' });
          } catch (e1) {
            await api.delete(`/api/wishlist/${id}`);
          }
          setItems((prev) => prev.filter((i) => i.id !== id));
        } else {
          await api.post('/api/wishlist', { product_id: id });
          toast.success('Added to wishlist');
          refresh();
        }
      } catch (e) {
        toast.error(e.response?.status === 401 ? 'Please log in to use your wishlist' : e.message);
      }
      return;
    }

    // Guest mode — keep it in localStorage.
    const guest = readGuest();
    if (guest.some((i) => i.id === id)) {
      const next = guest.filter((i) => i.id !== id);
      writeGuest(next); setItems(next);
    } else if (typeof product === 'object') {
      const next = [slim(product), ...guest];
      writeGuest(next); setItems(next);
      toast.success('Added to wishlist');
    } else {
      toast.error('Please log in to use your wishlist');
    }
  };

  return (
    <WishlistContext.Provider value={{ items, has, toggle, refresh, count: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

// Public, store-wide config (announcement bar, socials, contact, shipping…)
// fetched once at app boot from /api/store-info and shared everywhere.
const DEFAULTS = {
  name: 'Beadsboutique',
  logo: '',
  email: 'beadsboutiquejewellery@gmail.com',
  phone: '+91 98765 43210',
  address: 'Bengaluru, India',
  announcement: '',
  free_shipping_min: 1999,
  instagram: '',
  facebook: '',
  twitter: '',
  whatsapp: '',
};

const StoreContext = createContext(DEFAULTS);
export const useStore = () => useContext(StoreContext);

export function StoreProvider({ children }) {
  const [store, setStore] = useState(DEFAULTS);

  useEffect(() => {
    api.get('/api/store-info')
      .then((r) => setStore((s) => ({ ...s, ...r.data.data })))
      .catch(() => { });
  }, []);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

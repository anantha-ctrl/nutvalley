import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const CompareContext = createContext();
export const useCompare = () => useContext(CompareContext);

const KEY = 'cf_compare';
const MAX = 4;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

/** Compare tray holds up to 4 product slugs, persisted in localStorage. */
export function CompareProvider({ children }) {
  const [slugs, setSlugs] = useState(read);

  const persist = (list) => { localStorage.setItem(KEY, JSON.stringify(list)); setSlugs(list); };

  const has = useCallback((slug) => slugs.includes(slug), [slugs]);

  const toggle = useCallback((slug) => {
    setSlugs((cur) => {
      let next;
      if (cur.includes(slug)) {
        next = cur.filter((s) => s !== slug);
      } else if (cur.length >= MAX) {
        toast.error(`You can compare up to ${MAX} products`);
        return cur;
      } else {
        next = [...cur, slug];
      }
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((slug) => persist(read().filter((s) => s !== slug)), []);
  const clear = useCallback(() => persist([]), []);

  return (
    <CompareContext.Provider value={{ slugs, has, toggle, remove, clear, max: MAX }}>
      {children}
    </CompareContext.Provider>
  );
}

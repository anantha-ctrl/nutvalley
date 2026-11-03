import { useStore } from '../context/StoreContext';

/**
 * Brand logo (the full Nut Valley badge).
 *  - When an admin has uploaded a store logo (Settings → Brand), show it as-is.
 *  - Otherwise use the bundled `/Nut_Valley_Logo.png` (also used on invoices and
 *    emails). Its cream background matches the site, so it needs no card on
 *    light surfaces; on dark surfaces (`white`) it sits as a rounded cream tile.
 */
export default function Logo({ className = 'h-12', white }) {
  const { logo, name } = useStore();
  const src = logo || '/Nut_Valley_Logo.png';
  const tile = white ? 'rounded-xl bg-luxe-bg p-1 shadow-luxe-sm' : 'rounded-lg';

  return (
    <img
      src={src}
      alt={name || 'NutValley'}
      className={`w-auto object-contain ${tile} ${className}`}
    />
  );
}

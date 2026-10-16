import { useStore } from '../context/StoreContext';

/**
 * Brand logo (Beadsboutique Jewellery wordmark).
 *  - When an admin has uploaded a store logo (Settings → Brand), show it as-is.
 *  - Otherwise use the bundled `/logo.webp` (same artwork as `/logo.png`, lighter
 *    for page loads). It is a full-colour logo on a white background, so on dark
 *    surfaces it sits on a small white card to keep the background from clashing.
 *  - `white` marks a dark surface (footer, auth panel, landing nav over the dark
 *    hero) regardless of the active theme; otherwise the card appears only in dark mode.
 */
export default function Logo({ className = 'h-10', white }) {
  const { logo, name } = useStore();
  const src = logo || '/logo.webp';
  const card = white ? 'rounded-lg bg-white p-1' : 'rounded-lg dark:bg-white dark:p-1';

  return (
    <img
      src={src}
      alt={name || 'Beadsboutique'}
      className={`w-auto object-contain ${card} ${className}`}
    />
  );
}

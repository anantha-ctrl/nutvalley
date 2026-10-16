import { Check } from 'lucide-react';

// Small reusable UI primitives.

/** Themed checkbox — light border when unchecked, gold fill + white tick when checked.
 *  Replaces the native black checkbox that renders poorly on dark backgrounds. */
export const Checkbox = ({ checked, onChange, className = '' }) => (
  <span className={`relative inline-flex h-4 w-4 shrink-0 ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 bg-white transition checked:border-gold checked:bg-gold focus:outline-none focus:ring-2 focus:ring-gold/40 dark:border-white/25 dark:bg-white/5 dark:checked:bg-gold"
    />
    <Check
      size={12}
      strokeWidth={3.5}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-ink opacity-0 transition peer-checked:opacity-100"
    />
  </span>
);

export const Spinner = ({ className = '' }) => (
  <div className={`flex items-center justify-center py-16 ${className}`}>
    <div className="relative flex h-14 w-14 items-center justify-center">
      {/* spinning gold ring */}
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-gold/25 border-t-gold" />
      {/* brand logo, gently pulsing */}
      <img src="/icon-192.png" alt="Loading" className="h-9 w-9 animate-pulse rounded-full object-contain" />
    </div>
  </div>
);

export const SectionTitle = ({ eyebrow, title, action }) => (
  <div className="mb-8 flex items-end justify-between">
    <div>
      {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-gold">{eyebrow}</p>}
      <h2 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
    </div>
    {action}
  </div>
);

export const Empty = ({ icon: Icon, title, subtitle, children }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    {Icon && <Icon size={48} className="mb-4 text-gold/60" />}
    <h3 className="text-xl font-semibold">{title}</h3>
    {subtitle && <p className="mt-1 text-gray-400">{subtitle}</p>}
    {children && <div className="mt-6">{children}</div>}
  </div>
);

export const Skeleton = () => (
  <div className="card aspect-[3/4] shimmer bg-black/5 dark:bg-white/5" />
);

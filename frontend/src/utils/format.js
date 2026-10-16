export const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);

export const discountPct = (price, mrp) =>
  mrp > 0 ? Math.round((100 * (mrp - price)) / mrp) : 0;

export const dateFmt = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d.replace(' ', 'T')).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return dateFmt(d);
};

export const statusColor = {
  pending: 'bg-amber-500/15 text-amber-500',
  processing: 'bg-blue-500/15 text-blue-500',
  packed: 'bg-indigo-500/15 text-indigo-500',
  shipped: 'bg-cyan-500/15 text-cyan-500',
  delivered: 'bg-emerald-500/15 text-emerald-500',
  cancelled: 'bg-rose-500/15 text-rose-500',
  paid: 'bg-emerald-500/15 text-emerald-500',
  failed: 'bg-rose-500/15 text-rose-500',
};

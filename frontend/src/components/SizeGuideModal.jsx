import { X } from 'lucide-react';

const GUIDE = {
  label: 'Pack sizes (approx. servings at 30 g a day)',
  head: ['Pack', 'Servings', 'Lasts one person'],
  rows: [
    ['100 g', '3', '3 days'],
    ['250 g', '8', '~1 week'],
    ['500 g', '16', '~2 weeks'],
    ['1 kg', '33', '~1 month'],
  ],
  tip: 'Store in an air-tight container in a cool, dry place. Refrigerate after opening for longer freshness.',
};

export default function SizeGuideModal({ sizes = [], onClose }) {
  const packs = (sizes || []).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="card relative w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-2 hover:bg-luxe-cream"><X size={18} /></button>
        <h3 className="font-display text-2xl font-bold">Pack Size Guide</h3>
        <p className="mt-1 text-sm text-gray-400">{GUIDE.label} — servings are approximate.</p>

        {/* Real available packs for THIS product, straight from the DB variants */}
        {packs.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">Available packs</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {packs.map((s) => (
                <span key={s} className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-1 text-sm font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gold/10 text-gold">
                {GUIDE.head.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {GUIDE.rows.map((r, i) => (
                <tr key={i} className="border-b border-black/5 dark:border-white/10">
                  {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-semibold' : 'text-gray-500 dark:text-gray-300'}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-400">Tip: {GUIDE.tip}</p>
      </div>
    </div>
  );
}

import { X } from 'lucide-react';

const TABLE = {
  ring: {
    label: 'Ring sizing (Indian sizes, by inner diameter)',
    head: ['Indian Size', 'Diameter (mm)', 'Circumference (mm)'],
    rows: [
      ['8', '15.3', '48.0'],
      ['10', '15.9', '50.0'],
      ['12', '16.5', '51.8'],
      ['14', '17.2', '54.0'],
      ['16', '17.8', '55.9'],
      ['18', '18.5', '58.1'],
    ],
    tip: 'Measure the inside of a ring that already fits the same finger, and size up if in between.',
  },
  bracelet: {
    label: 'Bracelet & anklet sizing (by wrist / ankle)',
    head: ['Size', 'Wrist (cm)', 'Bracelet (cm)', 'Anklet (cm)'],
    rows: [
      ['S', '14 – 15', '16', '22'],
      ['M', '15 – 16.5', '17.5', '24'],
      ['L', '16.5 – 18', '19', '26'],
      ['XL', '18 – 19.5', '20.5', '28'],
    ],
    tip: 'Wrap a soft tape just above the wrist bone and add 1–2 cm for a comfortable fit.',
  },
  necklace: {
    label: 'Necklace lengths (how they sit)',
    head: ['Style', 'Length (in)', 'Sits at'],
    rows: [
      ['Choker', '14 – 16', 'Base of the neck'],
      ['Princess', '17 – 19', 'Just below the collarbone'],
      ['Matinee', '20 – 24', 'Top of the bust'],
      ['Opera', '28 – 36', 'Bust line or below'],
    ],
    tip: 'Lay a string around your neck where you want it to sit, then measure the string.',
  },
};

/**
 * Picks the right guide from the product's category and its ACTUAL variant sizes
 * (real DB data), so a ring never shows a necklace chart and vice-versa.
 */
function pickGuide(category = '', sizes = []) {
  const cat = category.toLowerCase();
  const sizeStr = (sizes || []).join(' ');

  if (/ring/.test(cat) && !/ear/.test(cat)) return 'ring';
  if (/bracelet|bangle|anklet|kada/.test(cat)) return 'bracelet';
  if (/necklace|chain|choker|pendant|mala/.test(cat)) return 'necklace';
  if (/^\s*\d{1,2}(\s|$)/.test(sizeStr)) return 'ring';
  return 'bracelet';
}

export default function SizeGuideModal({ category, sizes = [], onClose }) {
  const key = pickGuide(category, sizes);
  const data = TABLE[key];
  const packs = (sizes || []).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="card relative w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-2 hover:bg-gold/10"><X size={18} /></button>
        <h3 className="font-display text-2xl font-bold">Jewellery Size Guide</h3>
        <p className="mt-1 text-sm text-gray-400">{data.label} — measurements are approximate.</p>

        {/* Real available sizes for THIS product, straight from the DB variants */}
        {packs.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">Available sizes</p>
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
                {data.head.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i} className="border-b border-black/5 dark:border-white/10">
                  {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-semibold' : 'text-gray-500 dark:text-gray-300'}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-400">Tip: {data.tip}</p>
      </div>
    </div>
  );
}

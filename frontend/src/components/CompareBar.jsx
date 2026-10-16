import { useNavigate } from 'react-router-dom';
import { Scale, X } from 'lucide-react';
import { useCompare } from '../context/CompareContext';

/** Floating bar that appears when products are selected for comparison. */
export default function CompareBar() {
  const { slugs, clear, max } = useCompare();
  const navigate = useNavigate();
  if (slugs.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-ink/95 px-4 py-3 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-sm">
          <Scale size={16} className="text-gold" />
          {slugs.length} of {max} selected to compare
        </span>
        <div className="flex items-center gap-2">
          <button onClick={clear} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:text-white">
            <X size={14} /> Clear
          </button>
          <button onClick={() => navigate('/compare')} disabled={slugs.length < 2}
            className="btn-gold !py-2 text-sm disabled:opacity-50">
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}

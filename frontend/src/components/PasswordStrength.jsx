import { Check, X } from 'lucide-react';

// Live password-strength meter + rule checklist. Pure UI — no validation gating.
const RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
  { label: 'One symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const LEVELS = [
  { label: 'Weak', bar: 'bg-red-500', text: 'text-red-500' },
  { label: 'Fair', bar: 'bg-orange-500', text: 'text-orange-500' },
  { label: 'Good', bar: 'bg-yellow-500', text: 'text-yellow-600' },
  { label: 'Strong', bar: 'bg-green-500', text: 'text-green-600' },
];

export default function PasswordStrength({ value = '' }) {
  if (!value) return null;
  const passed = RULES.filter((r) => r.test(value)).length;
  const level = LEVELS[Math.max(0, passed - 1)] || LEVELS[0];

  return (
    <div className="mt-2 space-y-2">
      {/* segmented bar */}
      <div className="flex gap-1.5">
        {RULES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < passed ? level.bar : 'bg-black/10 dark:bg-white/10'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${level.text}`}>{level.label} password</p>

      {/* rule checklist */}
      <ul className="grid grid-cols-2 gap-1 text-xs">
        {RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.label} className={`flex items-center gap-1.5 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
              {ok ? <Check size={13} /> : <X size={13} />} {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

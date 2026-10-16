import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password field with a show/hide toggle.
 * Forwards all standard input props (value, onChange, placeholder, required, …).
 */
export default function PasswordInput({ className = '', icon: Icon, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {Icon && <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />}
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`input ${Icon ? 'pl-11' : ''} pr-11 ${className}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gold"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

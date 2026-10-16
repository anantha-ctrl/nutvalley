import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * Premium magnetic button — follows the cursor slightly on hover, springs back
 * on leave. Pass `to` to navigate, or `onClick` for custom actions.
 */
export default function MagneticButton({ children, to, onClick, className = '', strength = 0.4, ...props }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 180, damping: 14, mass: 0.4 });
  const y = useSpring(my, { stiffness: 180, damping: 14, mass: 0.4 });

  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * strength);
    my.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { mx.set(0); my.set(0); };

  const handleClick = (e) => {
    onClick?.(e);
    if (to) navigate(to);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={move}
      onMouseLeave={reset}
      onClick={handleClick}
      style={{ x, y }}
      whileTap={{ scale: 0.95 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

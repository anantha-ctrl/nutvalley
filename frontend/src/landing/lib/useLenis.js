import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Buttery smooth-scroll for the landing experience.
 * Runs a single RAF loop and tears down cleanly on unmount so the rest of the
 * app (admin, storefront) keeps native scrolling.
 */
export default function useLenis(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    // Respect reduced-motion users — no hijacked scroll.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let raf = 0;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [enabled]);
}

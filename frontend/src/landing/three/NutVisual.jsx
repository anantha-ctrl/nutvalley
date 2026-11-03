import { useEffect, useState } from 'react';
import { kindFor } from './nuts';
import { renderNut } from './nutRender';

// Seed data and empty slots use placehold.co text images — those are not real photos.
export const isRealImage = (src) => !!src && !/placehold\.co/i.test(src);

/**
 * Shows the real photo when there is one; otherwise a 3D-rendered pile of the
 * matching nut (picked from `kind`, or guessed from `label`, e.g. a category or
 * product name) on a soft brand backdrop.
 */
export default function NutVisual({ src, label = '', kind, alt = '', className = '', imgClassName = '', dark = false, w = 600, h = 750 }) {
  const real = isRealImage(src);
  const k = kind || kindFor(label);
  const [render, setRender] = useState(null);

  useEffect(() => {
    if (real) return undefined;
    let live = true;
    renderNut(k, w, h).then((url) => { if (live) setRender(url); });
    return () => { live = false; };
  }, [real, k, w, h]);

  if (real) return <img src={src} alt={alt || label} loading="lazy" className={`${className} ${imgClassName}`} />;

  return (
    <div className={`relative overflow-hidden ${dark
      ? 'bg-[radial-gradient(ellipse_at_50%_35%,#2f7a3b_0%,#1a4d23_45%,#0f3316_100%)]'
      : 'bg-[radial-gradient(ellipse_at_50%_35%,#ffffff_0%,#fbf6ea_55%,#efe3c4_100%)]'} ${className}`}>
      {render ? (
        // The render is composed for its frame — always fit it whole (callers' object-cover is for photos).
        <img src={render} alt={alt || label} draggable={false}
          className={`h-full w-full object-contain ${imgClassName.replace(/\bobject-(cover|contain|\[[^\]]*\])/g, '')}`} />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      )}
    </div>
  );
}

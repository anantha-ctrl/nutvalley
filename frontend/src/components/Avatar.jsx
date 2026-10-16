import { useEffect, useState } from 'react';

/**
 * Round profile photo for the signed-in user (users.avatar_url — uploaded photo or
 * Google picture). Falls back to the name's first letter when there is no photo or
 * it fails to load.
 */
export default function Avatar({ user, size = 36, className = '' }) {
  const [broken, setBroken] = useState(false);
  const src = user?.avatar_url;
  useEffect(() => setBroken(false), [src]);

  const style = { width: size, height: size, minWidth: size };
  if (src && !broken) {
    return (
      <img src={src} alt={user?.name || 'Profile'} style={style} onError={() => setBroken(true)}
        className={`rounded-full object-cover ring-2 ring-gold/30 ${className}`} />
    );
  }
  return (
    <div style={{ ...style, fontSize: size * 0.42 }}
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark font-bold uppercase text-ink ${className}`}>
      {user?.name?.[0] || '?'}
    </div>
  );
}

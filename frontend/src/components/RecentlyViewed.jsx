import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ProductCard from './ProductCard';
import { SectionTitle } from './ui';

/** Reads the local recently-viewed list (works for guests). */
export function getLocalRecent() {
  try { return JSON.parse(localStorage.getItem('cf_recent')) || []; } catch { return []; }
}

/** Pushes a product onto the recently-viewed list (most-recent first, max 12, deduped). */
export function pushLocalRecent(product) {
  if (!product?.id) return;
  const img = product.image || product.images?.[0]?.image_url || null;
  const slim = {
    id: product.id, name: product.name, slug: product.slug, brand: product.brand,
    price: product.price, mrp: product.mrp, rating_avg: product.rating_avg,
    discount_pct: product.discount_pct,
    // Never persist heavy base64 data-URIs to localStorage — they blow the
    // ~5MB quota and make setItem throw. Keep only real (http) image URLs.
    image: img && img.startsWith('data:') ? null : img,
  };
  const list = [slim, ...getLocalRecent().filter((p) => p.id !== product.id)].slice(0, 12);
  try {
    localStorage.setItem('cf_recent', JSON.stringify(list));
  } catch {
    // Quota exceeded (likely legacy base64 entries) — reset to just this item.
    try { localStorage.setItem('cf_recent', JSON.stringify([slim])); } catch { /* ignore */ }
  }
}

export default function RecentlyViewed({ excludeId, title = 'Recently Viewed', limit = 4 }) {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      api.get('/api/recently-viewed')
        .then((r) => setItems(r.data.data))
        .catch(() => setItems(getLocalRecent()));
    } else {
      setItems(getLocalRecent());
    }
  }, [user, loading]);

  const list = items.filter((p) => p.id !== excludeId).slice(0, limit);
  if (list.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <SectionTitle eyebrow="Pick up where you left off" title={title} />
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Star, ShoppingBag, Scale } from 'lucide-react';
import api from '../api/client';
import { inr, discountPct } from '../utils/format';
import { useCompare } from '../context/CompareContext';
import { useCart } from '../context/CartContext';
import { Spinner, Empty } from '../components/ui';
import Seo from '../components/Seo';

export default function Compare() {
  const { slugs, remove, clear } = useCompare();
  const { add } = useCart();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    if (!slugs.length) { setProducts([]); return; }
    Promise.all(slugs.map((s) => api.get(`/api/products/${s}`).then((r) => r.data.data).catch(() => null)))
      .then((list) => setProducts(list.filter(Boolean)));
  }, [slugs.join(',')]);

  if (!products) return <Spinner className="min-h-[50vh]" />;

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Empty icon={Scale} title="Nothing to compare yet"
          subtitle="Add products to compare using the ⚖ button on any product card.">
          <Link to="/shop" className="btn-gold">Browse products</Link>
        </Empty>
      </div>
    );
  }

  // Union of specification keys across the compared products.
  const specKeys = [...new Set(products.flatMap((p) => Object.keys(p.specifications || {})))];

  const Cell = ({ children, className = '' }) => (
    <td className={`border-b border-black/5 p-4 align-top dark:border-white/10 ${className}`}>{children}</td>
  );
  const RowHead = ({ children }) => (
    <td className="border-b border-black/5 p-4 text-sm font-semibold text-gray-500 dark:border-white/10 dark:text-gray-300">{children}</td>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Seo title="Compare Products" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Compare</h1>
        <button onClick={clear} className="btn-outline !py-2 text-sm">Clear all</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <tbody>
            {/* Product header row */}
            <tr>
              <RowHead> </RowHead>
              {products.map((p) => (
                <Cell key={p.id} className="text-center">
                  <div className="relative">
                    <button onClick={() => remove(p.slug)}
                      className="absolute -right-1 -top-1 rounded-full bg-black/60 p-1 text-white hover:bg-rose-500">
                      <X size={12} />
                    </button>
                    <Link to={`/product/${p.slug}`}>
                      <img src={p.images?.[0]?.image_url || p.image} alt={p.name}
                        className="mx-auto h-36 w-28 rounded-xl object-cover" />
                      <p className="mt-2 line-clamp-2 text-sm font-medium hover:text-gold">{p.name}</p>
                    </Link>
                  </div>
                </Cell>
              ))}
            </tr>
            <tr>
              <RowHead>Price</RowHead>
              {products.map((p) => (
                <Cell key={p.id} className="text-center">
                  <span className="text-lg font-semibold">{inr(p.price)}</span>
                  {p.mrp > p.price && <span className="ml-1 text-xs text-gray-400 line-through">{inr(p.mrp)}</span>}
                  {discountPct(p.price, p.mrp) > 0 && <div className="text-xs font-semibold text-emerald-500">{discountPct(p.price, p.mrp)}% off</div>}
                </Cell>
              ))}
            </tr>
            <tr>
              <RowHead>Rating</RowHead>
              {products.map((p) => (
                <Cell key={p.id} className="text-center">
                  {Number(p.rating_avg) > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <Star size={14} className="fill-amber-500" /> {Number(p.rating_avg).toFixed(1)}
                      <span className="text-gray-400">({p.rating_count})</span>
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </Cell>
              ))}
            </tr>
            <tr>
              <RowHead>Brand</RowHead>
              {products.map((p) => <Cell key={p.id} className="text-center text-sm">{p.brand || '—'}</Cell>)}
            </tr>
            <tr>
              <RowHead>Availability</RowHead>
              {products.map((p) => (
                <Cell key={p.id} className="text-center text-sm">
                  {p.stock > 0 ? <span className="text-emerald-500">In stock</span> : <span className="text-rose-500">Out of stock</span>}
                </Cell>
              ))}
            </tr>
            {specKeys.map((k) => (
              <tr key={k}>
                <RowHead>{k}</RowHead>
                {products.map((p) => <Cell key={p.id} className="text-center text-sm">{p.specifications?.[k] || '—'}</Cell>)}
              </tr>
            ))}
            <tr>
              <RowHead> </RowHead>
              {products.map((p) => (
                <Cell key={p.id} className="text-center">
                  <button onClick={() => add(p)} className="btn-gold !py-2 text-sm">
                    <ShoppingBag size={14} /> Add to Cart
                  </button>
                </Cell>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingBag, Eye, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import { inr, discountPct } from '../utils/format';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import QuickViewModal from './QuickViewModal';
import Tilt3D from '../landing/lib/Tilt3D';
import { productImage } from '../utils/productImage';

export default function ProductCard({ product }) {
  const { has, toggle } = useWishlist();
  const { add } = useCart();
  const compare = useCompare();
  const [quickView, setQuickView] = useState(false);
  const pct = product.discount_pct ?? discountPct(product.price, product.mrp);
  const wished = has(product.id);

  return (
    <>
    <Tilt3D max={6} scale={1.02} className="h-full">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group card h-full overflow-hidden"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <Link to={`/product/${product.slug}`}>
          <img
            src={productImage(product)}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />
        </Link>
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {pct > 0 && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ink">-{pct}%</span>
          )}
          {Number(product.is_trending) === 1 ? (
            <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">🔥 Trending</span>
          ) : Number(product.sold_count) >= 100 ? (
            <span className="rounded-full bg-ink/85 px-2.5 py-1 text-xs font-bold text-gold backdrop-blur">⭐ Best Seller</span>
          ) : null}
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            onClick={() => toggle(product)}
            className="rounded-full bg-white/80 p-2 backdrop-blur transition hover:scale-110 dark:bg-black/40"
            aria-label="wishlist"
          >
            <Heart size={18} className={wished ? 'fill-rose-500 text-rose-500' : ''} />
          </button>
          <button
            onClick={() => setQuickView(true)}
            className="rounded-full bg-white/80 p-2 opacity-0 backdrop-blur transition hover:scale-110 group-hover:opacity-100 dark:bg-black/40"
            aria-label="quick view"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => compare.toggle(product.slug)}
            className={`rounded-full p-2 backdrop-blur transition hover:scale-110 ${compare.has(product.slug) ? 'bg-gold text-ink' : 'bg-white/80 opacity-0 group-hover:opacity-100 dark:bg-black/40'}`}
            aria-label="compare" title="Compare"
          >
            <Scale size={18} />
          </button>
        </div>
        <button
          onClick={() => add(product)}
          className="absolute inset-x-3 bottom-3 flex translate-y-0 items-center justify-center gap-2 rounded-full bg-ink/90 py-2.5 text-sm font-semibold text-white opacity-100 backdrop-blur transition lg:translate-y-4 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
        >
          <ShoppingBag size={16} /> Quick Add
        </button>
      </div>

      <div className="p-4">
        {product.brand && <p className="text-xs uppercase tracking-wider text-gold">{product.brand}</p>}
        <Link to={`/product/${product.slug}`}>
          <h3 className="mt-1 line-clamp-1 font-medium hover:text-gold">{product.name}</h3>
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-lg font-semibold">{inr(product.price)}</span>
          {product.mrp > product.price && (
            <span className="text-sm text-gray-400 line-through">{inr(product.mrp)}</span>
          )}
          {Number(product.rating_avg) > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-500">
              <Star size={13} className="fill-amber-500" /> {Number(product.rating_avg).toFixed(1)}
              {Number(product.rating_count) > 0 && (
                <span className="text-gray-400">({product.rating_count})</span>
              )}
            </span>
          )}
        </div>
      </div>

    </motion.div>
    </Tilt3D>
    {quickView && <QuickViewModal slug={product.slug} onClose={() => setQuickView(false)} />}
    </>
  );
}

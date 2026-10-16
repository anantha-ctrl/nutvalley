import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Star, Heart, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function QuickViewModal({ slug, onClose }) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const [product, setProduct] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    api.get(`/api/products/${slug}`).then((r) => setProduct(r.data.data)).catch(() => onClose());
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [slug]);

  const variant = product?.variants?.find(
    (v) => (!product.sizes.length || v.size === size) && (!product.colors.length || v.color === color)
  );
  const inStock = (variant?.stock ?? product?.stock ?? 0) > 0;

  // Live price for the selected size/variant: prefer its absolute price,
  // else fall back to base + legacy price_diff, else the base price.
  const displayPrice = variant?.price != null
    ? Number(variant.price)
    : Number(product?.price || 0) + Number(variant?.price_diff || 0);
  const displayMrp = variant?.mrp != null ? Number(variant.mrp) : Number(product?.mrp || 0);
  const displayDiscount = displayMrp > displayPrice
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : 0;

  const addToCart = () => {
    if (product.sizes.length && !size) return toast.error('Please select a size');
    if (product.colors.length && !color) return toast.error('Please select a color');
    add(product, variant?.id ?? null, qty, variant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="relative ml-auto h-full w-full max-w-md overflow-y-auto bg-white shadow-glass dark:bg-ink-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-2 dark:bg-black/40"><X size={18} /></button>
        {!product ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-5">
            <div>
              <div className="aspect-[3/4] overflow-hidden rounded-xl">
                <img src={product.images?.[activeImg]?.image_url} alt={product.name} className="h-full w-full object-cover" />
              </div>
              <div className="mt-3 flex gap-2">
                {product.images?.slice(0, 4).map((img, i) => (
                  <button key={img.id} onClick={() => setActiveImg(i)}
                    className={`h-14 w-12 overflow-hidden rounded-lg border-2 ${i === activeImg ? 'border-gold' : 'border-transparent opacity-60'}`}>
                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              {product.brand && <p className="text-xs uppercase tracking-widest text-gold">{product.brand}</p>}
              <h2 className="mt-1 font-display text-2xl font-bold">{product.name}</h2>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1 text-amber-500"><Star size={14} className="fill-amber-500" /> {Number(product.rating_avg).toFixed(1)}</span>
                <span className="text-gray-400">({product.rating_count})</span>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-2xl font-bold">{inr(displayPrice)}</span>
                {displayMrp > displayPrice && <span className="text-gray-400 line-through">{inr(displayMrp)}</span>}
                {displayDiscount > 0 && <span className="rounded bg-gold/15 px-2 py-0.5 text-sm font-semibold text-gold">{displayDiscount}% OFF</span>}
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-gray-500 dark:text-gray-300">{product.description}</p>

              {product.sizes?.length > 0 && (
                <Picker label="Size" options={product.sizes} value={size} onChange={setSize} />
              )}
              {product.colors?.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider">Color</p>
                  <div className="flex gap-2">
                    {product.colors.map((c) => (
                      <button key={c.color} onClick={() => setColor(c.color)} title={c.color}
                        className={`h-8 w-8 rounded-full border-2 ${color === c.color ? 'border-gold scale-110' : 'border-black/10 dark:border-white/20'}`}
                        style={{ background: c.hex || '#ccc' }} />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center rounded-full border border-black/10 dark:border-white/10">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5"><Minus size={14} /></button>
                  <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="p-2.5"><Plus size={14} /></button>
                </div>
                <span className={`text-sm ${inStock ? 'text-emerald-500' : 'text-rose-500'}`}>{inStock ? 'In Stock' : 'Out of Stock'}</span>
              </div>

              <div className="mt-5 flex gap-2">
                <button onClick={addToCart} disabled={!inStock} className="btn-gold flex-1">Add to Cart</button>
                <button onClick={() => toggle(product)} className="btn-outline !px-4" aria-label="wishlist">
                  <Heart size={18} className={has(product.id) ? 'fill-rose-500 text-rose-500' : ''} />
                </button>
              </div>
              <Link to={`/product/${product.slug}`} onClick={onClose} className="mt-3 block text-center text-sm text-gold hover:underline">
                View full details →
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

const Picker = ({ label, options, value, onChange }) => (
  <div className="mt-4">
    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)}
          className={`min-w-[2.5rem] rounded-lg border px-3 py-1.5 text-sm ${value === o ? 'border-gold bg-gold/10 text-gold' : 'border-black/10 dark:border-white/10'}`}>
          {o}
        </button>
      ))}
    </div>
  </div>
);

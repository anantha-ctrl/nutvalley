import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, Truck, RefreshCw, ShieldCheck, Minus, Plus, BadgeCheck, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import { Spinner, SectionTitle } from '../components/ui';
import Seo from '../components/Seo';
import RecentlyViewed, { pushLocalRecent } from '../components/RecentlyViewed';
import SizeGuideModal from '../components/SizeGuideModal';
import NotifyStock from '../components/NotifyStock';
import ShareButtons from '../components/ShareButtons';
import { Ruler } from 'lucide-react';

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [fbt, setFbt] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [sizeGuide, setSizeGuide] = useState(false);
  const touchX = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setProduct(null);
    let cancelled = false;
    api.get(`/api/products/${slug}`)
      .then((r) => {
        if (cancelled) return;
        const p = r.data.data;
        setProduct(p);
        try { pushLocalRecent(p); } catch { /* localStorage quota — ignore */ }
        const id = p.id;
        api.get(`/api/products/${slug}/related`).then((x) => !cancelled && setRelated(x.data.data)).catch(() => {});
        api.get(`/api/products/${slug}/frequently-bought`).then((x) => !cancelled && setFbt(x.data.data)).catch(() => {});
        api.get(`/api/products/${id}/reviews`).then((x) => !cancelled && setReviews(x.data.data)).catch(() => {});
        if (user) api.post('/api/recently-viewed', { product_id: id }).catch(() => {});
      })
      // Only a genuine failure of the product fetch should show this.
      .catch(() => { if (!cancelled) toast.error('Product not found'); });
    return () => { cancelled = true; };
  }, [slug, user]);

  if (!product) return <Spinner className="min-h-[60vh]" />;

  const variant = product.variants?.find((v) => (!product.sizes.length || v.size === size) && (!product.colors.length || v.color === color));
  const inStock = (variant?.stock ?? product.stock) > 0;
  // Selling price for the selected variant: its own manual price, else base (+ legacy price_diff).
  const displayPrice = variant?.price != null
    ? Number(variant.price)
    : Number(product.price) + (Number(variant?.price_diff) || 0);
  // MRP for the selected variant: its own MRP, else the product base MRP.
  const displayMrp = variant?.mrp != null ? Number(variant.mrp) : Number(product.mrp || 0);

  const validateSelection = () => {
    if (product.sizes.length && !size) { toast.error('Please select a size'); return false; }
    if (product.colors.length && !color) { toast.error('Please select a color'); return false; }
    return true;
  };

  const addToCart = () => {
    if (!validateSelection()) return;
    add(product, variant?.id ?? null, qty, variant);
  };

  const buyNow = async () => {
    if (!validateSelection()) return;
    const ok = await add(product, variant?.id ?? null, qty, variant);
    if (ok) navigate('/checkout');
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please log in to review');
    try {
      await api.post(`/api/products/${product.id}/reviews`, reviewForm);
      toast.success('Review submitted');
      const [x, p] = await Promise.all([
        api.get(`/api/products/${product.id}/reviews`),
        api.get(`/api/products/${slug}`)
      ]);
      setReviews(x.data.data);
      if (p.data?.data) setProduct(p.data.data);
      setReviewForm({ rating: 5, title: '', comment: '' });
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Seo title={product.name} type="product"
        description={(product.description || '').slice(0, 160) || `${product.name} by ${product.brand}`}
        image={product.images?.[0]?.image_url} />
      <nav className="mb-6 text-sm text-gray-400">
        <Link to="/" className="hover:text-gold">Home</Link> /{' '}
        <Link to={`/category/${product.category_slug}`} className="hover:text-gold">{product.category_name}</Link> /{' '}
        <span className="text-gold">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* GALLERY with zoom */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-3">
            {product.images?.map((img, i) => (
              <button key={img.id} onClick={() => setActiveImg(i)}
                className={`h-20 w-16 overflow-hidden rounded-xl border-2 transition ${i === activeImg ? 'border-gold' : 'border-transparent opacity-60'}`}>
                <img src={img.image_url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div
            className="relative aspect-[3/4] flex-1 overflow-hidden rounded-2xl"
            onMouseEnter={() => setZoom((z) => ({ ...z, on: true }))}
            onMouseLeave={() => setZoom((z) => ({ ...z, on: false }))}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ on: true, x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              const n = product.images?.length || 1;
              if (dx < -40) setActiveImg((i) => (i + 1) % n);
              else if (dx > 40) setActiveImg((i) => (i - 1 + n) % n);
              touchX.current = null;
            }}
          >
            <img
              src={product.images?.[activeImg]?.image_url || 'https://via.placeholder.com/600x800'}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-200"
              style={zoom.on ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : {}}
            />
            {/* swipe dots (mobile) */}
            {product.images?.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden">
                {product.images.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === activeImg ? 'w-5 bg-gold' : 'w-1.5 bg-white/60'}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* INFO */}
        <div>
          {product.brand && <p className="text-sm uppercase tracking-widest text-gold">{product.brand}</p>}
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-sm text-amber-500">
              <Star size={14} className="fill-amber-500" /> {Number(product.rating_avg).toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">{product.rating_count} reviews</span>
            <span className="text-sm text-gray-400">· {product.sold_count} sold</span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            {/* Price reflects the selected variant's own price when set. */}
            <span className="text-3xl font-bold">{inr(displayPrice)}</span>
            {displayMrp > displayPrice && (
              <>
                <span className="text-lg text-gray-400 line-through">{inr(displayMrp)}</span>
                <span className="rounded bg-gold/15 px-2 py-0.5 text-sm font-semibold text-gold">{Math.round((1 - displayPrice / displayMrp) * 100)}% OFF</span>
              </>
            )}
          </div>

          <p className="mt-5 text-gray-500 dark:text-gray-300">{product.description}</p>

          {product.sizes?.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wider">Pack Size</p>
                <button onClick={() => setSizeGuide(true)} className="flex items-center gap-1 text-xs text-gold hover:underline">
                  <Ruler size={13} /> Pack Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((o) => (
                  <button key={o} onClick={() => setSize(o)}
                    className={`min-w-[3rem] rounded-xl border px-4 py-2 text-sm font-medium transition ${size === o ? 'border-gold bg-gold/10 text-gold' : 'border-black/10 dark:border-white/10'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}
          {product.colors?.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider">Color: <span className="text-gold">{color}</span></p>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <button key={c.color} onClick={() => setColor(c.color)} title={c.color}
                    className={`h-9 w-9 rounded-full border-2 transition ${color === c.color ? 'border-gold scale-110' : 'border-black/10 dark:border-white/20'}`}
                    style={{ background: c.hex || '#ccc' }} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-black/10 dark:border-white/10">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3"><Minus size={16} /></button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="p-3"><Plus size={16} /></button>
            </div>
            <span className={`text-sm font-medium ${inStock ? 'text-emerald-500' : 'text-rose-500'}`}>
              {inStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>

          {inStock ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={addToCart} className="btn-outline flex-1 min-w-[8rem]">Add to Cart</button>
              <button onClick={buyNow} className="btn-gold flex-1 min-w-[8rem]">Buy Now</button>
              <button onClick={() => toggle(product)} className="btn-outline !px-4" aria-label="wishlist">
                <Heart size={20} className={has(product.id) ? 'fill-rose-500 text-rose-500' : ''} />
              </button>
            </div>
          ) : (
            <NotifyStock productId={product.id} />
          )}

          <ShareButtons product={product} />

          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-black/5 pt-6 text-center text-xs dark:border-white/10">
            {[
              (Number(product.is_free_shipping) !== 0 && (Number(product.shipping_fee) || 0) === 0)
                ? [Truck, 'Free Shipping']
                : [Truck, `Delivery ₹${product.shipping_fee || 0}`],
              // Returns badge reflects this product's real returnable flag (from DB).
              product.is_returnable ? [RefreshCw, '7-Day Returns'] : [Ban, 'Non-returnable'],
              [ShieldCheck, 'Secure Payment'],
            ].map(([Icon, t]) => (
              <div key={t} className="flex flex-col items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Icon size={20} className={product.is_returnable === 0 && t === 'Non-returnable' ? 'text-rose-400' : 'text-gold'} /> {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SPECIFICATIONS */}
      {product.specifications && (
        <div className="mt-14">
          <h2 className="mb-4 font-display text-2xl font-bold">Specifications</h2>
          <div className="card grid gap-px overflow-hidden sm:grid-cols-2">
            {Object.entries(product.specifications).map(([k, v]) => (
              <div key={k} className="flex justify-between px-5 py-3">
                <span className="text-gray-400">{k}</span><span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVIEWS */}
      <div className="mt-14 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 font-display text-2xl font-bold">Customer Reviews</h2>
          {reviews.length > 0 && <RatingBreakdown reviews={reviews} avg={product.rating_avg} />}
          {reviews.length === 0 && <p className="text-gray-400">No reviews yet. Be the first!</p>}
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold">
                    {r.user_name}
                    {r.verified && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                        <BadgeCheck size={12} /> Verified
                      </span>
                    )}
                  </span>
                  <span className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < r.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-300'} />
                    ))}
                  </span>
                </div>
                {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submitReview} className="card h-fit space-y-4 p-6">
          <h3 className="font-semibold">Write a Review</h3>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}>
                <Star size={24} className={n <= reviewForm.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-300'} />
              </button>
            ))}
          </div>
          <input className="input" placeholder="Title" value={reviewForm.title}
            onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} />
          <textarea className="input" rows={4} placeholder="Share your experience…" value={reviewForm.comment}
            onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} />
          <button className="btn-gold w-full">Submit Review</button>
        </form>
      </div>

      {/* FREQUENTLY BOUGHT TOGETHER */}
      {fbt.length > 0 && (
        <div className="mt-16">
          <SectionTitle eyebrow="Complete the look" title="Frequently Bought Together" />
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {fbt.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* RELATED */}
      {related.length > 0 && (
        <div className="mt-16">
          <SectionTitle eyebrow="You may also like" title="Related Products" />
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {related.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      <RecentlyViewed excludeId={product.id} />

      {sizeGuide && <SizeGuideModal category={product.category_name} sizes={product.sizes} onClose={() => setSizeGuide(false)} />}
    </div>
  );
}

function RatingBreakdown({ reviews, avg }) {
  const total = reviews.length;
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: reviews.filter((r) => r.rating === star).length,
  }));
  return (
    <div className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <div className="text-center sm:w-32">
        <p className="font-display text-4xl font-bold">{Number(avg).toFixed(1)}</p>
        <div className="mt-1 flex justify-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={14} className={i < Math.round(avg) ? 'fill-amber-500 text-amber-500' : 'text-gray-300'} />
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">{total} review{total !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex-1 space-y-1.5">
        {counts.map(({ star, n }) => (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-6 text-gray-400">{star}★</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div className="h-full rounded-full bg-amber-500" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
            </div>
            <span className="w-6 text-right text-gray-400">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

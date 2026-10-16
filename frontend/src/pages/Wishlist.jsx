import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import { Empty } from '../components/ui';

export default function Wishlist() {
  const { items } = useWishlist();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-bold">My Wishlist</h1>
      {items.length === 0 ? (
        <Empty icon={Heart} title="Your wishlist is empty" subtitle="Save your favourite products here.">
          <Link to="/shop" className="btn-gold">Explore Products</Link>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

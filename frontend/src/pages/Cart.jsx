import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { inr } from '../utils/format';
import { Empty } from '../components/ui';

export default function Cart() {
  const { cart, update, remove } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <Empty icon={ShoppingBag} title="Your bag is empty" subtitle="Discover something you'll love.">
          <Link to="/shop" className="btn-gold">Continue Shopping</Link>
        </Empty>
      </div>
    );
  }

  const displaySubtotal = cart.items.reduce((s, it) => s + (Number(it.line_total) || (Number(it.unit_price || it.price) * it.quantity)), 0) || Number(cart.summary?.subtotal || 0);

  const displayShipping = cart.items.reduce((s, it) => {
    const fee = Number(it.shipping_fee) || 0;
    const isFree = fee > 0 ? 0 : (it.is_free_shipping != null ? Number(it.is_free_shipping) : 1);
    if (!isFree) return s + fee;
    return s;
  }, 0) || Number(cart.summary?.shipping_fee || 0);

  const displayTotal = displaySubtotal + displayShipping;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-bold">Shopping Bag</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.items.map((item) => (
            <div key={item.id} className="card flex gap-4 p-4">
              <img src={item.image} alt={item.name} className="h-28 w-24 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between">
                  <Link to={`/product/${item.slug}`} className="font-medium hover:text-gold">{item.name}</Link>
                  <button onClick={() => remove(item.id ?? item.key ?? item.product_id)} className="text-gray-400 hover:text-rose-500" title="Remove item"><Trash2 size={18} /></button>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  {item.size && `Size: ${item.size}`} {item.color && `· ${item.color}`}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-black/10 dark:border-white/10">
                    <button onClick={() => update(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="p-2 disabled:opacity-30"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => update(item.id, item.quantity + 1)} className="p-2"><Plus size={14} /></button>
                  </div>
                  <span className="font-semibold">{inr(item.line_total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card h-fit p-6">
          <h3 className="mb-4 text-lg font-semibold">Order Summary</h3>
          <Row label="Subtotal" value={inr(displaySubtotal)} />
          <div className="my-4 border-t border-black/5 dark:border-white/10" />
          <Row label="Total" value={inr(displaySubtotal)} bold />
          <button onClick={() => navigate(user ? '/checkout' : '/login')} className="btn-gold mt-6 w-full">
            {user ? 'Proceed to Checkout' : 'Login to Checkout'} <ArrowRight size={18} />
          </button>
          <Link to="/shop" className="mt-3 block text-center text-sm text-gray-400 hover:text-gold">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, bold }) => (
  <div className={`flex justify-between py-1.5 ${bold ? 'text-lg font-bold' : 'text-sm text-gray-500 dark:text-gray-300'}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);

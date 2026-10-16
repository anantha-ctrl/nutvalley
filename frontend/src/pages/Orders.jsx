import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Star } from 'lucide-react';
import api from '../api/client';
import { inr, dateFmt, statusColor } from '../utils/format';
import { Spinner, Empty } from '../components/ui';

export default function Orders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api.get('/api/orders')
      .then((r) => setOrders(r.data.data))
      .catch(() => setOrders([])); // 401 is handled globally (redirect to login)
  }, []);

  if (!orders) return <Spinner className="min-h-[50vh]" />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-bold">My Orders</h1>
      {orders.length === 0 ? (
        <Empty icon={Package} title="No orders yet" subtitle="Your orders will appear here.">
          <Link to="/shop" className="btn-gold">Start Shopping</Link>
        </Empty>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="card flex items-center justify-between p-5 transition hover:border-gold/40">
              <div>
                <p className="font-semibold">{o.order_number}</p>
                <p className="text-sm text-gray-400">{dateFmt(o.placed_at)} · {o.payment_method.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{inr(o.total)}</p>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor[o.status]}`}>
                  {o.status}
                </span>
                {o.status === 'delivered' && (
                  <span className="mt-1 flex items-center justify-end gap-1 text-xs font-medium text-gold">
                    <Star size={12} className="fill-gold" /> Rate your order
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

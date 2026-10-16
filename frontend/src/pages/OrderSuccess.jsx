import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, ArrowRight, Clock } from 'lucide-react';
import api from '../api/client';
import { inr, dateFmt } from '../utils/format';
import { Spinner } from '../components/ui';
import Seo from '../components/Seo';

export default function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/api/orders/${id}`).then((r) => setOrder(r.data.data)).catch(() => {});
  }, [id]);

  if (!order) return <Spinner className="min-h-[60vh]" />;

  const pendingVerify = order.payment_method === 'upi' && order.payment_approval === 'pending';

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Seo title={pendingVerify ? 'Payment Received' : 'Order Confirmed'} />
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${pendingVerify ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}>
        {pendingVerify ? <Clock size={56} className="text-amber-500" /> : <CheckCircle2 size={56} className="text-emerald-500" />}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 text-center">
        <h1 className="font-display text-4xl font-bold">{pendingVerify ? 'Payment received 🙌' : 'Thank you! 🎉'}</h1>
        <p className="mt-2 text-gray-400">
          {pendingVerify
            ? 'We’re verifying your payment. Your order is confirmed as soon as it’s approved — we’ll email you.'
            : 'Your order has been placed successfully.'}
        </p>
      </motion.div>

      <div className="card mt-8 p-6">
        <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/10">
          <div>
            <p className="text-sm text-gray-400">Order Number</p>
            <p className="font-display text-xl font-bold text-gold">{order.order_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Placed on</p>
            <p className="font-medium">{dateFmt(order.placed_at)}</p>
          </div>
        </div>

        <div className="space-y-3 py-4">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 text-sm">
              <img src={it.image_url} className="h-14 w-12 rounded-lg object-cover" alt="" />
              <div className="flex-1">
                <p className="line-clamp-1 font-medium">{it.product_name}</p>
                <p className="text-gray-400">Qty {it.quantity} {it.size && `· ${it.size}`}</p>
              </div>
              <span className="font-semibold">{inr(it.line_total)}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/10">
          <span className="font-semibold">{pendingVerify ? 'Amount' : 'Total Paid'}</span>
          <span className="font-display text-2xl font-bold">{inr(order.total)}</span>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">
          Payment: {order.payment_method.toUpperCase()} · {pendingVerify ? 'awaiting verification' : order.payment_status}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link to={`/orders/${order.id}`} className="btn-gold flex-1">
          <Package size={18} /> Track Order
        </Link>
        <Link to="/shop" className="btn-outline flex-1">
          Continue Shopping <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldX, Package, Loader2, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import api from '../api/client';
import { inr, dateFmt, statusColor } from '../utils/format';
import Logo from '../components/Logo';

/**
 * Public delivery-verification page. Opened by scanning the invoice QR — reads a
 * signed token and shows the live order (items, ship-to, delivery status) straight
 * from the DB so a courier or customer can confirm the parcel. No login required.
 */
export default function VerifyOrder() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  const load = () => {
    const url = `/api/orders/verify/${id}${token ? `?t=${encodeURIComponent(token)}` : ''}`;
    api.get(url)
      .then((r) => setState({ loading: false, data: r.data.data, error: '' }))
      .catch((err) => setState({ loading: false, data: null, error: err.message || 'Verification failed' }));
  };

  useEffect(() => { load(); }, [id, token]);

  // Poll DB every 5s so delivery status changes update live on screen
  useEffect(() => {
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [id, token]);

  const { loading, data, error } = state;

  const isDelivered = data?.status === 'delivered';
  const isShipped = data?.status === 'shipped';
  const isPaid = data?.payment_status === 'paid' || data?.payment_approval === 'approved';

  return (
    <div className="min-h-screen bg-luxe-bg px-4 py-10 dark:bg-ink">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center"><Logo className="h-10" /></div>

        {loading ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-gray-400">
            <Loader2 className="animate-spin" /> Verifying order live from database…
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15">
              <ShieldX size={34} className="text-rose-500" />
            </div>
            <h1 className="text-xl font-bold">Verification Failed</h1>
            <p className="mt-2 text-sm text-gray-400">{error}. This QR code is invalid or tampered with.</p>
          </div>
        ) : (
          <div className="card overflow-hidden space-y-0">
            {/* Authenticated Order & Payment Banner */}
            <div className={`flex items-center justify-between border-b border-black/5 px-6 py-4 dark:border-white/10 ${
              isPaid ? 'bg-emerald-500/15' : 'bg-amber-500/15'
            }`}>
              <div className="flex items-center gap-2.5">
                {isPaid ? <ShieldCheck size={26} className="text-emerald-500" /> : <AlertCircle size={26} className="text-amber-500" />}
                <div>
                  <p className={`font-display font-bold text-sm ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {isPaid ? 'Payment Verified & Order Authenticated ✓' : 'Order Record Found · Payment Unverified ⏳'}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Live Database Match · Genuine Beadsboutique</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isPaid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
              }`}>
                {isPaid ? 'Verified' : 'Unverified'}
              </span>
            </div>

            {/* Prominent Delivery Status Banner */}
            <div className={`p-5 text-center ${
              isDelivered ? 'bg-emerald-500/10 border-b border-emerald-500/20' :
              isShipped ? 'bg-cyan-500/10 border-b border-cyan-500/20' :
              'bg-amber-500/10 border-b border-amber-500/20'
            }`}>
              <div className="flex items-center justify-center gap-2">
                {isDelivered ? <CheckCircle2 className="text-emerald-500" size={24} /> :
                 isShipped ? <Truck className="text-cyan-500 animate-pulse" size={24} /> :
                 <Clock className="text-amber-500" size={24} />}
                <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Delivery Status</span>
              </div>
              <p className={`mt-1 font-display text-2xl font-black capitalize ${
                isDelivered ? 'text-emerald-500' : isShipped ? 'text-cyan-500' : 'text-amber-500'
              }`}>
                {data.status === 'delivered' ? 'Order Delivered ✓' : data.status === 'shipped' ? 'Shipped / In Transit 🚚' : `Status: ${data.status}`}
              </p>
              {data.carrier && (
                <p className="mt-1 text-xs text-gray-400 font-medium">
                  Carrier: <span className="text-gold font-semibold">{data.carrier}</span> {data.tracking_number && `· Track #: ${data.tracking_number}`}
                </p>
              )}
            </div>

            <div className="space-y-5 p-6 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Order Number</p>
                  <p className="font-display text-lg font-bold text-gold">{data.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Order Date</p>
                  <p className="font-medium">{dateFmt(data.placed_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment Method" value={data.payment_method?.toUpperCase()} />
                <Field label="Payment Verification" value={
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isPaid ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                  }`}>
                    {isPaid ? 'PAID (VERIFIED ✓)' : `${(data.payment_status || 'UNPAID').toUpperCase()} (UNVERIFIED)`}
                  </span>
                } />
              </div>

              {/* Ship to address verification */}
              <div className="rounded-xl bg-black/5 p-4 dark:bg-white/5">
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-400 font-semibold">Recipient Shipping Address</p>
                <p className="font-semibold text-base">{data.ship_to?.name}</p>
                {data.ship_to?.phone && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">📞 {data.ship_to.phone}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {[data.ship_to?.line1, data.ship_to?.line2, data.ship_to?.city, data.ship_to?.state, data.ship_to?.pincode].filter(Boolean).join(', ')}
                </p>
              </div>

              {/* Product items verification */}
              <div>
                <p className="mb-2.5 flex items-center justify-between text-xs uppercase tracking-wide text-gray-400 font-semibold">
                  <span className="flex items-center gap-1.5"><Package size={14} className="text-gold" /> Verified Product Items ({data.item_count})</span>
                  <span className="text-emerald-500 font-bold">100% Genuine</span>
                </p>
                <div className="space-y-2.5">
                  {data.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-black/5 p-3 dark:border-white/10">
                      {it.image ? (
                        <img src={it.image} alt={it.name} className="h-12 w-12 rounded-lg object-cover border border-black/10 dark:border-white/10 shrink-0" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15 text-gold font-bold shrink-0">
                          <Package size={20} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-snug">{it.name}</p>
                        {(it.size || it.color) && (
                          <p className="text-xs text-gray-400">Variant: {[it.size, it.color].filter(Boolean).join(', ')}</p>
                        )}
                        <p className="text-xs text-gold font-semibold mt-0.5">{inr(it.price)} × {it.qty}</p>
                      </div>
                      <span className="shrink-0 font-display font-bold text-sm">{inr(it.line_total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/10">
                <span className="font-semibold text-gray-400">Verified Total</span>
                <span className="font-display text-xl font-bold text-gold">{inr(data.total)}</span>
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          <Link to="/" className="text-gold font-semibold hover:underline">Beadsboutique</Link> · Live Database Delivery & Product Verification
        </p>
      </div>
    </div>
  );
}

const Field = ({ label, value }) => (
  <div className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
    <p className="text-[11px] text-gray-400">{label}</p>
    <p className="font-medium mt-0.5">{value}</p>
  </div>
);

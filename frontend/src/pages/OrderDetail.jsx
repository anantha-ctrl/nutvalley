import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Check, X, FileText, Truck, RotateCcw, Star, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, dateFmt, statusColor } from '../utils/format';
import { printInvoice } from '../utils/invoice';
import { Spinner } from '../components/ui';
import { useCart } from '../context/CartContext';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh: refreshCart } = useCart();
  const [order, setOrder] = useState(null);

  const load = () => api.get(`/api/orders/${id}`).then((r) => setOrder(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const cancel = async () => {
    try { await api.put(`/api/orders/${id}/cancel`); toast.success('Order cancelled'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const reorder = async () => {
    try {
      const { data } = await api.post(`/api/orders/${id}/reorder`);
      toast.success(data.message);
      await refreshCart();
      if (data.data.added) navigate('/cart');
    } catch (e) { toast.error(e.message); }
  };

  if (!order) return <Spinner className="min-h-[50vh]" />;
  const addr = order.shipping_address;
  const canCancel = !['shipped', 'delivered', 'cancelled'].includes(order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/orders" className="text-sm text-gray-400 hover:text-gold">← Back to orders</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{order.order_number}</h1>
          <p className="text-sm text-gray-400">Placed {dateFmt(order.placed_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusColor[order.status]}`}>{order.status}</span>
          <button onClick={() => printInvoice(order)} className="btn-outline !py-2 text-sm">
            <FileText size={16} /> Invoice
          </button>
        </div>
      </div>

      {/* Timeline */}
      {order.status !== 'cancelled' && (
        <div className="card mt-6 flex justify-between p-6">
          {order.timeline.map((step, i) => (
            <div key={step.status} className="flex flex-1 flex-col items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${step.done ? 'bg-gold text-ink' : 'bg-black/10 text-gray-400 dark:bg-white/10'}`}>
                {step.done ? <Check size={16} /> : i + 1}
              </div>
              <span className="mt-2 text-xs capitalize">{step.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Shipment tracking — live courier scans when a partner is connected */}
      {(order.tracking_number || order.awb_code) && (
        <ShipmentTracking order={order} initialEvents={order.shipment_events || []} />
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          {order.items.map((it) => (
            <div key={it.id} className="card p-4">
              <div className="flex gap-4">
                <img src={it.image_url} className="h-24 w-20 rounded-xl object-cover" alt="" />
                <div className="flex-1">
                  <p className="font-medium">{it.product_name}</p>
                  <p className="text-sm text-gray-400">{it.size && `Size ${it.size}`} {it.color && `· ${it.color}`}</p>
                  <p className="text-sm text-gray-400">Qty {it.quantity}</p>
                </div>
                <span className="font-semibold">{inr(it.line_total)}</span>
              </div>
              {/* Reviews unlock once the order is delivered. */}
              {order.status === 'delivered' && it.product_id && (
                <ReviewBox item={it} onSaved={load} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card p-5 text-sm">
            <h3 className="mb-2 font-semibold">Delivery Address</h3>
            <p>{addr.full_name}</p>
            <p className="text-gray-400">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
            <p className="text-gray-400">{addr.phone}</p>
          </div>
          <div className="card p-5 text-sm">
            <h3 className="mb-2 font-semibold">Payment</h3>
            <Row label="Subtotal" value={inr(order.subtotal)} />
            {order.discount > 0 && <Row label="Discount" value={`-${inr(order.discount)}`} />}
            <Row label="Shipping" value={order.shipping_fee ? inr(order.shipping_fee) : 'Free'} />
            <div className="my-2 border-t border-black/5 dark:border-white/10" />
            <Row label="Total" value={inr(order.total)} bold />
            <p className="mt-2 text-gray-400">{order.payment_method.toUpperCase()} ·
              <span className={`ml-1 rounded px-2 py-0.5 ${statusColor[order.payment_status]}`}>{order.payment_status}</span>
            </p>
          </div>
          <button onClick={reorder} className="btn-gold w-full">
            <RotateCcw size={16} /> Reorder
          </button>
          {canCancel && (
            <button onClick={cancel} className="btn-outline w-full !border-rose-500/50 !text-rose-500">
              <X size={16} /> Cancel Order
            </button>
          )}
          {order.status === 'delivered' && <ReturnPanel order={order} onChange={load} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Live shipment panel. Paints instantly from the scans already stored with the
 * order, then polls /orders/{id}/track (which asks the courier at most once a
 * minute) so the customer sees movement without reloading the page.
 */
function ShipmentTracking({ order, initialEvents }) {
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(false);

  const poll = () => {
    setLoading(true);
    api.get(`/api/orders/${order.id}/track`)
      .then((r) => setLive(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    poll();
    const t = setInterval(() => { if (document.visibilityState === 'visible') poll(); }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const events = live?.events?.length ? live.events : initialEvents;
  const courier = live?.courier || order.courier_name || order.carrier;
  const awb = live?.awb_code || order.awb_code || order.tracking_number;

  return (
    <div className="card mt-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-xl bg-gold/15 p-2.5 text-gold"><Truck size={20} /></span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Shipment tracking</p>
          <p className="text-sm text-gray-400">
            {courier ? `${courier} · ` : ''}Tracking #
            <span className="ml-1 font-mono font-semibold text-gold">{awb}</span>
          </p>
        </div>
        <div className="text-right">
          {live?.shipment_status && (
            <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs text-sky-500">{live.shipment_status}</span>
          )}
          {live?.eta && <p className="mt-1 text-xs text-gray-400">Expected by {dateFmt(live.eta)}</p>}
        </div>
      </div>

      {events.length > 0 && (
        <ol className="mt-5 border-t border-black/5 pt-4 dark:border-white/10">
          {events.map((e, i) => (
            <li key={i} className="flex gap-3 pb-4 last:pb-0">
              <span className="flex flex-col items-center">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? 'bg-gold' : 'bg-gray-300 dark:bg-white/20'}`} />
                {i < events.length - 1 && <span className="w-px flex-1 bg-gray-200 dark:bg-white/10" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${i === 0 ? 'font-semibold text-gold' : 'font-medium'}`}>{e.status}</p>
                {e.activity && <p className="text-xs text-gray-400">{e.activity}</p>}
                <p className="text-[11px] text-gray-400">
                  {[e.location, e.event_at && dateFmt(e.event_at)].filter(Boolean).join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {events.length === 0 && (
        <p className="mt-4 text-xs text-gray-400">
          {loading ? 'Checking with the courier…' : 'Tracking updates will appear here once the parcel is picked up.'}
        </p>
      )}

      {live?.tracking_url && (
        <a href={live.tracking_url} target="_blank" rel="noreferrer"
          className="mt-3 inline-block text-sm text-gold hover:underline">
          Track on the courier site →
        </a>
      )}
    </div>
  );
}

const Row = ({ label, value, bold }) => (
  <div className={`flex justify-between py-1 ${bold ? 'font-bold' : 'text-gray-500 dark:text-gray-300'}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);

const RETURN_LABEL = {
  requested: ['Return requested', 'text-amber-500'],
  approved: ['Return approved', 'text-sky-500'],
  rejected: ['Return rejected', 'text-rose-500'],
  refunded: ['Refunded', 'text-emerald-500'],
};

/** Return/refund panel for delivered orders. Shows the request's status, or a
 *  form to raise one. Backed by POST /api/orders/{id}/return. */
function ReturnPanel({ order, onChange }) {
  const ret = order.return;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (ret) {
    const [label, color] = RETURN_LABEL[ret.status] || [ret.status, 'text-gray-400'];
    return (
      <div className="card p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <Undo2 size={16} /> <span className={color}>{label}</span>
        </div>
        <p className="mt-1 text-gray-400">Reason: {ret.reason}</p>
        {ret.admin_note && <p className="mt-1 text-gray-400">Note: {ret.admin_note}</p>}
      </div>
    );
  }

  const submit = async () => {
    if (!reason.trim()) return toast.error('Please add a reason');
    setSaving(true);
    try {
      await api.post(`/api/orders/${order.id}/return`, { reason });
      toast.success('Return requested');
      setOpen(false);
      onChange();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // No returnable products in this order — show why, no request button.
  if (!order.returnable) {
    return (
      <div className="card p-4 text-sm text-gray-400">
        <div className="flex items-center gap-2 font-semibold text-gray-500 dark:text-gray-300">
          <Undo2 size={16} /> Not returnable
        </div>
        <p className="mt-1">The item(s) in this order are marked non-returnable and can’t be returned.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline w-full">
        <Undo2 size={16} /> Request Return
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <p className="text-sm font-semibold">Request a return</p>
      <textarea rows={3} className="input text-sm" placeholder="Why are you returning this order?"
        value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="btn-gold !py-2 text-sm">
          {saving ? 'Submitting…' : 'Submit'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-outline !py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}

/** Per-product review widget shown on delivered orders. Prefills the customer's
 *  existing review and upserts via POST /api/products/{id}/reviews. */
function ReviewBox({ item, onSaved }) {
  const existing = item.my_review;
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment || '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!rating) return toast.error('Please pick a star rating');
    setSaving(true);
    try {
      await api.post(`/api/products/${item.product_id}/reviews`, { rating, comment });
      toast.success(existing ? 'Review updated' : 'Thanks for your review!');
      setOpen(false);
      onSaved();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const Stars = ({ value, onPick, onHover }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button"
          onClick={onPick ? () => onPick(n) : undefined}
          onMouseEnter={onHover ? () => onHover(n) : undefined}
          onMouseLeave={onHover ? () => onHover(0) : undefined}
          className={onPick ? 'cursor-pointer' : 'cursor-default'}>
          <Star size={18} className={n <= value ? 'fill-gold text-gold' : 'text-gray-300 dark:text-gray-600'} />
        </button>
      ))}
    </div>
  );

  if (!open) {
    return (
      <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/10">
        {existing ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
            <Stars value={existing.rating} /> <span>Your review</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Delivered — share your experience</span>
        )}
        <button onClick={() => setOpen(true)} className="btn-outline !py-1.5 text-sm">
          <Star size={14} /> {existing ? 'Edit review' : 'Write a review'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-black/5 pt-3 dark:border-white/10">
      <Stars value={hover || rating} onPick={setRating} onHover={setHover} />
      <textarea rows={3} className="input text-sm" placeholder="Tell others what you think (optional)"
        value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="btn-gold !py-2 text-sm">
          {saving ? 'Saving…' : 'Submit review'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-outline !py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}

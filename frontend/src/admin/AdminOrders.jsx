import { useEffect, useState } from 'react';
import { Truck, Check, X, Clock, ShieldCheck, PackageCheck, Radar, FileText, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { inr, dateFmt, statusColor } from '../utils/format';
import { Spinner } from '../components/ui';

const STATUSES = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('');
  const [review, setReview] = useState(null); // order id under payment review
  const [track, setTrack] = useState(null);   // order under live tracking
  const [partner, setPartner] = useState({ provider: 'none', configured: false });
  const [syncing, setSyncing] = useState(false);

  const load = () => api.get(`/api/admin/orders${
    filter === 'awaiting' ? '?payment_approval=pending'
      : filter === 'unpaid' ? '?unpaid=1'
        : filter ? `?status=${filter}` : ''}`)
    .then((r) => setOrders(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, [filter]);

  // Poll the backend so confirmed orders and payment approvals stay current.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(id);
  }, [filter]);

  // Is a courier API connected? Decides between one-click booking and manual entry.
  useEffect(() => {
    api.get('/api/admin/delivery/config')
      .then((r) => setPartner({ provider: r.data.data.provider, configured: r.data.data.configured }))
      .catch(() => {});
  }, []);

  const syncShipments = async () => {
    setSyncing(true);
    try {
      const r = await api.post('/api/admin/delivery/sync', {});
      const d = r.data.data || {};
      toast.success(d.checked ? `Synced ${d.synced}/${d.checked} shipment(s)` : 'No shipments in transit');
      load();
    } catch (err) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const awaitingCount = (orders || []).filter((o) => o.payment_approval === 'pending').length;
  const visible = filter === 'awaiting'
    ? (orders || []).filter((o) => o.payment_approval === 'pending')
    : (orders || []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            partner.configured ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            <Truck size={12} />
            {partner.configured ? `${partner.provider} live` : 'Manual tracking'}
          </span>
          {partner.configured && (
            <button onClick={syncShipments} disabled={syncing}
              className="btn-outline inline-flex !px-3 !py-1.5 text-xs disabled:opacity-50">
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync shipments'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={!filter} onClick={() => setFilter('')}>All</Chip>
        <Chip active={filter === 'awaiting'} onClick={() => setFilter('awaiting')}>
          <span className="inline-flex items-center gap-1"><Clock size={13} /> Payment approvals
            {awaitingCount > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{awaitingCount}</span>}
          </span>
        </Chip>
        {STATUSES.map((s) => <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</Chip>)}
        {/* Online checkouts that were never paid — kept out of the main list. */}
        <Chip active={filter === 'unpaid'} onClick={() => setFilter('unpaid')}>Unpaid</Chip>
      </div>

      {!orders ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-gray-400">
              <tr className="border-b border-black/5 [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium dark:border-white/10">
                <th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th>Shipment</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <OrderRow key={o.id} o={o} partner={partner} onSaved={load}
                  onReview={() => setReview(o.id)} onTrack={() => setTrack(o)} />
              ))}
              {visible.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {review && <PaymentReviewModal id={review} onClose={() => setReview(null)} onDone={() => { setReview(null); load(); }} />}
      {track && <TrackModal order={track} onClose={() => setTrack(null)} />}
    </div>
  );
}

function PaymentReviewModal({ id, onClose, onDone }) {
  const [proof, setProof] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => { api.get(`/api/admin/orders/${id}/payment`).then((r) => setProof(r.data.data)).catch(() => {}); }, [id]);

  const act = async (action) => {
    if (action === 'reject' && !note.trim()) return toast.error('Add a short reason for the customer');
    setBusy(action);
    try {
      await api.put(`/api/admin/orders/${id}/payment`, { action, note });
      toast.success(action === 'approve' ? 'Payment approved — order confirmed' : 'Payment rejected — customer notified');
      onDone();
    } catch (err) { toast.error(err.message); } finally { setBusy(''); }
  };

  const done = proof && proof.payment_approval !== 'pending' && proof.payment_approval !== 'none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="card relative max-h-[88vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck size={18} className="text-gold" /> Verify UPI Payment</h3>
        {!proof ? <div className="py-10"><Spinner /></div> : (
          <div className="mt-4 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Order" value={proof.order_number} />
              <Info label="Amount" value={inr(proof.total)} strong />
              <Info label="Customer" value={proof.customer} />
              <Info label="Phone" value={proof.phone || '—'} />
              <Info label="Txn / Ref ID" value={proof.payment_txn_id || '—'} className="col-span-2" />
            </div>

            <div>
              <span className="mb-1 block text-xs text-gray-400">Payment screenshot</span>
              {proof.payment_screenshot
                ? <a href={proof.payment_screenshot} target="_blank" rel="noreferrer">
                    <img src={proof.payment_screenshot} alt="proof" className="max-h-72 w-full rounded-xl border border-black/10 object-contain dark:border-white/10" />
                  </a>
                : <p className="text-gray-400">No screenshot uploaded.</p>}
            </div>

            {done ? (
              <p className={`rounded-xl px-3 py-2 text-center font-semibold ${proof.payment_approval === 'approved' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                Payment {proof.payment_approval}{proof.payment_note ? ` · ${proof.payment_note}` : ''}
              </p>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-400">Note (required to reject)</span>
                  <input className="input" placeholder="e.g. Amount didn't match / txn not found"
                    value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <div className="flex gap-3">
                  <button onClick={() => act('approve')} disabled={!!busy}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 font-semibold text-white disabled:opacity-50">
                    <Check size={16} /> {busy === 'approve' ? 'Approving…' : 'Approve & confirm'}
                  </button>
                  <button onClick={() => act('reject')} disabled={!!busy}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 font-semibold text-white disabled:opacity-50">
                    <X size={16} /> {busy === 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <button onClick={onClose} className="btn-outline mt-5 w-full">Close</button>
      </div>
    </div>
  );
}

const Info = ({ label, value, strong, className = '' }) => (
  <div className={className}>
    <span className="block text-xs text-gray-400">{label}</span>
    <span className={strong ? 'font-display text-lg font-bold text-gold' : 'font-medium'}>{value}</span>
  </div>
);

function OrderRow({ o, partner, onSaved, onReview, onTrack }) {
  const [status, setStatus] = useState(o.status);
  const [carrier, setCarrier] = useState(o.carrier || '');
  const [tracking, setTracking] = useState(o.tracking_number || '');
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    setStatus(o.status);
    setCarrier(o.carrier || '');
    setTracking(o.tracking_number || '');
  }, [o.status, o.carrier, o.tracking_number]);

  const trackingDirty = carrier !== (o.carrier || '') || tracking !== (o.tracking_number || '');

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    try {
      await api.put(`/api/admin/orders/${o.id}/status`, { status: newStatus, carrier, tracking_number: tracking });
      toast.success(`Order ${o.order_number} set to ${newStatus}`);
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    }
  };

  const saveTracking = async () => {
    setSaving(true);
    try {
      await api.put(`/api/admin/orders/${o.id}/status`, { status, carrier, tracking_number: tracking });
      toast.success('Shipment tracking updated');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to update tracking');
    } finally {
      setSaving(false);
    }
  };

  /** One-click AWB booking with the connected courier. */
  const bookShipment = async () => {
    setBooking(true);
    try {
      const r = await api.post(`/api/admin/orders/${o.id}/ship`, {});
      toast.success(r.data.message || 'Shipment booked');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const cancelShipment = async () => {
    if (!window.confirm(`Cancel AWB ${o.awb_code} with ${o.courier_name || 'the courier'}?`)) return;
    setBooking(true);
    try {
      const r = await api.post(`/api/admin/orders/${o.id}/ship/cancel`, {});
      toast.success(r.data.message || 'Shipment cancelled');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Cancellation failed');
    } finally {
      setBooking(false);
    }
  };

  return (
    <tr className="border-b border-black/5 align-top last:border-0 dark:border-white/10 [&>td]:px-4 [&>td]:py-4">
      <td className="font-medium">{o.order_number}</td>
      <td><p>{o.customer}</p><p className="text-xs text-gray-400">{o.email}</p></td>
      <td className="whitespace-nowrap text-gray-400">{dateFmt(o.placed_at)}</td>
      <td className="font-semibold">{inr(o.total)}</td>
      <td>
        <div className="flex flex-col items-start gap-1">
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[o.payment_status]}`}>{o.payment_status}</span>
          <span className="text-xs text-gray-400">{o.payment_method.toUpperCase()}</span>
          {o.payment_method === 'upi' && o.payment_approval === 'pending' && (
            <button onClick={onReview}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-xs font-semibold text-white">
              <Clock size={12} /> Review payment
            </button>
          )}
          {o.payment_method === 'upi' && o.payment_approval === 'rejected' && (
            <button onClick={onReview} className="text-xs font-semibold text-rose-500 hover:underline">rejected (unverified)</button>
          )}
          {o.payment_method === 'upi' && o.payment_approval === 'approved' && o.payment_status === 'paid' && (
            <button onClick={onReview} className="text-xs text-emerald-500 hover:underline">verified · view</button>
          )}
        </div>
      </td>
      <td>
        <select value={status} onChange={(e) => handleStatusChange(e.target.value)}
          className={`input !w-auto !py-1 text-xs capitalize ${statusColor[status]}`}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td>
        <div className="flex w-44 flex-col gap-1.5">
          {o.awb_code ? (
            /* Booked with the courier API — show the live shipment, not editable text. */
            <>
              <span className="text-xs font-semibold">{o.courier_name || o.carrier || 'Courier'}</span>
              <span className="font-mono text-xs text-gold">{o.awb_code}</span>
              {o.shipment_status && (
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-center text-[11px] text-sky-500">
                  {o.shipment_status}
                </span>
              )}
              {o.shipment_eta && <span className="text-[11px] text-gray-400">ETA {o.shipment_eta}</span>}
              <div className="flex flex-wrap gap-1">
                <button onClick={onTrack}
                  className="inline-flex items-center gap-1 rounded-lg bg-gold px-2 py-1 text-[11px] font-semibold text-ink">
                  <Radar size={12} /> Track
                </button>
                {o.label_url && (
                  <a href={o.label_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-[11px] dark:border-white/10">
                    <FileText size={12} /> Label
                  </a>
                )}
                <button onClick={cancelShipment} disabled={booking}
                  className="rounded-lg border border-black/10 px-2 py-1 text-[11px] text-rose-500 disabled:opacity-50 dark:border-white/10">
                  Cancel
                </button>
              </div>
            </>
          ) : partner.configured ? (
            /* Partner connected but not booked yet — one click books the AWB. */
            <>
              <button onClick={bookShipment} disabled={booking}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-gold px-2 py-1.5 text-xs font-semibold text-ink disabled:opacity-50">
                {booking ? <Loader2 size={13} className="animate-spin" /> : <PackageCheck size={13} />}
                {booking ? 'Booking…' : 'Book shipment'}
              </button>
              <span className="text-[11px] text-gray-400">via {partner.provider}</span>
            </>
          ) : (
            /* No partner connected — keep the manual carrier + tracking entry. */
            <>
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier"
                className="input !w-full !py-1 text-xs" />
              <div className="flex items-center gap-1.5">
                <span className="text-gold"><Truck size={14} /></span>
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking #"
                  className="input !w-full !py-1 text-xs" />
              </div>
              {trackingDirty && (
                <button onClick={saveTracking} disabled={saving}
                  className="mt-0.5 flex items-center justify-center gap-1 rounded-lg bg-gold px-2 py-1 text-xs font-semibold text-ink disabled:opacity-50">
                  <Check size={13} /> {saving ? 'Saving…' : 'Save tracking'}
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/** Live courier scan timeline for one order; re-polls every 30s while open. */
function TrackModal({ order, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTrack = (force) => {
    setLoading(true);
    api.get(`/api/admin/orders/${order.id}/track${force ? '?force=1' : ''}`)
      .then((r) => { setData(r.data.data); setError(null); })
      .catch((err) => setError(err.message || 'Tracking unavailable'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrack(true);
    const id = setInterval(() => { if (document.visibilityState === 'visible') fetchTrack(true); }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const events = data?.events || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">{order.order_number}</h3>
            <p className="text-sm text-gray-400">
              {order.courier_name || order.carrier || 'Courier'} ·{' '}
              <span className="font-mono text-gold">{order.awb_code}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-rose-500"><X size={18} /></button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data?.status && (
            <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs text-sky-500">{data.status}</span>
          )}
          {data?.eta && <span className="text-xs text-gray-400">ETA {data.eta}</span>}
          <button onClick={() => fetchTrack(true)} disabled={loading}
            className="btn-outline inline-flex !px-2.5 !py-1 text-xs disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {data?.tracking_url && (
            <a href={data.tracking_url} target="_blank" rel="noreferrer" className="text-xs text-gold hover:underline">
              Open courier page →
            </a>
          )}
        </div>

        {error && <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-500">{error}</p>}

        <ol className="mt-5 space-y-0">
          {events.map((e, i) => (
            <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
              <span className="relative flex flex-col items-center">
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
          {!loading && events.length === 0 && !error && (
            <li className="py-6 text-center text-sm text-gray-400">
              No courier scans yet — the parcel has not been picked up.
            </li>
          )}
        </ol>

        <button onClick={onClose} className="btn-outline mt-4 w-full">Close</button>
      </div>
    </div>
  );
}

const Chip = ({ active, onClick, children }) => (
  <button onClick={onClick} className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${active ? 'bg-gold text-ink' : 'glass'}`}>{children}</button>
);

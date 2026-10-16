import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Check, Tag, QrCode, Banknote, Upload, Copy, Loader2, ShieldCheck, CreditCard, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { inr } from '../utils/format';

const empty = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' };

export default function Checkout() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState('');
  const [method, setMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);
  const [offers, setOffers] = useState([]);
  const [shipInfo, setShipInfo] = useState(null);
  // UPI / QR manual payment
  const [payInfo, setPayInfo] = useState(null);   // admin-configured UPI/bank details
  const [qrUrl, setQrUrl] = useState('');          // generated UPI QR (data URI)
  const [txnId, setTxnId] = useState('');
  const [screenshot, setScreenshot] = useState('');

  useEffect(() => {
    if (!cart.items.length) navigate('/cart');
    loadAddresses();
    api.get('/api/offers').then((r) => setOffers(r.data.data)).catch(() => { });
    api.get('/api/shipping-info').then((r) => setShipInfo(r.data.data)).catch(() => { });
    api.get('/api/payment-info').then((r) => setPayInfo(r.data.data)).catch(() => { });
  }, []);

  const loadAddresses = async () => {
    try {
      const { data } = await api.get('/api/addresses');
      setAddresses(data.data);
      const def = data.data.find((a) => a.is_default) || data.data[0];
      if (def) setSelected(def.id);
      if (!data.data.length) setShowForm(true);
    } catch { /* 401/expired — auth interceptor handles redirect */ }
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/api/addresses', { ...form, is_default: addresses.length === 0 });
      toast.success('Address saved');
      setForm(empty); setShowForm(false);
      await loadAddresses();
      setSelected(data.data.id);
    } catch (err) { toast.error(err.message); }
  };

  const applyCoupon = async (codeArg) => {
    const code = (codeArg || coupon).trim();
    if (!code) return;
    try {
      const { data } = await api.post('/api/coupons/apply', { code, subtotal: cart.summary.subtotal });
      setDiscount(data.data.discount);
      setCoupon(code);
      setAppliedCode(code);
      toast.success(`Coupon applied: -${inr(data.data.discount)}`);
    } catch (err) { setDiscount(0); setAppliedCode(''); toast.error(err.message); }
  };

  const offerLabel = (o) =>
    o.type === 'percentage'
      ? `${Number(o.value)}% OFF${o.max_discount ? ` up to ${inr(o.max_discount)}` : ''}`
      : `${inr(o.value)} OFF`;

  const subtotal = cart.items.reduce((s, it) => s + (Number(it.line_total) || (Number(it.unit_price || it.price) * it.quantity)), 0) || Number(cart.summary?.subtotal || 0);
  const itemsShippingFee = cart.items.reduce((s, it) => {
    const fee = Number(it.shipping_fee) || 0;
    const isFree = fee > 0 ? 0 : (it.is_free_shipping != null ? Number(it.is_free_shipping) : 1);
    if (!isFree) return s + fee;
    return s;
  }, 0) || Number(cart.summary?.shipping_fee || 0);

  const shipping = itemsShippingFee;
  const total = Math.max(0, subtotal - discount + shipping);

  // Payment rule (live from the DB): COD is offered only up to cod_max; Razorpay is
  // always available. Above the threshold, Razorpay is the only option.
  const codMax = Number(payInfo?.cod_max_amount ?? 1000);
  const codAllowed = total <= codMax;
  useEffect(() => {
    // If COD is no longer allowed (cart crossed the threshold), fall back to Razorpay.
    if (!codAllowed && method === 'cod') setMethod('razorpay');
  }, [codAllowed]);

  // Build the UPI intent + generate a QR that encodes the exact payable amount.
  const upiEnabled = !!payInfo?.upi_enabled;
  const upiLink = upiEnabled
    ? `upi://pay?pa=${encodeURIComponent(payInfo.upi_id)}&pn=${encodeURIComponent(payInfo.payee_name || 'Beadsboutique')}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Beadsboutique Order')}`
    : '';
  useEffect(() => {
    if (method !== 'upi' || !upiEnabled) { setQrUrl(''); return; }
    // Prefer the admin's custom QR image; else generate one from the UPI link.
    if (payInfo.qr_image) { setQrUrl(payInfo.qr_image); return; }
    QRCode.toDataURL(upiLink, { width: 260, margin: 1, color: { dark: '#3a0d14', light: '#ffffff' } })
      .then(setQrUrl).catch(() => setQrUrl(''));
  }, [method, upiEnabled, upiLink, payInfo?.qr_image]);

  const selectedAddr = addresses.find((a) => a.id === selected);
  const custName = selectedAddr?.full_name || user?.name || '';
  const custPhone = selectedAddr?.phone || user?.phone || '';

  const copy = (text, label) => {
    navigator.clipboard?.writeText(text).then(() => toast.success(`${label} copied`)).catch(() => {});
  };

  const pickScreenshot = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image too large (max 5 MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Lazy-load Razorpay's checkout script only when needed.
  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  // Razorpay gateway: create a pending order on the server, open the hosted
  // checkout, then verify the signature server-side to finalize the order.
  const payWithRazorpay = async (payload) => {
    const { data } = await api.post('/api/checkout/create-order', payload);
    const d = data.data;
    // No API keys on the server -> test mode: finalize without the live gateway.
    if (d.is_test || !d.razorpay_key) {
      await api.post('/api/checkout/verify', { order_id: d.order_id, is_test: true });
      toast.success('Order placed (test mode — add Razorpay keys for live payments)');
      refresh();
      return navigate(`/order-success/${d.order_id}`);
    }
    const ok = await loadRazorpay();
    if (!ok) return toast.error('Could not load Razorpay. Check your connection.');
    const rzp = new window.Razorpay({
      key: d.razorpay_key,
      amount: d.amount,
      currency: d.currency,
      name: 'Beadsboutique',
      description: `Order ${d.order_number}`,
      order_id: d.razorpay_order_id,
      prefill: { name: custName, contact: custPhone },
      theme: { color: '#b8745a' },
      handler: async (resp) => {
        try {
          await api.post('/api/checkout/verify', {
            order_id: d.order_id,
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          toast.success('Payment successful!');
          refresh();
          navigate(`/order-success/${d.order_id}`);
        } catch (err) { toast.error(err.message || 'Verification failed'); }
      },
      modal: { ondismiss: () => toast('Payment cancelled') },
    });
    rzp.open();
  };

  const placeOrder = async () => {
    if (!selected) return toast.error('Please select a delivery address');
    setPlacing(true);
    try {
      const payload = {
        address_id: selected,
        coupon_code: discount ? coupon : undefined,
      };

      if (method === 'razorpay') { await payWithRazorpay(payload); return; }

      if (method === 'cod') {
        const { data } = await api.post('/api/orders/cod', payload);
        toast.success('Order placed!');
        refresh();
        return navigate(`/order-success/${data.data.order_id}`);
      }

      // UPI / QR manual payment — customer submits transaction id + screenshot,
      // order waits for admin verification.
      if (!upiEnabled) return toast.error('Online payment is not available right now. Please choose Cash on Delivery.');
      if (!txnId.trim()) return toast.error('Please enter the UPI transaction / reference id');
      if (!screenshot) return toast.error('Please upload your payment screenshot');

      const { data } = await api.post('/api/orders/upi', {
        ...payload, txn_id: txnId.trim(), screenshot,
      });
      toast.success('Payment submitted — awaiting verification');
      refresh();
      navigate(`/order-success/${data.data.order_id}`);
    } catch (err) {
      toast.error(err.message);
    } finally { setPlacing(false); }
  };

  const upiReady = method !== 'upi' || (upiEnabled && txnId.trim() && screenshot);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => navigate('/cart')}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-gray-600 transition hover:border-gold hover:text-gold dark:border-white/10 dark:bg-gray-900 dark:text-gray-300"
          title="Back to Shopping Bag"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-3xl font-bold">Checkout</h1>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Addresses */}
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Delivery Address</h2>
              <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-1 text-sm text-gold">
                <Plus size={16} /> Add New
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <button key={a.id} onClick={() => setSelected(a.id)}
                  className={`rounded-xl border p-4 text-left text-sm transition ${selected === a.id ? 'border-gold bg-gold/5' : 'border-black/10 dark:border-white/10'}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold">{a.full_name}</span>
                    {selected === a.id && <Check size={16} className="text-gold" />}
                  </div>
                  <p className="mt-1 text-gray-400">{a.line1}, {a.city}, {a.state} - {a.pincode}</p>
                  <p className="text-gray-400">{a.phone}</p>
                </button>
              ))}
            </div>

            {showForm && (
              <form onSubmit={saveAddress} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input required className="input" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <input required className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input required className="input sm:col-span-2" placeholder="Address Line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
                <input className="input sm:col-span-2" placeholder="Address Line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
                <input required className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <input required className="input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                <input required className="input" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                <button className="btn-gold sm:col-span-2">Save Address</button>
              </form>
            )}
          </section>

          {/* Payment method — gated by order total (live rule from the DB) */}
          <section className="card p-6">
            <h2 className="mb-1 text-lg font-semibold">Payment Method</h2>
            <p className="mb-4 text-xs text-gray-400">
              {codAllowed
                ? `Cash on Delivery or pay online. (COD available up to ${inr(codMax)}.)`
                : `Orders above ${inr(codMax)} are paid online (Razorpay) only.`}
            </p>
            <div className={`grid gap-3 ${codAllowed ? 'sm:grid-cols-2' : ''}`}>
              <PayOption active={method === 'razorpay'} onClick={() => setMethod('razorpay')} icon={CreditCard}
                title="Card / UPI / Netbanking" subtitle="Secure payment via Razorpay" />
              {codAllowed && (
                <PayOption active={method === 'cod'} onClick={() => setMethod('cod')} icon={Banknote}
                  title="Cash on Delivery" subtitle="Pay when you receive" />
              )}
            </div>

            {/* Razorpay panel */}
            {method === 'razorpay' && (
              <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/[0.03] p-5">
                <p className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-300">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold" />
                  You'll pay securely via Razorpay — Cards, UPI, Netbanking &amp; Wallets. Your order is confirmed instantly on successful payment.
                </p>
              </div>
            )}

            {/* UPI / QR payment panel */}
            {method === 'upi' && (
              <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/[0.03] p-5">
                {!payInfo ? (
                  <p className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Loading payment details…</p>
                ) : !upiEnabled ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Online payment isn’t configured yet. Please choose <b>Cash on Delivery</b>, or ask the store to add a UPI ID in Admin → Settings.
                  </p>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* LEFT — scan QR / account details */}
                    <div className="text-center">
                      <p className="mb-1 text-sm font-semibold">Scan &amp; Pay</p>
                      <p className="mb-3 text-xs text-gray-400">UPI apps: GPay, PhonePe, Paytm, BHIM</p>
                      <div className="mx-auto inline-block rounded-2xl bg-white p-3 shadow-luxe">
                        {qrUrl
                          ? <img src={qrUrl} alt="UPI QR" className="h-44 w-44" />
                          : <div className="flex h-44 w-44 items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>}
                      </div>
                      <p className="mt-3 font-display text-2xl font-bold text-gold">{inr(total)}</p>

                      <div className="mt-4 space-y-2 text-left text-sm">
                        <DetailRow label="UPI ID" value={payInfo.upi_id} onCopy={() => copy(payInfo.upi_id, 'UPI ID')} />
                        <DetailRow label="Payee" value={payInfo.payee_name} />
                        {payInfo.account_number && (
                          <>
                            <div className="my-2 flex items-center gap-2 text-xs text-gray-400">
                              <span className="h-px flex-1 bg-black/10 dark:bg-white/10" /> or bank transfer <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                            </div>
                            <DetailRow label="A/C Name" value={payInfo.account_name} />
                            <DetailRow label="A/C No." value={payInfo.account_number} onCopy={() => copy(payInfo.account_number, 'Account number')} />
                            {payInfo.ifsc && <DetailRow label="IFSC" value={payInfo.ifsc} onCopy={() => copy(payInfo.ifsc, 'IFSC')} />}
                            {payInfo.bank_name && <DetailRow label="Bank" value={payInfo.bank_name} />}
                          </>
                        )}
                      </div>
                    </div>

                    {/* RIGHT — confirm your payment */}
                    <div>
                      <p className="mb-3 text-sm font-semibold">Confirm your payment</p>
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <ReadonlyField label="Name" value={custName || '—'} />
                          <ReadonlyField label="Phone" value={custPhone || '—'} />
                        </div>
                        <label className="block">
                          <span className="mb-1 block text-xs text-gray-400">UPI Transaction / Reference ID <span className="text-rose-500">*</span></span>
                          <input className="input" placeholder="e.g. 4157XXXXXX123"
                            value={txnId} onChange={(e) => setTxnId(e.target.value)} />
                        </label>
                        <div>
                          <span className="mb-1 block text-xs text-gray-400">Payment screenshot <span className="text-rose-500">*</span></span>
                          {screenshot ? (
                            <div className="flex items-center gap-3">
                              <img src={screenshot} alt="proof" className="h-16 w-16 rounded-lg border border-black/10 object-cover dark:border-white/10" />
                              <button onClick={() => setScreenshot('')} className="text-xs text-rose-500 hover:underline">Remove</button>
                            </div>
                          ) : (
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/50 px-4 py-6 text-sm text-gold hover:bg-gold/10">
                              <Upload size={16} /> Upload screenshot
                              <input type="file" accept="image/*" className="hidden" onChange={pickScreenshot} />
                            </label>
                          )}
                        </div>
                        <p className="flex items-start gap-1.5 rounded-lg bg-black/5 px-3 py-2 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
                          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gold" />
                          After you place the order, our team verifies the payment and confirms it. You’ll get an email once approved.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Summary */}
        <div className="card h-fit p-6">
          <h3 className="mb-4 text-lg font-semibold">Order Summary</h3>
          <div className="mb-4 max-h-48 space-y-3 overflow-y-auto">
            {cart.items.map((i) => (
              <div key={i.id} className="flex gap-3 text-sm">
                <img src={i.image} className="h-14 w-12 rounded-lg object-cover" alt="" />
                <div className="flex-1">
                  <p className="line-clamp-1 font-medium">{i.name}</p>
                  <p className="text-gray-400">Qty {i.quantity}</p>
                </div>
                <span>{inr(i.line_total)}</span>
              </div>
            ))}
          </div>

          <div className="mb-2 flex gap-2">
            <input className="input !py-2 text-sm" placeholder="Coupon code" value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
            <button onClick={() => applyCoupon()} className="btn-outline !px-4 !py-2 text-sm"><Tag size={14} /> Apply</button>
          </div>

          {/* Available coupons (live from backend) */}
          {offers.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs text-gray-400">Available offers — tap to apply:</p>
              <div className="flex flex-wrap gap-2">
                {offers.map((o) => {
                  const active = appliedCode === o.code;
                  return (
                    <button key={o.code} onClick={() => applyCoupon(o.code)} title={`${offerLabel(o)}${Number(o.min_order) > 0 ? ` · min ${inr(o.min_order)}` : ''}`}
                      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${active ? 'border-gold bg-gold/15 text-gold' : 'border-dashed border-gold/40 text-gold hover:bg-gold/10'}`}>
                      <Tag size={11} /> {o.code}
                      <span className="font-normal text-gray-400">· {offerLabel(o)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Row label="Subtotal" value={inr(subtotal)} />
          {discount > 0 && <Row label="Discount" value={`-${inr(discount)}`} className="text-emerald-500" />}
          <Row label="Shipping" value={shipping ? inr(shipping) : 'Free'} />
          <div className="my-3 border-t border-black/5 dark:border-white/10" />
          <Row label="Total" value={inr(total)} bold />

          <button onClick={placeOrder} disabled={placing || !upiReady} className="btn-gold mt-6 w-full disabled:opacity-60">
            {placing ? 'Processing…'
              : method === 'cod' ? 'Place Order'
              : method === 'razorpay' ? `Pay ${inr(total)}`
              : `I've Paid ${inr(total)} — Place Order`}
          </button>
          {method === 'upi' && upiEnabled && !upiReady && (
            <p className="mt-2 text-center text-xs text-gray-400">Enter the transaction id &amp; upload the screenshot to continue</p>
          )}
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, bold, className = '' }) => (
  <div className={`flex justify-between py-1.5 ${bold ? 'text-lg font-bold' : 'text-sm text-gray-500 dark:text-gray-300'} ${className}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);

const DetailRow = ({ label, value, onCopy }) => (
  <div className="flex items-center justify-between gap-2 rounded-lg bg-black/5 px-3 py-2 dark:bg-white/5">
    <span className="text-xs text-gray-400">{label}</span>
    <span className="flex items-center gap-2 font-medium">
      <span className="truncate">{value}</span>
      {onCopy && <button onClick={onCopy} className="text-gold hover:opacity-70" title="Copy"><Copy size={13} /></button>}
    </span>
  </div>
);

const ReadonlyField = ({ label, value }) => (
  <div>
    <span className="mb-1 block text-xs text-gray-400">{label}</span>
    <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">{value}</div>
  </div>
);

const PayOption = ({ active, onClick, icon: Icon, title, subtitle }) => (
  <button onClick={onClick}
    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-gold bg-gold/5' : 'border-black/10 dark:border-white/10'}`}>
    <Icon size={22} className={active ? 'text-gold' : 'text-gray-400'} />
    <div><p className="font-semibold">{title}</p><p className="text-xs text-gray-400">{subtitle}</p></div>
  </button>
);

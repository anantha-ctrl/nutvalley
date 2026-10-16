import QRCode from 'qrcode';
import { inr, dateFmt } from './format';

/**
 * Opens a clean, print-ready invoice in a new window and triggers the print
 * dialog (users can "Save as PDF" from there). Adds a delivery-verification QR
 * that encodes a signed link — scanning it confirms the order live from the DB.
 *
 * Async because the QR is generated as a data URI; the popup is opened first
 * (inside the click gesture) so it isn't blocked while the QR renders.
 */
export async function printInvoice(order) {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return;
  w.document.write('<!doctype html><title>Invoice…</title><body style="font:14px Arial;padding:40px;color:#888">Generating invoice…</body>');

  const a = order.shipping_address || {};
  const rows = order.items.map((it) => `
    <tr>
      <td>${escapeHtml(it.product_name)}${it.size ? ` <span class="muted">(${it.size}${it.color ? ', ' + it.color : ''})</span>` : ''}</td>
      <td class="center">${it.quantity}</td>
      <td class="right">${inr(it.price)}</td>
      <td class="right">${inr(it.line_total)}</td>
    </tr>`).join('');

  const logoUrl = `${window.location.origin}/logo.png`;

  // Delivery-verification QR (signed link → live order lookup on scan).
  let verifyBlock = '';
  if (order.verify_token) {
    const verifyUrl = `${window.location.origin}/verify-order/${order.id}?t=${order.verify_token}`;
    let qrImg = '';
    try {
      qrImg = await QRCode.toDataURL(verifyUrl, { width: 150, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } });
    } catch { /* QR is best-effort — invoice still prints without it */ }
    if (qrImg) {
      verifyBlock = `
    <div class="verify">
      <img src="${qrImg}" alt="Verification QR" />
      <div>
        <div class="verify-title">Delivery Verification</div>
        <div class="muted">Scan to verify this order &amp; its items<br>against the live store record.</div>
      </div>
    </div>`;
    }
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${order.order_number}</title>
<style>
  * { font-family: 'Helvetica Neue', Arial, sans-serif; box-sizing: border-box; }
  body { margin: 0; padding: 40px; color: #1a1a1a; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b8745a; padding-bottom: 18px; }
  .brand { height: 56px; width: auto; object-fit: contain; }
  .muted { color: #888; font-size: 12px; }
  h2 { margin: 0 0 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #b8745a; }
  .cols { display: flex; justify-content: space-between; gap: 30px; margin: 26px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th { text-align: left; background: #fbf4f2; padding: 10px; border-bottom: 2px solid #eedfdc; }
  td { padding: 10px; border-bottom: 1px solid #eee; }
  .center { text-align: center; } .right { text-align: right; }
  .totals { width: 280px; margin-left: auto; margin-top: 18px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #b8745a; margin-top: 6px; padding-top: 10px; font-size: 17px; font-weight: 800; }
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; background:#e7f6ec; color:#1a8a4a; font-size:12px; font-weight:600; }
  .below { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-top:18px; }
  .verify { display:flex; align-items:center; gap:14px; border:1px solid #eedfdc; background:#fbf4f2; border-radius:10px; padding:12px 14px; max-width:340px; }
  .verify img { width:96px; height:96px; }
  .verify-title { font-weight:700; font-size:13px; color:#1a1a1a; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px; }
  .foot { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; }
</style></head>
<body>
  <div class="head">
    <div>
      <img class="brand" src="${logoUrl}" alt="Beadsboutique" />
      <div class="muted" style="margin-top:6px">Handcrafted beaded jewellery.</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:700">INVOICE</div>
      <div class="muted">#${order.order_number}</div>
      <div class="muted">${dateFmt(order.placed_at)}</div>
    </div>
  </div>

  <div class="cols">
    <div>
      <h2>Billed To</h2>
      <strong>${escapeHtml(a.full_name || '')}</strong><br>
      ${escapeHtml(a.line1 || '')}${a.line2 ? ', ' + escapeHtml(a.line2) : ''}<br>
      ${escapeHtml(a.city || '')}, ${escapeHtml(a.state || '')} - ${escapeHtml(a.pincode || '')}<br>
      ${escapeHtml(a.phone || '')}
    </div>
    <div style="text-align:right">
      <h2>Payment</h2>
      ${(order.payment_method || '').toUpperCase()}<br>
      <span class="badge">${order.payment_status}</span><br>
      <span class="muted">Status: ${order.status}</span>
    </div>
  </div>

  <table>
    <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="below">
    ${verifyBlock}
    <div class="totals">
      <div><span>Subtotal</span><span>${inr(order.subtotal)}</span></div>
      ${order.discount > 0 ? `<div><span>Discount${order.coupon_code ? ' (' + order.coupon_code + ')' : ''}</span><span>-${inr(order.discount)}</span></div>` : ''}
      <div><span>Shipping</span><span>${order.shipping_fee ? inr(order.shipping_fee) : 'Free'}</span></div>
      <div class="grand"><span>Total</span><span>${inr(order.total)}</span></div>
    </div>
  </div>

  <div class="foot">Thank you for shopping with Beadsboutique · beadsboutiquejewellery@gmail.com</div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * Print-ready invoice for an in-store counter bill (the `bills` table shape).
 * Mirrors the billing-counter receipt, including a split-payment breakdown.
 */
export function printBill(bill, config = {}) {
  const money = (n) => inr(n);
  const rows = (bill.items || []).map((i) => `
    <tr>
      <td>${escapeHtml(i.product_name)}${i.sku ? ` <span class="muted">(${escapeHtml(i.sku)})</span>` : ''}</td>
      <td class="center">${i.quantity}</td>
      <td class="right">${money(i.price)}</td>
      <td class="right">${money(i.line_total)}</td>
    </tr>`).join('');
  const logoUrl = `${window.location.origin}/logo.png`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(bill.bill_number)}</title>
<style>
  * { font-family: 'Helvetica Neue', Arial, sans-serif; box-sizing: border-box; }
  body { margin: 0; padding: 40px; color: #1a1a1a; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b8745a; padding-bottom: 18px; }
  .brand { height: 56px; width: auto; object-fit: contain; }
  .muted { color: #888; font-size: 12px; }
  h2 { margin: 0 0 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #b8745a; }
  .cols { display: flex; justify-content: space-between; gap: 30px; margin: 26px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th { text-align: left; background: #fbf4f2; padding: 10px; border-bottom: 2px solid #eedfdc; }
  td { padding: 10px; border-bottom: 1px solid #eee; }
  .center { text-align: center; } .right { text-align: right; }
  .totals { width: 280px; margin-left: auto; margin-top: 18px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #b8745a; margin-top: 6px; padding-top: 10px; font-size: 17px; font-weight: 800; }
  .void { color:#e11d48; border:2px solid #e11d48; text-align:center; font-weight:700; padding:6px; margin:14px 0; border-radius:6px; }
  .foot { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; }
</style></head>
<body>
  <div class="head">
    <div>
      <img class="brand" src="${logoUrl}" alt="${escapeHtml(config.store_name || 'Beadsboutique')}" />
      <div class="muted" style="margin-top:6px">${escapeHtml(config.address || 'In-store purchase')}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:700">INVOICE</div>
      <div class="muted">#${escapeHtml(bill.bill_number)}</div>
      <div class="muted">${dateFmt(bill.created_at)}</div>
    </div>
  </div>

  <div class="cols">
    <div>
      <h2>Billed To</h2>
      <strong>${escapeHtml(bill.customer_name || 'Walk-in customer')}</strong><br>
      ${bill.customer_phone ? escapeHtml(bill.customer_phone) + '<br>' : ''}
      ${bill.cashier ? `<span class="muted">Cashier: ${escapeHtml(bill.cashier)}</span>` : ''}
    </div>
    <div style="text-align:right">
      <h2>Payment</h2>
      ${escapeHtml((bill.payment_method || '').toUpperCase())}<br>
      <span class="muted">Counter sale</span>
    </div>
  </div>

  ${bill.status === 'void' ? '<div class="void">VOID — items restocked</div>' : ''}

  <table>
    <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${money(bill.subtotal)}</span></div>
    ${bill.discount > 0 ? `<div><span>Discount</span><span>-${money(bill.discount)}</span></div>` : ''}
    ${bill.tax_amount > 0 ? `<div><span>Tax (${bill.tax_pct}%)</span><span>${money(bill.tax_amount)}</span></div>` : ''}
    <div class="grand"><span>Total</span><span>${money(bill.total)}</span></div>
    <div><span>Paid (${escapeHtml(bill.payment_method)})</span><span>${money(bill.paid)}</span></div>
    ${bill.payment_method === 'split' ? `<div class="muted"><span>&nbsp;&nbsp;Cash</span><span>${money(bill.split_cash)}</span></div><div class="muted"><span>&nbsp;&nbsp;Card / UPI</span><span>${money(bill.split_digital)}</span></div>` : ''}
    ${bill.change_due > 0 ? `<div><span>Change</span><span>${money(bill.change_due)}</span></div>` : ''}
  </div>

  <div class="foot">${escapeHtml(config.footer_note || 'Thank you for shopping with us!')}</div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

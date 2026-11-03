import{q as o,w as c}from"./index-DaY32o0l.js";function g(t){const n=window.open("","_blank","width=820,height=900");if(!n)return;const e=t.shipping_address||{},d=t.items.map(s=>`
    <tr>
      <td>${a(s.product_name)}${s.size?` <span class="muted">(${s.size}${s.color?", "+s.color:""})</span>`:""}</td>
      <td class="center">${s.quantity}</td>
      <td class="right">${o(s.price)}</td>
      <td class="right">${o(s.line_total)}</td>
    </tr>`).join(""),p=`${window.location.origin}/Nut_Valley_Logo.png`,r=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${t.order_number}</title>
<style>
  * { font-family: 'Helvetica Neue', Arial, sans-serif; box-sizing: border-box; }
  body { margin: 0; padding: 40px; color: #1a1a1a; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #c9971c; padding-bottom: 18px; }
  .brand { height: 56px; width: auto; object-fit: contain; }
  .muted { color: #888; font-size: 12px; }
  h2 { margin: 0 0 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #c9971c; }
  .cols { display: flex; justify-content: space-between; gap: 30px; margin: 26px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th { text-align: left; background: #fbf6ea; padding: 10px; border-bottom: 2px solid #ece2c6; }
  td { padding: 10px; border-bottom: 1px solid #eee; }
  .center { text-align: center; } .right { text-align: right; }
  .totals { width: 280px; margin-left: auto; margin-top: 18px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #c9971c; margin-top: 6px; padding-top: 10px; font-size: 17px; font-weight: 800; }
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; background:#e7f6ec; color:#1a8a4a; font-size:12px; font-weight:600; }
  .foot { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; }
</style></head>
<body>
  <div class="head">
    <div>
      <img class="brand" src="${p}" alt="NutValley" />
      <div class="muted" style="margin-top:6px">Premium nuts &amp; dry fruits.</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:700">INVOICE</div>
      <div class="muted">#${t.order_number}</div>
      <div class="muted">${c(t.placed_at)}</div>
    </div>
  </div>

  <div class="cols">
    <div>
      <h2>Billed To</h2>
      <strong>${a(e.full_name||"")}</strong><br>
      ${a(e.line1||"")}${e.line2?", "+a(e.line2):""}<br>
      ${a(e.city||"")}, ${a(e.state||"")} - ${a(e.pincode||"")}<br>
      ${a(e.phone||"")}
    </div>
    <div style="text-align:right">
      <h2>Payment</h2>
      ${(t.payment_method||"").toUpperCase()}<br>
      <span class="badge">${t.payment_status}</span><br>
      <span class="muted">Status: ${t.status}</span>
    </div>
  </div>

  <table>
    <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead>
    <tbody>${d}</tbody>
  </table>

  <div class="totals">
      <div><span>Subtotal</span><span>${o(t.subtotal)}</span></div>
      ${t.discount>0?`<div><span>Discount${t.coupon_code?" ("+t.coupon_code+")":""}</span><span>-${o(t.discount)}</span></div>`:""}
      <div><span>Shipping</span><span>${t.shipping_fee?o(t.shipping_fee):"Free"}</span></div>
      <div class="grand"><span>Total</span><span>${o(t.total)}</span></div>
  </div>

  <div class="foot">Thank you for shopping with NutValley · nutsvally@gmail.com</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body></html>`;n.document.open(),n.document.write(r),n.document.close()}function h(t,n={}){const e=i=>o(i),d=(t.items||[]).map(i=>`
    <tr>
      <td>${a(i.product_name)}${i.sku?` <span class="muted">(${a(i.sku)})</span>`:""}</td>
      <td class="center">${i.quantity}</td>
      <td class="right">${e(i.price)}</td>
      <td class="right">${e(i.line_total)}</td>
    </tr>`).join(""),p=`${window.location.origin}/Nut_Valley_Logo.png`,r=`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${a(t.bill_number)}</title>
<style>
  * { font-family: 'Helvetica Neue', Arial, sans-serif; box-sizing: border-box; }
  body { margin: 0; padding: 40px; color: #1a1a1a; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #c9971c; padding-bottom: 18px; }
  .brand { height: 56px; width: auto; object-fit: contain; }
  .muted { color: #888; font-size: 12px; }
  h2 { margin: 0 0 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #c9971c; }
  .cols { display: flex; justify-content: space-between; gap: 30px; margin: 26px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th { text-align: left; background: #fbf6ea; padding: 10px; border-bottom: 2px solid #ece2c6; }
  td { padding: 10px; border-bottom: 1px solid #eee; }
  .center { text-align: center; } .right { text-align: right; }
  .totals { width: 280px; margin-left: auto; margin-top: 18px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #c9971c; margin-top: 6px; padding-top: 10px; font-size: 17px; font-weight: 800; }
  .void { color:#e11d48; border:2px solid #e11d48; text-align:center; font-weight:700; padding:6px; margin:14px 0; border-radius:6px; }
  .foot { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; }
</style></head>
<body>
  <div class="head">
    <div>
      <img class="brand" src="${p}" alt="${a(n.store_name||"NutValley")}" />
      <div class="muted" style="margin-top:6px">${a(n.address||"In-store purchase")}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:20px;font-weight:700">INVOICE</div>
      <div class="muted">#${a(t.bill_number)}</div>
      <div class="muted">${c(t.created_at)}</div>
    </div>
  </div>

  <div class="cols">
    <div>
      <h2>Billed To</h2>
      <strong>${a(t.customer_name||"Walk-in customer")}</strong><br>
      ${t.customer_phone?a(t.customer_phone)+"<br>":""}
      ${t.cashier?`<span class="muted">Cashier: ${a(t.cashier)}</span>`:""}
    </div>
    <div style="text-align:right">
      <h2>Payment</h2>
      ${a((t.payment_method||"").toUpperCase())}<br>
      <span class="muted">Counter sale</span>
    </div>
  </div>

  ${t.status==="void"?'<div class="void">VOID — items restocked</div>':""}

  <table>
    <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Total</th></tr></thead>
    <tbody>${d}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${e(t.subtotal)}</span></div>
    ${t.discount>0?`<div><span>Discount</span><span>-${e(t.discount)}</span></div>`:""}
    ${t.tax_amount>0?`<div><span>Tax (${t.tax_pct}%)</span><span>${e(t.tax_amount)}</span></div>`:""}
    <div class="grand"><span>Total</span><span>${e(t.total)}</span></div>
    <div><span>Paid (${a(t.payment_method)})</span><span>${e(t.paid)}</span></div>
    ${t.payment_method==="split"?`<div class="muted"><span>&nbsp;&nbsp;Cash</span><span>${e(t.split_cash)}</span></div><div class="muted"><span>&nbsp;&nbsp;Card / UPI</span><span>${e(t.split_digital)}</span></div>`:""}
    ${t.change_due>0?`<div><span>Change</span><span>${e(t.change_due)}</span></div>`:""}
  </div>

  <div class="foot">${a(n.footer_note||"Thank you for shopping with us!")}</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body></html>`,s=window.open("","_blank","width=820,height=900");s&&(s.document.write(r),s.document.close())}function a(t){return String(t??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n])}export{h as a,g as p};

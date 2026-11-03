# Novo Clothing — Page → API Map

Which API endpoint each page / component / context calls.
Base URL: `http://localhost/CloudFashion/backend`  ·  `(✓)` = needs auth token.

---

## Storefront pages  (frontend/src/pages/)

```
Home.jsx
    GET    /api/banners
    GET    /api/categories

Shop.jsx
    GET    /api/categories
    GET    /api/products/filters?...        (size/color/price facets)
    GET    /api/products?...                (search, on_sale, sort, page)

ProductDetails.jsx
    GET    /api/products/{slug}
    GET    /api/products/{slug}/related
    GET    /api/products/{slug}/frequently-bought
    GET    /api/products/{id}/reviews
    POST   /api/recently-viewed            (✓, logged-in only)
    POST   /api/products/{id}/reviews       (✓, after delivery)

Compare.jsx
    GET    /api/products/{slug}             (one per compared item)

Checkout.jsx
    GET    /api/offers
    GET    /api/shipping-info               (✓)
    GET    /api/loyalty                     (✓)
    GET    /api/payment-info                (UPI id / payee / QR / bank details)
    GET    /api/addresses                   (✓)
    POST   /api/addresses                   (✓)
    POST   /api/coupons/apply               (✓)
    POST   /api/orders/cod                  (✓, COD)
    POST   /api/orders/upi                  (✓, UPI/QR — txn id + screenshot)
    # Razorpay endpoints (/api/checkout/create-order · /verify) remain available but
    # are not used by the default checkout (online = admin-verified UPI/QR).

Orders.jsx
    GET    /api/orders                      (✓)

OrderDetail.jsx
    GET    /api/orders/{id}                 (✓)
    PUT    /api/orders/{id}/cancel          (✓)
    POST   /api/orders/{id}/reorder         (✓)
    POST   /api/orders/{id}/return          (✓, RMA)
    POST   /api/products/{id}/reviews       (✓, per item)

OrderSuccess.jsx
    GET    /api/orders/{id}                 (✓)

Profile.jsx
    PUT    /api/profile                     (✓)
    PUT    /api/profile/password            (✓)
    GET    /api/loyalty                     (✓, Rewards tab)
    GET    /api/addresses                   (✓)
    POST   /api/addresses                   (✓)
    PUT    /api/addresses/{id}              (✓, set default)
    DELETE /api/addresses/{id}              (✓)

static/Contact.jsx
    POST   /api/contact
```

---

## Auth pages  (frontend/src/pages/auth/)

```
Login.jsx          POST /api/auth/login        (via AuthContext)
                   POST /api/auth/google       (Continue with Google)
Register.jsx       POST /api/auth/register
VerifyOtp.jsx      POST /api/auth/verify-otp   (via AuthContext)
                   POST /api/auth/resend-otp
ForgotPassword.jsx POST /api/auth/forgot-password
ResetPassword.jsx  POST /api/auth/reset-password
```

---

## Global components & contexts  (run on every page)

```
context/AuthContext.jsx
    GET    /api/auth/me                     (✓, boot + sliding session)
    POST   /api/auth/login
    POST   /api/auth/google
    POST   /api/auth/register
    POST   /api/auth/verify-otp

context/CartContext.jsx
    GET    /api/cart                        (✓)
    POST   /api/cart                        (✓)
    PUT    /api/cart/{id}                   (✓)
    DELETE /api/cart/{id}                   (✓)
    DELETE /api/cart                        (✓, clear)

context/WishlistContext.jsx
    GET    /api/wishlist                    (✓)
    POST   /api/wishlist                    (✓)
    DELETE /api/wishlist/{id}               (✓)

context/StoreContext.jsx
    GET    /api/store-info                  (announcement, socials, contact…)

api/client.js
    GET    /api/auth/me                     (401 interceptor probe)

components/Navbar.jsx
    GET    /api/categories
    GET    /api/products?search=...         (search suggestions)

components/Footer.jsx          POST /api/newsletter
components/OffersStrip.jsx     GET  /api/offers
components/RecentlyViewed.jsx  GET  /api/recently-viewed     (✓)
components/QuickViewModal.jsx  GET  /api/products/{slug}
components/NotifyStock.jsx     POST /api/notify-stock
```

---

## Admin pages  (frontend/src/admin/) — all require admin token

```
Dashboard.jsx
    GET    /api/admin/dashboard

NotificationBell.jsx
    GET    /api/admin/notifications
    POST   /api/admin/notifications/state
    POST   /api/admin/notifications/read-all

AdminProducts.jsx
    GET    /api/admin/products
    POST   /api/admin/products/import       (CSV)
    POST   /api/admin/products/bulk
    DELETE /api/admin/products/{id}

AdminProductForm.jsx
    GET    /api/categories
    GET    /api/admin/products
    GET    /api/products/{slug}             (prefill on edit)
    POST   /api/admin/products              (create)
    PUT    /api/admin/products/{id}         (update)

AdminCategories.jsx
    GET    /api/categories
    POST   /api/admin/categories
    PUT    /api/admin/categories/{id}
    DELETE /api/admin/categories/{id}

AdminOrders.jsx
    GET    /api/admin/orders?status=
    PUT    /api/admin/orders/{id}/status    (carrier + tracking, emails)
    GET    /api/admin/orders/{id}/payment   (UPI proof: txn id + screenshot)
    PUT    /api/admin/orders/{id}/payment   (approve/reject → emails customer)

AdminReturns.jsx
    GET    /api/admin/returns
    PUT    /api/admin/returns/{id}          (approve/reject/refund)

AdminInventory.jsx
    GET    /api/admin/inventory
    PUT    /api/admin/inventory/{id}

AdminCustomers.jsx
    GET    /api/admin/customers
    GET    /api/admin/customers/{id}
    # Export to CSV / Excel / PDF is generated client-side (no API call).

AdminCoupons.jsx
    GET    /api/admin/coupons
    POST   /api/admin/coupons
    PUT    /api/admin/coupons/{id}
    DELETE /api/admin/coupons/{id}

AdminBanners.jsx
    GET    /api/admin/banners
    POST   /api/admin/banners
    PUT    /api/admin/banners/{id}
    DELETE /api/admin/banners/{id}

AdminReviews.jsx
    GET    /api/admin/reviews
    PUT    /api/admin/reviews/{id}          (hide/unhide)
    DELETE /api/admin/reviews/{id}

AdminLoyalty.jsx
    GET    /api/admin/loyalty
    PUT    /api/admin/loyalty/settings      (program rules)
    GET    /api/admin/loyalty/{id}          (customer detail)
    POST   /api/admin/loyalty/{id}/adjust   (manual credit/debit)

AdminMessages.jsx
    GET    /api/admin/messages
    PUT    /api/admin/messages/{id}         (read/unread)
    DELETE /api/admin/messages/{id}

AdminSettings.jsx
    GET    /api/admin/settings
    PUT    /api/admin/settings

AdminReports.jsx
    GET    /api/admin/reports/sales?from=&to=
    GET    /api/admin/reports/products
    GET    /api/admin/reports/customers
```

---

> Full request/response details for each endpoint: see **[API.md](API.md)**.
> Route definitions: **[routes.php](routes.php)**.

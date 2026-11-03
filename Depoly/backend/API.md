# Novo Clothing — API Reference

Base URL: `http://localhost/CloudFashion/backend`
All responses: `{ "success": bool, "message": string, "data": any }`
Auth: send `Authorization: Bearer <token>` for protected routes.

> Want to know **which page calls which endpoint**? See **[PAGE_API_MAP.md](PAGE_API_MAP.md)**.

---

## Auth
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/register` | – | `name, email, password, password_confirmation, phone?` |
| POST | `/api/auth/verify-otp` | – | `email, otp` → returns `{token, user}` |
| POST | `/api/auth/resend-otp` | – | `email` |
| POST | `/api/auth/login` | – | `email, password` → `{token, user}` |
| POST | `/api/auth/google` | – | `access_token` (Google OAuth) → find-or-create → `{token, user}`; 503 if `GOOGLE_CLIENT_ID` unset |
| POST | `/api/auth/logout` | – | – |
| POST | `/api/auth/forgot-password` | – | `email` |
| POST | `/api/auth/reset-password` | – | `email, token, password, password_confirmation` |
| GET | `/api/auth/me` | ✓ | – → `{user, token}` (sliding session: rolls the 7-day window forward) |
| PUT | `/api/profile` | ✓ | `name, phone?` |
| PUT | `/api/profile/password` | ✓ | `current_password, password, password_confirmation` |

## Categories & Products
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/categories` | with `product_count` |
| GET | `/api/categories/{slug}` | |
| GET | `/api/products` | query: `search, category, brand, size, color, min_price, max_price, on_sale, sort, page, per_page` · `sort` adds `discount` |
| GET | `/api/products/featured\|trending\|new-arrivals\|best-sellers` | `?limit=` |
| GET | `/api/products/filters` | live facets: distinct sizes, colors (+hex), price range |
| GET | `/api/products/{slug}` | images, variants, sizes, colors |
| GET | `/api/products/{slug}/related` | |
| GET | `/api/products/{slug}/frequently-bought` | co-purchased items (category fallback) |
| GET | `/api/products/{id}/reviews` | excludes hidden reviews |
| POST | `/api/products/{id}/reviews` ✓ | `rating(1-5), title?, comment?` — requires a **delivered** order of the product |

## Cart / Wishlist / Addresses (all ✓)
| Method | Endpoint | Body |
|---|---|---|
| GET/POST | `/api/cart` | POST: `product_id, variant_id?, quantity?` |
| PUT/DELETE | `/api/cart/{id}` | PUT: `quantity` |
| DELETE | `/api/cart` | clear |
| GET/POST | `/api/wishlist` | POST: `product_id` |
| DELETE | `/api/wishlist/{productId}` | |
| GET/POST | `/api/addresses` | |
| PUT/DELETE | `/api/addresses/{id}` | |

## Checkout / Orders (all ✓)
| Method | Endpoint | Body / Notes |
|---|---|---|
| POST | `/api/coupons/apply` | `code, subtotal` |
| GET | `/api/shipping-info` | first-order-free flag, free-shipping threshold + flat fee (from settings) |
| POST | `/api/checkout/create-order` | `address_id, coupon_code?, points_redeem?` → razorpay order (gateway path — optional) |
| POST | `/api/checkout/verify` | `order_id, razorpay_*` (or `is_test`) |
| POST | `/api/orders/cod` | `address_id, coupon_code?, points_redeem?` |
| POST | `/api/orders/upi` | `address_id, coupon_code?, points_redeem?, txn_id, screenshot` — UPI/QR: places the order as **awaiting verification** (`payment_approval=pending`), stores the proof, emails the admin. Stock committed only on admin approval. |
| GET | `/api/orders` · `/api/orders/{id}` | `{id}` also returns each item's `my_review` + any `return` record |
| PUT | `/api/orders/{id}/cancel` | restocks items |
| POST | `/api/orders/{id}/reorder` | re-adds the order's items to the cart |
| POST | `/api/orders/{id}/return` | `reason, items?` — RMA request on a **delivered** order |

## Loyalty (✓)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/loyalty` | balance, history, and live rules (`earn_rate_pct, earn_cap, redeem_cap_pct, point_value`) |

Earning is capped per order (`earn_cap`); points redeem at `point_value` ₹ each, up to `redeem_cap_pct` of the payable amount. *(The referral programme was removed; loyalty points remain.)*

## Misc
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/newsletter` | `email` |
| POST | `/api/contact` | `name, email, subject?, message` — saved to DB + emailed (reply-to sender) |
| GET | `/api/store-info` | public store config: name, contact, announcement, free-shipping min, socials, WhatsApp |
| GET | `/api/payment-info` | public checkout payee details: `upi_enabled, upi_id, payee_name, qr_image, bank_name, account_name, account_number, ifsc` |
| GET | `/api/offers` | active coupons for the offers strip |
| GET | `/api/banners` | active homepage banners |
| POST | `/api/notify-stock` | `product_id, email` (back-in-stock) |
| GET/POST | `/api/recently-viewed` | ✓ list / track a view |

## Admin (all require admin role)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/admin/dashboard` | KPIs, charts, widgets |
| GET | `/api/admin/notifications` | live alerts |
| POST | `/api/admin/notifications/state` | mark read/unread / dismiss |
| POST | `/api/admin/notifications/read-all` | mark all read |
| GET | `/api/admin/reports/sales\|products\|customers` | `?from=&to=` (sales) |
| GET/POST | `/api/admin/products` | list / create |
| POST | `/api/admin/products/bulk` | bulk action |
| POST | `/api/admin/products/import` | CSV import (auto-creates categories) |
| PUT/DELETE | `/api/admin/products/{id}` | update / delete |
| POST | `/api/admin/products/{id}/images` | upload images |
| GET | `/api/admin/inventory` · `/api/admin/inventory/low-stock` | |
| PUT | `/api/admin/inventory/{id}` | update stock |
| POST/PUT/DELETE | `/api/admin/categories[/{id}]` | image upload supported |
| GET | `/api/admin/orders?status=` | includes `payment_approval`, `payment_method`, `payment_txn_id` |
| PUT | `/api/admin/orders/{id}/status` | carrier + tracking, emails customer |
| GET | `/api/admin/orders/{id}/payment` | UPI proof: `payment_txn_id`, `payment_screenshot`, approval + customer |
| PUT | `/api/admin/orders/{id}/payment` | `action: approve\|reject, note?` — approve commits stock/loyalty + emails; reject marks failed + emails |
| GET | `/api/admin/customers[/{id}]` | |
| GET/POST/PUT/DELETE | `/api/admin/banners[/{id}]` | |
| GET/POST/PUT/DELETE | `/api/admin/coupons[/{id}]` | |
| GET | `/api/admin/reviews` | all reviews |
| PUT | `/api/admin/reviews/{id}` | hide/unhide (`is_hidden`) — recalcs rating |
| DELETE | `/api/admin/reviews/{id}` | delete — recalcs rating |
| GET | `/api/admin/returns` | RMA list |
| PUT | `/api/admin/returns/{id}` | approve/reject/refund → restock + email |
| GET | `/api/admin/loyalty` | customers, KPIs, current rules |
| PUT | `/api/admin/loyalty/settings` | edit rules (earn rate, cap, point value, redeem cap) |
| GET | `/api/admin/loyalty/{id}` | one customer's points history |
| POST | `/api/admin/loyalty/{id}/adjust` | `points (±), note?` manual credit/debit |
| GET | `/api/admin/messages` | Contact Us inbox + unread count |
| PUT | `/api/admin/messages/{id}` | `is_read` |
| DELETE | `/api/admin/messages/{id}` | delete |
| GET | `/api/admin/settings` | store settings |
| PUT | `/api/admin/settings` | save store settings (name, contact, inbox, announcement, free-shipping min/fee, socials, WhatsApp, landing copy/images, billing tax/prefix/footer, **UPI id/payee/QR + bank account/IFSC**) |

### Error codes
`401` unauthenticated · `403` forbidden / unverified email · `404` not found ·
`409` conflict (duplicate) · `422` validation (`errors` map) · `500` server error ·
`503` service not configured (e.g. Google Sign-In without `GOOGLE_CLIENT_ID`)

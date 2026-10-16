# 💳 Razorpay Payment Gateway — Setup Guide (Beadsboutique)

Indha guide-la Razorpay API keys epdi vaanguradhu, epdi connect panradhu-nu step-by-step irukku.
Checkout page-la **"Card / UPI / Netbanking — Secure payment via Razorpay"** option ippo already wired.
Keys illatta **test mode**-la work aagum; keys pottadhum **real payments** aagum.

---

## 0. Ippo enna state? (Current status)

| | Status |
|---|---|
| Backend Razorpay flow (`/api/checkout/create-order`, `/verify`) | ✅ Ready |
| Frontend checkout (modal + verify) | ✅ Wired |
| API keys | ⏳ **Neenga add pannanum** (`backend/.env`) |
| Mode | **Test mode** (keys empty = order place aagum, real charge illa) |

---

## 1. Razorpay account create pannunga

1. Go to **https://razorpay.com** → **Sign Up**
2. Email / phone-la register pannunga (free)
3. Dashboard load aagum: **https://dashboard.razorpay.com**

> Business KYC complete pannaama-um **Test Mode** full-a use panna mudiyum. Live payments-ku mattum KYC venum.

---

## 2. API Keys generate pannunga

1. Dashboard top-right-la **Test Mode** / **Live Mode** toggle irukku — mudhalla **Test Mode** select pannunga
2. Left menu → **Settings** (⚙️) → **API Keys** tab
   *(Direct link: https://dashboard.razorpay.com/app/keys)*
3. **"Generate Test Key"** button click pannunga
4. Rendu values kaatum — **copy pannunga**:
   - **Key ID** → `rzp_test_XXXXXXXXXXXXXX`
   - **Key Secret** → `XXXXXXXXXXXXXXXXXXXXXXXX` *(idhu **oru thadava mattum** kaatum — copy panni safe-a vachiko!)*

> ⚠️ **Key Secret** yaarukkum share pannaadha. Idhu private — GitHub-la commit pannaadha (`.env` already gitignored).

---

## 3. Keys-a `backend/.env`-la paste pannunga

File open pannunga: **`backend/.env`**

```env
# Razorpay payment gateway
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
```

- `RAZORPAY_KEY_ID` → un **Key ID**
- `RAZORPAY_KEY_SECRET` → un **Key Secret**
- `=` ku appuram **space illa**, **quotes illa** — just paste
- Save pannunga

---

## 4. Apache restart pannunga

`.env` maathina appuram backend reload aaganum:

- **XAMPP Control Panel** → **Apache** → **Stop** → **Start**

---

## 5. Test payment pannunga (test mode)

1. Store-la oru product-a cart-la add pannunga → **Checkout**
2. Payment method: **"Card / UPI / Netbanking"** select pannunga
3. **"Pay ₹…"** button click → Razorpay modal open aagum
4. Kizhe irukkura **test details** use pannunga:

### 🧪 Test Card
| Field | Value |
|---|---|
| Card number | `4111 1111 1111 1111` |
| Expiry | edhachu future date (e.g. `12/26`) |
| CVV | edhachu 3 digits (e.g. `123`) |
| Name | edhachu |
| OTP | `1234` (illa "Success" click) |

### 🧪 Test UPI
- UPI ID: **`success@razorpay`** → payment success
- UPI ID: **`failure@razorpay`** → payment fail (testing-ku)

5. Payment success aana → order **confirm** aagum, **Order Success** page varum, admin **Orders**-la "paid" status kaatum.

> Test mode-la **real money debit aagaadhu** — ellam simulation.

---

## 6. Live payments-ku (real money)

1. Razorpay dashboard-la **KYC / Business verification** complete pannunga (PAN, bank account, business proof)
2. Approve aana appuram → **Live Mode** toggle → **Settings → API Keys → Generate Live Key**
3. Live keys `rzp_live_...` la irukkum
4. `backend/.env`-la test keys-a **live keys**-oda replace pannunga:
   ```env
   RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXX
   RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
   ```
5. Apache restart

> ⚠️ Live mode-la real test card work aagaadhu — actual card/UPI thaan. Chinna amount (₹1) la mudhalla test pannunga.

---

## 7. Epdi work aagudhu (flow)

```
Customer "Pay" click
        │
        ▼
Frontend → POST /api/checkout/create-order   (backend Razorpay order create pannudhu)
        │
        ▼
Razorpay modal open (Card / UPI / Netbanking / Wallet)
        │  customer pays
        ▼
Frontend → POST /api/checkout/verify  (backend signature verify pannudhu — HMAC SHA256)
        │
        ▼
Order → payment_status = "paid", status = "processing"
Stock decrement · cart clear · loyalty points · confirmation
```

Relevant files:
- `backend/core/Razorpay.php` — order create + signature verify
- `backend/controllers/CheckoutController.php` — create-order / verify endpoints
- `frontend/src/pages/Checkout.jsx` — `payWithRazorpay()` flow

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Modal open aagala, "test mode" toast varudhu | Keys empty / wrong. `backend/.env`-la keys check pannunga + Apache restart |
| "Payment verification failed" | Key Secret wrong. Dashboard-la irundhu correct secret copy pannunga |
| "Could not load Razorpay" | Internet illa / checkout.js block aagudhu — connection check |
| Keys pottum test mode-la irukku | Apache restart pannala. Stop → Start |
| Live keys work aagala | KYC complete aagalaya check pannunga |

---

## 9. Security notes

- `backend/.env` **git-la commit aagaadhu** (already `.gitignore`-la irukku) ✅
- **Key Secret** frontend-ku anuppa maatom — backend-la mattum use aagudhu ✅
- Payment **signature server-side-la verify** aagudhu (customer tamper panna mudiyaadhu) ✅

---

**Doubt-na kelunga** — naan config check panni help panren. 🐾

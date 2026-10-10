# What is real, what is simulated, and how to make it real

This build is a complete, working application with a deliberately explicit line
between implemented behaviour and simulation. Nothing claims a capability that does
not exist, and every simulated surface says so in the UI **and** in the API.

The machine-readable version is `GET /api/health → data.capabilities`.

## Real and working

| Capability | Where |
| --- | --- |
| Catalogue: 177 products, 15 categories, 39 brands, 12 restaurants, 98 dishes | `shared/catalog.js`, `shared/restaurants.js` |
| Search with suggestions, history, typo tolerance, filters, sorts, pagination | `js/store.js`, `js/components/listing.js`, `/api/search` |
| Cart: add/+1, quantity, remove, save for later, single fulfilment context, persistence, guest→account merge | `js/store.js`, `/api/cart` |
| Pricing engine: item savings, auto offers, coupons, threshold, fees, surge, tips, GST, loyalty, min-order | `shared/pricing.js` (used by both sides) |
| Checkout: multi-step, address book, serviceability, slot choice, full bill breakdown, duplicate-order prevention | `js/pages/checkout.js`, `/api/orders` |
| Orders: placement, stock consumption, status history, tracking page, cancellation with stock restore, reorder, invoices | `js/store.js`, `backend/src/services/order.service.js` |
| Auth: register, sign-in, sign-out, profile, change password, forgot/reset with expiring codes, lockout, hashed passwords | `js/pages/auth.js`, `backend/src/services/auth.service.js` |
| Account: profile, addresses, orders, wishlist, coupons wallet, rewards + history, preferences, security, data export/delete | `js/pages/account.js` |
| Admin: analytics, orders, products, inventory, restaurants/menus, coupons, cities/coverage, users, business settings | `js/pages/admin.js`, `/api/admin/*` |
| Notifications, support tickets, FAQs, policies, contact — stored and listed | `js/pages/{notifications,support,static}.js` |
| Multi-city location system with coverage levels, localities, PIN lookup | `shared/locations.js` |
| Security: role checks, server-side price validation, rate limiting, helmet, CORS allow-list, env-only secrets | `backend/src/middleware/*` |

## Simulated (and labelled as such)

| Surface | What actually happens | How it is disclosed |
| --- | --- | --- |
| **Payments** | `demo` is recorded as paid with the note *"Simulated payment for this build. No payment gateway was contacted and no money moved."*; COD stays pending. UPI/card are refused (`422`) until a gateway exists. | Payment method labelled "Demo payment" in checkout; note stored on the order and shown on the invoice and tracking page; `capabilities.gatewayPayments: false` |
| **Refunds** | A cancelled paid order is marked `REFUNDED` with a note that no money moved | `refundNote` shown on the order page and in the cancellation dialog |
| **Order progression** | Statuses advance by simulation (customer "simulate" control, admin dropdown, `POST /orders/:id/simulate`) | `simulated: true` on every order, badge in the tracking timeline, "Simulated update" in notifications, `capabilities.simulatedOrderProgress: true` |
| **Delivery tracking** | ETA is computed from seeded city + handling minutes | "Simulated estimate for this build — no live delivery network" on the order page; `capabilities.liveGpsTracking: false` |
| **Ratings & reviews** | Ratings are seeded merchandising values; `reviewCount` is always 0 and no review system exists | "Demo rating" chip wording, `capabilities.reviews: false`, stated on the restaurants and about pages |
| **Coupons & promotions** | Seeded sample offers with full rules | `demo: true` flag → "Demo coupon" badge and a banner in the coupons wallet |
| **Cities** | Coverage levels are configured data: `demo-full`, `demo-limited`, `coming-soon` | "Launching soon" cities are listed honestly and **block checkout**; no claim of live delivery anywhere |
| **Support tickets** | Stored and listed; no inbox/CRM receives them | Modal and API response both state nobody outside the app receives it, and no response time is promised |
| **Contact channels** | Demo email/phone/hours | "Demo address — not a monitored mailbox" |
| **Notifications** | In-app records in the database/localStorage | No SMS/push/email provider claimed; stated on the notifications page |
| **Password reset email** | No SMTP configured → the code is returned and rendered as a **demo reset** | "Demo reset — no email was sent"; `capabilities.emailResets: false` |
| **Product imagery** | Locally generated SVG placeholders (no external URLs, no broken images) | Documented in `docs/COMPONENTS.md`; admin can change the emoji seed |
| **Demo mode data** | Everything in localStorage for the current browser | Header pill "Demo data", account page "Local demo storage", admin header |
| **Legal pages** | Draft business content | Banner on every policy page: not reviewed by counsel |

## Making a simulation real

| To make real | Do this |
| --- | --- |
| Payments | Implement `verifyGatewayPayment()` in `backend/src/services/payment.service.js` (signature check + provider re-fetch + amount match), add a webhook route, set `PAYMENT_MODE` and gateway keys. See `docs/DEPLOYMENT.md` §3. |
| Order progression | Replace the simulate endpoints with courier/kitchen webhooks that call `orders.setStatus()` — the flow validation, history, notifications and loyalty rules already work. |
| Live tracking | Add courier partner ids + a tracking provider to `orders`, expose it through `/api/orders/:id`, and only then enable `features.liveGpsTracking`. |
| Reviews & ratings | Add a `Review` collection with verified-purchase checks, set `reviewCount` from it, and enable `features.reviewsEnabled`. Until then the demo ratings must stay labelled. |
| Email/SMS | Configure SMTP (password resets, order emails) or an SMS provider; `forgotPassword` already branches on `env.smtp.enabled`. |
| Cities | Change coverage per city in Admin → Cities & coverage (`POST /api/admin/zones`) as a real network goes live. |
| Legal text | Replace the drafts in `shared/content.js` after counsel review. |

## Rules the code enforces

1. No success message for a failed operation — errors surface the real reason,
   mapped to the offending field where possible.
2. No capability is offered in the UI unless it exists; flags for unimplemented
   features are documented as such and switching them on does not create them.
3. The frontend never declares a payment successful.
4. Prices, stock, coupon eligibility, coverage and totals are recomputed
   server-side; client-supplied money is ignored.
5. Seeded promotions, ratings and contact details are always labelled as demo data.

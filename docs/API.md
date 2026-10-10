# Food Express API reference

Base URL: `/api` (the storefront dev server proxies `/api/*` to the backend, so the
browser only ever uses relative URLs).

* **Envelope** — success: `{ "success": true, "data": …, "meta"?: … }`;
  failure: `{ "success": false, "error": "<CODE>", "message": "…", "details"?: … }`.
* **Auth** — `Authorization: Bearer <jwt>` (or `x-access-token`). Tokens are signed
  with `JWT_SECRET` and expire per `JWT_EXPIRES_IN`.
* **Roles** — `user`, `staff`, `admin`. Every `/api/admin/*` route requires a valid
  token **and** the admin role; hiding the dashboard in the UI is not a control.
* **Money** — whole-rupee integers, GST-inclusive. Totals are always computed
  server-side; client-sent prices are ignored.
* **Pagination** — `?page=&limit=` with `meta: { total, page, pages, limit }`.

| Status | Meaning |
| --- | --- |
| 400 | malformed request / bad identifier (`CAST_ERROR`, `INVALID_ROLE`, …) |
| 401 | missing, expired or invalid token (`NO_TOKEN`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`) |
| 403 | authenticated but not permitted (`FORBIDDEN`, `ORDER_FORBIDDEN`) |
| 404 | unknown route or record (`ROUTE_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `ORDER_NOT_FOUND`, …) |
| 409 | conflict (`DUPLICATE_KEY`, `EMAIL_TAKEN`, `OUT_OF_STOCK`, `INSUFFICIENT_STOCK`, `CART_TYPE_CONFLICT`) |
| 422 | validation or business rule (`VALIDATION`, `CHECKOUT_BLOCKED`, `CITY_NOT_SERVICEABLE`, `PAYMENT_METHOD_UNAVAILABLE`, `INVALID_STATUS_TRANSITION`, `GATEWAY_NOT_CONFIGURED`) |
| 423 | account locked after repeated failed sign-ins (`ACCOUNT_LOCKED`) |
| 429 | rate limited (`RATE_LIMITED`) |
| 503 | MongoDB unreachable (`DATABASE_UNAVAILABLE`) |

---

## Health

### `GET /api/health`
Liveness + capability probe the storefront uses to choose its data mode. No auth.

```json
{ "success": true, "data": {
  "status": "ok", "service": "food-express-api", "version": "3.0.0",
  "database": "connected", "mode": "backend", "authenticated": false, "role": null,
  "capabilities": { "demoPayments": true, "codPayments": true, "gatewayPayments": false,
                    "emailResets": false, "liveGpsTracking": false, "reviews": false,
                    "simulatedOrderProgress": true },
  "settings": { "currency": "INR", "freeDeliveryThreshold": 150, "deliveryFee": 29, "packingFee": 20, "lowStockThreshold": 10 },
  "notice": "Serving persisted data from MongoDB." } }
```

`capabilities` is the machine-readable honesty list: anything `false` is not
implemented, and the storefront hides or labels it accordingly.

---

## Auth — `/api/auth`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Rate limited. Body: `name, email, phone?, password`. Returns `{ token, user }`. Role is always `user` — privilege is never client-controlled. 409 `EMAIL_TAKEN` / `PHONE_TAKEN`, 422 `VALIDATION` with a per-field map. |
| POST | `/auth/login` | — | Rate limited, `skipSuccessfulRequests`. Body: `email`\|`phone`, `password`, `remember?`. 401 `INVALID_CREDENTIALS` (same copy for unknown account and wrong password — no enumeration), 423 `ACCOUNT_LOCKED` after 8 failures. |
| GET | `/auth/profile` | user | `{ user }` |
| PUT | `/auth/profile` | user | Patch `name`, `phone`, `gender`, `avatar`, `preferences` |
| POST | `/auth/change-password` | user | `{ currentPassword, newPassword }`; verifies the current hash first |
| POST | `/auth/forgot-password` | — | `{ email }`. Always answers success. With SMTP configured → `channel: "email"`; otherwise → `channel: "demo"` plus `demoCode` (no provider is wired up, so the code is returned instead of pretending it was emailed). |
| POST | `/auth/reset-password` | — | `{ email, token\|code, password }`; codes are stored hashed and expire in 15 minutes |
| POST | `/auth/logout` | user | Acknowledgement only — JWTs are stateless and discarded client-side |

---

## Catalogue (public)

| Method | Path | Query | Returns |
| --- | --- | --- | --- |
| GET | `/products` | `q, category, brand, type, restaurantId, tags, veg, inStock, minPrice, maxPrice, minDiscount, sort, page, limit` | paged products |
| GET | `/products/:id` | — | product + `related` |
| GET | `/categories` | — | categories ordered for the storefront |
| GET | `/restaurants` | `cityId, cuisine, pureVeg, q, limit` | restaurants |
| GET | `/restaurants/:id` | — | restaurant + `menu` (its dishes) |
| GET | `/search` | `q, limit, page, sort, type` | `{ products, dishes, facets }` where facets carry categories, brands, price range, in-stock and on-discount counts |
| GET | `/settings/public` | — | `{ settings, coverage[], coverageLabels, deliverySlots, orderFlow, paymentMethods, disclaimer }` |
| GET | `/coupons` | — | coupons (seeded ones carry `demo: true`) |
| POST | `/coupons/validate` | user optional | `{ code }` → `{ ok, reason }` or `{ ok, coupon, discount, eligibleSubtotal }` |

`sort` accepts `popularity` (default), `price-asc`, `price-desc`, `newest`,
`rating`, `discount`, `name`.

Without a database connection the read-only catalogue routes answer from the
seeded `shared/` data and mark it: `meta.source: "seed"`.

---

## Cart — `/api/cart` (auth required)

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/cart` | — | `{ type, restaurantId, restaurant, items[], saved[], couponCode, tip, redeemPoints, count, totals, warnings[] }` — every line is re-priced from the catalogue, unavailable lines are reported in `warnings` |
| POST | `/cart` | `itemId, qty?, addons?, selection?, forceSwitch?` | Adds exactly `qty` (default 1) to an existing line, capped by stock and `maxQuantityPerItem`. 409 `CART_TYPE_CONFLICT` when mixing store items with a restaurant cart (retry with `forceSwitch: true` to replace the cart), 409 `OUT_OF_STOCK` |
| PUT | `/cart/:itemId` | `qty?, addons?, couponCode?, tip?, redeemPoints?` | `qty: 0` removes the line |
| DELETE | `/cart/:itemId` | — | removes one line |
| DELETE | `/cart` | — | empties the cart and resets the fulfilment context |
| POST | `/cart/merge` | `items[{itemId, qty, addons?, selection?}]` | Guest → account merge on sign-in: quantities **combine** per line, never duplicate; conflicting contexts are skipped and reported |

Customisation prices are looked up server-side by `groupId`/`optionId`;
`multiplier` options (e.g. half portion) scale the base price.

---

## Wishlist — `/api/wishlist` (auth required)

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/wishlist` | — | `{ ids, count, items[] }` |
| POST | `/wishlist/toggle` | `itemId` | `{ …, saved: true\|false, itemId }` |

---

## Addresses — `/api/addresses` (auth required)

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/addresses` | — | list, default first, each with a `serviceability` block (coverage, delivery fee, whether the city is configured) |
| POST | `/addresses` | `label, type, receiver, phone, line1, line2?, landmark?, cityId, localityId?, pincode, isDefault?` | first address becomes the default; 400 `UNKNOWN_CITY` |
| PUT | `/addresses/:id` | same fields, partial | ownership enforced |
| DELETE | `/addresses/:id` | — | promotes the newest remaining address to default |

---

## Orders — `/api/orders`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/orders` | user (or `?phone=` for guest lookups) | history, newest first, filter `status`, `cartType` |
| GET | `/orders/:id` | user | `:id` is the `FX-…` order number; 403 for another account's order |
| POST | `/orders` | user | Place an order — see below |
| POST | `/orders/:id/cancel` | user | `{ reason? }`; restores stock, marks a **simulated** refund if it was paid, reverses loyalty |
| POST | `/orders/:id/reorder` | user | re-adds available lines to the cart, reports `skipped[]` |
| POST | `/orders/:id/simulate` | user | advances one step along the order's own flow; response states the progression is simulated |

### Placing an order

```json
POST /api/orders
{
  "addressId": "665f…",            // or a full "address" object
  "items": [{ "itemId": "p-toor-dal-1-kg", "qty": 2 }],   // omit to use the server-side cart
  "cartType": "store",              // or "restaurant"
  "couponCode": "SAVE10",
  "paymentMethod": "demo",          // demo | cod (upi/card require a configured gateway)
  "deliverySlot": "standard",
  "tip": 10,
  "redeemPoints": 0,
  "notes": "Ring the bell twice",
  "idempotencyKey": "b7c1…",        // also accepted as the Idempotency-Key header
  "guestEmail": ""
}
```

Server behaviour, in order: idempotency lookup → address + city serviceability →
re-price every line from the catalogue → min-order/coupon checks → payment method
policy → **atomic stock decrement** → order insert → coupon usage counter, loyalty
redemption, cart reset, notification.

The response is the persisted order: `id`/`orderNumber`, `status` = first flow step,
`flow[]`, `statusHistory[]`, `totals{…}`, `paymentStatus`, `paymentNote`,
`simulated: true`, `etaMinutes`, `loyaltyEarned`. A repeated call with the same
`idempotencyKey` returns the **same** order with `meta.duplicate: true`.

Failures: `EMPTY_CART`, `ADDRESS_REQUIRED`, `CITY_NOT_SERVICEABLE`,
`CHECKOUT_BLOCKED`, `INSUFFICIENT_STOCK` (409, with `available`/`requested`),
`PAYMENT_METHOD_UNAVAILABLE`, `CART_TYPE_MISMATCH`, `MULTIPLE_RESTAURANTS`.

---

## Notifications — `/api/notifications` (auth required)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/notifications` | list (filter `kind`, `unreadOnly`), `meta.unread` |
| POST | `/notifications/read-all` | `{ updated }` |
| POST | `/notifications/:id/read` | ownership enforced |
| DELETE | `/notifications` | `{ deleted }` |

In-app records only — no SMS/push/email provider is connected.

---

## Support — `/api/support`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/support/tickets` | optional | the caller's tickets (`[]` for guests) |
| POST | `/support/tickets` | optional | `{ topic, subject, message, contact, orderNumber?, source? }` → `FXS-…` ticket. The response states that no external inbox is connected, so no response time is promised. |

---

## Admin — `/api/admin` (auth + admin role)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/stats` | analytics: users, products, menu items, restaurants, orders, revenue, `byStatus`, low stock (+ up to 20 items), out of stock, coupons, open tickets, current settings, 8 recent orders |
| GET | `/admin/users` | paged users with order count + spend; filter `q`, `role` |
| PUT | `/admin/users/:id/role` | change a role (`user`\|`staff`\|`admin`); self-demotion is refused |
| GET | `/admin/orders` | all orders; filter `status`, `cartType`, `q`, paged |
| PUT | `/admin/orders/:id/status` | `{ status, note? }` — validated against the order's flow (`INVALID_STATUS_TRANSITION` otherwise), writes history, notifies the customer |
| POST | `/admin/orders/:id/cancel` | admin cancellation with stock restore |
| GET | `/admin/products` | paged, filterable, including inactive |
| POST | `/admin/products` | create a product or menu item |
| PUT | `/admin/products/:id` | update price, stock, visibility, copy, customisations |
| DELETE | `/admin/products/:id` | soft delete (`active: false`) |
| GET | `/admin/restaurants` · PUT | list · update min order, ETA, fees, cuisines, sections, visibility |
| GET | `/admin/coupons` · POST · DELETE `/admin/coupons/:code` | list · create/update · deactivate |
| GET | `/admin/settings` · PUT | read · save business settings (threshold, fees, loyalty, flags, per-city overrides) with type guards |
| POST | `/admin/settings/reset` | back to seeded defaults |
| GET | `/admin/zones` | cities with effective coverage, effective + seeded delivery fee, localities, override flag |
| POST | `/admin/zones` | `{ cityId, coverage?, deliveryFee? }` — per-city coverage/fee overrides |
| GET | `/admin/tickets` · PUT `/admin/tickets/:id` | list · set status and reply (notifies the customer) |

---

## Rate limits

| Scope | Default |
| --- | --- |
| all `/api/*` | 600 requests / 15 min / IP (`RATE_LIMIT_MAX`) |
| `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` | 20 / 15 min, successful requests not counted (`AUTH_RATE_LIMIT_MAX`) |
| write routes (cart, orders, admin mutations) | 120 / 15 min |

Responses carry standard `RateLimit-*` headers.

## Not implemented (by design)

`capabilities` in `/api/health` is the authoritative list. Today:

* **Payment gateway** — UPI/card are refused with 422 `GATEWAY_NOT_CONFIGURED`.
  `backend/src/services/payment.service.js#verifyGatewayPayment` is the single
  place that may mark a real payment paid; it currently throws instead of
  pretending. Wire a provider + signature verification there.
* **Email delivery** — password resets return a demo code until SMTP is set.
* **Live GPS tracking, courier webhooks, customer reviews/ratings, referrals** —
  absent, and the storefront says so instead of faking them.

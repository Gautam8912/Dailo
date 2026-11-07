# Food Express — Architecture

Food Express is a multi-category delivery and shopping platform: groceries, fresh
produce, dairy, snacks, personal care, beauty, household supplies, electronics,
stationery, pet supplies **and** restaurant food, all in one cart, checkout, order
and account experience.

The build has three layers that never duplicate a business rule:

```
shared/            ← one source of truth for data + money rules (UMD: browser & Node)
   │
   ├── js/          ← storefront (vanilla JS, no framework, no build step)
   │      ├── store.js    state, cart, auth, orders, admin, notifications
   │      ├── ui.js       reusable components
   │      ├── components/ header, footer, bottom-nav, location modal, cart drawer, listing
   │      ├── pages/      one controller per page
   │      └── api.js + backend-integration.js   HTTP client + adapters
   │
   └── backend/     ← Express + Mongoose API (persistence, auth, enforcement)
          ├── models/    Mongoose schemas
          ├── services/  pricing, orders, auth, settings, payments, notifications
          ├── routes/    /api/* (matches js/backend-integration.js exactly)
          └── seed/      seeds MongoDB from shared/
```

## 1. `shared/` — the single source of truth

Everything that both sides must agree on lives here as UMD modules
(`global.FX.<name>` in the browser, `require()` in Node):

| Module | Contents |
| --- | --- |
| `constants.js` | roles, cart types, order flows, status/payment/address/coverage enums **and their label maps**, delivery slots, coupon types, notification kinds, loyalty constants, storage keys |
| `settings.js` | `DEFAULT_SETTINGS`: currency, **free-delivery threshold**, **delivery fee**, packing fee, small-order fee, tip presets, GST policy, min order, low-stock threshold, max qty/line, loyalty rules, auto offers, per-city overrides, feature flags, disclaimer |
| `locations.js` | 11 cities with localities + PIN codes, coverage level, seeded delivery fee, ETA estimation |
| `catalog.js` | 177 products, 15 categories, 39 brands, banners, frequently-bought-together groups |
| `restaurants.js` | 12 restaurants, 98 menu items, cuisines, customisation groups |
| `coupons.js` | 10 seeded demo coupons with full eligibility rules |
| `pricing.js` | the pricing engine: line totals, auto offers, coupon validation, threshold, fees, tips, loyalty, min-order checks, customer-facing copy |
| `content.js` | onboarding messages, FAQs, support topics, policy drafts, contact channels |

**Rule:** the storefront never re-implements a calculation and the backend never
re-implements one either — both call `FX.pricing.computeCart`. That is verified by
a test (`backend/tests/services.test.js` → "the storefront and the API price the
same cart identically").

## 2. Storefront

Plain HTML/CSS/JS with no bundler. Root `*.html` files are **generated** from
`src/pages/*.body.html` + `tools/pages.json` by `tools/build-pages.js`, which
injects the shared shell (skip link, header/footer/bottom-nav mounts, splash) and
the scripts in dependency order. Edit the fragment, then run `npm run build:pages`.

### Page contract

```html
<body data-page="home" data-protected="user" data-chrome="none"
      data-splash="never" data-reload-on-location="true">
```

| Attribute | Meaning |
| --- | --- |
| `data-page` | selects the controller: `FX.pages[<name>].render()` |
| `data-protected` | `user` → redirect guests to sign-in with `?next=`; `admin` → visible "Access restricted" state |
| `data-chrome="none"` | skip header/footer/bottom-nav (used by the auth pages) |
| `data-splash="never"` | never show the boot splash on this page |
| `data-reload-on-location="true"` | re-render when the city/locality changes |

A controller registers itself and boots through the app lifecycle:

```js
FX.pages.orders = { render };
FX.app.onReady(() => { render(); FX.bus.on('order:updated', render); });
```

### Boot order (`js/app.js`)

1. error boundary installed;
2. splash shown **only** on the first load of a session (no artificial timer);
3. `FX.store.boot()` — restore localStorage, seed catalogue, restore session, probe the API;
4. chrome rendered (header, footer, bottom nav);
5. route guards enforced;
6. `fx:ready` dispatched and **page controllers run**;
7. the first-run welcome/onboarding overlay opens *on top of* the rendered page.

Page content therefore never waits on onboarding, and onboarding never fakes a delay.

### Two data modes

| | Demo mode (default) | Backend mode |
| --- | --- | --- |
| Trigger | `USE_BACKEND=false`, or the API probe fails | `USE_BACKEND=true` **and** `/api/health` answers |
| Data | `shared/` seeds + localStorage | MongoDB via `/api/*` |
| Accounts | local, salted SHA-256 hashes | bcrypt + JWT |
| Admin edits | override layer over the seed (`fx_admin_catalog_v1`) | written to the database |
| Orders | simulated locally, flagged `simulated: true` | persisted, still flagged simulated |

`js/backend-integration.js` wraps every endpoint, and `js/store.js` branches on
`FX.backend.useBackend()`. Mode is surfaced in the UI (header pill, account page,
admin header) so nobody mistakes demo data for live data.

## 3. Backend

Express 4 + Mongoose 8. `backend/src/app.js` assembles the app (helmet, CORS
allow-list, JSON body limit, rate limiters, routes, error envelope);
`backend/src/server.js` validates configuration, connects, seeds and listens.

Enforcement lives on the server, never in the browser:

* `protect` (JWT → `req.user`) and `requireRole('admin')` on every privileged route;
* prices, add-on prices, stock caps and totals recomputed from the database —
  client-supplied money is ignored;
* coupon eligibility re-checked with the shared engine, including per-user usage;
* city serviceability re-checked at order placement;
* stock decremented atomically and refused when unavailable (`INSUFFICIENT_STOCK`);
* `idempotencyKey` unique index makes a double-submitted checkout return the same order;
* order status moves only forward along its own flow (`Order.canTransitionTo`);
* bcrypt password hashing, lockout after 8 failed sign-ins, hashed expiring reset codes;
* rate limiting on all API traffic and tighter limits on auth and write routes.

### Honest degradation

When MongoDB is unreachable the API does not fake data:

* `/api/health` answers `database: "disconnected"`, `mode: "demo"`;
* public catalogue reads fall back to the **seeded shared data** and say
  `meta.source: "seed"`;
* every route that needs persistence answers `503 DATABASE_UNAVAILABLE` with an
  actionable message (`dbGuard`), and mongoose command buffering is disabled so the
  answer is immediate;
* `ALLOW_WITHOUT_DATABASE=true` is an explicit opt-in for CI/demos — a normal
  deployment refuses to start without `MONGO_URI` and `JWT_SECRET`.

## 4. Money conventions

* All amounts are whole-rupee integers; product prices are GST-inclusive
  (`taxInclusive: true`), and the GST component is *derived* for the invoice.
* The free-delivery threshold applies to the **eligible merchandise subtotal**
  (tips and fees never count towards it).
* One coupon per order; an automatic offer stacks only when `stacksWithCoupon`,
  otherwise the engine keeps whichever saves more.
* `free_delivery` coupons waive the delivery fee, not merchandise.
* Per-city overrides (`cityCoverage`, `cityDeliveryFee`) beat the global default;
  the global `deliveryFee` is the fallback.
* Loyalty: earn `earnRate` × payable merchandise, redeem at `pointValue` per point,
  minimum `minRedeemPoints`, capped at `maxRedeemPercent` of the order.

## 5. Verification tooling

| Tool | Purpose |
| --- | --- |
| `tools/build-pages.js` | assembles root HTML; fails on an unresolved placeholder |
| `tools/audit-api.js` | static check that every `FX.*` member used by a page actually exists (including enum members) |
| `tools/serve.js` | dependency-free dev server on `0.0.0.0`, proxies `/api` to the backend, real 404s |
| `tests/dom-smoke.test.js` | boots all 27 pages in jsdom: no script errors, chrome, mounts, guards, dead links |
| `tests/flows.test.js` | acceptance flows: cart, threshold, coupons, restaurant rule, merge, orders, auth, coverage |
| `backend/tests/*` | models, validators, payments, settings, pricing parity, HTTP contract |

`npm run verify` runs build → syntax check → API audit → all tests.

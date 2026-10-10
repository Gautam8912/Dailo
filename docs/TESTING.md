# Testing

```bash
npm test              # everything (81 tests)
npm run test:frontend # jsdom page + flow tests
npm run test:backend  # API service + HTTP contract tests
npm run verify        # build:pages → check → audit → test
```

Tests use Node's built-in runner (`node --test`). The only dev dependency is
**jsdom**; without it the DOM suites report a single skipped test instead of
failing, so `npm test` still works on a bare checkout.

## `tests/dom-smoke.test.js` — every page boots

For all 27 generated pages:

* the page loads with every script enabled and **no script error** is thrown
  (window `error`, `unhandledrejection`, jsdom errors, `console.error`);
* `body[data-page]` matches the generated markup;
* shared chrome (header, footer, bottom nav) renders on chrome pages and is absent
  on the full-bleed auth pages, which render their own shell;
* the page's mount point contains real content (child count + minimum text length);
* rendered text never contains `undefined`, `[object Object]` or `NaN`;
* route guards: protected pages redirect guests and remember the destination
  (`fx_redirect_after_login`); the admin dashboard shows **Access restricted** and
  does not render for non-admins;
* with a seeded session, protected pages render their real content;
* the admin dashboard renders **all nine sections** by clicking through them;
* every internal `<a href>`, `<script src>` and `<link href>` on every page resolves
  to a file that exists (no dead links or missing assets);
* no page leaks a `{{PLACEHOLDER}}`.

## `tests/flows.test.js` — acceptance flows

Run against the real store and pricing engine inside a live DOM:

1. **Add to cart** — first click = 1 unit, second click = **qty 2 on the same line**
   (never a duplicate), subtotal = unit × 2, header badge updates immediately
   without a reload, and the on-page stepper stays in sync.
2. **Free-delivery threshold** — at ₹80 / ₹120 / ₹149 / ₹150 / ₹200 the remaining
   amount, delivery fee, unlock flag and customer message are all asserted, and the
   threshold + fee are then changed in settings to prove nothing is hard-coded.
3. **Restaurant maths** — add-ons, packing charge, tip, minimum-order blocking.
4. **Coupons** — minimum-spend rejection with the real reason, exact discount,
   expired and first-order-only rejections, stacking behaviour.
5. **One fulfilment context** — a store product cannot join a restaurant cart
   (`needsSwitch`), and `forceSwitch` replaces rather than mixes.
6. **Guest → sign-in merge** — quantities combine, never duplicate; stored accounts
   hold salted hashes and **no plain-text password**.
7. **Wishlist + search** — toggling persists; a typo (`basmathi`) still finds
   *Basmati* products.
8. **Orders** — placement prices the bill correctly (subtotal − discounts + every
   fee line), decrements stock, raises a notification, empties the cart, refuses a
   duplicate submission, advances status, and on cancellation restores stock,
   marks a simulated refund and blocks a second cancellation.
9. **Reorder** — puts the same lines back.
10. **Admin layer** — role gating, price/stock edits applied immediately, catalogue
    reset restores seeded values without signing anybody out.
11. **Auth** — invalid registration rejected, wrong password never yields a fake
    success, demo reset code flow works, the old password stops working.
12. **Coverage honesty** — a coming-soon city is not serviceable and has no ETA;
    an admin override opens it; clearing overrides restores the seed.
13. **Home page** — ≥8 merchandising sections, populated category grid, ≥20 product
    cards, lazy-loaded images.
14. **Admin dashboard** — renders with an admin session and lists catalogue rows.

## `backend/tests/services.test.js` — rules and models

Validation rules (name/email/phone/password) and the 422 field map; bcrypt hashing,
no plain-text password in any payload, lockout after 8 failures, JWT contents;
payment policy (demo = paid **and labelled simulated**, COD = pending, UPI/card
refused, gateway verification throws instead of pretending); settings resolution
and per-city overrides; **pricing parity** between the backend bridge and the
frontend module; model validation for products, addresses, coupons, users; the
order state machine (forward-only, no cancelling a delivered or cancelled order,
restaurant flow, required fields, status vocabulary).

## `backend/tests/api.test.js` — HTTP contract

Boots the real Express app on an ephemeral port with no MongoDB and asserts:
`/api/health` honesty (no gateway, no GPS, no reviews, simulated fulfilment
declared); the service description; seeded fallbacks for products, product detail,
categories, restaurants + menu, search + facets, coupons, public settings;
filtering, sorting and pagination; `503 DATABASE_UNAVAILABLE` for every route that
needs persistence (login, register, cart, coupon validation, ticket creation) while
a guest ticket list is an honest `[]`; `401` on all admin routes before anything
else is revealed; malformed tokens rejected; the 404 envelope; oversized bodies
refused; no `x-powered-by`.

## Adding tests

* New page → add an entry to `PAGES` (or `PROTECTED_PAGES`) in
  `tests/dom-smoke.test.js`.
* New store behaviour → add a subtest in `tests/flows.test.js` (the harness in
  `tests/helpers/dom.js` boots a page and waits for `FX.app.booted`).
* New endpoint → add a case in `backend/tests/api.test.js`; new money or role logic
  → `backend/tests/services.test.js`.
* Keep assertions about **behaviour and honesty** (what the customer sees, what is
  refused and why), not about implementation details.

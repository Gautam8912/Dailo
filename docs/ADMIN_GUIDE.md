# Admin dashboard guide

Open `admin.html` and sign in with an administrator account. The page is
role-gated twice: the storefront renders an explicit **Access restricted** state for
non-admins, and every `/api/admin/*` route re-checks the JWT **and** the role.

Seeded demo credentials (change them via `backend/.env` before any real use):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@foodexpress.com` | `admin123` |
| Customer | `user@test.com` | `user123` |

In demo mode these accounts live in `localStorage` as salted SHA-256 hashes; in
backend mode they are bcrypt hashes in MongoDB, created by `npm run seed`.

## Sections

### 1. Overview & analytics
Revenue (non-cancelled orders), order count and average value, catalogue size,
account count, low-stock and out-of-stock counts, orders by status (bar chart),
today's orders, store vs restaurant split, current threshold/fee, the ten most
urgent stock alerts with one-click restock, and the six latest orders.
Everything is computed from stored orders — no third-party analytics is loaded.

### 2. Orders
Filter by status, search by order id. Change a status with the dropdown (validated
against the order's own flow), cancel while it is still cancellable, or open the
customer-facing tracking page. Each change writes to `statusHistory` and raises a
notification for that customer. Statuses are **simulated**: no courier or kitchen
system is integrated, and the UI says so.

### 3. Products
Search the catalogue; edit price, stock and visibility inline; open the editor for
the full record (brand, category, subcategory, MRP, unit, GST rate, handling time,
emoji/image seed, tags, description, active). Create new products with
**+ New product**. Discount percent and `inStock` are derived — never entered twice.

### 4. Inventory
Stock health (healthy / low / out of stock / total units), quick `+10` / `+50`
restock, exact stock entry, bulk "restock everything low to 50", and
**Reset catalogue overrides** which discards admin edits and returns to the seeded
catalogue without touching accounts, orders or shopper data.

### 5. Restaurants & menus
Per restaurant: minimum order and ETA inline, cuisine/area/city summary. Per dish:
servings available, availability toggle, and an editor for name, section, price,
MRP, prep time, portion label, description and vegetarian flag. Restaurant records
are seeded demo partners; ratings are merchandising values, not verified reviews.

### 6. Coupons
Create or edit code, title, description, type (`percent`, `flat`, `free_delivery`),
value, minimum subtotal, maximum discount, uses per user, validity window,
applicable cart type, stacking with automatic offers, first-order-only, active, and
the **demo** flag that labels seeded offers in the customer UI. Deactivate instead
of deleting so past orders keep a valid reference. Eligibility is enforced by the
same engine the cart uses, and the customer sees the exact rejection reason.

### 7. Cities & coverage
Per city: coverage level (`Demo coverage — full assortment`,
`Demo coverage — limited assortment`, `Not serviceable yet`) and delivery fee.
Overrides are stored in app settings, so the storefront, cart, checkout, address
serviceability warnings and the API all follow the same values. **Not serviceable
yet** blocks checkout for that city — the app never pretends every city is live.
"Clear city overrides" restores the seeded values.

### 8. Users
Accounts with role, join date, order count, spend and verification flags. This
profile is read-only: role changes and deletions are backend operations
(`PUT /api/admin/users/:id/role`), because a client-side toggle would not be a
security control.

### 9. Business settings
The money rules, in one place:

* free-delivery threshold, standard delivery fee, restaurant packing charge,
  small-order fee + its floor, minimum order value;
* low-stock threshold, max quantity per line, default GST rate, demand surge fee;
* GST-inclusive pricing, enforce per-restaurant minimums;
* loyalty: earn rate, value per point, minimum redeemable points, max redemption
  fraction;
* feature flags: guest checkout, demo payments, COD, UPI, card, wallet, live GPS
  tracking, reviews, referral programme — flags for unimplemented capabilities are
  documented as such, and switching one on does not make the capability exist;
* tip presets and the storefront disclaimer;
* automatic offers (read-only summary of the seeded rules).

Saving recalculates every open cart immediately. "Reset to seeded defaults"
restores `shared/settings.js`.

## Where edits are stored

| Mode | Storage |
| --- | --- |
| Demo | `fx_settings_v1` + `fx_admin_catalog_v1` override layer on top of the seeded catalogue — the seed data is never destroyed |
| Backend | `appsettings` document, `products`, `restaurants`, `coupons` collections, with `updatedBy` recorded |

## What the dashboard does **not** do

* accept real payments or issue real refunds (both are labelled simulated);
* dispatch couriers, track GPS, or send SMS/push/email;
* collect or display customer reviews and verified ratings;
* manage real delivery partner accounts or zone-level routing.

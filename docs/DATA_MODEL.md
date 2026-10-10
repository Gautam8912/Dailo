# Food Express — data model

Two representations of the same model: **MongoDB collections** (backend mode) and
**browser records** (demo mode, localStorage). Field names match so the storefront
code path is identical in both modes.

## Entities

```
User 1───* Address          User 1───1 Cart          User 1───1 Wishlist
User 1───* Order            User 1───* Notification  User 1───* SupportTicket
Order *───1 Restaurant      Order *───* Product (snapshot lines)
Product *───1 Category      Product *───0..1 Restaurant (menu items)
Coupon (standalone)         AppSetting (single document, key = "business")
```

## Collections

### `users`
`name`, `email` (unique, lowercase), `phone` (unique when set, `^[6-9]\d{9}$`),
`passwordHash` (bcrypt, `select: false`), `role` (`user|admin|staff`), `avatar`,
`gender`, `emailVerified`, `phoneVerified`,
`rewards { points, history[{type: credit|debit, points, reason, ref, at}] }`,
`preferences { vegOnly, notifyOrder, notifyPromo, deliveryPreference, favouriteCategories[] }`,
`resetTokenHash` + `resetExpires` (15 min, `select: false`), `failedAttempts`,
`lockedUntil`, `lastLoginAt`, timestamps.
`toPublic()` is the only shape that leaves the API — it contains no hash.

### `addresses`
`user`, `label`, `type` (`home|work|other`), `receiver`, `phone`, `line1`, `line2`,
`landmark`, `cityId`, `localityId`, `pincode` (6 digits), `isDefault`
(a pre-save hook guarantees exactly one default per user), timestamps.

### `products` — store items **and** menu items
`seedId` (unique; the stable `shared/` id used in storefront URLs), `slug`,
`type` (`product|menu-item`), `name`, `brand`, `brandId`, `categoryId`,
`categoryName`, `subcategory`, `price`, `mrp`, `discountPercent` (derived),
`unit`, `stock`, `inStock` (derived), `gstRate`, `handlingMinutes`, `prepMinutes`,
`emoji`, `tone`, `description`, `tags[]`, `attributes`, `popularity`,
`rating` (demo merchandising value), `reviewCount` (always 0 — no review system),
`restaurantId`, `restaurantName`, `sectionId`, `veg`,
`customisations[{id,label,required,max,options[{id,label,price,veg,mode:additive|multiplier}]}]`,
`active`, `updatedBy`, timestamps. Indexes: text (`name`,`brand`,`tags`,`description`),
`(categoryId, active, popularity)`, `(restaurantId, sectionId, active)`, `stock`.

### `restaurants`
`restaurantId` (`r-<slug>`), `slug`, `name`, `cuisines[]`, `pureVeg`, `cityIds[]`,
`area`, `rating` (demo), `reviewCount` (0), `etaMinutes`, `minOrder`, `deliveryFee`,
`packingFee`, `emoji`, `tone`, `promoted`, `offers[]`, `hours`, `blurb`,
`sections[{id,label,order}]`, `priceForTwo`, `active`, timestamps.

### `coupons`
`code` (unique, uppercase, `^[A-Z0-9]{3,20}$`), `title`, `description`,
`type` (`percent|flat|free_delivery`), `value`, `minSubtotal`, `maxDiscount`,
`maxUsesPerUser`, `validFrom`, `validTo`, `cartType` (`null|store|restaurant`),
`categories[]`, `restaurants[]`, `firstOrderOnly`, `newUserOnly`,
`stacksWithCoupon`, `active`, `demo`, `totalRedemptions`, timestamps.

### `orders`
`orderNumber` (unique, `FX-YYMMDD-XXXX`), `user` (null for guests), `userName`,
`guest { email, phone }`, `cartType`, `restaurantId`, `restaurantName`,
`items[{ product, itemId, name, unit, unitPrice, qty, lineTotal, gstRate, addons[], selection }]`,
`address` (snapshot), `location { cityId, localityId, label, coverage }`,
`paymentMethod` (`demo|cod|upi|card`), `paymentStatus` (`pending|paid|failed|refunded`),
`paymentNote`, `paymentRef`, `paymentVerified` (true only after server-side gateway
verification), `couponCode`,
`totals { …40 keys from the shared pricing engine… }`,
`status`, `statusHistory[{status, at, note, by}]`, `flow[]`, `etaMinutes`,
`deliverySlot`, `notes`, `simulated` (always true in this build),
`loyaltyEarned`, `loyaltyRedeemed`, `cancelledAt`, `cancelReason`, `refundNote`,
`idempotencyKey` (unique partial index), timestamps.
Methods: `canTransitionTo(status)` (forward-only along `flow`, or cancel),
`canCancel()` (false once out for delivery / delivered / cancelled).

### `carts`
`user` (unique), `cartType`, `restaurantId`,
`items[{ product, seedId, qty, addons[], selection, addedAt }]`, `saved[]`,
`couponCode`, `tip`, `redeemPoints`, timestamps. Only references and quantities are
stored — prices are re-read on every serialisation.

### `wishlists`
`user` (unique), `productIds[]` (max 200), timestamps.

### `notifications`
`user`, `kind` (`order|promo|coupon|account|support`), `title`, `message`, `href`,
`orderNumber`, `read`, `readAt`, timestamps.

### `supporttickets`
`ticketNumber` (`FXS-…`), `user`, `userName`, `contact`, `topic`, `topicLabel`,
`subject`, `message`, `orderNumber`, `source`, `status`
(`open|pending|resolved|closed`), `replies[{by: customer|team, message, at}]`, timestamps.

### `appsettings`
Single document `key: "business"` holding the effective settings object
(threshold, fees, loyalty, flags, auto offers, per-city overrides, disclaimer),
plus `updatedBy`. Defaults come from `shared/settings.js`; `AppSetting.resolve()`
always merges stored values onto the defaults so a partial save can never lose a rule.

## Browser records (demo mode)

Persisted under the keys in `FX.constants.STORAGE_KEYS`:

| Key | Contents |
| --- | --- |
| `fx_cart_v1` | `{ type, restaurantId, items[], saved[], couponCode, tip, redeemPoints }` |
| `fx_wishlist_v1` | product id array |
| `fx_recent_v1` | recently viewed ids (capped) |
| `fx_search_history_v1` | recent search terms (capped) |
| `fx_location_v1` | `{ cityId, localityId, label, updatedAt }` |
| `fx_addresses_v1` | address records (same field names as the API) |
| `fx_orders_v1` | order records (same field names as the API) |
| `fx_notifications_v1` | notification records |
| `fx_rewards_v1` | `{ points, history[] }` |
| `fx_coupon_wallet_v1` | per-code usage counts |
| `fx_preferences_v1` | preference object |
| `fx_tickets_v1` | support tickets |
| `fx_settings_v1` | admin settings overrides |
| `fx_admin_catalog_v1` | `{ productPatches[], customProducts[], menuPatches[], couponPatches[], restaurantPatches[] }` — admin edits layered over the seed, never destructive |
| `fx_demo_accounts_v1` | demo accounts: `{ id, name, email, phone, salt, passwordHash, role, … }` — **salted SHA-256 hashes, never plain text** |
| `fx_user_v1`, `fx_token` | restored session (the user must still exist in `fx_demo_accounts_v1`, otherwise the session is dropped) |
| `fx_account_cart_<userId>` | per-account cart stash so signing out never loses it, and signing back in merges rather than duplicates |

## Money & status vocabularies

* Statuses — store flow: `PLACED → CONFIRMED → PACKING → OUT_FOR_DELIVERY → DELIVERED`;
  restaurant flow: `PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`;
  plus `CANCELLED`. Labels and customer copy live in `shared/constants.js`
  (`ORDER_STATUS_LABELS`, `ORDER_STATUS_COPY`).
* Payment statuses — `PENDING`, `PAID`, `FAILED`, `REFUNDED` (a cancelled paid order
  becomes `REFUNDED` with a note that the refund is simulated).
* Coverage — `demo-full`, `demo-limited`, `coming-soon` (the last blocks checkout).

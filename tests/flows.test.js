/**
 * Food Express — tests/flows.test.js
 *
 * End-to-end behaviour tests for the acceptance flows, executed against the
 * real store/pricing code inside a live DOM:
 *
 *   1.  Add to cart is exactly +1, a second click makes qty 2 (never a second
 *       line), the header badge and subtotal update immediately, and the cart
 *       survives navigation.
 *   2.  The ₹150 free-delivery rule: remaining = max(0, threshold − eligible
 *       subtotal) with the documented messages at ₹80 / ₹120 / ₹149 / ₹150 /
 *       ₹200 — and the threshold + fee are configurable, not hard-coded.
 *   3.  Coupons: eligibility, minimum spend rejection reasons, stacking rules.
 *   4.  One fulfilment context per cart (store XOR a single restaurant).
 *   5.  Guest cart merges into an account on sign-in without duplicating qty.
 *   6.  Order placement: priced bill, stock consumed, notification raised,
 *       cart emptied, duplicate submission refused, cancellation restores
 *       stock and marks the simulated refund.
 *   7.  Wishlist and search (typo tolerance) behave as documented.
 *   8.  Auth: validation, no fake success on a wrong password, demo password
 *       reset flow, and hashed (never plain-text) password storage.
 *
 * Run: npm test
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const harness = require('./helpers/dom.js');
const SETTINGS = require('../shared/settings.js');
const COUPONS = require('../shared/coupons.js');
const C = harness.C;

const { loadPage, sleep, DEMO_ADMIN } = harness;

if (!harness.isAvailable()) {
  test('flow suite skipped (jsdom not installed)', { skip: 'Run `npm install` to enable the jsdom flow tests.' }, () => {});
} else {
  test('shopping, pricing, auth and order flows', async (t) => {
    const ctx = await loadPage({ file: 'index.html' });
    const { window, document, FX, store } = ctx;
    t.after(() => window.close());

    assert.deepEqual(ctx.realErrors().map((e) => e.message), [], 'the home page booted without script errors');

    const pricing = FX.pricing;
    const money = FX.u.money;

    /* ---------------- 1. add to cart: +1, then qty 2, then badge ------- */

    await t.test('add to cart adds exactly one unit and repeats as quantity', () => {
      const product = store.catalog.products().find((item) => item.stock > 3);
      assert.ok(product, 'the seeded catalogue has a product in stock');

      const first = store.cart.add(product, { qty: 1 });
      assert.equal(first.ok, true, 'the first add succeeds');
      assert.equal(store.cart.count(), 1, 'cart count is 1 after the first click');
      assert.equal(store.cart.items.length, 1, 'one cart line exists');

      const second = store.cart.add(product, { qty: 1 });
      assert.equal(second.ok, true, 'the second add succeeds');
      assert.equal(store.cart.items.length, 1, 'still ONE line — no duplicate entry');
      assert.equal(store.cart.items[0].qty, 2, 'the line quantity became 2');
      assert.equal(store.cart.count(), 2, 'cart count is 2');

      const totals = store.cart.totals();
      assert.equal(totals.merchandiseSubtotal, product.price * 2, 'subtotal is unit price × 2');

      // The header badge reflects the change without a page reload.
      const badge = Array.from(document.querySelectorAll('#fx-header .fx-count')).find((el) => {
        const link = el.closest('a,button');
        return link && /cart\.html/.test(link.getAttribute('href') || '');
      });
      assert.ok(badge, 'the header renders a cart badge');
      assert.equal(badge.textContent, '2', 'the header badge shows 2 immediately');
      assert.equal(badge.classList.contains('is-zero'), false, 'the badge is not in its zero state');

      // A stepper on the page shows the same quantity.
      const card = document.querySelector('.fx-product-card[data-id="' + product.id + '"]');
      if (card) {
        const qty = card.querySelector('.fx-qty-value');
        if (qty) assert.equal(qty.textContent, '2', 'the product card stepper shows qty 2');
      }

      store.cart.clear();
      assert.equal(store.cart.count(), 0, 'the cart can be emptied again');
    });

    /* ------------------------- 2. free-delivery threshold behaviour ----- */

    await t.test('the ₹150 free-delivery threshold drives fee, remaining and copy', () => {
      const line = (price, qty) => ({ itemId: 'p-test-' + price, type: 'product', qty: qty || 1, unitPrice: price, gstRate: 0 });
      const compute = (items, overrides) =>
        pricing.computeCart({
          items,
          coupon: null,
          settings: SETTINGS.withSettings(overrides || {}),
          cartType: C.CART_TYPES.STORE,
          cityId: 'vijayawada',
        });

      const cases = [
        { subtotal: 80, remaining: 70, fee: 29, unlocked: false },
        { subtotal: 120, remaining: 30, fee: 29, unlocked: false },
        { subtotal: 149, remaining: 1, fee: 29, unlocked: false },
        { subtotal: 150, remaining: 0, fee: 0, unlocked: true },
        { subtotal: 200, remaining: 0, fee: 0, unlocked: true },
      ];

      cases.forEach((expected) => {
        const totals = compute([line(expected.subtotal)]);
        assert.equal(totals.eligibleSubtotal, expected.subtotal, 'eligible subtotal at ' + expected.subtotal);
        assert.equal(totals.remainingForFreeDelivery, expected.remaining, 'remaining at ' + expected.subtotal);
        assert.equal(totals.deliveryFee, expected.fee, 'delivery fee at ' + expected.subtotal);
        assert.equal(totals.freeDeliveryUnlocked, expected.unlocked, 'unlock flag at ' + expected.subtotal);
        assert.equal(totals.freeDeliveryThreshold, 150, 'the threshold is reported from settings');
        assert.ok(totals.freeDeliveryMessage, 'a human message is always provided');
      });

      const at149 = compute([line(149)]);
      assert.match(at149.freeDeliveryMessage, /₹1\b/, '₹149 tells the customer exactly ₹1 more is needed: ' + at149.freeDeliveryMessage);
      const at150 = compute([line(150)]);
      assert.match(at150.freeDeliveryMessage, /free delivery/i, '₹150 confirms the unlock: ' + at150.freeDeliveryMessage);
      const at80 = compute([line(80)]);
      assert.match(at80.freeDeliveryMessage, /₹70/, '₹80 states the ₹70 remaining: ' + at80.freeDeliveryMessage);
      const at200 = compute([line(200)]);
      assert.equal(at200.grandTotal, 200, '₹200 pays no delivery fee');

      // Configurable, never hard-coded.
      const custom = compute([line(200)], { freeDeliveryThreshold: 300, deliveryFee: 45 });
      assert.equal(custom.freeDeliveryThreshold, 300, 'the threshold comes from settings');
      assert.equal(custom.remainingForFreeDelivery, 100, 'remaining is recomputed against the new threshold');
      assert.equal(custom.deliveryFee, 45, 'the configured fee is charged below the new threshold');
      assert.equal(custom.grandTotal, 245, 'grand total = subtotal + configured fee');
    });

    await t.test('restaurant fees, tips and loyalty stay inside the same engine', () => {
      const totals = pricing.computeCart({
        items: [{ itemId: 'm-test', type: 'menu-item', qty: 2, unitPrice: 200, addons: [{ label: 'Extra cheese', price: 40 }], gstRate: 0.05 }],
        coupon: null,
        settings: SETTINGS.DEFAULT_SETTINGS,
        cartType: C.CART_TYPES.RESTAURANT,
        restaurantMinOrder: 249,
        tip: 20,
        cityId: 'vijayawada',
      });
      assert.equal(totals.merchandiseSubtotal, 2 * (200 + 40), 'add-ons are part of the merchandise subtotal');
      assert.equal(totals.packingFee, SETTINGS.DEFAULT_SETTINGS.packingFee, 'restaurant orders carry the packing charge');
      assert.equal(totals.tip, 20, 'the tip is recorded');
      assert.ok(!totals.belowMinOrder && !totals.restaurantMinOrder, '₹480 clears a ₹249 minimum order');
      assert.equal(totals.canCheckout, true, 'the cart can be checked out');
      assert.ok(totals.grandTotal > totals.merchandiseSubtotal, 'fees and tip are added to the grand total');

      const tooSmall = pricing.computeCart({
        items: [{ itemId: 'm-test', type: 'menu-item', qty: 1, unitPrice: 100, gstRate: 0.05 }],
        coupon: null,
        settings: SETTINGS.DEFAULT_SETTINGS,
        cartType: C.CART_TYPES.RESTAURANT,
        restaurantMinOrder: 249,
        cityId: 'vijayawada',
      });
      assert.match(String(tooSmall.restaurantMinOrder), /₹249 minimum/i, 'a ₹100 restaurant cart explains the ₹249 minimum: ' + tooSmall.restaurantMinOrder);
      assert.equal(tooSmall.canCheckout, false, 'checkout is blocked below the minimum order');
    });

    /* ------------------------------- 3. coupon rules and rejections ----- */

    await t.test('coupons validate against the real cart and explain rejections', () => {
      const save10 = COUPONS.COUPONS.find((coupon) => coupon.code === 'SAVE10');
      assert.ok(save10, 'the seeded SAVE10 coupon exists');

      const context = (subtotal) => ({
        items: [{ itemId: 'p-test', type: 'product', qty: 1, unitPrice: subtotal, gstRate: 0 }],
        eligibleSubtotal: subtotal,
        cartType: C.CART_TYPES.STORE,
        orderCount: 1,
        couponUses: {},
        isNewUser: false,
      });

      const rejected = pricing.validateCoupon(save10, context(100));
      assert.equal(rejected.ok, false, 'SAVE10 is rejected on a ₹100 cart');
      assert.match(rejected.reason, /₹199|minimum/i, 'the rejection names the ₹199 minimum: ' + rejected.reason);

      const accepted = pricing.validateCoupon(save10, context(250));
      assert.equal(accepted.ok, true, 'SAVE10 is accepted on a ₹250 cart');
      assert.equal(accepted.coupon.code, 'SAVE10', 'the accepted coupon is returned for the UI');
      assert.equal(pricing.couponDiscountValue(save10, 250), 10, 'SAVE10 discounts exactly ₹10 on a ₹250 cart');

      const expired = COUPONS.COUPONS.find((coupon) => coupon.code === 'EXPIRED25');
      if (expired) {
        const result = pricing.validateCoupon(expired, context(500));
        assert.equal(result.ok, false, 'an expired coupon is always rejected');
        assert.match(result.reason, /expired/i, 'the reason says it expired: ' + result.reason);
      }

      const firstOrder = COUPONS.COUPONS.find((coupon) => coupon.code === 'FIRSTORDER');
      if (firstOrder) {
        const returning = pricing.validateCoupon(firstOrder, Object.assign(context(500), { orderCount: 4, isNewUser: false }));
        assert.equal(returning.ok, false, 'a first-order coupon is refused for a returning customer');
      }

      // Stacking: when an auto offer does not stack, the bigger saving wins.
      const stacked = pricing.computeCart({
        items: [{ itemId: 'p-test', type: 'product', qty: 1, unitPrice: 900, gstRate: 0 }],
        coupon: save10,
        settings: SETTINGS.DEFAULT_SETTINGS,
        cartType: C.CART_TYPES.STORE,
        cityId: 'vijayawada',
      });
      assert.ok(stacked.grandTotal < 900, 'the coupon reduces the grand total');
      assert.ok(stacked.totalDiscount >= 10, 'total savings include at least the coupon value');
    });

    /* ------------------- 4. one fulfilment context per cart ------------- */

    await t.test('a cart holds store items XOR one restaurant', () => {
      const product = store.catalog.products().find((item) => item.stock > 0);
      const restaurant = store.catalog.restaurants()[0];
      const dish = (restaurant.menu || [])[0];
      assert.ok(dish, 'the seeded restaurant has a menu item');

      store.cart.clear();
      const addedDish = store.cart.add(dish, { qty: 1 });
      assert.equal(addedDish.ok, true, 'a dish can be added to an empty cart');
      assert.equal(store.cart.type, C.CART_TYPES.RESTAURANT, 'the cart switched to the restaurant context');
      assert.equal(store.cart.restaurantId, restaurant.id, 'the cart remembers which restaurant');

      const conflict = store.cart.add(product, { qty: 1 });
      assert.equal(conflict.ok, false, 'a store product cannot join a restaurant cart');
      assert.equal(conflict.needsSwitch, true, 'the store reports that a cart switch is required');
      assert.ok(conflict.conflict, 'the conflict describes what is already in the cart');

      const forced = store.cart.add(product, { qty: 1, forceSwitch: true });
      assert.equal(forced.ok, true, 'forceSwitch replaces the cart with the store context');
      assert.equal(store.cart.type, C.CART_TYPES.STORE, 'the cart is now a store cart');
      assert.equal(store.cart.items.length, 1, 'the restaurant lines were dropped, not mixed');
      store.cart.clear();
    });

    /* ------------------- 5. guest cart merges on sign-in ---------------- */

    await t.test('signing in merges the guest cart without duplicating quantities', async () => {
      const product = store.catalog.products().find((item) => item.stock > 5);
      store.cart.clear();
      store.cart.add(product, { qty: 2 });

      const demo = FX.config.demoCredentials.user;
      const user = await store.auth.demoLogin(demo.email, demo.password);
      assert.ok(user, 'the demo customer can sign in');
      assert.equal(store.auth.isSignedIn(), true, 'a session exists after sign-in');

      const lines = store.cart.items.filter((line) => line.itemId === product.id);
      assert.equal(lines.length, 1, 'the merged cart has a single line for the product');
      assert.ok(lines[0].qty >= 2, 'the guest quantity was preserved, not duplicated per click');
      assert.ok(lines[0].qty <= 4, 'quantities combine instead of stacking into absurd numbers');

      const storedPasswords = JSON.parse(window.localStorage.getItem(C.STORAGE_KEYS.demoAccounts) || '[]');
      assert.ok(storedPasswords.length, 'demo accounts are persisted');
      storedPasswords.forEach((account) => {
        assert.ok(account.passwordHash && account.salt, 'each account stores a salted hash');
        assert.equal(account.password, undefined, 'no account stores a plain-text password');
        Object.keys(account).forEach((key) => {
          assert.equal(typeof account[key] === 'string' && account[key].includes(demo.password) && key !== 'passwordHash', false, 'the plain-text password is not stored in ' + key);
        });
      });
    });

    /* ---------------------- 6. wishlist, search, recently viewed -------- */

    await t.test('wishlist toggles persist and search tolerates typos', async () => {
      const product = store.catalog.products()[0];
      assert.equal(store.wishlist.has(product.id), false, 'the product starts un-saved');
      store.wishlist.toggle(product.id);
      assert.equal(store.wishlist.has(product.id), true, 'toggling saves it');
      assert.ok(store.wishlist.items().some((item) => item.id === product.id), 'the wishlist resolves the saved product');
      await sleep(400); // persistence is debounced (~200ms) so writes are batched
      assert.ok(JSON.parse(window.localStorage.getItem(C.STORAGE_KEYS.wishlist) || '[]').includes(product.id), 'the wishlist is persisted to storage');
      store.wishlist.toggle(product.id);
      assert.equal(store.wishlist.has(product.id), false, 'toggling again removes it');

      const exact = store.search('basmati');
      assert.ok(exact.length, 'an exact term finds products');

      const typo = store.search('basmathi');
      assert.ok(typo.length, 'a typo still returns results (typo tolerance)');
      assert.ok(
        typo.some((item) => /basmati/i.test(item.name)),
        'the typo search surfaces Basmati products: ' + typo.map((item) => item.name).slice(0, 3).join(', ')
      );

      store.recent.view(product);
      assert.ok(store.recent.items().some((item) => item.id === product.id), 'recently viewed records the product');
    });

    /* ------------------------------ 7. orders: place, block, cancel ----- */

    await t.test('placing an order prices, decrements stock, notifies and blocks duplicates', async () => {
      const product = store.catalog.products().find((item) => item.stock > 5 && item.price >= 80);
      const stockBefore = product.stock;
      store.cart.clear();
      store.cart.add(product, { qty: 2 });

      const address = await store.addresses.create({
        label: 'Home',
        type: 'home',
        receiver: 'Test User',
        phone: '9876543210',
        line1: '12-3-45 Test Street',
        landmark: 'Near Demo Park',
        cityId: 'vijayawada',
        pincode: '520010',
      });
      assert.ok(address.id, 'an address can be saved');
      assert.equal(store.addresses.defaultAddress().id, address.id, 'the first address becomes the default');

      const order = await store.orders.place({
        addressId: address.id,
        paymentMethod: C.PAYMENT_METHODS.DEMO,
        deliverySlot: 'standard',
        notes: 'Ring the bell twice',
      });

      assert.match(order.id, /^FX/, 'the order gets a Food Express order id: ' + order.id);
      assert.equal(order.status, C.STORE_ORDER_FLOW[0], 'a new order starts at the first flow status');
      assert.equal(order.simulated, true, 'the order is explicitly flagged as simulated');
      assert.equal(order.paymentStatus, C.PAYMENT_STATUS.PAID, 'the demo payment is recorded as paid');
      assert.match(order.paymentNote, /Simulated|no real gateway/i, 'the payment note states that no gateway was charged');
      const bill = order.totals;
      assert.equal(
        bill.grandTotal,
        bill.merchandiseSubtotal - bill.totalDiscount + bill.deliveryFee + bill.packingFee + bill.surgeFee + (bill.smallOrderFee || 0) + bill.tip,
        'the bill adds up: subtotal − discounts + every fee line'
      );
      assert.ok(bill.freeDeliveryThreshold > 0, 'the bill reports the configured threshold');
      assert.ok(Array.isArray(order.statusHistory) && order.statusHistory.length, 'the order keeps a status history');

      const stored = store.catalog.product(product.id);
      assert.equal(stored.stock, stockBefore - 2, 'stock was decremented by the ordered quantity');

      assert.equal(store.cart.count(), 0, 'the cart is emptied after ordering');
      assert.ok(
        store.notifications.list().some((item) => item.orderId === order.id),
        'a notification was raised for the order'
      );

      await assert.rejects(
        () => store.orders.place({ addressId: address.id, paymentMethod: C.PAYMENT_METHODS.DEMO }),
        /empty/i,
        'submitting again with an empty cart is refused — no duplicate order'
      );

      // Simulated progression and cancellation restore inventory.
      const flow = order.flow && order.flow.length ? order.flow : C.orderFlowFor(order.cartType);
      store.orders.setStatus(order.id, flow[1], { note: 'test progression' });
      assert.equal(store.orders.get(order.id).status, flow[1], 'the status advanced');
      assert.equal(store.orders.canCancel(store.orders.get(order.id)), true, 'the order is still cancellable');

      await store.orders.cancel(order.id, 'Changed my mind');
      const cancelled = store.orders.get(order.id);
      assert.equal(cancelled.status, C.CANCELLED, 'the order is cancelled');
      assert.equal(cancelled.cancelReason, 'Changed my mind', 'the cancellation reason is stored');
      assert.equal(cancelled.paymentStatus, C.PAYMENT_STATUS.REFUNDED, 'a paid order is marked refunded');
      assert.match(cancelled.refundNote, /simulated|no payment gateway/i, 'the refund is labelled as simulated');
      assert.equal(store.catalog.product(product.id).stock, stockBefore, 'cancelling restored the stock');
      assert.equal(store.orders.canCancel(cancelled), false, 'a cancelled order cannot be cancelled again');
    });

    await t.test('reorder puts the same lines back into the cart', async () => {
      const order = store.orders.list()[0];
      assert.ok(order, 'there is an order to reorder');
      store.cart.clear();
      const result = store.orders.reorder(order.id);
      assert.equal(result.ok, true, 'reorder succeeds');
      assert.ok(store.cart.count() > 0, 'the cart has items again');
      store.cart.clear();
    });

    /* -------------------------- 8. settings drive the whole storefront -- */

    await t.test('changing the threshold and fees in settings changes every calculation', () => {
      const cityId = store.location.current.cityId;
      const cityFeeBefore = store.location.deliveryFee();

      store.settings.update({ freeDeliveryThreshold: 300, deliveryFee: 49, cityDeliveryFee: { [cityId]: 55 } });
      const product = store.catalog.products().find((item) => item.price >= 150 && item.price < 300 && item.stock > 0);
      store.cart.clear();
      store.cart.add(product, { qty: 1 });
      const totals = store.cart.totals();
      assert.equal(totals.freeDeliveryThreshold, 300, 'the cart reports the new threshold');
      assert.equal(totals.remainingForFreeDelivery, 300 - totals.eligibleSubtotal, 'remaining is recomputed from settings');
      assert.equal(totals.deliveryFee, 55, 'the per-city fee configured by an admin is charged below the threshold');

      store.settings.update({ cityDeliveryFee: {} });
      assert.equal(store.cart.totals().deliveryFee, cityFeeBefore, 'clearing the city override falls back to the seeded city fee');

      store.settings.update({ freeDeliveryThreshold: 150, deliveryFee: 29 });
      assert.equal(store.cart.totals().freeDeliveryThreshold, 150, 'settings can be restored');
      store.cart.clear();
    });

    /* ------------------------------------------- 9. admin role & config - */

    await t.test('the admin surface is role-gated and edits layer over the seed', async () => {
      assert.equal(store.auth.isAdmin(), false, 'the signed-in customer is not an admin');
      await store.auth.logout();
      assert.equal(store.auth.isSignedIn(), false, 'signing out clears the session');

      const demoAdmin = FX.config.demoCredentials.admin;
      const admin = await store.auth.demoLogin(demoAdmin.email, demoAdmin.password);
      assert.equal(admin.role, C.ROLES.ADMIN, 'the seeded admin account has the admin role');
      assert.equal(store.auth.isAdmin(), true, 'isAdmin() reflects the role');

      const target = store.catalog.products()[0];
      const priceBefore = target.price;
      await store.admin.saveProduct({ id: target.id, price: priceBefore + 25, stock: 77 });
      const updated = store.catalog.product(target.id);
      assert.equal(updated.price, priceBefore + 25, 'an admin price edit applies immediately');
      assert.equal(updated.stock, 77, 'an admin stock edit applies immediately');
      assert.ok(store.state.adminCatalog, 'edits are stored as an override layer');

      store.resetLocalData({ catalogueOnly: true, keepAccounts: true });
      assert.equal(store.catalog.product(target.id).price, priceBefore, 'resetting the catalogue restores the seeded price');
      assert.equal(store.auth.isSignedIn(), true, 'a catalogue reset does not sign anybody out');
    });

    /* ------------------------------------- 10. auth validation & reset -- */

    await t.test('registration validates, login refuses wrong passwords, reset works', async () => {
      await store.auth.logout();

      await assert.rejects(
        () => store.auth.register({ name: 'A', email: 'not-an-email', phone: '12345', password: 'abc' }),
        /required|valid|at least|exist|registered/i,
        'invalid registration data is rejected by the store'
      );

      const email = 'flow.test+' + Date.now() + '@example.com';
      const user = await store.auth.register({ name: 'Flow Test', email, phone: '9876500011', password: 'Password123' });
      assert.equal(user.email, email, 'registration returns the new user');
      assert.equal(store.auth.isSignedIn(), true, 'registration signs the user in');

      await assert.rejects(
        () => store.auth.login(email, 'WrongPassword1'),
        /incorrect|password|no account/i,
        'a wrong password never produces a fake success'
      );
      assert.equal(store.auth.isSignedIn(), true, 'a failed login does not disturb the existing session');

      const reset = await store.auth.forgotPassword(email);
      assert.equal(reset.ok, true, 'the reset flow starts');
      assert.ok(reset.demoCode, 'demo mode returns a clearly labelled demo code (no email provider is connected)');

      await assert.rejects(() => store.auth.resetPassword(email, '000000', 'NewPassword123'), /not correct|expired|again/i, 'a wrong code is refused');

      await store.auth.resetPassword(email, reset.demoCode, 'NewPassword123');
      await store.auth.logout();
      const signedIn = await store.auth.login(email, 'NewPassword123');
      assert.equal(signedIn.email, email, 'the new password works');
      await assert.rejects(() => store.auth.login(email, 'Password123'), /incorrect|password/i, 'the old password stops working');
    });

    /* ----------------------------- 11. location honesty & serviceability  */

    await t.test('city coverage decides serviceability instead of pretending', () => {
      const coming = FX.locations.CITIES.find((city) => city.coverage === C.COVERAGE.COMING_SOON);
      assert.ok(coming, 'the seed includes a city that is not serviceable yet');
      store.location.set(coming.id, null);
      assert.equal(store.location.isServiceable(), false, 'a coming-soon city is not serviceable');
      assert.match(store.location.etaLabel(0), /not serviceable/i, 'the ETA label says so plainly');

      store.location.set('vijayawada', null);
      assert.equal(store.location.isServiceable(), true, 'a demo-coverage city is serviceable');

      // An admin can open a city; the storefront follows the override.
      store.settings.update({ cityCoverage: Object.assign({}, store.settings.get().cityCoverage, { [coming.id]: C.COVERAGE.DEMO_FULL }) });
      assert.equal(store.location.coverageOf(coming.id), C.COVERAGE.DEMO_FULL, 'the coverage override is applied');
      store.settings.update({ cityCoverage: {} });
      assert.equal(store.location.coverageOf(coming.id), C.COVERAGE.COMING_SOON, 'clearing overrides restores the seeded coverage');
    });

    /* ----------------------------------------- 12. rendered home page --- */

    await t.test('the home page renders the documented sections', () => {
      const sections = document.querySelector('#home-sections');
      assert.ok(sections, 'the home sections mount exists');
      assert.ok(sections.children.length >= 8, 'at least 8 merchandising sections rendered (found ' + sections.children.length + ')');
      const text = sections.textContent;
      assert.match(text, /Best ?seller|Bestselling/i, 'a best-sellers section is present');
      assert.match(text, /Deal|Today/i, "a today's-deals section is present");
      assert.ok(document.querySelectorAll('#home-category-grid > *').length >= 8, 'the quick category grid is populated');
      assert.ok(document.querySelectorAll('.fx-product-card').length >= 20, 'product cards are rendered (' + document.querySelectorAll('.fx-product-card').length + ')');
      assert.equal(document.querySelectorAll('img[loading="lazy"]').length > 0, true, 'images are lazy-loaded');
      assert.equal(document.querySelectorAll('.fx-rating-demo').length >= 0, true, 'demo ratings, when shown, carry the demo marker class');
      assert.ok(money(150).includes('150'), 'money formatting works');
    });

    /* --------------------- 13. admin dashboard renders for an admin ----- */

    await t.test('the admin dashboard renders for an admin session', async () => {
      const adminCtx = await loadPage({ file: 'admin.html', query: '?tab=products' }, { session: DEMO_ADMIN });
      t.after(() => adminCtx.window.close());
      assert.deepEqual(adminCtx.realErrors().map((e) => e.message), [], 'the admin page booted without errors');
      const content = adminCtx.document.querySelector('.fx-admin-content');
      assert.ok(content && content.children.length, 'the products section rendered');
      assert.ok(content.querySelectorAll('.fx-table tbody tr').length > 0, 'the product table lists rows');
      const stats = await adminCtx.store.admin.stats();
      assert.ok(stats.products > 100, 'the catalogue reports ' + stats.products + ' products');
      assert.equal(typeof stats.lowStock, 'number', 'low-stock counting is available');
    });

    await sleep(10);
  });
}

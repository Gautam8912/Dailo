/**
 * Food Express — backend/tests/services.test.js
 *
 * Service, model and rule tests that run WITHOUT MongoDB: they exercise the
 * code paths that decide money, roles, passwords, payments and order flow.
 *
 * Run: npm test   (or: node --test backend/tests/)
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-ci-only-0123456789';
process.env.ALLOW_WITHOUT_DATABASE = 'true';
process.env.MONGO_URI = '';

const ROOT = path.resolve(__dirname, '..');

/** Skip the whole file when the API dependencies are not installed. */
function dependenciesAvailable() {
  try {
    require('express');
    require('mongoose');
    require('bcryptjs');
    require('jsonwebtoken');
    require('helmet');
    require('cors');
    require('express-rate-limit');
    return true;
  } catch (err) {
    return false;
  }
}

const DEPS = dependenciesAvailable();

if (!DEPS) {
  test('backend suite skipped (dependencies not installed)', { skip: 'Run `npm install` to enable the API tests.' }, () => {});
} else {
  const authService = require(path.join(ROOT, 'src/services/auth.service'));
  const payments = require(path.join(ROOT, 'src/services/payment.service'));
  const settingsService = require(path.join(ROOT, 'src/services/settings.service'));
  const { ApiError } = require(path.join(ROOT, 'src/utils/ApiError'));
  const { signToken } = require(path.join(ROOT, 'src/middleware/auth'));
  const shared = require(path.join(ROOT, 'src/services/shared'));

  const User = require(path.join(ROOT, 'src/models/User'));
  const Product = require(path.join(ROOT, 'src/models/Product'));
  const Address = require(path.join(ROOT, 'src/models/Address'));
  const Coupon = require(path.join(ROOT, 'src/models/Coupon'));
  const Order = require(path.join(ROOT, 'src/models/Order'));
  const AppSetting = require(path.join(ROOT, 'src/models/AppSetting'));

  const { constants, pricing, settings, locations } = shared;

  /* ------------------------------------------------------------- validation */

  test('auth validation refuses weak or malformed input', () => {
    assert.match(authService.validators.password('short1'), /at least 8/i);
    assert.match(authService.validators.password('allletters'), /letter and one number/i);
    assert.equal(authService.validators.password('Password123'), null);
    assert.match(authService.validators.email('not-an-email'), /valid email/i);
    assert.equal(authService.validators.email('shopper@example.com'), null);
    assert.match(authService.validators.phone('12345'), /10-digit/i);
    assert.equal(authService.validators.phone('9876543210'), null);
    assert.equal(authService.validators.phone(''), null, 'phone stays optional at registration');
    assert.match(authService.validators.name('A'), /full name/i);
  });

  test('assertValid reports every field problem with a 422', () => {
    try {
      authService.assertValid({ name: 'A', email: 'bad', password: 'x' });
      assert.fail('invalid registration data must be rejected');
    } catch (err) {
      assert.ok(err instanceof ApiError, 'an ApiError is thrown');
      assert.equal(err.status, 422);
      assert.deepEqual(Object.keys(err.details.fields).sort(), ['email', 'name', 'password']);
    }
  });

  test('valid registration data passes validation', () => {
    assert.doesNotThrow(() =>
      authService.assertValid({ name: 'Anitha Reddy', email: 'anitha@example.com', phone: '9876543210', password: 'Password123' })
    );
  });

  /* --------------------------------------------------------------- passwords */

  test('passwords are bcrypt-hashed and never stored in plain text', async () => {
    const user = new User({ name: 'Hash Test', email: 'hash@example.com', phone: '9876500000', role: 'user' });
    await user.setPassword('Password123');

    assert.ok(user.passwordHash, 'a hash was produced');
    assert.notEqual(user.passwordHash, 'Password123', 'the hash is not the password');
    assert.match(user.passwordHash, /^\$2[aby]\$/, 'the hash is bcrypt');
    assert.equal(await user.comparePassword('Password123'), true, 'the right password verifies');
    assert.equal(await user.comparePassword('WrongPassword1'), false, 'a wrong password does not verify');

    const publicShape = user.toPublic();
    assert.equal(publicShape.passwordHash, undefined, 'the hash never leaves the API');
    assert.equal(JSON.stringify(publicShape).includes('Password123'), false, 'no plain-text password in the payload');

    await assert.rejects(() => user.setPassword('short'), /at least 8/i, 'weak passwords are refused');
  });

  test('repeated failed sign-ins lock the account', () => {
    const user = new User({ name: 'Lock Test', email: 'lock@example.com', passwordHash: 'x' });
    assert.equal(user.isLocked(), false);
    for (let i = 0; i < 8; i += 1) user.registerFailedAttempt();
    assert.equal(user.failedAttempts, 8);
    assert.equal(user.isLocked(), true, 'the account locks after 8 failures');
    user.resetFailedAttempts();
    assert.equal(user.isLocked(), false, 'a successful sign-in clears the lock');
  });

  test('session tokens are signed JWTs carrying the role', () => {
    const user = new User({ name: 'Token Test', email: 'token@example.com', passwordHash: 'x', role: 'admin' });
    user._id = '507f1f77bcf86cd799439011';
    const token = signToken(user);
    assert.equal(typeof token, 'string');
    assert.equal(token.split('.').length, 3, 'a JWT has three segments');
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    assert.equal(payload.sub, '507f1f77bcf86cd799439011');
    assert.equal(payload.role, 'admin');
  });

  /* --------------------------------------------------------------- payments */

  test('demo payments are labelled simulated and no gateway is faked', () => {
    const demo = payments.describe(constants.PAYMENT_METHODS.DEMO);
    assert.equal(demo.paymentStatus, constants.PAYMENT_STATUS.PAID);
    assert.equal(demo.simulated, true);
    assert.match(demo.paymentNote, /simulated|no money moved/i);
    assert.equal(demo.verified, false, 'a demo payment is never marked gateway-verified');

    const cod = payments.describe(constants.PAYMENT_METHODS.COD);
    assert.equal(cod.paymentStatus, constants.PAYMENT_STATUS.PENDING, 'cash on delivery stays pending');

    assert.throws(() => payments.describe('bitcoin'), /payment method/i, 'unknown methods are refused');
  });

  test('online payments are refused while no gateway is configured', async () => {
    assert.throws(
      () => payments.assertMethodAllowed(constants.PAYMENT_METHODS.UPI),
      (err) => err.status === 422 && /gateway/i.test(err.message),
      'UPI is refused with a 422 explaining the missing gateway'
    );
    assert.throws(() => payments.assertMethodAllowed(constants.PAYMENT_METHODS.CARD), /gateway/i);
    assert.doesNotThrow(() => payments.assertMethodAllowed(constants.PAYMENT_METHODS.DEMO));
    assert.doesNotThrow(() => payments.assertMethodAllowed(constants.PAYMENT_METHODS.COD));

    await assert.rejects(
      () => payments.verifyGatewayPayment({ orderNumber: 'FX-TEST', amount: 100 }),
      (err) => err.status === 422 && err.details.code === 'GATEWAY_NOT_CONFIGURED',
      'gateway verification fails loudly instead of pretending to succeed'
    );
  });

  /* --------------------------------------------------------------- settings */

  test('settings resolve from shared defaults and honour per-city overrides', () => {
    const cfg = settingsService.peek();
    assert.equal(cfg.freeDeliveryThreshold, settings.DEFAULT_SETTINGS.freeDeliveryThreshold);
    assert.equal(cfg.deliveryFee, settings.DEFAULT_SETTINGS.deliveryFee);

    const overridden = settings.withSettings({ cityCoverage: { kolkata: constants.COVERAGE.DEMO_FULL }, cityDeliveryFee: { vijayawada: 55 } });
    assert.equal(settingsService.coverageFor(overridden, 'kolkata'), constants.COVERAGE.DEMO_FULL);
    assert.equal(settingsService.isServiceable(overridden, 'kolkata'), true);
    assert.equal(settingsService.deliveryFeeFor(overridden, 'vijayawada'), 55);
    assert.equal(settingsService.deliveryFeeFor(overridden, 'guntur'), locations.getCity('guntur').deliveryFee, 'cities without an override keep their seeded fee');

    assert.equal(settingsService.isServiceable(settings.DEFAULT_SETTINGS, 'kolkata'), false, 'a coming-soon city is not serviceable by default');
    assert.equal(settingsService.etaMinutesFor(settings.DEFAULT_SETTINGS, 'kolkata', 0), null, 'a non-serviceable city has no ETA');
    assert.ok(settingsService.etaMinutesFor(settings.DEFAULT_SETTINGS, 'vijayawada', 10) >= 10, 'a serviceable city has an ETA');

    assert.equal(AppSetting.resolve({ freeDeliveryThreshold: 999 }).freeDeliveryThreshold, 999);
    assert.equal(AppSetting.resolve({}).deliveryFee, settings.DEFAULT_SETTINGS.deliveryFee, 'defaults survive a partial override');
  });

  test('the storefront and the API price the same cart identically', () => {
    // The backend must not re-implement money rules: both sides use shared/pricing.
    const frontendPricing = require(path.resolve(__dirname, '..', '..', 'shared', 'pricing.js'));
    const items = [
      { itemId: 'p-a', type: 'product', qty: 2, unitPrice: 120, mrp: 150, gstRate: 0.18 },
      { itemId: 'p-b', type: 'product', qty: 1, unitPrice: 65, gstRate: 0.05 },
    ];
    const input = { items, coupon: null, settings: settings.DEFAULT_SETTINGS, cartType: 'store', cityId: 'vijayawada', tip: 10, redeemPoints: 0, availablePoints: 0 };
    const viaBackendBridge = pricing.computeCart(input);
    const viaDirectRequire = frontendPricing.computeCart(input);
    assert.deepEqual(viaBackendBridge, viaDirectRequire, 'identical totals from both entry points');
    assert.equal(viaBackendBridge.merchandiseSubtotal, 305);
    assert.equal(viaBackendBridge.freeDeliveryUnlocked, true, '₹305 clears the ₹150 threshold');
    assert.equal(viaBackendBridge.deliveryFee, 0);
    assert.equal(viaBackendBridge.grandTotal, 305 + 10, 'grand total = merchandise + tip when delivery is free');
  });

  /* ------------------------------------------------------------------ models */

  test('product model normalises price, discount and stock flags', () => {
    const product = new Product({ seedId: 'p-test', name: 'Test Product', categoryId: 'groceries', price: 90, mrp: 120, stock: 0 });
    const error = product.validateSync();
    assert.equal(error, undefined, 'a valid product passes validation');
    product.normalise();
    assert.equal(product.discountPercent, 25, 'the discount is derived from MRP and price');
    assert.equal(product.inStock, false, 'zero stock means out of stock');
    assert.equal(product.toClient().discountPercent, 25, 'the API payload carries the derived discount');
    assert.equal(product.toClient().id, 'p-test', 'the API payload exposes the seed id as `id`');

    const belowMrp = new Product({ seedId: 'p-test-2', name: 'Cheap', categoryId: 'groceries', price: 100, mrp: 40, stock: 5 });
    belowMrp.normalise();
    assert.ok(belowMrp.mrp >= belowMrp.price, 'MRP can never fall below the selling price');
    assert.equal(belowMrp.discountPercent, 0, 'no discount is invented when MRP is below price');
    assert.equal(belowMrp.inStock, true);

    const invalid = new Product({ name: 'No seed id', categoryId: 'groceries', price: -5 });
    assert.ok(invalid.validateSync(), 'a product without a seedId or with a negative price is rejected');
  });

  test('address model enforces phone, PIN code and required lines', () => {
    const good = new Address({
      user: '507f1f77bcf86cd799439011',
      label: 'Home',
      receiver: 'Anitha',
      phone: '9876543210',
      line1: '12-3-45 MG Road',
      cityId: 'vijayawada',
      pincode: '520010',
    });
    assert.equal(good.validateSync(), undefined);

    const badPhone = new Address(Object.assign({}, good.toObject(), { phone: '12345' }));
    assert.match(String(badPhone.validateSync()), /10-digit/i);

    const badPin = new Address(Object.assign({}, good.toObject(), { pincode: '5200' }));
    assert.match(String(badPin.validateSync()), /6 digits/i);

    const missingLine = new Address(Object.assign({}, good.toObject(), { line1: '' }));
    assert.ok(missingLine.validateSync(), 'a blank address line is rejected');
  });

  test('coupon model uppercases codes and rejects malformed ones', () => {
    const coupon = new Coupon({ code: 'save10', title: '₹10 off', type: 'flat', value: 10, minSubtotal: 199 });
    assert.equal(coupon.validateSync(), undefined);
    assert.equal(coupon.code, 'SAVE10', 'codes are stored uppercase');

    const bad = new Coupon({ code: 'x', title: 'Too short', type: 'flat', value: 1 });
    assert.match(String(bad.validateSync()), /3–20 letters/i);

    const badType = new Coupon({ code: 'WEIRD1', title: 'Bad type', type: 'buy-one-get-one', value: 1 });
    assert.ok(badType.validateSync(), 'an unknown coupon type is rejected');
  });

  test('user model rejects malformed emails and duplicate roles', () => {
    const user = new User({ name: 'Model Test', email: 'NOT_AN_EMAIL', passwordHash: 'x' });
    assert.match(String(user.validateSync()), /valid email/i);

    const badRole = new User({ name: 'Role Test', email: 'role@example.com', passwordHash: 'x', role: 'superuser' });
    assert.ok(badRole.validateSync(), 'an unknown role is rejected');

    const admin = new User({ name: 'Admin Test', email: 'admin@example.com', passwordHash: 'x', role: constants.ROLES.ADMIN });
    assert.equal(admin.validateSync(), undefined);
    assert.equal(admin.toPublic().role, 'admin');
  });

  /* ------------------------------------------------------------ order flow */

  function makeOrder(status, cartType) {
    return new Order({
      orderNumber: 'FX-TEST-' + status,
      cartType: cartType || constants.CART_TYPES.STORE,
      paymentMethod: constants.PAYMENT_METHODS.DEMO,
      paymentStatus: constants.PAYMENT_STATUS.PAID,
      address: { line1: '12 Test Street', cityId: 'vijayawada' },
      totals: { merchandiseSubtotal: 400, grandTotal: 400, totalDiscount: 0, deliveryFee: 0, packingFee: 0, surgeFee: 0, tip: 0 },
      items: [{ itemId: 'p-test', name: 'Test', unitPrice: 200, qty: 2, lineTotal: 400 }],
      status,
      flow: constants.orderFlowFor(cartType || constants.CART_TYPES.STORE),
    });
  }

  test('order status only moves forward along its own flow', () => {
    const flow = constants.STORE_ORDER_FLOW;
    const order = makeOrder(flow[0]);
    assert.equal(order.canTransitionTo(flow[1]), true, 'the next step is allowed');
    assert.equal(order.canTransitionTo(flow[3]), false, 'skipping steps is refused');
    assert.equal(order.canTransitionTo(flow[0]), false, 'staying put is not a transition');
    assert.equal(order.canTransitionTo(constants.CANCELLED), true, 'a fresh order can be cancelled');

    const late = makeOrder('OUT_FOR_DELIVERY');
    assert.equal(late.canTransitionTo('DELIVERED'), true);
    assert.equal(late.canCancel(), false, 'an order that is out for delivery cannot be cancelled');

    const delivered = makeOrder('DELIVERED');
    assert.equal(delivered.canCancel(), false, 'a delivered order cannot be cancelled');

    const cancelled = makeOrder(constants.CANCELLED);
    assert.equal(cancelled.canTransitionTo(flow[1]), false, 'a cancelled order cannot be revived');
    assert.equal(cancelled.canCancel(), false, 'a cancelled order cannot be cancelled twice');
  });

  test('restaurant orders follow their own flow', () => {
    const flow = constants.RESTAURANT_ORDER_FLOW;
    const order = makeOrder(flow[0], constants.CART_TYPES.RESTAURANT);
    assert.deepEqual(order.flow, flow);
    assert.equal(order.canTransitionTo(flow[1]), true);
    assert.equal(order.canTransitionTo(constants.STORE_ORDER_FLOW[2]), flow[2] === constants.STORE_ORDER_FLOW[2], 'only steps in this flow are reachable');
  });

  test('order model requires items, an address and a payment method', () => {
    const order = new Order({ orderNumber: 'FX-EMPTY', cartType: 'store', paymentMethod: 'demo', address: {}, totals: {}, items: [] });
    const error = order.validateSync();
    assert.ok(error, 'an empty order is rejected');
    assert.ok(error.errors.items, 'items are required');
  });

  test('the payment status vocabulary matches the storefront constants', () => {
    assert.deepEqual(
      Object.keys(Order.schema.path('paymentStatus').enumValues).length ? Order.schema.path('paymentStatus').enumValues : [],
      [constants.PAYMENT_STATUS.PENDING, constants.PAYMENT_STATUS.PAID, constants.PAYMENT_STATUS.FAILED, constants.PAYMENT_STATUS.REFUNDED]
    );
    assert.deepEqual(Order.ALL_STATUSES.sort(), Array.from(new Set([].concat(constants.STORE_ORDER_FLOW).concat(constants.RESTAURANT_ORDER_FLOW).concat([constants.CANCELLED]))).sort());
  });
}

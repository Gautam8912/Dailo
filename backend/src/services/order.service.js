/**
 * Order service — placement, progression, cancellation and reorder.
 *
 * Guarantees enforced here (never in the browser):
 *   - the bill is recomputed from the catalogue before anything is written;
 *   - a double-submitted checkout returns the SAME order (idempotencyKey);
 *   - stock is decremented atomically and refused when it is not available;
 *   - status moves only forward along the order's own flow;
 *   - cancellation restores stock and marks a simulated refund honestly;
 *   - loyalty is credited on delivery and reversed on cancellation.
 */
'use strict';

const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const catalog = require('./catalog.service');
const pricingService = require('./pricing.service');
const settingsService = require('./settings.service');
const notifications = require('./notification.service');
const payments = require('./payment.service');
const { ApiError } = require('../utils/ApiError');
const { constants, locations, pricing } = require('./shared');

function orderNumber() {
  const now = new Date();
  const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return 'FX-' + stamp + '-' + rand;
}

/** Line total including priced add-ons, using the shared line math. */
function lineTotalFor(line) {
  const addonTotal = (line.addons || []).reduce((sum, addon) => sum + (Number(addon.price) || 0), 0);
  return Math.round(((Number(line.unitPrice) || 0) + addonTotal) * line.qty);
}

function flowFor(cartType) {
  return constants.orderFlowFor(cartType);
}

/** Place an order for a signed-in user or a guest. */
async function place(input) {
  const user = input.user || null;
  const cfg = await settingsService.get();

  // 1. Idempotency: the same key returns the order that was already created.
  if (input.idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey: String(input.idempotencyKey) }).lean();
    if (existing) return { order: toClient(existing), duplicate: true };
  }

  const items = input.items && input.items.length
    ? input.items
    : user
      ? (await Cart.findOne({ user: user._id }).lean()) || { items: [] }
      : { items: [] };
  const lines = (items.items || items || []).map((line) => ({
    itemId: line.itemId || line.seedId,
    qty: line.qty,
    addons: line.addons,
    selection: line.selection,
  }));

  // 2. Address (snapshot) — validated against coverage on the server.
  const address = input.address || null;
  if (!address || !address.line1 || !address.cityId) {
    throw ApiError.badRequest('A delivery address is required.', { code: 'ADDRESS_REQUIRED' });
  }
  if (!settingsService.isServiceable(cfg, address.cityId)) {
    throw ApiError.unprocessable('Food Express is not delivering in this city yet.', {
      code: 'CITY_NOT_SERVICEABLE',
      cityId: address.cityId,
      coverage: settingsService.coverageFor(cfg, address.cityId),
    });
  }

  // 3. Price the cart from the database (client prices are ignored).
  const priced = await pricingService.priceCart({
    items: lines,
    couponCode: input.couponCode,
    cartType: input.cartType,
    restaurantId: input.restaurantId,
    cityId: address.cityId,
    tip: input.tip,
    redeemPoints: input.redeemPoints,
    user,
  });

  if (!priced.totals.canCheckout) {
    throw ApiError.unprocessable(priced.totals.belowMinOrder || priced.totals.restaurantMinOrder || 'This cart cannot be checked out yet.', {
      code: 'CHECKOUT_BLOCKED',
      totals: priced.totals,
    });
  }

  // 4. Payment method.
  const method = input.paymentMethod || constants.PAYMENT_METHODS.DEMO;
  payments.assertMethodAllowed(method);
  const payment = payments.describe(method);

  // 5. Build the order document.
  const cartType = priced.restaurant ? constants.CART_TYPES.RESTAURANT : constants.CART_TYPES.STORE;
  const flow = flowFor(cartType);
  const handling = priced.lines.reduce((max, line) => Math.max(max, line.handlingMinutes || 0), 0);
  const eta = settingsService.etaMinutesFor(cfg, address.cityId, handling);

  const draft = {
    orderNumber: orderNumber(),
    user: user ? user._id : null,
    userName: user ? user.name : address.receiver || 'Guest',
    guest: user ? { email: '', phone: '' } : { email: input.guestEmail || '', phone: address.phone || '' },
    cartType,
    restaurantId: priced.restaurant ? priced.restaurant.restaurantId : null,
    restaurantName: priced.restaurant ? priced.restaurant.name : '',
    items: priced.lines.map((line) => ({
      itemId: line.itemId,
      name: line.name,
      unit: line.unit,
      unitPrice: line.unitPrice,
      qty: line.qty,
      lineTotal: lineTotalFor(line),
      gstRate: line.gstRate,
      addons: line.addons,
      selection: line.selection,
    })),
    address: {
      label: address.label || 'Home',
      type: address.type || 'home',
      receiver: address.receiver,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || '',
      landmark: address.landmark || '',
      cityId: address.cityId,
      localityId: address.localityId || null,
      pincode: address.pincode || '',
    },
    location: {
      cityId: address.cityId,
      localityId: address.localityId || null,
      label: (locations.getLocality(address.cityId, address.localityId) || locations.getCity(address.cityId) || {}).name || '',
      coverage: settingsService.coverageFor(cfg, address.cityId),
    },
    paymentMethod: method,
    paymentStatus: payment.paymentStatus,
    paymentNote: payment.paymentNote,
    paymentRef: payments.localReference('pending', method),
    paymentVerified: false,
    couponCode: priced.totals.coupon ? priced.totals.coupon.code : null,
    totals: priced.totals,
    status: flow[0],
    statusHistory: [{ status: flow[0], at: new Date(), note: 'Order received', by: user ? 'customer' : 'guest' }],
    flow,
    etaMinutes: eta || cfg.defaultEtaMinutes || 30,
    deliverySlot: input.deliverySlot || 'standard',
    notes: String(input.notes || '').slice(0, 300),
    simulated: true,
    loyaltyEarned: 0,
    loyaltyRedeemed: priced.totals.redeemPoints || 0,
    idempotencyKey: input.idempotencyKey ? String(input.idempotencyKey) : null,
  };

  // 6. Stock: decrement before the record exists so overselling is refused.
  await catalog.decrementStock({ items: priced.lines });

  let order;
  try {
    order = await Order.create(draft);
  } catch (err) {
    await catalog.restoreStock(priced.lines);
    if (err && err.code === 11000 && input.idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey: String(input.idempotencyKey) }).lean();
      if (existing) return { order: toClient(existing), duplicate: true };
    }
    throw err;
  }

  // 7. Side effects: coupon usage, loyalty redemption, cart reset, notification.
  if (priced.totals.coupon) {
    await Coupon.updateOne({ code: priced.totals.coupon.code }, { $inc: { totalRedemptions: 1 } });
  }
  if (user) {
    if (priced.totals.redeemPoints > 0) {
      await User.updateOne(
        { _id: user._id },
        {
          $inc: { 'rewards.points': -priced.totals.redeemPoints },
          $push: {
            'rewards.history': {
              $each: [
                {
                  type: 'debit',
                  points: priced.totals.redeemPoints,
                  reason: 'Redeemed on ' + order.orderNumber,
                  ref: order.orderNumber,
                  at: new Date(),
                },
              ],
              $position: 0,
            },
          },
        }
      );
    }
    await Cart.findOneAndUpdate({ user: user._id }, { $set: { items: [], saved: [], couponCode: null, tip: 0, redeemPoints: 0, cartType: constants.CART_TYPES.STORE, restaurantId: null } }, { upsert: true });
    await notifications.push({
      user,
      kind: constants.NOTIFICATION_KINDS.ORDER,
      title: 'Order ' + order.orderNumber + ' placed',
      message:
        (priced.restaurant ? priced.restaurant.name : 'Your Food Express order') +
        ' · ' + order.items.length + ' items · ' + formatMoney(order.totals.grandTotal) +
        '. Status updates here are simulated in this build.',
      href: 'order.html?id=' + order.orderNumber,
      orderNumber: order.orderNumber,
    });
  }

  return { order: toClient(order.toObject()), duplicate: false, warnings: priced.warnings };
}

function formatMoney(value) {
  return '₹' + Math.round(Number(value) || 0);
}

async function listFor(user, query) {
  const q = query || {};
  const filter = user ? { user: user._id } : { 'guest.phone': String(q.phone || '') };
  if (q.status && q.status !== 'all') filter.status = String(q.status).toUpperCase();
  if (q.cartType) filter.cartType = String(q.cartType);
  const limit = Math.min(Number(q.limit) || 50, 200);
  const docs = await Order.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map(toClient);
}

async function getForUser(user, idOrNumber) {
  const key = String(idOrNumber || '');
  const filter = /^FX-/i.test(key) ? { orderNumber: key.toUpperCase() } : { _id: key };
  const doc = await Order.findOne(filter).lean();
  if (!doc) throw ApiError.notFound('We could not find that order.', { code: 'ORDER_NOT_FOUND' });
  const isOwner = user && (String(doc.user) === String(user._id) || user.role === constants.ROLES.ADMIN);
  if (!isOwner) throw ApiError.forbidden('That order belongs to another account.', { code: 'ORDER_FORBIDDEN' });
  return toClient(doc);
}

async function getForAdmin(idOrNumber) {
  const key = String(idOrNumber || '');
  const filter = /^FX-/i.test(key) ? { orderNumber: key.toUpperCase() } : { _id: key };
  const doc = await Order.findOne(filter).lean();
  if (!doc) throw ApiError.notFound('We could not find that order.');
  return toClient(doc);
}

/** Move an order forward along its flow (admin or system simulation). */
async function setStatus(orderNumberValue, status, options) {
  const opts = options || {};
  const next = String(status || '').toUpperCase();
  const doc = await Order.findOne({ orderNumber: String(orderNumberValue).toUpperCase() });
  if (!doc) throw ApiError.notFound('We could not find that order.');
  if (!doc.canTransitionTo(next)) {
    throw ApiError.unprocessable('An order cannot move from ' + doc.status + ' to ' + next + '.', {
      code: 'INVALID_STATUS_TRANSITION',
      current: doc.status,
      requested: next,
      flow: doc.flow,
    });
  }
  doc.status = next;
  doc.statusHistory.push({ status: next, at: new Date(), note: opts.note || '', by: opts.by || 'system' });
  if (next === 'DELIVERED') {
    const points = doc.totals.loyaltyEarned || Math.floor((doc.totals.grandTotal || 0) * (doc.totals.loyaltyEarnRate || 0.05));
    doc.loyaltyEarned = points;
    if (doc.user && points > 0) {
      await User.updateOne(
        { _id: doc.user },
        {
          $inc: { 'rewards.points': points },
          $push: {
            'rewards.history': {
              $each: [{ type: 'credit', points, reason: 'Reward for ' + doc.orderNumber, ref: doc.orderNumber, at: new Date() }],
              $position: 0,
            },
          },
        }
      );
    }
  }
  await doc.save();

  if (doc.user) {
    await notifications.push({
      user: doc.user,
      kind: constants.NOTIFICATION_KINDS.ORDER,
      title: constants.ORDER_STATUS_LABELS[next] || next,
      message: (opts.note || 'Order ' + doc.orderNumber + ' is now ' + String(constants.ORDER_STATUS_LABELS[next] || next).toLowerCase() + '.') + ' (simulated update)',
      href: 'order.html?id=' + doc.orderNumber,
      orderNumber: doc.orderNumber,
    });
  }
  return toClient(doc.toObject());
}

async function cancel(orderNumberValue, reason, actor) {
  const doc = await Order.findOne({ orderNumber: String(orderNumberValue).toUpperCase() });
  if (!doc) throw ApiError.notFound('We could not find that order.');
  const isAdmin = actor && actor.role === constants.ROLES.ADMIN;
  if (!isAdmin && (!actor || String(doc.user) !== String(actor._id))) {
    throw ApiError.forbidden('That order belongs to another account.');
  }
  if (!doc.canCancel()) {
    throw ApiError.unprocessable(
      doc.status === constants.CANCELLED ? 'This order is already cancelled.' : 'This order is ' + String(doc.status).toLowerCase().replace(/_/g, ' ') + ' and can no longer be cancelled.',
      { code: 'CANCELLATION_NOT_ALLOWED', status: doc.status }
    );
  }

  await catalog.restoreStock(doc.items.map((item) => ({ itemId: item.itemId, qty: item.qty })));

  doc.status = constants.CANCELLED;
  doc.cancelledAt = new Date();
  doc.cancelReason = String(reason || 'Cancelled by customer').slice(0, 200);
  doc.statusHistory.push({ status: constants.CANCELLED, at: new Date(), note: doc.cancelReason, by: isAdmin ? 'admin' : 'customer' });

  const wasPaid = doc.paymentStatus === constants.PAYMENT_STATUS.PAID;
  if (wasPaid) {
    doc.paymentStatus = constants.PAYMENT_STATUS.REFUNDED;
    doc.refundNote = 'Simulated refund: this build has no payment gateway, so no money was charged and none is returned. A real integration refunds through the provider.';
  } else {
    doc.refundNote = 'No online payment was made, so there is nothing to refund.';
  }

  // Reverse loyalty: take back points earned, give back points redeemed.
  if (doc.user) {
    const update = { $inc: {} };
    if (doc.loyaltyEarned > 0) update.$inc['rewards.points'] = -doc.loyaltyEarned;
    if (doc.loyaltyRedeemed > 0) update.$inc['rewards.points'] = (update.$inc['rewards.points'] || 0) + doc.loyaltyRedeemed;
    if (Object.keys(update.$inc).length) await User.updateOne({ _id: doc.user }, update);
    await notifications.push({
      user: doc.user,
      kind: constants.NOTIFICATION_KINDS.ORDER,
      title: 'Order ' + doc.orderNumber + ' cancelled',
      message: doc.refundNote,
      href: 'order.html?id=' + doc.orderNumber,
      orderNumber: doc.orderNumber,
    });
  }

  await doc.save();
  return toClient(doc.toObject());
}

/** Re-add a past order's items to the shopper's server-side cart. */
async function reorder(orderNumberValue, user) {
  const doc = await Order.findOne({ orderNumber: String(orderNumberValue).toUpperCase(), user: user._id }).lean();
  if (!doc) throw ApiError.notFound('We could not find that order.');
  const docs = await Product.find({ seedId: { $in: doc.items.map((item) => item.itemId) }, active: { $ne: false } }).lean();
  const available = new Map(docs.map((item) => [item.seedId, item]));

  const cart = (await Cart.findOne({ user: user._id })) || new Cart({ user: user._id });
  const targetCartType = doc.cartType;
  if (cart.items.length && cart.cartType !== targetCartType) {
    cart.items = [];
    cart.cartType = targetCartType;
    cart.restaurantId = doc.restaurantId;
  }
  const added = [];
  const skipped = [];
  doc.items.forEach((item) => {
    const product = available.get(item.itemId);
    if (!product || product.stock <= 0) {
      skipped.push({ itemId: item.itemId, name: item.name, reason: 'unavailable' });
      return;
    }
    const existing = cart.items.find((line) => String(line.seedId) === item.itemId);
    const qty = Math.min(product.stock, (existing ? existing.qty : 0) + item.qty);
    if (existing) existing.qty = qty;
    else cart.items.push({ product: product._id, seedId: item.itemId, qty, addons: item.addons || [], selection: item.selection || null });
    added.push({ itemId: item.itemId, name: item.name, qty });
  });
  cart.cartType = targetCartType;
  cart.restaurantId = doc.restaurantId || cart.restaurantId;
  await cart.save();
  return { ok: added.length > 0, added, skipped, cartType: cart.cartType, restaurantId: cart.restaurantId };
}

async function stats() {
  const [orders, revenue, byStatus, users, products, lowStock] = await Promise.all([
    Order.countDocuments({}),
    Order.aggregate([{ $match: { status: { $ne: constants.CANCELLED } } }, { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({}),
    Product.countDocuments({}),
    Product.countDocuments({ stock: { $lte: constants.LOW_STOCK_THRESHOLD } }),
  ]);
  return {
    orders,
    revenue: revenue.length ? Math.round(revenue[0].total) : 0,
    byStatus: byStatus.reduce((acc, row) => Object.assign(acc, { [row._id]: row.count }), {}),
    users,
    products,
    lowStock,
  };
}

function toClient(doc) {
  const copy = Object.assign({}, doc);
  copy.id = copy.orderNumber;
  delete copy._id;
  delete copy.__v;
  delete copy.idempotencyKey;
  if (copy.user) copy.user = String(copy.user);
  return copy;
}

module.exports = { place, listFor, getForUser, getForAdmin, setStatus, cancel, reorder, stats, orderNumber, toClient };

/**
 * Pricing service — the server-side bill.
 *
 * Security rule: the client never decides a price. Every line is re-read from
 * the catalogue, every customisation price is looked up by option id, and the
 * total is computed with the SAME engine the storefront uses (shared/pricing.js)
 * so the two can never disagree.
 */
'use strict';

const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { ApiError } = require('../utils/ApiError');
const settingsService = require('./settings.service');
const { pricing, constants } = require('./shared');

/** Resolve an add-on's real price from the product's customisation groups. */
function priceAddons(product, requested) {
  const groups = product.customisations || [];
  const priced = [];
  (requested || []).forEach((entry) => {
    const group = groups.find((g) => g.id === entry.groupId || g.label === entry.groupLabel);
    if (!group) return;
    const option = (group.options || []).find((o) => o.id === entry.optionId || o.label === entry.label);
    if (!option) return;
    const raw = Number(option.price) || 0;
    // Multiplier options scale the base price (e.g. half portion = -35%).
    const value = option.mode === 'multiplier' ? Math.round(product.price * raw) : raw;
    priced.push({ groupId: group.id, optionId: option.id, label: option.label, price: value });
  });
  return priced;
}

function clampQty(qty, product, maxPerItem) {
  const requested = Math.max(0, Math.floor(Number(qty) || 0));
  const cap = Math.min(maxPerItem, Number.isFinite(product.stock) ? product.stock : maxPerItem);
  return Math.max(0, Math.min(requested, cap));
}

/**
 * @param {object} input
 *   items: [{ itemId, qty, addons?, selection? }]
 *   couponCode, cartType, restaurantId, cityId, tip, redeemPoints, user, guest
 * @returns {Promise<{lines, totals, restaurant, warnings, coupon}>}
 */
async function priceCart(input) {
  const cfg = await settingsService.get();
  const cartType = input.cartType === constants.CART_TYPES.RESTAURANT ? constants.CART_TYPES.RESTAURANT : constants.CART_TYPES.STORE;
  const warnings = [];

  const requested = Array.isArray(input.items) ? input.items : [];
  if (!requested.length) throw ApiError.badRequest('Your cart is empty.', { code: 'EMPTY_CART' });

  const seedIds = requested.map((line) => String(line.itemId));
  const docs = await Product.find({ seedId: { $in: seedIds } }).lean();
  const bySeed = new Map(docs.map((doc) => [doc.seedId, doc]));

  const lines = [];
  requested.forEach((line) => {
    const product = bySeed.get(String(line.itemId));
    if (!product || product.active === false) {
      warnings.push({ itemId: line.itemId, message: 'That item is no longer available and was skipped.' });
      return;
    }
    const qty = clampQty(line.qty, product, cfg.maxQuantityPerItem || 10);
    if (qty <= 0) {
      warnings.push({ itemId: product.seedId, message: product.name + ' is out of stock right now.' });
      return;
    }
    if (qty < Math.floor(Number(line.qty) || 0)) {
      warnings.push({ itemId: product.seedId, message: product.name + ' is limited to ' + qty + ' per order.' });
    }
    const isMenuItem = product.type === 'menu-item';
    if (cartType === constants.CART_TYPES.RESTAURANT && !isMenuItem) {
      throw ApiError.conflict('A restaurant cart can only contain dishes from that restaurant.', { code: 'CART_TYPE_MISMATCH' });
    }
    lines.push({
      itemId: product.seedId,
      type: product.type,
      name: product.name,
      unit: product.unit || '',
      categoryId: product.categoryId,
      restaurantId: product.restaurantId || null,
      unitPrice: product.price,
      mrp: Math.max(product.mrp || product.price, product.price),
      gstRate: product.gstRate || 0,
      handlingMinutes: product.handlingMinutes || product.prepMinutes || 0,
      qty,
      addons: priceAddons(product, line.addons),
      selection: line.selection || null,
    });
  });

  if (!lines.length) throw ApiError.badRequest('None of the items in your cart are available right now.', { code: 'CART_UNAVAILABLE', warnings });

  // One fulfilment context per cart.
  const restaurantIds = Array.from(new Set(lines.map((line) => line.restaurantId).filter(Boolean)));
  if (cartType === constants.CART_TYPES.RESTAURANT && restaurantIds.length > 1) {
    throw ApiError.conflict('Your cart can only hold dishes from one restaurant at a time.', { code: 'MULTIPLE_RESTAURANTS', restaurantIds });
  }

  let restaurant = null;
  const restaurantId = cartType === constants.CART_TYPES.RESTAURANT ? restaurantIds[0] || input.restaurantId || null : null;
  if (cartType === constants.CART_TYPES.RESTAURANT) {
    const key = String(restaurantId || '').replace(/^r-/, '').toLowerCase();
    restaurant = await Restaurant.findOne({ $or: [{ slug: key }, { restaurantId: 'r-' + key }, { restaurantId: key }] }).lean();
    if (!restaurant) throw ApiError.notFound('That restaurant is not available.', { code: 'RESTAURANT_NOT_FOUND' });
  }

  // Serviceability is enforced here, not just in the UI.
  const cityId = input.cityId || (input.address && input.address.cityId) || null;
  if (cityId && !settingsService.isServiceable(cfg, cityId)) {
    throw ApiError.unprocessable('Food Express is not delivering in this city yet.', {
      code: 'CITY_NOT_SERVICEABLE',
      cityId,
      coverage: settingsService.coverageFor(cfg, cityId),
    });
  }

  // Coupon usage for this shopper.
  let orderCount = 0;
  let couponUses = {};
  let isNewUser = true;
  let availablePoints = 0;
  if (input.user) {
    orderCount = await Order.countDocuments({ user: input.user._id, status: { $ne: constants.CANCELLED } });
    isNewUser = orderCount === 0;
    availablePoints = (input.user.rewards && input.user.rewards.points) || 0;
    const used = await Order.aggregate([
      { $match: { user: input.user._id, couponCode: { $ne: null }, status: { $ne: constants.CANCELLED } } },
      { $group: { _id: '$couponCode', count: { $sum: 1 } } },
    ]);
    couponUses = used.reduce((acc, row) => Object.assign(acc, { [row._id]: row.count }), {});
  }

  let coupon = null;
  let couponInvalid = null;
  if (input.couponCode) {
    const doc = await Coupon.findOne({ code: String(input.couponCode).trim().toUpperCase() }).lean();
    if (!doc) {
      couponInvalid = { code: String(input.couponCode).toUpperCase(), reason: 'We could not find that code.' };
    } else {
      coupon = doc;
    }
  }

  const deliveryFeeOverride = cityId ? settingsService.deliveryFeeFor(cfg, cityId) : cfg.deliveryFee;

  const totals = pricing.computeCart({
    items: lines,
    settings: cfg,
    cartType,
    coupon,
    couponUses,
    orderCount,
    isNewUser,
    restaurantId: restaurant ? restaurant.restaurantId : null,
    restaurantName: restaurant ? restaurant.name : null,
    restaurantMinOrder: restaurant ? restaurant.minOrder : 0,
    deliveryFeeOverride,
    tip: input.tip,
    redeemPoints: input.redeemPoints,
    availablePoints,
  });

  if (coupon && (totals.couponInvalid || !totals.coupon)) {
    couponInvalid = { code: coupon.code, reason: totals.couponRejection || 'That coupon does not apply to this cart.' };
  }

  return { lines, totals, restaurant, warnings, couponInvalid, cityId, cfg };
}

/** Validate a coupon on its own (used by the coupon apply endpoint). */
async function validateCoupon(code, context) {
  const doc = await Coupon.findOne({ code: String(code || '').trim().toUpperCase() }).lean();
  if (!doc) return { ok: false, reason: 'We could not find the code ' + String(code || '').toUpperCase() + '.' };
  return pricing.validateCoupon(doc, context || {});
}

module.exports = { priceCart, validateCoupon, priceAddons };

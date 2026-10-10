/**
 * /api/cart — the signed-in shopper's server-side cart.
 * Prices are always recomputed from the catalogue; the client's numbers are
 * never stored or trusted.
 */
'use strict';

const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');
const pricingService = require('../services/pricing.service');
const settingsService = require('../services/settings.service');
const { protect } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { ApiError } = require('../utils/ApiError');
const { constants, locations } = require('../services/shared');

const router = express.Router();
router.use(protect);

async function loadCart(user) {
  const cart = await Cart.findOne({ user: user._id });
  return cart || Cart.create({ user: user._id, items: [], cartType: constants.CART_TYPES.STORE });
}

async function serialise(cart, user) {
  const settings = await settingsService.get();
  const ids = cart.items.map((line) => line.seedId);
  const docs = ids.length ? await Product.find({ seedId: { $in: ids } }).lean() : [];
  const byId = new Map(docs.map((doc) => [doc.seedId, doc]));

  const lines = [];
  const warnings = [];
  cart.items.forEach((line) => {
    const product = byId.get(line.seedId);
    if (!product || product.active === false || product.stock <= 0) {
      warnings.push({ itemId: line.seedId, message: (product ? product.name : line.seedId) + ' is unavailable and was skipped.' });
      return;
    }
    const qty = Math.min(line.qty, product.stock, settings.maxQuantityPerItem || 10);
    lines.push({
      itemId: product.seedId,
      name: product.name,
      unit: product.unit,
      unitPrice: product.price,
      mrp: Math.max(product.mrp || product.price, product.price),
      gstRate: product.gstRate || 0,
      handlingMinutes: product.handlingMinutes || 0,
      qty,
      addons: line.addons || [],
      selection: line.selection || null,
      maxQty: Math.min(product.stock, settings.maxQuantityPerItem || 10),
      stock: product.stock,
      restaurantId: product.restaurantId || null,
    });
  });

  let restaurant = null;
  if (cart.cartType === constants.CART_TYPES.RESTAURANT && cart.restaurantId) {
    const key = String(cart.restaurantId).replace(/^r-/, '').toLowerCase();
    restaurant = await Restaurant.findOne({ $or: [{ slug: key }, { restaurantId: 'r-' + key }, { restaurantId: key }] }).lean();
  }

  let totals = null;
  if (lines.length) {
    const priced = await pricingService.priceCart({
      items: lines.map((line) => ({ itemId: line.itemId, qty: line.qty, addons: line.addons, selection: line.selection })),
      couponCode: cart.couponCode,
      cartType: cart.cartType,
      restaurantId: cart.restaurantId,
      cityId: user.preferences && user.preferences.cityId ? user.preferences.cityId : null,
      tip: cart.tip,
      redeemPoints: cart.redeemPoints,
      user,
    }).catch((err) => {
      if (err instanceof ApiError) return null;
      throw err;
    });
    totals = priced ? priced.totals : null;
  }

  return {
    type: cart.cartType,
    cartType: cart.cartType,
    restaurantId: cart.restaurantId,
    restaurant: restaurant ? Object.assign({}, restaurant, { id: restaurant.restaurantId, _id: undefined }) : null,
    items: lines,
    saved: cart.saved || [],
    couponCode: cart.couponCode,
    tip: cart.tip || 0,
    redeemPoints: cart.redeemPoints || 0,
    count: lines.reduce((sum, line) => sum + line.qty, 0),
    totals,
    warnings,
    updatedAt: cart.updatedAt,
  };
}

router.get('/', asyncHandler(async (req, res) => ok(res, await serialise(await loadCart(req.user), req.user))));

router.post(
  '/',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { itemId, qty, addons, selection, forceSwitch } = req.body || {};
    if (!itemId) throw ApiError.badRequest('Which item should be added?', { code: 'ITEM_REQUIRED' });
    const product = await Product.findOne({ seedId: String(itemId) }).lean();
    if (!product || product.active === false) throw ApiError.notFound('That item is not available.', { code: 'ITEM_UNAVAILABLE' });

    const cart = await loadCart(req.user);
    const settings = await settingsService.get();
    const wantsRestaurant = product.type === 'menu-item';
    const target = wantsRestaurant ? constants.CART_TYPES.RESTAURANT : constants.CART_TYPES.STORE;

    if (cart.cartType !== target && cart.items.length) {
      if (!forceSwitch) {
        const current = cart.restaurantId
          ? await Restaurant.findOne({ restaurantId: cart.restaurantId }).lean()
          : null;
        throw ApiError.conflict(
          wantsRestaurant
            ? 'Your cart already has store items. Clear it to order from ' + (product.restaurantName || 'a restaurant') + '.'
            : 'Your cart already has dishes from ' + ((current && current.name) || 'a restaurant') + '. Clear it to add store items.',
          { code: 'CART_TYPE_CONFLICT', cartType: cart.cartType, restaurantId: cart.restaurantId, needsSwitch: true }
        );
      }
      cart.items = [];
    }

    cart.cartType = target;
    cart.restaurantId = wantsRestaurant ? product.restaurantId || cart.restaurantId : null;

    const existing = cart.items.find((line) => String(line.seedId) === String(itemId));
    const requested = Math.max(1, Math.floor(Number(qty) || 1));
    const cap = Math.min(product.stock, settings.maxQuantityPerItem || 10);
    if (cap <= 0) {
      throw ApiError.conflict(product.name + ' is out of stock right now.', { code: 'OUT_OF_STOCK', itemId: product.seedId });
    }
    if (existing) {
      const nextQty = Math.min(existing.qty + requested, cap);
      existing.qty = nextQty;
      if (addons) existing.addons = addons;
      if (selection) existing.selection = selection;
      if (nextQty < existing.qty + requested) {
        await cart.save();
        return ok(res, await serialise(cart, req.user), { capped: true, reason: product.name + ' is limited to ' + cap + ' per order.' });
      }
    } else {
      cart.items.push({ product: product._id, seedId: product.seedId, qty: Math.min(requested, cap), addons: addons || [], selection: selection || null });
    }
    await cart.save();
    return ok(res, await serialise(cart, req.user));
  })
);

router.put(
  '/:itemId',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const cart = await loadCart(req.user);
    const line = cart.items.find((entry) => String(entry.seedId) === String(req.params.itemId));
    if (!line) throw ApiError.notFound('That item is not in your cart.', { code: 'LINE_NOT_FOUND' });
    const settings = await settingsService.get();
    const product = await Product.findOne({ seedId: line.seedId }).lean();
    const cap = Math.min(product ? product.stock : settings.maxQuantityPerItem, settings.maxQuantityPerItem || 10);
    if (req.body.qty !== undefined) {
      const qty = Math.max(0, Math.floor(Number(req.body.qty) || 0));
      if (qty === 0) cart.items = cart.items.filter((entry) => entry !== line);
      else line.qty = Math.min(qty, cap);
    }
    if (req.body.addons !== undefined) line.addons = req.body.addons || [];
    if (req.body.couponCode !== undefined) cart.couponCode = req.body.couponCode ? String(req.body.couponCode).toUpperCase() : null;
    if (req.body.tip !== undefined) cart.tip = Math.max(0, Math.min(500, Number(req.body.tip) || 0));
    if (req.body.redeemPoints !== undefined) cart.redeemPoints = Math.max(0, Math.floor(Number(req.body.redeemPoints) || 0));
    await cart.save();
    return ok(res, await serialise(cart, req.user));
  })
);

router.delete(
  '/:itemId',
  asyncHandler(async (req, res) => {
    const cart = await loadCart(req.user);
    cart.items = cart.items.filter((entry) => String(entry.seedId) !== String(req.params.itemId));
    if (!cart.items.length) {
      cart.cartType = constants.CART_TYPES.STORE;
      cart.restaurantId = null;
      cart.couponCode = null;
    }
    await cart.save();
    return ok(res, await serialise(cart, req.user));
  })
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await loadCart(req.user);
    cart.items = [];
    cart.saved = [];
    cart.cartType = constants.CART_TYPES.STORE;
    cart.restaurantId = null;
    cart.couponCode = null;
    cart.tip = 0;
    cart.redeemPoints = 0;
    await cart.save();
    return ok(res, await serialise(cart, req.user));
  })
);

/** Merge a guest cart into the account cart on sign-in (quantities combine). */
router.post(
  '/merge',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const items = (req.body || {}).items || [];
    const cart = await loadCart(req.user);
    const settings = await settingsService.get();
    const ids = items.map((line) => String(line.itemId));
    const docs = ids.length ? await Product.find({ seedId: { $in: ids } }).lean() : [];
    const byId = new Map(docs.map((doc) => [doc.seedId, doc]));
    const skipped = [];
    let merged = 0;

    items.forEach((line) => {
      const product = byId.get(String(line.itemId));
      if (!product || product.active === false || product.stock <= 0) {
        skipped.push({ itemId: line.itemId, reason: 'unavailable' });
        return;
      }
      const target = product.type === 'menu-item' ? constants.CART_TYPES.RESTAURANT : constants.CART_TYPES.STORE;
      if (cart.items.length && cart.cartType !== target) {
        skipped.push({ itemId: line.itemId, reason: 'cart-type-conflict' });
        return;
      }
      const existing = cart.items.find((entry) => String(entry.seedId) === product.seedId);
      const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
      const cap = Math.min(product.stock, settings.maxQuantityPerItem || 10);
      if (existing) existing.qty = Math.min(existing.qty + qty, cap);
      else cart.items.push({ product: product._id, seedId: product.seedId, qty: Math.min(qty, cap), addons: line.addons || [], selection: line.selection || null });
      cart.cartType = target;
      if (product.type === 'menu-item') cart.restaurantId = product.restaurantId || cart.restaurantId;
      merged += 1;
    });

    await cart.save();
    return ok(res, Object.assign(await serialise(cart, req.user), { merged, skipped }));
  })
);

module.exports = router;

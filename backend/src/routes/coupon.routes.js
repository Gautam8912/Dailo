/**
 * /api/coupons — public list and validation against the real cart.
 */
'use strict';

const express = require('express');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const catalog = require('../services/catalog.service');
const { optionalAuth } = require('../middleware/auth');
const { requireDatabase } = require('../utils/dbGuard');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { constants, pricing } = require('../services/shared');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => ok(res, await catalog.listCoupons())));

router.post(
  '/validate',
  requireDatabase,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const code = String((req.body || {}).code || '').trim().toUpperCase();
    const coupon = await catalog.getCoupon(code);
    if (!coupon) return ok(res, { ok: false, code, reason: 'We could not find the code ' + code + '.' });

    let items = (req.body || {}).items || [];
    let cartType = (req.body || {}).cartType || constants.CART_TYPES.STORE;
    let restaurantId = (req.body || {}).restaurantId || null;

    if (req.user && (!items.length || items[0].unitPrice === undefined)) {
      const cart = await Cart.findOne({ user: req.user._id }).lean();
      if (cart && cart.items.length) {
        const docs = await catalog.findProductsBySeedIds(cart.items.map((line) => line.seedId));
        const byId = new Map(docs.map((doc) => [doc.seedId, doc]));
        items = cart.items.map((line) => {
          const product = byId.get(line.seedId);
          return {
            itemId: line.seedId,
            unitPrice: product ? product.price : 0,
            qty: line.qty,
            categoryId: product ? product.categoryId : null,
          };
        });
        cartType = cart.cartType;
        restaurantId = cart.restaurantId;
      }
    }

    const eligibleSubtotal = items.reduce((sum, line) => sum + (Number(line.unitPrice) || 0) * (Number(line.qty) || 0), 0);
    let orderCount = 0;
    let couponUses = {};
    let isNewUser = true;
    if (req.user) {
      orderCount = await Order.countDocuments({ user: req.user._id, status: { $ne: constants.CANCELLED } });
      isNewUser = orderCount === 0;
      const used = await Order.aggregate([
        { $match: { user: req.user._id, couponCode: { $ne: null }, status: { $ne: constants.CANCELLED } } },
        { $group: { _id: '$couponCode', count: { $sum: 1 } } },
      ]);
      couponUses = used.reduce((acc, row) => Object.assign(acc, { [row._id]: row.count }), {});
    }

    const check = pricing.validateCoupon(coupon, {
      items,
      eligibleSubtotal,
      cartType,
      restaurantId,
      orderCount,
      couponUses,
      isNewUser,
    });
    const discount = check.ok ? pricing.couponDiscountValue(coupon, eligibleSubtotal) : 0;
    return ok(res, Object.assign({}, check, { code: coupon.code, eligibleSubtotal, discount: Math.round(discount) }));
  })
);

module.exports = router;

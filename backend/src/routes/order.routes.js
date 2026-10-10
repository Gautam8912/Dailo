/**
 * /api/orders — placement, history, tracking, cancellation and reorder.
 */
'use strict';

const express = require('express');
const Address = require('../models/Address');
const orders = require('../services/order.service');
const { protect, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { ApiError } = require('../utils/ApiError');
const { constants } = require('../services/shared');

const router = express.Router();

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (req.user) return ok(res, await orders.listFor(req.user, req.query));
    const phone = String((req.query && req.query.phone) || '').replace(/\D/g, '');
    if (!phone) throw ApiError.unauthorized('Sign in to see your orders, or pass the phone number used at checkout.', { code: 'NO_SESSION' });
    return ok(res, await orders.listFor(null, { phone }));
  })
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (req.user) return ok(res, await orders.getForUser(req.user, req.params.id));
    const order = await orders.getForAdmin(req.params.id);
    const phone = String((req.query && req.query.phone) || '').replace(/\D/g, '');
    if (!order.guest || !phone || order.guest.phone !== phone) {
      throw ApiError.unauthorized('Sign in to open this order.', { code: 'NO_SESSION' });
    }
    return ok(res, order);
  })
);

router.post(
  '/',
  protect,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    let address = body.address || null;
    if (body.addressId) {
      const doc = await Address.findOne({ _id: body.addressId, user: req.user._id });
      if (!doc) throw ApiError.notFound('That address is not saved on your account.', { code: 'ADDRESS_NOT_FOUND' });
      address = doc.toClient();
    }
    if (!address) {
      const fallback = await Address.findOne({ user: req.user._id, isDefault: true });
      if (!fallback) throw ApiError.badRequest('Add a delivery address to place the order.', { code: 'ADDRESS_REQUIRED' });
      address = fallback.toClient();
    }

    const result = await orders.place({
      user: req.user,
      items: body.items,
      address,
      cartType: body.cartType,
      restaurantId: body.restaurantId,
      couponCode: body.couponCode,
      paymentMethod: body.paymentMethod || constants.PAYMENT_METHODS.DEMO,
      deliverySlot: body.deliverySlot,
      tip: body.tip,
      redeemPoints: body.redeemPoints,
      notes: body.notes,
      idempotencyKey: body.idempotencyKey || req.headers['idempotency-key'] || null,
    });

    return result.duplicate ? ok(res, result.order, { duplicate: true }) : created(res, result.order, { warnings: result.warnings });
  })
);

router.post(
  '/:id/cancel',
  protect,
  writeLimiter,
  asyncHandler(async (req, res) => ok(res, await orders.cancel(req.params.id, (req.body || {}).reason, req.user)))
);

router.post(
  '/:id/reorder',
  protect,
  writeLimiter,
  asyncHandler(async (req, res) => ok(res, await orders.reorder(req.params.id, req.user)))
);

/**
 * Advance an order one step along its own flow. This is the simulated
 * fulfilment used by the demo build — no courier or kitchen system is
 * integrated, and the response says so.
 */
router.post(
  '/:id/simulate',
  protect,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const current = await orders.getForUser(req.user, req.params.id);
    if (current.status === constants.CANCELLED) {
      throw ApiError.unprocessable('A cancelled order cannot progress.', { code: 'ORDER_CANCELLED' });
    }
    const flow = current.flow && current.flow.length ? current.flow : constants.orderFlowFor(current.cartType);
    const index = flow.indexOf(current.status);
    if (index === -1 || index >= flow.length - 1) {
      throw ApiError.unprocessable('This order has already reached its final status.', { code: 'FLOW_COMPLETE', status: current.status });
    }
    const next = flow[index + 1];
    const updated = await orders.setStatus(current.id, next, { note: 'Simulated progression', by: 'simulation' });
    return ok(res, Object.assign(updated, { simulated: true, note: 'Status progression is simulated in this build.' }));
  })
);

module.exports = router;

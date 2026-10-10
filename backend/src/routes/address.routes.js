/**
 * /api/addresses — saved delivery addresses (one default per user).
 */
'use strict';

const express = require('express');
const Address = require('../models/Address');
const { protect } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { ApiError } = require('../utils/ApiError');
const settingsService = require('../services/settings.service');
const { locations } = require('../services/shared');

const router = express.Router();
router.use(protect);

function serviceability(address) {
  const cfg = settingsService.peek();
  const city = locations.getCity(address.cityId);
  if (!city) return { known: false, serviceable: false, coverage: null };
  return {
    known: true,
    serviceable: settingsService.isServiceable(cfg, address.cityId),
    coverage: settingsService.coverageFor(cfg, address.cityId),
    deliveryFee: settingsService.deliveryFeeFor(cfg, address.cityId),
    cityName: city.name,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const docs = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    return ok(res, docs.map((doc) => Object.assign(doc.toClient(), { serviceability: serviceability(doc) })));
  })
);

router.post(
  '/',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    if (!locations.getCity(body.cityId)) {
      throw ApiError.badRequest('We do not have that city configured.', { code: 'UNKNOWN_CITY', cityId: body.cityId });
    }
    const count = await Address.countDocuments({ user: req.user._id });
    const address = await Address.create({
      user: req.user._id,
      label: body.label || 'Home',
      type: body.type || 'home',
      receiver: body.receiver || req.user.name,
      phone: String(body.phone || req.user.phone || '').replace(/\D/g, ''),
      line1: body.line1,
      line2: body.line2 || '',
      landmark: body.landmark || '',
      cityId: body.cityId,
      localityId: body.localityId || null,
      pincode: String(body.pincode || ''),
      isDefault: body.isDefault === undefined ? count === 0 : Boolean(body.isDefault),
    });
    return created(res, Object.assign(address.toClient(), { serviceability: serviceability(address) }));
  })
);

router.put(
  '/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) throw ApiError.notFound('That address does not exist.', { code: 'ADDRESS_NOT_FOUND' });
    const body = req.body || {};
    ['label', 'type', 'receiver', 'line1', 'line2', 'landmark', 'cityId', 'localityId', 'pincode'].forEach((key) => {
      if (body[key] !== undefined) address[key] = body[key];
    });
    if (body.phone !== undefined) address.phone = String(body.phone).replace(/\D/g, '');
    if (body.cityId && !locations.getCity(body.cityId)) throw ApiError.badRequest('We do not have that city configured.', { code: 'UNKNOWN_CITY' });
    if (body.isDefault !== undefined) address.isDefault = Boolean(body.isDefault);
    await address.save();
    return ok(res, Object.assign(address.toClient(), { serviceability: serviceability(address) }));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!address) throw ApiError.notFound('That address does not exist.', { code: 'ADDRESS_NOT_FOUND' });
    if (address.isDefault) {
      const next = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }
    return ok(res, { ok: true, id: String(address._id) });
  })
);

module.exports = router;

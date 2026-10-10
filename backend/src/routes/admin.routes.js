/**
 * /api/admin — the privileged surface.
 *
 * Every route here passes `protect` (valid JWT) AND `requireRole('admin')`.
 * Hiding the admin button in the storefront is a UX detail, not a control.
 */
'use strict';

const express = require('express');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Restaurant = require('../models/Restaurant');
const Coupon = require('../models/Coupon');
const AppSetting = require('../models/AppSetting');
const SupportTicket = require('../models/SupportTicket');

const catalog = require('../services/catalog.service');
const orders = require('../services/order.service');
const settingsService = require('../services/settings.service');
const notifications = require('../services/notification.service');

const { protect, requireRole } = require('../middleware/auth');
const { requireDatabase } = require('../utils/dbGuard');
const { writeLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paged } = require('../utils/respond');
const { ApiError } = require('../utils/ApiError');
const { constants, locations } = require('../services/shared');

const router = express.Router();
router.use(protect, requireRole(constants.ROLES.ADMIN), requireDatabase);

/* ------------------------------------------------------------- analytics */

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const cfg = await settingsService.get();
    const [summary, tickets, restaurants, menuItems, categories, recent] = await Promise.all([
      orders.stats(),
      SupportTicket.countDocuments({ status: { $in: ['open', 'pending'] } }),
      Restaurant.countDocuments({}),
      Product.countDocuments({ type: 'menu-item' }),
      Product.countDocuments({ type: 'product' }),
      Order.find({}).sort({ createdAt: -1 }).limit(8).lean(),
    ]);
    const lowStockItems = await catalog.lowStock(cfg.lowStockThreshold);
    return ok(res, {
      users: summary.users,
      products: categories,
      menuItems,
      restaurants,
      orders: summary.orders,
      revenue: summary.revenue,
      byStatus: summary.byStatus,
      lowStock: summary.lowStock,
      outOfStock: await Product.countDocuments({ stock: 0 }),
      lowStockItems: lowStockItems.slice(0, 20),
      coupons: await Coupon.countDocuments({}),
      openTickets: tickets,
      settings: { freeDeliveryThreshold: cfg.freeDeliveryThreshold, deliveryFee: cfg.deliveryFee, lowStockThreshold: cfg.lowStockThreshold },
      recentOrders: recent.map(orders.toClient),
      simulated: true,
    });
  })
);

/* ------------------------------------------------------------------ users */

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const page = Math.max(1, Number(req.query.page) || 1);
    const filter = {};
    if (req.query.q) {
      const term = String(req.query.q).trim();
      filter.$or = [{ name: { $regex: term, $options: 'i' } }, { email: { $regex: term, $options: 'i' } }, { phone: term.replace(/\D/g, '') }];
    }
    if (req.query.role) filter.role = String(req.query.role);
    const [docs, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);
    const withOrders = await Promise.all(
      docs.map(async (user) => {
        const [orderCount, spend] = await Promise.all([
          Order.countDocuments({ user: user._id }),
          Order.aggregate([{ $match: { user: user._id, status: { $ne: constants.CANCELLED } } }, { $group: { _id: null, total: { $sum: '$totals.grandTotal' } } }]),
        ]);
        return Object.assign(user.toPublic(), { orders: orderCount, spend: spend.length ? Math.round(spend[0].total) : 0 });
      })
    );
    return res.json({ success: true, data: withOrders, meta: { total, page, pages: Math.max(1, Math.ceil(total / limit)), limit } });
  })
);

router.put(
  '/users/:id/role',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const role = String((req.body || {}).role || '');
    if (!Object.values(constants.ROLES).includes(role)) {
      throw ApiError.badRequest('Choose a valid role.', { code: 'INVALID_ROLE', allowed: Object.values(constants.ROLES) });
    }
    if (String(req.params.id) === String(req.user._id) && role !== constants.ROLES.ADMIN) {
      throw ApiError.badRequest('You cannot remove your own administrator role.', { code: 'SELF_DEMOTION' });
    }
    const user = await User.findById(req.params.id);
    if (!user) throw ApiError.notFound('That account does not exist.');
    user.role = role;
    await user.save();
    return ok(res, user.toPublic());
  })
);

/* ----------------------------------------------------------------- orders */

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = String(req.query.status).toUpperCase();
    if (req.query.cartType) filter.cartType = String(req.query.cartType);
    if (req.query.q) filter.orderNumber = { $regex: String(req.query.q).trim(), $options: 'i' };
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const page = Math.max(1, Number(req.query.page) || 1);
    const [docs, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);
    return res.json({ success: true, data: docs.map(orders.toClient), meta: { total, page, pages: Math.max(1, Math.ceil(total / limit)), limit } });
  })
);

router.put(
  '/orders/:id/status',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const status = String((req.body || {}).status || '').toUpperCase();
    if (!constants.ORDER_STATUS_LABELS[status]) throw ApiError.badRequest('That is not a known order status.', { code: 'INVALID_STATUS', allowed: Object.keys(constants.ORDER_STATUS_LABELS) });
    const updated = await orders.setStatus(req.params.id, status, { note: (req.body || {}).note || 'Updated by admin', by: 'admin' });
    return ok(res, updated);
  })
);

router.post(
  '/orders/:id/cancel',
  writeLimiter,
  asyncHandler(async (req, res) => ok(res, await orders.cancel(req.params.id, (req.body || {}).reason || 'Cancelled by admin', req.user)))
);

/* ------------------------------------------------------- products & stock */

router.get(
  '/products',
  asyncHandler(async (req, res) => paged(res, await catalog.listProducts(Object.assign({}, req.query, { limit: Math.min(Number(req.query.limit) || 100, 500) }))))
);

router.post(
  '/products',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const saved = await catalog.saveProduct(req.body || {}, req.user);
    return res.status(201).json({ success: true, data: saved });
  })
);

router.put(
  '/products/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = Object.assign({}, req.body, { seedId: req.params.id });
    return ok(res, await catalog.saveProduct(body, req.user));
  })
);

router.delete(
  '/products/:id',
  writeLimiter,
  asyncHandler(async (req, res) => ok(res, await catalog.deleteProduct(req.params.id)))
);

/* -------------------------------------------------------------- restaurants */

router.get(
  '/restaurants',
  asyncHandler(async (req, res) => ok(res, await catalog.listRestaurants(req.query)))
);

router.put(
  '/restaurants/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const key = String(req.params.id).replace(/^r-/, '').toLowerCase();
    const doc = await Restaurant.findOne({ $or: [{ slug: key }, { restaurantId: 'r-' + key }, { restaurantId: key }] });
    if (!doc) throw ApiError.notFound('That restaurant does not exist.');
    ['name', 'cuisines', 'pureVeg', 'cityIds', 'area', 'etaMinutes', 'minOrder', 'deliveryFee', 'packingFee', 'emoji', 'promoted', 'offers', 'blurb', 'sections', 'active', 'rating'].forEach((field) => {
      if ((req.body || {})[field] !== undefined) doc[field] = req.body[field];
    });
    await doc.save();
    return ok(res, Object.assign(doc.toObject(), { id: doc.restaurantId }));
  })
);

/* ---------------------------------------------------------------- coupons */

router.get('/coupons', asyncHandler(async (req, res) => ok(res, await catalog.listCoupons())));

router.post(
  '/coupons',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = Object.assign({}, req.body);
    body.code = String(body.code || '').trim().toUpperCase();
    const existing = await Coupon.findOne({ code: body.code });
    if (existing) {
      Object.assign(existing, body);
      await existing.save();
      return ok(res, existing.toClient());
    }
    const created = await Coupon.create(body);
    return res.status(201).json({ success: true, data: created.toClient() });
  })
);

router.delete(
  '/coupons/:code',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const code = String(req.params.code).toUpperCase();
    const doc = await Coupon.findOne({ code });
    if (!doc) throw ApiError.notFound('That coupon does not exist.');
    doc.active = false;
    await doc.save();
    return ok(res, { ok: true, code, active: false });
  })
);

/* --------------------------------------------------------------- settings */

router.get('/settings', asyncHandler(async (req, res) => ok(res, await settingsService.get({ force: true }))));

router.put(
  '/settings',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const patch = req.body || {};
    const guarded = ['freeDeliveryThreshold', 'deliveryFee', 'packingFee', 'smallOrderFee', 'smallOrderFeeBelow', 'minOrderValue', 'lowStockThreshold', 'maxQuantityPerItem'];
    guarded.forEach((key) => {
      if (patch[key] !== undefined && (Number.isNaN(Number(patch[key])) || Number(patch[key]) < 0)) {
        throw ApiError.badRequest(key + ' must be a number of 0 or more.', { code: 'INVALID_SETTING', field: key });
      }
    });
    ['loyalty', 'features', 'tipOptions', 'autoOffers'].forEach((key) => {
      if (patch[key] !== undefined && (patch[key] === null || typeof patch[key] !== 'object')) {
        throw ApiError.badRequest(key + ' must be an object or list.', { code: 'INVALID_SETTING', field: key });
      }
    });
    const next = await settingsService.save(patch, req.user);
    await notifications.push({
      user: null,
      kind: constants.NOTIFICATION_KINDS.PROMO,
      title: 'Delivery settings updated',
      message: 'Free delivery now unlocks at ₹' + next.freeDeliveryThreshold + ' with a ₹' + next.deliveryFee + ' standard fee.',
    }).catch(() => null);
    return ok(res, next);
  })
);

router.post(
  '/settings/reset',
  writeLimiter,
  asyncHandler(async (req, res) => ok(res, await settingsService.reset(req.user)))
);

/* ------------------------------------------------- cities, zones & coverage */

router.get(
  '/zones',
  asyncHandler(async (req, res) => {
    const cfg = await settingsService.get();
    return ok(
      res,
      locations.CITIES.map((city) => ({
        id: city.id,
        name: city.name,
        state: city.state,
        coverage: settingsService.coverageFor(cfg, city.id),
        coverageLabel: locations.COVERAGE_LABELS[settingsService.coverageFor(cfg, city.id)],
        deliveryFee: settingsService.deliveryFeeFor(cfg, city.id),
        seededDeliveryFee: city.deliveryFee,
        etaMinutes: city.etaMinutes,
        overridden: Boolean((cfg.cityCoverage || {})[city.id] || typeof (cfg.cityDeliveryFee || {})[city.id] === 'number'),
        localities: city.localities.map((locality) => ({ id: locality.id, name: locality.name, pin: locality.pin })),
        restaurants: city.restaurantCount || 0,
      }))
    );
  })
);

router.post(
  '/zones',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const cityId = String(body.cityId || body.id || '');
    if (!locations.getCity(cityId)) throw ApiError.badRequest('That city is not configured.', { code: 'UNKNOWN_CITY', cityId });
    const cfg = await settingsService.get();
    const cityCoverage = Object.assign({}, cfg.cityCoverage || {});
    const cityDeliveryFee = Object.assign({}, cfg.cityDeliveryFee || {});
    if (body.coverage) {
      if (!Object.values(constants.COVERAGE).includes(body.coverage)) {
        throw ApiError.badRequest('That coverage value is not recognised.', { code: 'INVALID_COVERAGE', allowed: Object.values(constants.COVERAGE) });
      }
      cityCoverage[cityId] = body.coverage;
    }
    if (body.deliveryFee !== undefined) {
      const fee = Number(body.deliveryFee);
      if (Number.isNaN(fee) || fee < 0) throw ApiError.badRequest('The delivery fee must be 0 or more.', { code: 'INVALID_FEE' });
      cityDeliveryFee[cityId] = Math.round(fee);
    }
    const next = await settingsService.save({ cityCoverage, cityDeliveryFee }, req.user);
    return ok(res, { cityId, coverage: settingsService.coverageFor(next, cityId), deliveryFee: settingsService.deliveryFeeFor(next, cityId) });
  })
);

/* ----------------------------------------------------------------- tickets */

router.get(
  '/tickets',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status);
    const docs = await SupportTicket.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return ok(res, docs);
  })
);

router.put(
  '/tickets/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const doc = await SupportTicket.findById(req.params.id);
    if (!doc) throw ApiError.notFound('That ticket does not exist.');
    if ((req.body || {}).status) doc.status = String(req.body.status);
    if ((req.body || {}).reply) doc.replies.push({ by: 'team', message: String(req.body.reply).slice(0, 2000), at: new Date() });
    await doc.save();
    if (doc.user) {
      await notifications
        .push({ user: doc.user, kind: constants.NOTIFICATION_KINDS.SUPPORT, title: 'Update on ticket ' + doc.ticketNumber, message: String((req.body || {}).reply || 'Status changed to ' + doc.status), href: 'support.html' })
        .catch(() => null);
    }
    return ok(res, doc.toObject());
  })
);

module.exports = router;

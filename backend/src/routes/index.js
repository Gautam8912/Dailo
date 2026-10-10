/**
 * /api — route table.
 *
 * Mounted endpoints match js/backend-integration.js exactly, so switching the
 * storefront from demo mode to backend mode needs no client changes.
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { env } = require('../config/env');
const { isConnected } = require('../config/db');
const { requireDatabase } = require('../utils/dbGuard');
const { apiLimiter } = require('../middleware/rateLimit');
const { optionalAuth } = require('../middleware/auth');
const settingsService = require('../services/settings.service');
const catalog = require('../services/catalog.service');
const { constants, catalog: seedCatalog, restaurants: seedRestaurants, settings: sharedSettings, coupons: seedCoupons } = require('../services/shared');

const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');
const cartRoutes = require('./cart.routes');
const wishlistRoutes = require('./wishlist.routes');
const addressRoutes = require('./address.routes');
const orderRoutes = require('./order.routes');
const couponRoutes = require('./coupon.routes');
const notificationRoutes = require('./notification.routes');
const supportRoutes = require('./support.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

/** Liveness + capability probe used by the storefront to pick its mode. */
router.get('/health', optionalAuth, async (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
  const cfg = settingsService.peek();
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'food-express-api',
      version: '3.0.0',
      environment: env.nodeEnv,
      time: new Date().toISOString(),
      database: dbState,
      connected: isConnected(),
      authenticated: Boolean(req.user),
      role: req.user ? req.user.role : null,
      mode: isConnected() ? 'backend' : 'demo',
      capabilities: {
        demoPayments: true,
        codPayments: true,
        gatewayPayments: env.payments.gatewayConfigured,
        emailResets: env.smtp.enabled,
        liveGpsTracking: false,
        reviews: false,
        simulatedOrderProgress: true,
      },
      settings: {
        currency: cfg.currency,
        freeDeliveryThreshold: cfg.freeDeliveryThreshold,
        deliveryFee: cfg.deliveryFee,
        packingFee: cfg.packingFee,
        lowStockThreshold: cfg.lowStockThreshold,
      },
      catalogue: {
        products: isConnected() ? null : seedCatalog.PRODUCTS.length,
        restaurants: isConnected() ? null : seedRestaurants.RESTAURANTS.length,
        menuItems: isConnected() ? null : seedRestaurants.MENU_ITEMS.length,
      },
      notice: isConnected()
        ? 'Serving persisted data from MongoDB.'
        : 'MongoDB is not connected: the API answers health checks only, and the storefront keeps working in local demo mode.',
    },
  });
});

router.use(apiLimiter);

// Public catalogue reads work without a database connection by falling back to
// the seeded shared data, so the storefront never loses its catalogue.
router.get('/products', async (req, res, next) => {
  if (isConnected()) return next();
  const result = catalogFallback.listProducts(req.query);
  res.json({ success: true, data: result.data, meta: { total: result.total, page: result.page, pages: result.pages, limit: result.limit, source: 'seed' } });
});
router.get('/products/:id', async (req, res, next) => {
  if (isConnected()) return next();
  const product = catalogFallback.getProduct(req.params.id);
  if (!product) return res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'We could not find that product.' });
  res.json({ success: true, data: Object.assign({}, product, { related: catalogFallback.related(product) }) });
});
router.get('/categories', async (req, res, next) => {
  if (isConnected()) return next();
  res.json({ success: true, data: catalogFallback.categories(), meta: { source: 'seed' } });
});
router.get('/restaurants', async (req, res, next) => {
  if (isConnected()) return next();
  res.json({ success: true, data: catalogFallback.restaurants(req.query), meta: { source: 'seed' } });
});
router.get('/restaurants/:id', async (req, res, next) => {
  if (isConnected()) return next();
  const restaurant = catalogFallback.restaurant(req.params.id);
  if (!restaurant) return res.status(404).json({ success: false, error: 'RESTAURANT_NOT_FOUND', message: 'We could not find that restaurant.' });
  res.json({ success: true, data: restaurant });
});
router.get('/search', async (req, res, next) => {
  if (isConnected()) return next();
  const q = String(req.query.q || '').trim().toLowerCase();
  const pool = seedCatalog.PRODUCTS.concat(seedRestaurants.MENU_ITEMS);
  const matches = q
    ? pool.filter((item) => [item.name, item.brand, item.categoryName, (item.tags || []).join(' ')].join(' ').toLowerCase().includes(q))
    : pool;
  const limit = Math.min(Number(req.query.limit) || 40, 200);
  const products = matches.filter((item) => item.type !== 'menu-item').slice(0, limit);
  const dishes = matches.filter((item) => item.type === 'menu-item').slice(0, limit);
  res.json({
    success: true,
    data: {
      products,
      dishes,
      facets: {
        categories: Array.from(new Set(products.map((item) => item.categoryId))),
        brands: Array.from(new Set(products.map((item) => item.brand).filter(Boolean))),
        priceRange: products.length ? { min: Math.min(...products.map((item) => item.price)), max: Math.max(...products.map((item) => item.price)) } : { min: 0, max: 0 },
        inStock: products.filter((item) => item.stock > 0).length,
        onDiscount: products.filter((item) => item.discountPercent > 0).length,
      },
    },
    meta: { total: products.length + dishes.length, source: 'seed' },
  });
});
router.get('/coupons', async (req, res, next) => {
  if (isConnected()) return next();
  res.json({ success: true, data: seedCoupons.COUPONS, meta: { source: 'seed', notice: 'Seeded demo coupons — served without a database connection.' } });
});
router.get('/settings/public', async (req, res, next) => {
  if (isConnected()) return next();
  res.json({
    success: true,
    data: {
      settings: sharedSettings.withSettings(sharedSettings.DEFAULT_SETTINGS),
      source: 'seed',
      deliverySlots: constants.DELIVERY_SLOTS,
      orderFlow: { store: constants.STORE_ORDER_FLOW, restaurant: constants.RESTAURANT_ORDER_FLOW },
    },
  });
});

// Everything below needs MongoDB.
router.use('/auth', requireDatabase, authRoutes);
router.use('/cart', requireDatabase, cartRoutes);
router.use('/wishlist', requireDatabase, wishlistRoutes);
router.use('/addresses', requireDatabase, addressRoutes);
router.use('/orders', requireDatabase, orderRoutes);
router.use('/notifications', requireDatabase, notificationRoutes);
router.use('/admin', adminRoutes); // auth + role are enforced inside, then the DB guard
router.use('/coupons', couponRoutes);
router.use('/support', supportRoutes);
router.use('/', catalogRoutes);

/** Seed-data fallback used when MongoDB is not connected. */
const catalogFallback = {
  listProducts(query) {
    const q = query || {};
    let items = seedCatalog.PRODUCTS.concat(seedRestaurants.MENU_ITEMS);
    if (q.type) items = items.filter((item) => item.type === q.type);
    if (q.category) items = items.filter((item) => item.categoryId === q.category);
    if (q.restaurantId) items = items.filter((item) => String(item.restaurantId || '').replace(/^r-/, '') === String(q.restaurantId).replace(/^r-/, ''));
    if (q.q) {
      const term = String(q.q).toLowerCase();
      items = items.filter((item) => [item.name, item.brand, (item.tags || []).join(' ')].join(' ').toLowerCase().includes(term));
    }
    if (q.inStock === 'true') items = items.filter((item) => item.stock > 0);
    const limit = Math.min(Number(q.limit) || 60, 500);
    const page = Math.max(1, Number(q.page) || 1);
    const sorted = sortItems(items, q.sort);
    return { data: sorted.slice((page - 1) * limit, page * limit), total: sorted.length, page, pages: Math.max(1, Math.ceil(sorted.length / limit)), limit };
  },
  getProduct(id) {
    const all = seedCatalog.PRODUCTS.concat(seedRestaurants.MENU_ITEMS);
    return all.find((item) => item.id === id || item.slug === id) || null;
  },
  related(product) {
    return seedCatalog
      .relatedProducts(product, 8)
      .map((item) => item);
  },
  categories() {
    return seedCatalog.CATEGORIES.map((category) => Object.assign({}, category, { id: category.id }));
  },
  restaurants(query) {
    let items = seedRestaurants.RESTAURANTS;
    if (query && query.cityId) items = items.filter((restaurant) => restaurant.cityIds.includes(query.cityId));
    if (query && query.q) {
      const term = String(query.q).toLowerCase();
      items = items.filter((restaurant) => [restaurant.name, restaurant.area, restaurant.cuisines.join(' ')].join(' ').toLowerCase().includes(term));
    }
    return items;
  },
  restaurant(idOrSlug) {
    return seedRestaurants.getRestaurant(idOrSlug);
  },
};

function sortItems(items, sort) {
  const copy = items.slice();
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating);
    case 'discount':
      return copy.sort((a, b) => b.discountPercent - a.discountPercent);
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy.sort((a, b) => b.popularity - a.popularity);
  }
}

module.exports = { router, catalogFallback };

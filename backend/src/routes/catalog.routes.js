/**
 * /api — public catalogue: products, categories, restaurants, search, settings.
 */
'use strict';

const express = require('express');
const catalog = require('../services/catalog.service');
const settingsService = require('../services/settings.service');
const pricingService = require('../services/pricing.service');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paged } = require('../utils/respond');
const { locations, constants, catalog: seedCatalog } = require('../services/shared');

const router = express.Router();

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const result = await catalog.listProducts(req.query);
    return paged(res, result);
  })
);

router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await catalog.getProduct(req.params.id);
    const related = await catalog.listProducts({ category: product.categoryId, limit: 8, sort: 'popularity' });
    return ok(res, Object.assign({}, product, { related: related.data.filter((item) => item.id !== product.id) }));
  })
);

router.get('/categories', asyncHandler(async (req, res) => ok(res, await catalog.listCategories())));

router.get(
  '/restaurants',
  asyncHandler(async (req, res) => ok(res, await catalog.listRestaurants(req.query)))
);

router.get(
  '/restaurants/:id',
  asyncHandler(async (req, res) => ok(res, await catalog.getRestaurant(req.params.id)))
);

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const query = Object.assign({}, req.query, { limit: Math.min(Number(req.query.limit) || 40, 200) });
    const [products, dishes] = await Promise.all([
      catalog.listProducts(Object.assign({}, query, { type: 'product' })),
      query.type === 'product' ? Promise.resolve({ data: [], total: 0, page: 1, pages: 1, limit: 0 }) : catalog.listProducts(Object.assign({}, query, { type: 'menu-item' })),
    ]);
    const facets = {
      categories: Array.from(new Set(products.data.map((item) => item.categoryId))),
      brands: Array.from(new Set(products.data.map((item) => item.brand).filter(Boolean))),
      priceRange: products.data.length
        ? { min: Math.min(...products.data.map((item) => item.price)), max: Math.max(...products.data.map((item) => item.price)) }
        : { min: 0, max: 0 },
      inStock: products.data.filter((item) => item.stock > 0).length,
      onDiscount: products.data.filter((item) => item.discountPercent > 0).length,
    };
    return ok(res, { products: products.data, dishes: dishes.data, facets }, { total: products.total + dishes.total, page: products.page, pages: products.pages });
  })
);

/** Public settings: what the storefront needs to price and label things. */
router.get(
  '/settings/public',
  asyncHandler(async (req, res) => {
    const cfg = await settingsService.get();
    return ok(res, {
      settings: cfg,
      coverage: locations.CITIES.map((city) => ({
        id: city.id,
        name: city.name,
        state: city.state,
        coverage: settingsService.coverageFor(cfg, city.id),
        deliveryFee: settingsService.deliveryFeeFor(cfg, city.id),
        etaMinutes: city.etaMinutes,
        localities: city.localities.length,
      })),
      coverageLabels: locations.COVERAGE_LABELS,
      deliverySlots: constants.DELIVERY_SLOTS,
      orderFlow: { store: constants.STORE_ORDER_FLOW, restaurant: constants.RESTAURANT_ORDER_FLOW },
      paymentMethods: constants.PAYMENT_METHODS,
      productCount: seedCatalog.PRODUCTS.length,
      disclaimer: cfg.disclaimer,
    });
  })
);

module.exports = router;

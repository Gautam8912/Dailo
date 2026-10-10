/**
 * Food Express — backend/tests/api.test.js
 *
 * Boots the real Express app on an ephemeral port (no MongoDB, no bound 5000)
 * and asserts the HTTP contract the storefront depends on:
 *
 *   - /api/health reports capabilities honestly (no gateway, no GPS, no reviews);
 *   - public catalogue reads keep working from the seeded shared data;
 *   - anything that needs persistence answers 503 DATABASE_UNAVAILABLE instead
 *     of inventing a result;
 *   - privileged routes demand a token before they reveal anything;
 *   - unknown routes 404 with the standard envelope.
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
  const { createApp } = require(path.join(ROOT, 'src/app'));
  const { constants } = require(path.join(ROOT, 'src/services/shared'));

  let server = null;
  let base = null;

  async function get(route) {
    const res = await fetch(base + route);
    return { status: res.status, body: await res.json().catch(() => null) };
  }

  async function post(route, payload, headers) {
    const res = await fetch(base + route, {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
      body: JSON.stringify(payload || {}),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  }

  test('API HTTP surface', async (t) => {
    await new Promise((resolve, reject) => {
      const app = createApp({ quiet: true });
      server = app.listen(0, '127.0.0.1', () => {
        base = 'http://127.0.0.1:' + server.address().port + '/api';
        resolve();
      });
      server.on('error', reject);
    });
    t.after(() => new Promise((resolve) => server.close(resolve)));

    await t.test('GET /health reports the truth about this deployment', async () => {
      const { status, body } = await get('/health');
      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'ok');
      assert.equal(body.data.database, 'disconnected', 'the database state is reported honestly');
      assert.equal(body.data.mode, 'demo');
      assert.equal(body.data.capabilities.gatewayPayments, false, 'no payment gateway is claimed');
      assert.equal(body.data.capabilities.liveGpsTracking, false, 'no live GPS tracking is claimed');
      assert.equal(body.data.capabilities.reviews, false, 'no review system is claimed');
      assert.equal(body.data.capabilities.simulatedOrderProgress, true, 'simulated fulfilment is declared');
      assert.equal(body.data.settings.freeDeliveryThreshold, 150);
      assert.match(body.data.notice, /not connected|demo mode/i);
    });

    await t.test('GET / serves a service description', async () => {
      const res = await fetch(base.replace('/api', '/'));
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.service, 'Food Express API');
      assert.match(body.data.notice, /not implemented/i, 'unimplemented capabilities are stated up front');
    });

    await t.test('public catalogue reads fall back to the seeded shared data', async () => {
      const products = await get('/products?limit=5');
      assert.equal(products.status, 200);
      assert.equal(products.body.meta.source, 'seed', 'the response says the data is seeded');
      assert.equal(products.body.data.length, 5);
      assert.ok(products.body.meta.total > 100, 'the full seeded catalogue is available (' + products.body.meta.total + ')');
      products.body.data.forEach((item) => {
        assert.ok(item.id && item.name && typeof item.price === 'number', 'each product carries id, name and price');
        assert.equal(item.reviewCount, 0, 'no fake review counts are served');
      });

      const detail = await get('/products/' + products.body.data[0].id);
      assert.equal(detail.status, 200);
      assert.equal(detail.body.data.id, products.body.data[0].id);
      assert.ok(Array.isArray(detail.body.data.related), 'related products are included');

      const missing = await get('/products/does-not-exist');
      assert.equal(missing.status, 404);
      assert.equal(missing.body.error, 'PRODUCT_NOT_FOUND');

      const categories = await get('/categories');
      assert.equal(categories.status, 200);
      assert.ok(categories.body.data.length >= 10, 'categories are served');

      const restaurants = await get('/restaurants');
      assert.equal(restaurants.status, 200);
      assert.ok(restaurants.body.data.length >= 5);
      assert.ok(restaurants.body.data[0].id.startsWith('r-'), 'restaurant ids keep their canonical prefix');

      const restaurant = await get('/restaurants/' + restaurants.body.data[0].id);
      assert.equal(restaurant.status, 200);
      assert.ok(Array.isArray(restaurant.body.data.menu), 'the restaurant payload includes its menu');
      assert.ok(restaurant.body.data.menu.length > 0);

      const search = await get('/search?q=dal');
      assert.equal(search.status, 200);
      assert.ok(search.body.data.products.length > 0, 'search returns matches');
      assert.ok(search.body.data.facets, 'search returns facets for the filter panel');

      const coupons = await get('/coupons');
      assert.equal(coupons.status, 200);
      assert.ok(coupons.body.data.length >= 5);
      assert.ok(coupons.body.data.every((coupon) => coupon.demo === true), 'seeded coupons are flagged as demos');

      const publicSettings = await get('/settings/public');
      assert.equal(publicSettings.status, 200);
      assert.equal(publicSettings.body.data.settings.freeDeliveryThreshold, 150);
      assert.deepEqual(publicSettings.body.data.deliverySlots.map((slot) => slot.id), constants.DELIVERY_SLOTS.map((slot) => slot.id));
    });

    await t.test('filtered and sorted catalogue queries behave', async () => {
      const byCategory = await get('/products?category=groceries&limit=5');
      assert.equal(byCategory.status, 200);
      byCategory.body.data.forEach((item) => assert.equal(item.categoryId, 'groceries'));

      const inStock = await get('/products?inStock=true&limit=5');
      assert.equal(inStock.status, 200);
      inStock.body.data.forEach((item) => assert.ok(item.stock > 0, 'only in-stock items are returned'));

      const cheap = await get('/products?sort=price-asc&limit=5');
      const prices = cheap.body.data.map((item) => item.price);
      assert.deepEqual(prices, prices.slice().sort((a, b) => a - b), 'price-asc sorting works');

      const paged = await get('/products?limit=3&page=2');
      assert.equal(paged.body.data.length, 3);
      assert.equal(paged.body.meta.page, 2);
      assert.ok(paged.body.meta.pages > 1, 'pagination metadata is returned');
    });

    await t.test('routes that need persistence answer 503 instead of inventing data', async () => {
      const login = await post('/auth/login', { email: 'user@test.com', password: 'user123' });
      assert.equal(login.status, 503);
      assert.equal(login.body.error, 'DATABASE_UNAVAILABLE');
      assert.match(login.body.message, /MONGO_URI|demo mode/i, 'the message tells the operator what to do');

      const register = await post('/auth/register', { name: 'Test', email: 't@example.com', password: 'Password123' });
      assert.equal(register.status, 503);

      const cart = await get('/cart');
      assert.equal(cart.status, 503);
      assert.equal(cart.body.error, 'DATABASE_UNAVAILABLE');

      const validate = await post('/coupons/validate', { code: 'SAVE10' });
      assert.equal(validate.status, 503, 'coupon validation needs order history');

      const ticket = await post('/support/tickets', { subject: 'Broken', message: 'Something is wrong here', contact: 'a@b.com' });
      assert.equal(ticket.status, 503);

      const tickets = await get('/support/tickets');
      assert.equal(tickets.status, 200, 'a guest ticket list is an honest empty list');
      assert.deepEqual(tickets.body.data, []);
    });

    await t.test('privileged routes require a token before revealing anything', async () => {
      const admin = await get('/admin/stats');
      assert.equal(admin.status, 401, 'the admin surface answers 401 first, not 503');
      assert.equal(admin.body.error, 'NO_TOKEN');
      assert.match(admin.body.message, /sign in/i);

      const adminProducts = await get('/admin/products');
      assert.equal(adminProducts.status, 401);

      const adminSettings = await get('/admin/settings');
      assert.equal(adminSettings.status, 401);

      const zones = await get('/admin/zones');
      assert.equal(zones.status, 401, 'city/zone configuration is admin-only');

      const users = await get('/admin/users');
      assert.equal(users.status, 401, 'the user list is admin-only');

      const forged = await get('/admin/stats');
      assert.equal(forged.status, 401);
    });

    await t.test('a malformed token is rejected before any database work', async () => {
      const res = await fetch(base + '/admin/stats', { headers: { authorization: 'Bearer not.a.real.token' } });
      const body = await res.json();
      assert.equal(res.status, 401, 'an invalid signature is refused outright');
      assert.equal(body.error, 'TOKEN_INVALID');
      assert.match(body.message, /not valid|expired/i);
    });

    await t.test('unknown routes return the standard 404 envelope', async () => {
      const { status, body } = await get('/definitely-not-a-route');
      assert.equal(status, 404);
      assert.equal(body.success, false);
      assert.equal(body.error, 'ROUTE_NOT_FOUND');
    });

    await t.test('oversized bodies are rejected', async () => {
      const res = await fetch(base + '/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'x'.repeat(400000), email: 'big@example.com', password: 'Password123' }),
      });
      assert.ok([400, 413, 422].includes(res.status), 'a huge payload is refused with ' + res.status);
    });

    await t.test('security headers are present', async () => {
      const res = await fetch(base + '/health');
      assert.ok(res.headers.get('content-type').includes('application/json'));
      assert.equal(res.headers.get('x-powered-by'), null, 'the server does not advertise its framework');
    });
  });
}

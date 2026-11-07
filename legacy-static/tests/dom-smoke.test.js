/**
 * Food Express — tests/dom-smoke.test.js
 *
 * Boots every generated page in a real DOM (jsdom) with all scripts enabled and
 * asserts that:
 *   1. no script throws while the page boots and renders;
 *   2. the shared chrome (header / footer / bottom nav) renders where the page
 *      contract asks for it, and is absent on the full-bleed auth pages;
 *   3. the page controller produced real content in its mount point;
 *   4. rendered text never contains the classic bug signatures
 *      ("undefined", "[object Object]", "NaN");
 *   5. route guards behave: protected pages redirect guests (and remember where
 *      to return), and the admin dashboard blocks non-admins with a visible
 *      "Access restricted" state instead of rendering;
 *   6. with a session seeded, the protected pages render their real content;
 *   7. every internal link and asset reference resolves to a file that exists.
 *
 * jsdom is a dev-only dependency. When it is not installed the suite reports a
 * single skipped test instead of failing, so `npm test` works with zero
 * dependencies installed.
 *
 * Run: npm test          (or: node --test tests/*.test.js)
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const C = require('../shared/constants.js');
const CATALOG = require('../shared/catalog.js');
const RESTAURANTS = require('../shared/restaurants.js');

let jsdom = null;
try {
  jsdom = require('jsdom');
} catch (err) {
  jsdom = null;
}

const FIRST_PRODUCT = CATALOG.PRODUCTS[0];
const FIRST_RESTAURANT = RESTAURANTS.RESTAURANTS[0];

const BUG_SIGNATURES = ['[object Object]', 'undefined', 'NaN'];
const NAVIGATION_ERROR = /Not implemented: navigation/i;

/** Page → what the controller must produce, and how the page is reached. */
const PAGES = [
  { file: 'index.html', mount: '#home-sections', minChildren: 8, chrome: true, label: 'home' },
  { file: 'product.html', query: '?id=' + FIRST_PRODUCT.id, mount: '#pdp-mount', minChildren: 1, chrome: true, mustContain: FIRST_PRODUCT.name, label: 'product (' + FIRST_PRODUCT.id + ')' },
  { file: 'category.html', query: '?cat=groceries', mount: '#cat-mount', minChildren: 1, chrome: true, label: 'category' },
  { file: 'category.html', query: '', mount: '#cat-mount', minChildren: 1, chrome: true, label: 'category directory (no cat param)' },
  { file: 'search.html', query: '?q=dal', mount: '#search-mount', minChildren: 1, chrome: true, label: 'search' },
  { file: 'restaurants.html', mount: '#restaurants-mount', minChildren: 1, chrome: true, label: 'restaurants' },
  { file: 'restaurant.html', query: '?id=' + FIRST_RESTAURANT.id, mount: '#restaurant-mount', minChildren: 2, chrome: true, label: 'restaurant menu' },
  { file: 'cart.html', mount: '#cart-mount', minChildren: 1, chrome: true, label: 'cart (empty state)' },
  { file: 'checkout.html', mount: '#checkout-mount', minChildren: 1, chrome: true, minText: 60, label: 'checkout (empty cart state)' },
  { file: 'order-success.html', mount: '#success-mount', minChildren: 1, chrome: true, minText: 60, label: 'order success (no order yet)' },
  { file: 'wishlist.html', mount: '#wishlist-mount', minChildren: 1, chrome: true, label: 'wishlist (empty state)' },
  { file: 'login.html', mount: '#auth-mount', minChildren: 1, chrome: false, label: 'login' },
  { file: 'register.html', mount: '#auth-mount', minChildren: 1, chrome: false, label: 'register' },
  { file: 'forgot-password.html', mount: '#auth-mount', minChildren: 1, chrome: false, minText: 120, label: 'forgot password' },
  { file: 'support.html', mount: '#page-mount', minChildren: 2, chrome: true, label: 'support' },
  { file: 'faq.html', mount: '#page-mount', minChildren: 2, chrome: true, label: 'faq' },
  { file: 'about.html', mount: '#page-mount', minChildren: 3, chrome: true, label: 'about' },
  { file: 'contact.html', mount: '#page-mount', minChildren: 2, chrome: true, label: 'contact' },
  { file: 'privacy.html', mount: '#page-mount', minChildren: 2, chrome: true, label: 'privacy' },
  { file: 'terms.html', mount: '#page-mount', minChildren: 2, chrome: true, label: 'terms' },
  { file: 'shipping.html', mount: '#page-mount', minChildren: 2, chrome: true, label: 'shipping' },
  { file: 'refunds.html', mount: '#page-mount', minChildren: 2, chrome: true, label: 'refunds' },
  { file: '404.html', mount: '#page-mount', minChildren: 1, chrome: true, label: '404' },
];

/** Protected pages: tested as a guest (guard) and with a seeded session. */
const PROTECTED_PAGES = [
  { file: 'orders.html', mount: '#orders-mount', minChildren: 1, requires: 'user', label: 'orders' },
  { file: 'order.html', mount: '#order-mount', minChildren: 1, requires: 'user', label: 'order details' },
  { file: 'account.html', mount: '#account-mount', minChildren: 2, requires: 'user', label: 'account' },
  { file: 'notifications.html', mount: '#page-mount', minChildren: 1, requires: 'user', label: 'notifications' },
  { file: 'admin.html', mount: '#page-mount', minChildren: 1, requires: 'admin', label: 'admin dashboard' },
];

const DEMO_USER = {
  id: 'u-test-customer',
  name: 'Test User',
  email: 'user@test.com',
  phone: '9000000002',
  role: C.ROLES.USER,
  emailVerified: false,
  phoneVerified: false,
  createdAt: new Date('2026-01-04T10:00:00.000Z').toISOString(),
};

const DEMO_ADMIN = Object.assign({}, DEMO_USER, {
  id: 'u-test-admin',
  name: 'Food Express Admin',
  email: 'admin@foodexpress.com',
  phone: '9000000001',
  role: C.ROLES.ADMIN,
});

/* ------------------------------------------------------------- jsdom setup */

function createLoader() {
  class LocalLoader extends jsdom.ResourceLoader {
    fetch(urlString) {
      let parsed;
      try {
        parsed = new URL(urlString);
      } catch (err) {
        return null;
      }
      if (!/^https?:$/.test(parsed.protocol)) return null;
      const relative = decodeURIComponent(parsed.pathname).replace(/^\/+/, '') || 'index.html';
      const absolute = path.join(ROOT, relative);
      if (!absolute.startsWith(ROOT)) return null;
      try {
        return Promise.resolve(fs.readFileSync(absolute));
      } catch (err) {
        return Promise.reject(new Error('Cannot load ' + relative + ': ' + err.message));
      }
    }
  }
  return new LocalLoader();
}

function installPolyfills(window) {
  if (!window.matchMedia) {
    window.matchMedia = function matchMedia(query) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; },
      };
    };
  }
  window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function scrollIntoView() {};
  window.scrollTo = window.scrollTo || function scrollTo() {};
  window.print = window.print || function print() {};
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:local';
    window.URL.revokeObjectURL = () => {};
  }
  if (!window.navigator.geolocation) {
    Object.defineProperty(window.navigator, 'geolocation', {
      value: { getCurrentPosition: (ok, fail) => fail && fail({ code: 1, message: 'denied' }), watchPosition: () => 0, clearWatch: () => {} },
      configurable: true,
    });
  }
  if (!window.navigator.clipboard) {
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
  }
}

/**
 * Load one page. `session` seeds localStorage before any script runs so the
 * store restores a signed-in profile exactly like a returning visitor.
 */
async function loadPage(entry, options) {
  const opts = options || {};
  const errors = [];
  const virtualConsole = new jsdom.VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    const message = error && error.message ? error.message : String(error);
    if (NAVIGATION_ERROR.test(message)) {
      errors.push({ kind: 'navigation', message });
      return;
    }
    errors.push({ kind: 'jsdomError', message });
  });
  virtualConsole.on('error', (...args) => {
    const text = args.map(String).join(' ');
    if (/Could not load/i.test(text)) return;
    errors.push({ kind: 'console.error', message: text });
  });

  const dom = await jsdom.JSDOM.fromFile(path.join(ROOT, entry.file), {
    runScripts: 'dangerously',
    resources: createLoader(),
    pretendToBeVisual: true,
    url: 'http://localhost/' + entry.file + (entry.query || ''),
    virtualConsole,
    beforeParse(window) {
      installPolyfills(window);
      try {
        // Skip the first-run welcome flow so the page under test is what renders.
        window.localStorage.setItem(C.STORAGE_KEYS.onboarding, 'true');
        if (opts.session) {
          // Demo mode only restores a session when the account still exists in
          // the local account list — seed both, exactly like a returning user.
          const account = Object.assign(
            { salt: 'test-salt', passwordHash: 'test-hash', resetToken: null, resetExpires: null, failedAttempts: 0 },
            opts.session
          );
          window.localStorage.setItem(C.STORAGE_KEYS.demoAccounts, JSON.stringify([account]));
          window.localStorage.setItem(C.STORAGE_KEYS.user, JSON.stringify(opts.session));
          window.localStorage.setItem(C.STORAGE_KEYS.token, JSON.stringify('demo.test-token'));
        }
      } catch (err) {
        errors.push({ kind: 'seed', message: 'could not seed localStorage: ' + err.message });
      }
      window.addEventListener('error', (event) => {
        errors.push({
          kind: 'window.onerror',
          message: event.error && event.error.stack ? event.error.stack.split('\n').slice(0, 4).join(' | ') : event.message,
        });
      });
      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        errors.push({
          kind: 'unhandledrejection',
          message: reason && reason.stack ? reason.stack.split('\n').slice(0, 4).join(' | ') : String(reason),
        });
      });
    },
  });

  const window = dom.window;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (window.FX && window.FX.app && window.FX.app.booted && window.FX.store && window.FX.store.state.ready) break;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  for (let i = 0; i < 14; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return { dom, window, errors };
}

function assertNoScriptErrors(errors, context) {
  const real = errors.filter((entry) => entry.kind !== 'navigation');
  assert.deepEqual(real.map((entry) => entry.kind + ': ' + entry.message), [], context + ' produced script errors');
}

function assertCleanText(document, context) {
  const text = document.body.textContent || '';
  BUG_SIGNATURES.forEach((signature) => {
    assert.equal(text.includes(signature), false, context + ' rendered text containing "' + signature + '"');
  });
}

/* ------------------------------------------------------------------ tests */

if (!jsdom) {
  test('DOM smoke suite skipped (jsdom not installed)', { skip: 'Run `npm install` to enable the jsdom page tests.' }, () => {});
} else {
  PAGES.forEach((entry) => {
    test('page boots and renders: ' + entry.label + ' (' + entry.file + (entry.query || '') + ')', async (t) => {
      const { window, errors } = await loadPage(entry);
      const document = window.document;
      t.after(() => window.close());

      assertNoScriptErrors(errors, entry.label);

      const generated = fs.readFileSync(path.join(ROOT, entry.file), 'utf8');
      const expectedPage = /<body[^>]+data-page="([^"]+)"/.exec(generated);
      assert.ok(expectedPage, entry.file + ' has no data-page attribute');
      assert.equal(document.body.dataset.page, expectedPage[1], 'body[data-page] matches the generated page');

      if (entry.chrome) {
        ['#fx-header', '#fx-footer', '#fx-bottomnav'].forEach((selector) => {
          const el = document.querySelector(selector);
          assert.ok(el, 'missing chrome mount ' + selector);
          assert.ok(el.children.length > 0, selector + ' was not rendered on a chrome page');
        });
      } else {
        assert.equal(document.querySelector('#fx-header'), null, 'auth pages must not carry the shared header');
        assert.ok(document.querySelector('.fx-auth-shell'), 'auth page renders its own full-bleed shell');
      }

      const mount = document.querySelector(entry.mount);
      assert.ok(mount, 'missing mount point ' + entry.mount);
      assert.ok(
        mount.children.length >= entry.minChildren,
        entry.mount + ' rendered ' + mount.children.length + ' children (expected >= ' + entry.minChildren + ')'
      );
      if (entry.mustContain) {
        assert.ok(mount.textContent.includes(entry.mustContain), entry.mount + ' does not contain "' + entry.mustContain + '"');
      }
      const minText = entry.minText === undefined ? 200 : entry.minText;
      assert.ok(
        mount.textContent.trim().length > minText,
        entry.label + ' rendered suspiciously little content (' + mount.textContent.trim().length + ' chars, expected > ' + minText + ')'
      );

      assertCleanText(document, entry.label);
    });
  });

  PROTECTED_PAGES.forEach((entry) => {
    test('guard: ' + entry.label + ' blocks guests (' + entry.file + ')', async (t) => {
      const { window, errors } = await loadPage(entry);
      const document = window.document;
      t.after(() => window.close());

      assertNoScriptErrors(errors, 'guest view of ' + entry.label);

      if (entry.requires === 'user') {
        // Guests are redirected to sign-in with a `next` target, and the
        // intended destination is remembered for after login.
        const navigated = errors.some((item) => item.kind === 'navigation');
        const remembered = window.localStorage.getItem('fx_redirect_after_login');
        assert.ok(navigated || document.querySelector('#fx-main') === null || remembered, 'guests are redirected away from ' + entry.file);
        if (remembered) assert.ok(remembered.includes(entry.file.replace('.html', '')), 'redirect target remembers the page: ' + remembered);
      } else {
        const text = (document.querySelector('#fx-main') || document.body).textContent;
        assert.ok(/Access restricted|administrator/i.test(text), 'non-admin guests see an explicit access-restricted state');
        assert.equal(document.querySelector(entry.mount), null, 'the admin dashboard does not render for non-admins');
      }
    });

    test('signed-in: ' + entry.label + ' renders (' + entry.file + ')', async (t) => {
      const session = entry.requires === 'admin' ? DEMO_ADMIN : DEMO_USER;
      const { window, errors } = await loadPage(entry, { session });
      const document = window.document;
      t.after(() => window.close());

      assertNoScriptErrors(errors, 'signed-in view of ' + entry.label);

      const user = window.FX.store.auth.user();
      assert.ok(user, 'the seeded session was restored');
      assert.equal(user.role, session.role, 'role matches the seeded session');

      const mount = document.querySelector(entry.mount);
      assert.ok(mount, 'missing mount point ' + entry.mount + ' for signed-in ' + entry.label);
      assert.ok(
        mount.children.length >= entry.minChildren,
        entry.mount + ' rendered ' + mount.children.length + ' children (expected >= ' + entry.minChildren + ')'
      );
      assertCleanText(document, 'signed-in ' + entry.label);
    });
  });

  test('admin dashboard renders every section without errors', async (t) => {
    const entry = { file: 'admin.html', query: '?tab=overview', mount: '#page-mount', minChildren: 1 };
    const { window, errors } = await loadPage(entry, { session: DEMO_ADMIN });
    const document = window.document;
    t.after(() => window.close());

    assertNoScriptErrors(errors, 'admin dashboard');
    const navButtons = Array.from(document.querySelectorAll('.fx-admin-nav-item'));
    assert.ok(navButtons.length >= 8, 'admin navigation lists every section (found ' + navButtons.length + ')');

    const sectionLabels = ['Orders', 'Products', 'Inventory', 'Restaurants & menus', 'Coupons', 'Cities & coverage', 'Users', 'Business settings'];
    for (const label of sectionLabels) {
      const button = navButtons.find((item) => item.textContent.trim().includes(label));
      assert.ok(button, 'missing admin section: ' + label);
      button.click();
      // Section renders are async (stats are awaited); give them a few ticks.
      for (let i = 0; i < 10; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const content = document.querySelector('.fx-admin-content');
      assert.ok(content && content.children.length > 0, 'admin section rendered nothing: ' + label);
      assert.equal(content.textContent.includes('[object Object]'), false, 'admin section rendered a raw object: ' + label);
    }
    assertNoScriptErrors(errors, 'admin dashboard after visiting every section');
  });

  test('every internal asset and link on every page resolves to a real file', async () => {
    const missing = [];
    PAGES.concat(PROTECTED_PAGES).forEach((entry) => {
      const html = fs.readFileSync(path.join(ROOT, entry.file), 'utf8');
      const refs = [];
      [/<script[^>]+src="([^"]+)"/g, /<link[^>]+href="([^"]+)"/g, /<a[^>]+href="([^"]+)"/g].forEach((pattern) => {
        let match;
        while ((match = pattern.exec(html))) refs.push(match[1]);
      });
      refs.forEach((ref) => {
        if (/^(https?:|mailto:|tel:|data:|blob:|#)/i.test(ref)) return;
        const clean = ref.split('?').shift().split('#').shift();
        if (!clean) return;
        if (!fs.existsSync(path.join(ROOT, clean))) missing.push(entry.file + ' → ' + ref);
      });
    });
    assert.deepEqual(missing, [], 'unresolved references:\n' + missing.join('\n'));
  });

  test('no generated page leaks a build placeholder', () => {
    const offenders = [];
    PAGES.concat(PROTECTED_PAGES).forEach((entry) => {
      const html = fs.readFileSync(path.join(ROOT, entry.file), 'utf8');
      if (/\{\{[A-Z_]+\}\}/.test(html)) offenders.push(entry.file);
    });
    assert.deepEqual(offenders, [], 'pages with unresolved {{PLACEHOLDER}} values');
  });
}

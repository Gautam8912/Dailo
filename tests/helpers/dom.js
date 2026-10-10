/**
 * Food Express — tests/helpers/dom.js
 *
 * Shared jsdom harness for the test suite: loads a generated page from disk
 * with every script enabled, polyfills the few browser APIs jsdom lacks, and
 * waits for the application boot promise to settle.
 *
 * jsdom is a dev-only dependency; callers must check `isAvailable()` first so
 * `npm test` still works with zero dependencies installed.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const C = require('../../shared/constants.js');

let jsdom = null;
try {
  jsdom = require('jsdom');
} catch (err) {
  jsdom = null;
}

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

function isAvailable() {
  return Boolean(jsdom);
}

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
 * @param {object} entry  { file, query }
 * @param {object} [options]  { session, seed: {key: value} }
 * @returns {Promise<{dom, window, document, FX, store, errors}>}
 */
async function loadPage(entry, options) {
  if (!jsdom) throw new Error('jsdom is not installed — run `npm install` first.');
  const opts = options || {};
  const errors = [];

  const virtualConsole = new jsdom.VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    const message = error && error.message ? error.message : String(error);
    errors.push({ kind: /Not implemented: navigation/i.test(message) ? 'navigation' : 'jsdomError', message });
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
        window.localStorage.setItem(C.STORAGE_KEYS.onboarding, 'true');
        if (opts.session) {
          // Demo mode only restores a session whose account still exists
          // locally, so seed the account list too — like a returning visitor.
          const account = Object.assign(
            { salt: 'test-salt', passwordHash: 'test-hash', resetToken: null, resetExpires: null, failedAttempts: 0 },
            opts.session
          );
          window.localStorage.setItem(C.STORAGE_KEYS.demoAccounts, JSON.stringify([account]));
          window.localStorage.setItem(C.STORAGE_KEYS.user, JSON.stringify(opts.session));
          window.localStorage.setItem(C.STORAGE_KEYS.token, JSON.stringify('demo.test-token'));
        }
        Object.keys(opts.seed || {}).forEach((key) => {
          window.localStorage.setItem(key, JSON.stringify(opts.seed[key]));
        });
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
  const deadline = Date.now() + (opts.timeoutMs || 20000);
  while (Date.now() < deadline) {
    if (window.FX && window.FX.app && window.FX.app.booted && window.FX.store && window.FX.store.state.ready) break;
    await sleep(25);
  }
  for (let i = 0; i < (opts.settleTicks === undefined ? 14 : opts.settleTicks); i += 1) {
    await sleep(25);
  }

  return {
    dom,
    window,
    document: window.document,
    FX: window.FX,
    store: window.FX ? window.FX.store : null,
    errors,
    realErrors() {
      return errors.filter((entry2) => entry2.kind !== 'navigation');
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { ROOT, C, DEMO_USER, DEMO_ADMIN, isAvailable, loadPage, installPolyfills, sleep };

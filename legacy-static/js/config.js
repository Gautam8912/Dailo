/**
 * Food Express — js/config.js
 *
 * Frontend configuration. Keep the two keys the README documents
 * (`API_URL`, `USE_BACKEND`) plus everything else the app needs.
 *
 * API_URL is relative ("/api") on purpose: the bundled static server proxies
 * it to the Express backend, so browser code never hardcodes a host.
 *
 * USE_BACKEND:
 *   true  → always use the backend (fail loudly if unreachable)
 *   false → always use the local demo store (localStorage)
 *   'auto'→ probe the backend, then fall back to the demo store (default)
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});

  const CONFIG = {
    appName: 'Food Express',
    appTagline: 'Groceries · Essentials · Restaurants',
    version: '3.0.0',

    /** Backend base URL. Relative so the static server can proxy it. */
    API_URL: '/api',
    /** true | false | 'auto' */
    USE_BACKEND: 'auto',
    /** Milliseconds to wait for the backend health probe before falling back. */
    backendProbeTimeoutMs: 2500,
    /** Retries for transient network failures. */
    networkRetries: 1,

    /** Runtime settings (thresholds, fees, flags). See shared/settings.js. */
    settings: FX.settings ? FX.settings.DEFAULT_SETTINGS : {},

    /** Catalogue paging for incremental loading. */
    pageSize: 24,
    searchDebounceMs: 220,
    maxSearchHistory: 8,
    maxRecentlyViewed: 24,

    /** Onboarding copy + behaviour. */
    onboarding: {
      messages: FX.content ? FX.content.ONBOARDING_MESSAGES : [],
      messageRotateMs: 2600,
      /** Hard ceiling so a stuck request can never trap the user. */
      maxSplashMs: 12000,
      /** Only replay the full branded splash on a cold start / new session. */
      replayPerSession: false,
    },

    /** Demo credentials are seeded by `backend/seed` (bcrypt hashed at rest). */
    demoCredentials: {
      admin: { email: 'admin@foodexpress.com', password: 'admin123' },
      user: { email: 'user@test.com', password: 'user123' },
    },

    routes: {
      home: 'index.html',
      product: 'product.html',
      category: 'category.html',
      search: 'search.html',
      restaurants: 'restaurants.html',
      restaurant: 'restaurant.html',
      cart: 'cart.html',
      checkout: 'checkout.html',
      orderSuccess: 'order-success.html',
      orders: 'orders.html',
      order: 'order.html',
      wishlist: 'wishlist.html',
      account: 'account.html',
      login: 'login.html',
      register: 'register.html',
      forgotPassword: 'forgot-password.html',
      notifications: 'notifications.html',
      support: 'support.html',
      admin: 'admin.html',
    },
  };

  /**
   * Resolve the API base for the current page. When the page is opened from the
   * file:// protocol the relative "/api" cannot work, so we fall back to the
   * conventional local backend origin.
   */
  function resolveApiBase() {
    if (typeof global.location === 'undefined') return CONFIG.API_URL;
    if (global.location.protocol === 'file:') return 'http://localhost:5000/api';
    return CONFIG.API_URL;
  }

  function url(route, params) {
    const base = CONFIG.routes[route] || route;
    if (!params) return base;
    const qs = new URLSearchParams(
      Object.keys(params).reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          acc[key] = params[key];
        }
        return acc;
      }, {})
    ).toString();
    return qs ? base + '?' + qs : base;
  }

  function navigate(route, params) {
    global.location.href = url(route, params);
  }

  FX.config = CONFIG;
  FX.resolveApiBase = resolveApiBase;
  FX.url = url;
  FX.navigate = navigate;
})(typeof globalThis !== 'undefined' ? globalThis : this);

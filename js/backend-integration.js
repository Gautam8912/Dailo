/**
 * Food Express — js/backend-integration.js
 *
 * Adapter layer between the UI store and the Express/MongoDB backend.
 * When `USE_BACKEND` resolves to a reachable backend, every method below talks
 * to the API; otherwise `FX.store` keeps using the local demo store.
 *
 * Nothing here invents success: failures are thrown so callers can show real
 * error states and retry actions.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const api = FX.api;

  const state = {
    mode: 'unknown', // 'backend' | 'demo' | 'unknown'
    probedAt: 0,
    info: null,
    error: null,
  };

  async function probe(force) {
    const configured = FX.config.USE_BACKEND;
    if (configured === false) {
      state.mode = 'demo';
      state.info = { reason: 'USE_BACKEND is false in js/config.js' };
      return state.mode;
    }
    if (state.mode === 'backend' && !force) return state.mode;
    try {
      const health = await api.get('health', null, {
        auth: false,
        timeout: FX.config.backendProbeTimeoutMs,
        retries: 0,
      });
      state.mode = 'backend';
      state.info = health;
      state.error = null;
    } catch (err) {
      if (configured === true) {
        // Explicit backend mode: surface the failure, do not silently mock.
        state.mode = 'backend-unavailable';
        state.error = err;
        return state.mode;
      }
      state.mode = 'demo';
      state.error = err;
      state.info = { reason: 'Backend unreachable — running the local demo store.' };
    }
    state.probedAt = Date.now();
    return state.mode;
  }

  const useBackend = () => state.mode === 'backend';

  /* ---------------------------- Auth / user ---------------------------- */

  const backend = {
    get mode() {
      return state.mode;
    },
    get info() {
      return state.info;
    },
    get error() {
      return state.error;
    },
    probe,
    useBackend,

    auth: {
      register: (payload) => api.post('auth/register', payload),
      login: (payload) => api.post('auth/login', payload),
      me: () => api.get('auth/profile'),
      updateProfile: (payload) => api.put('auth/profile', payload),
      changePassword: (payload) => api.post('auth/change-password', payload),
      forgotPassword: (payload) => api.post('auth/forgot-password', payload),
      resetPassword: (payload) => api.post('auth/reset-password', payload),
      logout: () => api.post('auth/logout'),
    },

    catalog: {
      products: (params) => api.get('products', params),
      product: (id) => api.get('products/' + encodeURIComponent(id)),
      categories: () => api.get('categories'),
      restaurants: (params) => api.get('restaurants', params),
      restaurant: (id) => api.get('restaurants/' + encodeURIComponent(id)),
      search: (params) => api.get('search', params),
      settings: () => api.get('settings/public'),
    },

    cart: {
      get: () => api.get('cart'),
      add: (payload) => api.post('cart', payload),
      update: (itemId, payload) => api.put('cart/' + encodeURIComponent(itemId), payload),
      remove: (itemId) => api.del('cart/' + encodeURIComponent(itemId)),
      clear: () => api.del('cart'),
      merge: (payload) => api.post('cart/merge', payload),
    },

    wishlist: {
      get: () => api.get('wishlist'),
      toggle: (payload) => api.post('wishlist/toggle', payload),
    },

    addresses: {
      list: () => api.get('addresses'),
      create: (payload) => api.post('addresses', payload),
      update: (id, payload) => api.put('addresses/' + encodeURIComponent(id), payload),
      remove: (id) => api.del('addresses/' + encodeURIComponent(id)),
    },

    orders: {
      list: (params) => api.get('orders', params),
      get: (id) => api.get('orders/' + encodeURIComponent(id)),
      place: (payload) => api.post('orders', payload),
      cancel: (id, payload) => api.post('orders/' + encodeURIComponent(id) + '/cancel', payload),
      reorder: (id) => api.post('orders/' + encodeURIComponent(id) + '/reorder'),
      simulateProgress: (id) => api.post('orders/' + encodeURIComponent(id) + '/simulate'),
    },

    coupons: {
      list: () => api.get('coupons'),
      validate: (payload) => api.post('coupons/validate', payload),
    },

    notifications: {
      list: () => api.get('notifications'),
      markRead: (id) => api.post('notifications/' + encodeURIComponent(id) + '/read'),
      markAllRead: () => api.post('notifications/read-all'),
      clear: () => api.del('notifications'),
    },

    support: {
      createTicket: (payload) => api.post('support/tickets', payload),
      tickets: () => api.get('support/tickets'),
    },

    admin: {
      stats: () => api.get('admin/stats'),
      users: (params) => api.get('admin/users', params),
      orders: (params) => api.get('admin/orders', params),
      updateOrderStatus: (id, payload) => api.put('admin/orders/' + encodeURIComponent(id) + '/status', payload),
      products: (params) => api.get('admin/products', params),
      createProduct: (payload) => api.post('admin/products', payload),
      updateProduct: (id, payload) => api.put('admin/products/' + encodeURIComponent(id), payload),
      deleteProduct: (id) => api.del('admin/products/' + encodeURIComponent(id)),
      coupons: () => api.get('admin/coupons'),
      saveCoupon: (payload) => api.post('admin/coupons', payload),
      deleteCoupon: (code) => api.del('admin/coupons/' + encodeURIComponent(code)),
      settings: {
        get: () => api.get('admin/settings'),
        save: (payload) => api.put('admin/settings', payload),
      },
      zones: () => api.get('admin/zones'),
      saveZone: (payload) => api.post('admin/zones', payload),
    },
  };

  FX.backend = backend;
})(typeof globalThis !== 'undefined' ? globalThis : this);

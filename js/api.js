/**
 * Food Express — js/api.js
 * Thin fetch wrapper with JWT auth, timeouts, retries and typed errors.
 * Pure transport: no business logic lives here.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { storage } = FX.u;
  const KEYS = FX.constants.STORAGE_KEYS;

  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'ApiError';
      this.status = status || 0;
      this.payload = payload || null;
      this.fieldErrors = (payload && payload.errors) || null;
    }
    get isNetwork() {
      return this.status === 0;
    }
    get isAuth() {
      return this.status === 401 || this.status === 403;
    }
  }

  function getToken() {
    return storage.get(KEYS.token, null);
  }

  function setToken(token) {
    if (token) storage.set(KEYS.token, token);
    else storage.remove(KEYS.token);
  }

  function base() {
    return FX.resolveApiBase();
  }

  function buildUrl(path, params) {
    const clean = String(path || '').replace(/^\//, '');
    const url = base().replace(/\/$/, '') + '/' + clean;
    if (!params) return url;
    const qs = new URLSearchParams(
      Object.keys(params).reduce((acc, key) => {
        const value = params[key];
        if (value === undefined || value === null || value === '') return acc;
        acc[key] = Array.isArray(value) ? value.join(',') : value;
        return acc;
      }, {})
    ).toString();
    return qs ? url + '?' + qs : url;
  }

  async function request(path, options) {
    const opts = options || {};
    const timeoutMs = opts.timeout || 12000;
    const controller = new AbortController();
    const timer = global.setTimeout(() => controller.abort(), timeoutMs);
    const headers = Object.assign(
      { Accept: 'application/json' },
      opts.body !== undefined ? { 'Content-Type': 'application/json' } : {},
      opts.headers || {}
    );
    const token = opts.auth === false ? null : getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    try {
      const response = await global.fetch(buildUrl(path, opts.params), {
        method: (opts.method || 'GET').toUpperCase(),
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: opts.signal || controller.signal,
        credentials: opts.credentials || 'same-origin',
      });
      const text = await response.text();
      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (err) {
          payload = { message: text.slice(0, 200) };
        }
      }
      if (!response.ok) {
        const message =
          (payload && (payload.message || payload.error)) ||
          'Request failed with status ' + response.status;
        const error = new ApiError(message, response.status, payload);
        if (error.isAuth && FX.bus) FX.bus.emit('auth:expired', { path });
        throw error;
      }
      return payload;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const aborted = err && err.name === 'AbortError';
      throw new ApiError(
        aborted ? 'The request timed out. Check your connection and retry.' : 'Network error — the backend could not be reached.',
        0,
        { cause: String((err && err.message) || err) }
      );
    } finally {
      global.clearTimeout(timer);
    }
  }

  async function requestWithRetry(path, options) {
    const retries = (options && options.retries) || FX.config.networkRetries || 0;
    let attempt = 0;
    // Retry only idempotent GETs on network failures.
    const canRetry = !options || (options.method || 'GET').toUpperCase() === 'GET';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await request(path, options);
      } catch (err) {
        attempt += 1;
        if (!canRetry || attempt > retries || !(err instanceof ApiError) || !err.isNetwork) throw err;
        await FX.u.sleep(300 * attempt);
      }
    }
  }

  const api = {
    get: (path, params, options) => requestWithRetry(path, Object.assign({ method: 'GET', params }, options)),
    post: (path, body, options) => request(path, Object.assign({ method: 'POST', body }, options)),
    put: (path, body, options) => request(path, Object.assign({ method: 'PUT', body }, options)),
    patch: (path, body, options) => request(path, Object.assign({ method: 'PATCH', body }, options)),
    del: (path, options) => request(path, Object.assign({ method: 'DELETE' }, options)),
    getToken,
    setToken,
    ApiError,
    base,
  };

  FX.api = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

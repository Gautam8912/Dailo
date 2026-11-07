/**
 * Food Express — js/utils.js
 * DOM helpers, formatting, storage, validation and a tiny event bus.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const doc = global.document;

  /* ------------------------------- DOM -------------------------------- */

  /**
   * h('div', { class: 'x', onClick: fn, dataset: {id: 1} }, [child, 'text'])
   * Minimal hyperscript used everywhere instead of innerHTML soup.
   */
  function h(tag, props, children) {
    const el = doc.createElement(tag);
    if (props) {
      Object.keys(props).forEach((key) => {
        const value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class' || key === 'className') el.className = value;
        else if (key === 'html') el.innerHTML = value;
        else if (key === 'text') el.textContent = value;
        else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
        else if (key === 'dataset' && typeof value === 'object') Object.assign(el.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
          el.value = value;
        } else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'readOnly') {
          el[key] = Boolean(value);
        } else {
          el.setAttribute(key, value === true ? '' : value);
        }
      });
    }
    append(el, children);
    return el;
  }

  function append(parent, children) {
    if (children === null || children === undefined || children === false) return parent;
    if (Array.isArray(children)) {
      children.forEach((child) => append(parent, child));
      return parent;
    }
    if (children instanceof global.Node) parent.appendChild(children);
    else parent.appendChild(doc.createTextNode(String(children)));
    return parent;
  }

  const $ = (selector, root) => (root || doc).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || doc).querySelectorAll(selector));

  function clear(el) {
    if (!el) return el;
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ----------------------------- Formatting ---------------------------- */

  function money(value, opts) {
    const n = Number(value) || 0;
    const options = opts || {};
    const symbol = options.symbol !== undefined ? options.symbol : '₹';
    const decimals = options.decimals !== undefined ? options.decimals : Number.isInteger(n) ? 0 : 2;
    const formatted = n.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return options.bare ? formatted : symbol + formatted;
  }

  function pluralize(count, singular, plural) {
    return count === 1 ? singular : plural || singular + 's';
  }

  function timeAgo(date) {
    const then = new Date(date).getTime();
    if (!then) return '';
    const seconds = Math.floor((Date.now() - then) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' min ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' hr ago';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + ' ' + pluralize(days, 'day') + ' ago';
    return new Date(then).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDate(date, withTime) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const base = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!withTime) return base;
    return base + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  function etaLabel(minutes) {
    const m = Math.max(1, Math.round(Number(minutes) || 0));
    if (m < 60) return m + ' min';
    const hrs = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? hrs + ' hr ' + rest + ' min' : hrs + ' hr';
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      const self = this;
      if (timer) global.clearTimeout(timer);
      timer = global.setTimeout(() => {
        timer = null;
        fn.apply(self, args);
      }, wait || 200);
    };
  }

  function throttle(fn, wait) {
    let last = 0;
    let timer = null;
    return function throttled() {
      const now = Date.now();
      const args = arguments;
      const self = this;
      const remaining = (wait || 200) - (now - last);
      if (remaining <= 0) {
        last = now;
        fn.apply(self, args);
      } else if (!timer) {
        timer = global.setTimeout(() => {
          timer = null;
          last = Date.now();
          fn.apply(self, args);
        }, remaining);
      }
    };
  }

  /* ------------------------------- Storage ------------------------------ */

  const memoryStore = new Map();
  let storageAvailable = null;

  function hasLocalStorage() {
    if (storageAvailable !== null) return storageAvailable;
    try {
      const key = '__fx_probe__';
      global.localStorage.setItem(key, '1');
      global.localStorage.removeItem(key);
      storageAvailable = true;
    } catch (err) {
      storageAvailable = false;
    }
    return storageAvailable;
  }

  const storage = {
    get(key, fallback) {
      try {
        const raw = hasLocalStorage() ? global.localStorage.getItem(key) : memoryStore.get(key);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        const raw = JSON.stringify(value);
        if (hasLocalStorage()) global.localStorage.setItem(key, raw);
        else memoryStore.set(key, raw);
        return true;
      } catch (err) {
        memoryStore.set(key, JSON.stringify(value));
        return false;
      }
    },
    remove(key) {
      try {
        if (hasLocalStorage()) global.localStorage.removeItem(key);
        memoryStore.delete(key);
      } catch (err) {
        memoryStore.delete(key);
      }
    },
    isPersistent: () => hasLocalStorage(),
  };

  /* -------------------------------- Misc -------------------------------- */

  function uid(prefix) {
    const rand = Math.random().toString(36).slice(2, 8);
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + rand;
  }

  function orderId() {
    const stamp = new Date();
    const ymd =
      '' + stamp.getFullYear() + String(stamp.getMonth() + 1).padStart(2, '0') + String(stamp.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return 'FX' + ymd + rand;
  }

  function clone(value) {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach((name) => {
      const value = obj[name];
      if (value && typeof value === 'object') deepFreeze(value);
    });
    return Object.freeze(obj);
  }

  function groupBy(list, keyFn) {
    return list.reduce((acc, item) => {
      const key = keyFn(item);
      (acc[key] = acc[key] || []).push(item);
      return acc;
    }, {});
  }

  function uniqueBy(list, keyFn) {
    const seen = new Set();
    return list.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function chunk(list, size) {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  }

  function qs(name, url) {
    const params = new URLSearchParams((url || global.location.search).replace(/^.*?\?/, ''));
    return params.get(name);
  }

  function qsAll(name) {
    return new URLSearchParams(global.location.search).getAll(name);
  }

  function setQs(patch, opts) {
    const params = new URLSearchParams(global.location.search);
    Object.keys(patch).forEach((key) => {
      const value = patch[key];
      if (value === null || value === undefined || value === '') params.delete(key);
      else params.set(key, value);
    });
    const search = params.toString();
    const next = global.location.pathname + (search ? '?' + search : '');
    if (opts && opts.replace) global.history.replaceState({}, '', next);
    else global.history.pushState({}, '', next);
    return next;
  }

  /* ------------------------------ Validation ---------------------------- */

  const validators = {
    required(value, label) {
      if (!String(value || '').trim()) return (label || 'This field') + ' is required.';
      return null;
    },
    email(value) {
      const v = String(value || '').trim();
      if (!v) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return 'Enter a valid email address.';
      return null;
    },
    mobile(value) {
      const v = String(value || '').replace(/\D/g, '');
      if (!v) return 'Mobile number is required.';
      if (!/^[6-9]\d{9}$/.test(v)) return 'Enter a valid 10-digit Indian mobile number.';
      return null;
    },
    password(value) {
      const v = String(value || '');
      if (!v) return 'Password is required.';
      if (v.length < 8) return 'Use at least 8 characters.';
      if (!/[a-zA-Z]/.test(v) || !/\d/.test(v)) return 'Include at least one letter and one number.';
      return null;
    },
    pincode(value) {
      const v = String(value || '').trim();
      if (!v) return 'PIN code is required.';
      if (!/^\d{6}$/.test(v)) return 'PIN code must be 6 digits.';
      return null;
    },
    minLength(min) {
      return (value, label) =>
        String(value || '').trim().length < min
          ? (label || 'This field') + ' needs at least ' + min + ' characters.'
          : null;
    },
    maxLength(max) {
      return (value, label) =>
        String(value || '').trim().length > max
          ? (label || 'This field') + ' must be under ' + max + ' characters.'
          : null;
    },
    matches(other, label) {
      return (value) => (String(value || '') !== String(other || '') ? label || 'Values do not match.' : null);
    },
    checked(value, message) {
      return value ? null : message || 'Please accept to continue.';
    },
  };

  function passwordStrength(value) {
    const v = String(value || '');
    let score = 0;
    if (v.length >= 8) score += 1;
    if (v.length >= 12) score += 1;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score += 1;
    if (/\d/.test(v)) score += 1;
    if (/[^A-Za-z0-9]/.test(v)) score += 1;
    const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
    return { score, label: labels[score], percent: (score / 5) * 100 };
  }

  /* ------------------------------ Event bus ----------------------------- */

  function createBus() {
    const handlers = new Map();
    return {
      on(event, fn) {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event).add(fn);
        return () => handlers.get(event).delete(fn);
      },
      off(event, fn) {
        if (handlers.has(event)) handlers.get(event).delete(fn);
      },
      emit(event, payload) {
        if (handlers.has(event)) handlers.get(event).forEach((fn) => {
          try {
            fn(payload);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[FX] handler error for ' + event, err);
          }
        });
        // Wildcard subscribers
        if (handlers.has('*')) handlers.get('*').forEach((fn) => fn({ event, payload }));
      },
    };
  }

  /* --------------------------- Fuzzy / typo search ----------------------- */

  /** Small Levenshtein distance used for typo tolerance (short strings only). */
  function editDistance(a, b) {
    const s = String(a || '').toLowerCase();
    const t = String(b || '').toLowerCase();
    if (s === t) return 0;
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    if (Math.abs(s.length - t.length) > 3) return 99;
    let prev = new Array(t.length + 1);
    let curr = new Array(t.length + 1);
    for (let j = 0; j <= t.length; j += 1) prev[j] = j;
    for (let i = 1; i <= s.length; i += 1) {
      curr[0] = i;
      for (let j = 1; j <= t.length; j += 1) {
        curr[j] = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1)
        );
      }
      const tmp = prev;
      prev = curr;
      curr = tmp;
    }
    return prev[t.length];
  }

  function highlight(text, query) {
    const safe = escapeHtml(text);
    const q = escapeHtml(String(query || '').trim());
    if (!q) return safe;
    const idx = safe.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return safe;
    return safe.slice(0, idx) + '<mark>' + safe.slice(idx, idx + q.length) + '</mark>' + safe.slice(idx + q.length);
  }

  /**
   * Discount percentage for a catalogue item. Prefers the stored
   * `discountPercent`, otherwise derives it from mrp/price so seeded and
   * admin-edited items both behave.
   */
  function discountPercent(item) {
    if (!item) return 0;
    if (typeof item.discountPercent === 'number' && item.discountPercent > 0) return Math.round(item.discountPercent);
    const mrp = Number(item.mrp || 0);
    const price = Number(item.price || 0);
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  /** Percentage of `value` against `total`, clamped to 0–100 and rounded. */
  function percentage(value, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((Number(value) / Number(total)) * 100)));
  }

  /**
   * Copy text to the clipboard. Uses the async Clipboard API when available and
   * falls back to a hidden textarea so the button never silently does nothing.
   * Resolves true when the copy succeeded.
   */
  function copyToClipboard(text) {
    const value = String(text == null ? '' : text);
    if (!value) return Promise.resolve(false);
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      return global.navigator.clipboard.writeText(value).then(
        () => true,
        () => legacyCopy(value)
      );
    }
    return Promise.resolve(legacyCopy(value));
  }

  function legacyCopy(value) {
    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', 'readonly');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => global.setTimeout(resolve, ms));
  }

  function withRetry(fn, retries) {
    const attempts = (retries === undefined ? 1 : retries) + 1;
    return fn()
      .catch((err) => {
        if (attempts <= 1) throw err;
        return sleep(350).then(() => withRetry(fn, attempts - 2));
      });
  }

  FX.u = {
    h,
    append,
    $,
    $$,
    clear,
    escapeHtml,
    money,
    pluralize,
    timeAgo,
    formatDate,
    etaLabel,
    debounce,
    throttle,
    storage,
    uid,
    orderId,
    clone,
    deepFreeze,
    groupBy,
    uniqueBy,
    chunk,
    qs,
    qsAll,
    setQs,
    validators,
    passwordStrength,
    createBus,
    editDistance,
    highlight,
    discountPercent,
    percentage,
    sleep,
    copyToClipboard,
    withRetry,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

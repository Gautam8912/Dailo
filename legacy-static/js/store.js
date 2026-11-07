/**
 * Food Express — js/store.js
 *
 * The single client-side state container + service layer. Every page reads and
 * writes through `FX.store`, which keeps product IDs consistent across search,
 * product details, cart, checkout, orders and the admin panel.
 *
 * Two operating modes (see js/backend-integration.js):
 *   backend → Express/MongoDB is authoritative
 *   demo    → local persistence (localStorage), clearly labelled in the UI
 *
 * All price maths is delegated to shared/pricing.js — never re-implemented here.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { storage, uid, clone, money, debounce } = FX.u;
  const K = FX.constants.STORAGE_KEYS;
  const C = FX.constants;
  const pricing = FX.pricing;

  FX.bus = FX.bus || FX.u.createBus();
  const bus = FX.bus;

  /* ------------------------------------------------------------------ */
  /* Password hashing for demo accounts (never plaintext)                */
  /* ------------------------------------------------------------------ */

  function sha256Fallback(message) {
    // Compact pure-JS SHA-256 used when crypto.subtle is unavailable
    // (e.g. the page opened over file://). Output is hex.
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const bytes = [];
    for (let i = 0; i < message.length; i += 1) {
      const code = message.charCodeAt(i);
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      else bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i -= 1) bytes.push(Math.floor(bitLen / Math.pow(2, i * 8)) & 0xff);

    const w = new Array(64);
    for (let off = 0; off < bytes.length; off += 64) {
      for (let i = 0; i < 16; i += 1) {
        w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      }
      for (let i = 16; i < 64; i += 1) {
        const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
        const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = H;
      for (let i = 0; i < 64; i += 1) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = [H[0] + a | 0, H[1] + b | 0, H[2] + c | 0, H[3] + d | 0, H[4] + e | 0, H[5] + f | 0, H[6] + g | 0, H[7] + hh | 0];
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }

  async function hashPassword(password, salt) {
    const payload = salt + '::' + password;
    if (global.crypto && global.crypto.subtle && global.TextEncoder) {
      try {
        const data = new global.TextEncoder().encode(payload);
        const digest = await global.crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch (err) {
        return sha256Fallback(payload);
      }
    }
    return sha256Fallback(payload);
  }

  function randomSalt() {
    if (global.crypto && global.crypto.getRandomValues) {
      const arr = new Uint8Array(12);
      global.crypto.getRandomValues(arr);
      return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  /* ------------------------------------------------------------------ */
  /* State                                                                */
  /* ------------------------------------------------------------------ */

  const state = {
    ready: false,
    mode: 'demo',
    settings: clone(FX.settings.DEFAULT_SETTINGS),
    catalog: {
      products: [],
      categories: clone(FX.catalog.CATEGORIES),
      brands: clone(FX.catalog.BRANDS),
      restaurants: [],
      menuItems: [],
      banners: clone(FX.catalog.BANNERS),
      coupons: [],
      loaded: false,
      source: 'demo',
      error: null,
    },
    session: { user: null, token: null },
    cart: { type: C.CART_TYPES.STORE, restaurantId: null, items: [], saved: [], couponCode: null, tip: 0, redeemPoints: 0 },
    wishlist: [],
    recent: [],
    searches: [],
    location: { cityId: FX.locations.defaultCityId, localityId: null, label: 'Vijayawada' },
    addresses: [],
    orders: [],
    notifications: [],
    rewards: { points: 0, history: [] },
    couponUses: {},
    preferences: { vegOnly: false, notifyPromo: true, notifyOrder: true, deliveryPreference: 'standard', favouriteCategories: [] },
    tickets: [],
    accounts: [], // demo-mode accounts (hashed passwords only)
    adminCatalog: null, // admin edits layered on top of the seed catalogue
  };

  function emit(event, payload) {
    bus.emit(event, payload);
  }

  const persist = debounce(function persistNow() {
    storage.set(K.cart, state.cart);
    storage.set(K.wishlist, state.wishlist);
    storage.set(K.recent, state.recent.slice(0, FX.config.maxRecentlyViewed));
    storage.set(K.location, state.location);
    storage.set(K.addresses, state.addresses);
    storage.set(K.orders, state.orders);
    storage.set(K.notifications, state.notifications);
    storage.set(K.rewards, state.rewards);
    storage.set(K.searches, state.searches);
    storage.set(K.preferences, state.preferences);
    storage.set(K.tickets, state.tickets);
    storage.set(K.couponsWallet, state.couponUses);
    storage.set(K.demoAccounts, state.accounts);
    storage.set(K.adminCatalog, state.adminCatalog);
    storage.set(K.settings, state.settings);
  }, 120);

  function persistNow() {
    persist();
  }

  /* ------------------------------------------------------------------ */
  /* Catalogue                                                            */
  /* ------------------------------------------------------------------ */

  function seedDemoCatalog() {
    state.catalog.products = clone(FX.catalog.PRODUCTS);
    state.catalog.restaurants = clone(FX.restaurants.RESTAURANTS);
    state.catalog.menuItems = clone(FX.restaurants.MENU_ITEMS);
    state.catalog.coupons = clone(FX.coupons.COUPONS);
    state.catalog.source = 'demo';
  }

  /** Layer admin/demo edits (price, stock, active) on top of the seed data. */
  function applyAdminOverrides() {
    const overrides = state.adminCatalog;
    if (!overrides) return;
    if (Array.isArray(overrides.productPatches)) {
      overrides.productPatches.forEach((patch) => {
        const target = state.catalog.products.find((p) => p.id === patch.id);
        if (target) Object.assign(target, patch);
      });
    }
    if (Array.isArray(overrides.customProducts)) {
      overrides.customProducts.forEach((product) => {
        if (!state.catalog.products.some((p) => p.id === product.id)) state.catalog.products.push(product);
      });
    }
    if (Array.isArray(overrides.menuPatches)) {
      overrides.menuPatches.forEach((patch) => {
        const target = state.catalog.menuItems.find((m) => m.id === patch.id);
        if (target) Object.assign(target, patch);
        const rest = state.catalog.restaurants.find((r) => r.id === patch.restaurantId);
        if (rest) {
          const item = rest.menu.find((m) => m.id === patch.id);
          if (item) Object.assign(item, patch);
        }
      });
    }
    if (Array.isArray(overrides.restaurantPatches)) {
      overrides.restaurantPatches.forEach((patch) => {
        const target = state.catalog.restaurants.find((r) => r.id === patch.id);
        if (target) Object.assign(target, patch);
      });
    }
    if (Array.isArray(overrides.couponPatches)) {
      overrides.couponPatches.forEach((patch) => {
        const idx = state.catalog.coupons.findIndex((c) => c.code === patch.code);
        if (idx >= 0) state.catalog.coupons[idx] = Object.assign({}, state.catalog.coupons[idx], patch);
        else state.catalog.coupons.push(patch);
      });
    }
  }

  const catalog = {
    all() {
      return state.catalog.products.concat(state.catalog.menuItems);
    },
    products() {
      return state.catalog.products.filter((p) => p.active !== false);
    },
    product(idOrSlug) {
      const key = String(idOrSlug || '').toLowerCase();
      return (
        catalog.products().find((p) => p.id === key || p.slug === key) ||
        state.catalog.menuItems.find((m) => m.id === key || m.slug === key) ||
        null
      );
    },
    categories() {
      return state.catalog.categories;
    },
    category(id) {
      return state.catalog.categories.find((c) => c.id === id) || null;
    },
    brands() {
      return state.catalog.brands;
    },
    restaurants(cityId) {
      const list = state.catalog.restaurants.filter((r) => r.active !== false);
      return cityId ? list.filter((r) => r.cityIds.indexOf(cityId) !== -1) : list;
    },
    restaurant(idOrSlug) {
      const key = String(idOrSlug || '').replace(/^r-/, '').toLowerCase();
      return state.catalog.restaurants.find((r) => r.slug === key || r.id === 'r-' + key || r.id === key) || null;
    },
    menuItems(restaurantId) {
      // Accept either the canonical id (`r-spice-junction`) or the slug.
      const key = String(restaurantId || '')
        .replace(/^r-/, '')
        .toLowerCase();
      return key
        ? state.catalog.menuItems.filter((m) => String(m.restaurantId || '').replace(/^r-/, '').toLowerCase() === key)
        : state.catalog.menuItems;
    },
    coupons() {
      return state.catalog.coupons;
    },
    coupon(code) {
      const key = String(code || '').trim().toUpperCase();
      return state.catalog.coupons.find((c) => c.code === key) || null;
    },
    banners() {
      return state.catalog.banners;
    },
    /** Every searchable catalogue entry (products + menu items). */
    searchable() {
      return catalog.all().filter((item) => item.active !== false);
    },
  };

  /* ------------------------------------------------------------------ */
  /* Search                                                               */
  /* ------------------------------------------------------------------ */

  const STOP_WORDS = new Set(['the', 'a', 'an', 'for', 'of', 'and', 'in', 'with', 'pack', 'pcs', 'kg', 'g', 'ml', 'l']);

  function tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t && !STOP_WORDS.has(t));
  }

  function scoreItem(item, queryTokens, rawQuery) {
    const q = String(rawQuery || '').toLowerCase().trim();
    const name = item.name.toLowerCase();
    const brand = (item.brand || '').toLowerCase();
    const cat = (item.categoryName || '').toLowerCase();
    const sub = (item.subcategory || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const unit = (item.unit || '').toLowerCase();
    const cuisine = item.attributes && item.attributes.Cuisine ? String(item.attributes.Cuisine).toLowerCase() : '';
    let score = 0;

    if (name === q) score += 400;
    if (name.startsWith(q)) score += 220;
    if (name.indexOf(q) !== -1) score += 140;
    if (brand === q) score += 90;
    if (brand.indexOf(q) !== -1) score += 60;
    if (cat.indexOf(q) !== -1) score += 45;
    if (sub.indexOf(q) !== -1) score += 45;
    if (cuisine.indexOf(q) !== -1) score += 40;
    if (desc.indexOf(q) !== -1) score += 18;
    if (unit.indexOf(q) !== -1) score += 12;

    queryTokens.forEach((token) => {
      const nameTokens = tokenize(item.name);
      if (nameTokens.indexOf(token) !== -1) score += 55;
      else if (nameTokens.some((nt) => nt.startsWith(token) || token.startsWith(nt))) score += 28;
      else if (FX.u.editDistance(token, nameTokens[0] || '') <= 1 && token.length > 3) score += 22; // typo tolerance
      if (tokenize(brand).indexOf(token) !== -1) score += 18;
      if (tokenize(cat).indexOf(token) !== -1) score += 14;
      if (tokenize(sub).indexOf(token) !== -1) score += 14;
      if (desc.indexOf(token) !== -1) score += 5;
    });

    if (!score) return 0;
    // Relevance first, then merchandising signals.
    score += (item.popularity || 0) * 0.35;
    if (!item.inStock && item.stock <= 0) score -= 120;
    if (item.type === 'menu-item') score += 8;
    return score;
  }

  function search(query, options) {
    const opts = options || {};
    const raw = String(query || '').trim();
    const tokens = tokenize(raw);
    const pool = opts.pool || catalog.searchable();
    if (!raw) return [];
    const scored = pool
      .map((item) => ({ item, score: scoreItem(item, tokens, raw) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((entry) => entry.item);
  }

  function suggestions(query, limit) {
    const raw = String(query || '').trim();
    if (!raw) return { products: [], restaurants: [], categories: [] };
    const max = limit || 6;
    const products = search(raw, { pool: catalog.products() }).slice(0, max);
    const menuItems = search(raw, { pool: state.catalog.menuItems }).slice(0, 3);
    const q = raw.toLowerCase();
    const restaurants = state.catalog.restaurants.filter(
      (r) =>
        r.name.toLowerCase().indexOf(q) !== -1 ||
        r.cuisines.some((c) => c.toLowerCase().indexOf(q) !== -1)
    ).slice(0, 3);
    const categories = catalog.categories().filter(
      (c) => c.name.toLowerCase().indexOf(q) !== -1 || (c.blurb || '').toLowerCase().indexOf(q) !== -1
    ).slice(0, 3);
    return { products: products.concat(menuItems).slice(0, max), restaurants, categories };
  }

  /** Faceted filter + sort used by category and search result pages. */
  function query(items, filters) {
    const f = filters || {};
    let list = items.slice();

    if (f.categoryId) list = list.filter((i) => i.categoryId === f.categoryId);
    if (Array.isArray(f.categories) && f.categories.length) list = list.filter((i) => f.categories.indexOf(i.categoryId) !== -1);
    if (Array.isArray(f.brands) && f.brands.length) list = list.filter((i) => f.brands.indexOf(i.brandId || i.brand) !== -1);
    if (Array.isArray(f.cuisines) && f.cuisines.length) {
      list = list.filter((i) => (i.cuisines || []).some((c) => f.cuisines.indexOf(c) !== -1));
    }
    if (f.minPrice != null) list = list.filter((i) => i.price >= Number(f.minPrice));
    if (f.maxPrice != null) list = list.filter((i) => i.price <= Number(f.maxPrice));
    if (f.inStock) list = list.filter((i) => i.stock > 0);
    if (f.minDiscount) list = list.filter((i) => (i.discountPercent || 0) >= Number(f.minDiscount));
    if (f.vegOnly) list = list.filter((i) => i.veg !== false);
    if (f.tag) list = list.filter((i) => (i.tags || []).indexOf(f.tag) !== -1);
    if (f.cityId && f.type === 'restaurant') list = list.filter((i) => (i.cityIds || []).indexOf(f.cityId) !== -1);
    if (f.restaurantId) list = list.filter((i) => i.restaurantId === f.restaurantId);

    switch (f.sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        list.sort((a, b) => (b.sortIndex || 0) - (a.sortIndex || 0) * -1 === 0 ? 0 : (a.sortIndex || 0) - (b.sortIndex || 0));
        list.reverse();
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'discount':
        list.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'popular':
      default:
        list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || b.price - a.price);
        break;
    }
    return list;
  }

  /** Facet counts for the filter panel. */
  function facets(items) {
    const byCategory = {};
    const byBrand = {};
    let min = Infinity;
    let max = 0;
    let discounted = 0;
    let inStock = 0;
    items.forEach((item) => {
      byCategory[item.categoryId] = (byCategory[item.categoryId] || 0) + 1;
      const brandKey = item.brandId || item.brand;
      if (brandKey) byBrand[brandKey] = (byBrand[brandKey] || 0) + 1;
      min = Math.min(min, item.price);
      max = Math.max(max, item.price);
      if ((item.discountPercent || 0) > 0) discounted += 1;
      if (item.stock > 0) inStock += 1;
    });
    return {
      categories: byCategory,
      brands: byBrand,
      minPrice: Number.isFinite(min) ? min : 0,
      maxPrice: max,
      discounted,
      inStock,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Location                                                             */
  /* ------------------------------------------------------------------ */

  const location = {
    get current() {
      return state.location;
    },
    city() {
      return FX.locations.getCity(state.location.cityId);
    },
    locality() {
      return FX.locations.getLocality(state.location.cityId, state.location.localityId);
    },
    /** All configured cities with admin coverage/fee overrides applied. */
    cities() {
      const coverageOverrides = state.settings.cityCoverage || {};
      const feeOverrides = state.settings.cityDeliveryFee || {};
      return FX.locations.CITIES.map((city) => {
        const copy = Object.assign({}, city);
        if (coverageOverrides[city.id]) copy.coverage = coverageOverrides[city.id];
        if (typeof feeOverrides[city.id] === 'number') copy.deliveryFee = feeOverrides[city.id];
        copy.overridden = Boolean(coverageOverrides[city.id] || typeof feeOverrides[city.id] === 'number');
        return copy;
      });
    },
    coverageOf(cityId) {
      const override = (state.settings.cityCoverage || {})[cityId];
      if (override) return override;
      const city = FX.locations.getCity(cityId);
      return city ? city.coverage : C.COVERAGE.COMING_SOON;
    },
    coverage() {
      return location.coverageOf(state.location.cityId);
    },
    isServiceable() {
      return Boolean(location.city()) && location.coverage() !== C.COVERAGE.COMING_SOON;
    },
    label() {
      const loc = location.locality();
      if (loc) return loc.name;
      const city = location.city();
      return city ? city.name : 'Select location';
    },
    set(cityId, localityId) {
      const city = FX.locations.getCity(cityId);
      if (!city) return false;
      state.location = {
        cityId: city.id,
        localityId: localityId || null,
        label: localityId ? FX.locations.getLocality(city.id, localityId).name : city.name,
        updatedAt: new Date().toISOString(),
      };
      emit('location:changed', state.location);
      persistNow();
      return true;
    },
    etaMinutes(handlingMinutes) {
      return FX.locations.estimateEtaMinutes(state.location.cityId, handlingMinutes, {
        coverage: location.coverage(),
      });
    },
    etaLabel(handlingMinutes) {
      const minutes = location.etaMinutes(handlingMinutes);
      return minutes ? FX.u.etaLabel(minutes) : 'Not serviceable';
    },
    deliveryFee() {
      const override = (state.settings.cityDeliveryFee || {})[state.location.cityId];
      if (typeof override === 'number') return override;
      const city = location.city();
      return city && typeof city.deliveryFee === 'number' ? city.deliveryFee : state.settings.deliveryFee;
    },
    recent() {
      return storage.get('fx_recent_locations_v1', []);
    },
    pushRecent(entry) {
      const list = location.recent().filter((item) => item.cityId !== entry.cityId || item.localityId !== entry.localityId);
      list.unshift(entry);
      storage.set('fx_recent_locations_v1', list.slice(0, 5));
    },
    /** Attempt browser geolocation — permission-aware, never required. */
    detect() {
      return new Promise((resolve) => {
        if (!global.navigator || !global.navigator.geolocation) {
          resolve({ ok: false, reason: 'unsupported' });
          return;
        }
        global.navigator.geolocation.getCurrentPosition(
          () => resolve({ ok: false, reason: 'no-geocoder', note: 'Location detected, but no geocoding service is configured.' }),
          (err) => resolve({ ok: false, reason: err && err.code === 1 ? 'denied' : 'unavailable' }),
          { timeout: 6000, maximumAge: 300000 }
        );
      });
    },
  };

  /* ------------------------------------------------------------------ */
  /* Cart                                                                 */
  /* ------------------------------------------------------------------ */

  function addonSignature(addons) {
    if (!addons || !addons.length) return '';
    return addons
      .map((a) => (a.groupId || '') + ':' + (a.optionId || ''))
      .sort()
      .join('|');
  }

  function cartItemKey(type, itemId, addons) {
    return type + ':' + itemId + (addonSignature(addons) ? ':' + addonSignature(addons) : '');
  }

  function maxQtyFor(item) {
    const cap = Math.min(state.settings.maxQuantityPerItem || 10, item.stock > 0 ? item.stock : 0);
    return Math.max(1, cap);
  }

  /** Build a cart line from a catalogue item (price read from the catalogue). */
  function buildLine(item, qty, addons, selection) {
    const catalogItem = catalog.product(item.id) || item;
    let unitPrice = catalogItem.price;
    let resolvedAddons = addons || [];
    if (catalogItem.type === 'menu-item') {
      const priced = FX.restaurants.priceMenuItem(catalogItem, selection || {});
      unitPrice = priced.price;
      resolvedAddons = priced.addons;
    }
    return {
      key: cartItemKey(catalogItem.type === 'menu-item' ? C.CART_TYPES.RESTAURANT : C.CART_TYPES.STORE, catalogItem.id, resolvedAddons),
      type: catalogItem.type === 'menu-item' ? C.CART_TYPES.RESTAURANT : C.CART_TYPES.STORE,
      itemId: catalogItem.id,
      restaurantId: catalogItem.restaurantId || null,
      restaurantName: catalogItem.restaurantName || null,
      name: catalogItem.name,
      brand: catalogItem.brand || null,
      unit: catalogItem.unit || '',
      emoji: catalogItem.emoji,
      categoryId: catalogItem.categoryId,
      price: unitPrice,
      unitPrice,
      mrp: catalogItem.mrp || unitPrice,
      gstRate: catalogItem.gstRate || 0,
      handlingMinutes: catalogItem.handlingMinutes || 0,
      veg: catalogItem.veg,
      stock: catalogItem.stock,
      maxQty: maxQtyFor(catalogItem),
      qty: Math.max(1, Math.min(Math.floor(qty || 1), maxQtyFor(catalogItem))),
      addons: resolvedAddons,
      selection: selection || null,
      addedAt: new Date().toISOString(),
      eligible: true,
    };
  }

  function cartNeedsSwitch(item) {
    if (!state.cart.items.length) return null;
    const incomingType = item.type === 'menu-item' ? C.CART_TYPES.RESTAURANT : C.CART_TYPES.STORE;
    if (state.cart.type === incomingType && incomingType === C.CART_TYPES.STORE) return null;
    if (
      state.cart.type === C.CART_TYPES.RESTAURANT &&
      incomingType === C.CART_TYPES.RESTAURANT &&
      state.cart.restaurantId === (item.restaurantId || null)
    ) {
      return null;
    }
    if (state.cart.type === C.CART_TYPES.RESTAURANT) {
      return {
        kind: incomingType === C.CART_TYPES.RESTAURANT ? 'restaurant-switch' : 'restaurant-to-store',
        message:
          incomingType === C.CART_TYPES.RESTAURANT
            ? `Your cart already has items from ${state.cart.items[0].restaurantName}. Orders from two kitchens cannot be combined.`
            : 'Your cart has restaurant items. Store products cannot be delivered with a restaurant order.',
      };
    }
    return {
      kind: 'store-to-restaurant',
      message: `Adding food from ${item.restaurantName} will replace the store items in your cart — a restaurant order is delivered separately.`,
    };
  }

  const cart = {
    get items() {
      return state.cart.items;
    },
    get saved() {
      return state.cart.saved;
    },
    get type() {
      return state.cart.type;
    },
    get restaurantId() {
      return state.cart.restaurantId;
    },
    count() {
      return state.cart.items.reduce((sum, item) => sum + item.qty, 0);
    },
    isEmpty() {
      return state.cart.items.length === 0;
    },
    findLine(key) {
      return state.cart.items.find((item) => item.key === key) || null;
    },
    lineFor(itemId, selection) {
      const key = cartItemKey(
        itemId.indexOf('m-') === 0 ? C.CART_TYPES.RESTAURANT : C.CART_TYPES.STORE,
        itemId,
        selection ? FX.restaurants.priceMenuItem(catalog.product(itemId) || { customisations: [] }, selection).addons : null
      );
      return cart.findLine(key);
    },
    needsSwitch(item) {
      return cartNeedsSwitch(item);
    },

    /**
     * Add to cart.
     *  - first click  → exactly one unit
     *  - second click → quantity 2 on the SAME line (never a duplicate entry)
     *  - capped by available stock and the configured per-item maximum
     * Returns { ok, line, reason, capped }.
     */
    add(item, options) {
      const opts = options || {};
      const catalogItem = catalog.product(item.id || item) || item;
      if (!catalogItem || !catalogItem.id) return { ok: false, reason: 'That item is not in the catalogue.' };
      if (catalogItem.active === false) return { ok: false, reason: 'This item is no longer available.' };
      if (catalogItem.stock <= 0) return { ok: false, reason: catalogItem.name + ' is out of stock.' };

      const conflict = cartNeedsSwitch(catalogItem);
      if (conflict && !opts.forceSwitch) {
        return { ok: false, needsSwitch: true, conflict, reason: conflict.message };
      }
      if (conflict && opts.forceSwitch) {
        cart.clear({ silent: true });
      }

      const incomingType = catalogItem.type === 'menu-item' ? C.CART_TYPES.RESTAURANT : C.CART_TYPES.STORE;
      if (state.cart.items.length === 0 || state.cart.type !== incomingType) {
        state.cart.type = incomingType;
        state.cart.restaurantId = catalogItem.restaurantId || null;
      }

      const requestedQty = Math.max(1, Math.floor(opts.qty || 1));
      const line = cart.lineFor(catalogItem.id, opts.selection) ||
        cart.findLine(cartItemKey(incomingType, catalogItem.id, opts.selection ? FX.restaurants.priceMenuItem(catalogItem, opts.selection).addons : null));

      if (line) {
        const next = line.qty + requestedQty;
        const cap = maxQtyFor(line);
        line.qty = Math.min(next, cap);
        line.addedAt = new Date().toISOString();
        cart.afterChange({ type: 'increment', line });
        return { ok: true, line, capped: next > cap, reason: next > cap ? 'Only ' + cap + ' in stock.' : null };
      }

      const newLine = buildLine(catalogItem, requestedQty, opts.addons, opts.selection);
      state.cart.items.push(newLine);
      cart.afterChange({ type: 'add', line: newLine });
      return { ok: true, line: newLine, capped: requestedQty > newLine.maxQty };
    },

    increment(key) {
      const line = cart.findLine(key);
      if (!line) return { ok: false };
      if (line.qty >= maxQtyFor(line)) {
        return { ok: false, reason: 'Only ' + line.maxQty + ' available.' };
      }
      line.qty += 1;
      cart.afterChange({ type: 'increment', line });
      return { ok: true, line };
    },

    decrement(key) {
      const line = cart.findLine(key);
      if (!line) return { ok: false };
      line.qty -= 1;
      if (line.qty <= 0) return cart.remove(key);
      cart.afterChange({ type: 'decrement', line });
      return { ok: true, line };
    },

    setQty(key, qty) {
      const line = cart.findLine(key);
      if (!line) return { ok: false };
      const next = Math.floor(Number(qty) || 0);
      if (next <= 0) return cart.remove(key);
      const capped = Math.min(next, maxQtyFor(line));
      line.qty = capped;
      cart.afterChange({ type: 'set', line });
      return { ok: true, line, capped: capped !== next };
    },

    remove(key) {
      const index = state.cart.items.findIndex((item) => item.key === key);
      if (index === -1) return { ok: false };
      const [removed] = state.cart.items.splice(index, 1);
      if (state.cart.items.length === 0) {
        state.cart.type = C.CART_TYPES.STORE;
        state.cart.restaurantId = null;
        state.cart.couponCode = null;
        state.cart.tip = 0;
        state.cart.redeemPoints = 0;
      }
      cart.afterChange({ type: 'remove', line: removed });
      return { ok: true, line: removed };
    },

    /** Save for later — moves a line out of the active cart. */
    saveForLater(key) {
      const index = state.cart.items.findIndex((item) => item.key === key);
      if (index === -1) return { ok: false };
      const [line] = state.cart.items.splice(index, 1);
      if (!state.cart.saved.some((item) => item.key === line.key)) {
        state.cart.saved.push(Object.assign({}, line, { savedAt: new Date().toISOString() }));
      }
      if (state.cart.items.length === 0) {
        state.cart.type = C.CART_TYPES.STORE;
        state.cart.restaurantId = null;
        state.cart.couponCode = null;
      }
      cart.afterChange({ type: 'save', line });
      return { ok: true, line };
    },

    moveToCart(key) {
      const index = state.cart.saved.findIndex((item) => item.key === key);
      if (index === -1) return { ok: false };
      const saved = state.cart.saved[index];
      const catalogItem = catalog.product(saved.itemId);
      if (!catalogItem || catalogItem.stock <= 0) {
        state.cart.saved.splice(index, 1);
        cart.afterChange({ type: 'saved-remove' });
        return { ok: false, reason: (catalogItem ? catalogItem.name : 'This item') + ' is out of stock right now.' };
      }
      state.cart.saved.splice(index, 1);
      return cart.add(catalogItem, { qty: saved.qty, selection: saved.selection, forceSwitch: false });
    },

    removeSaved(key) {
      const index = state.cart.saved.findIndex((item) => item.key === key);
      if (index === -1) return { ok: false };
      state.cart.saved.splice(index, 1);
      cart.afterChange({ type: 'saved-remove' });
      return { ok: true };
    },

    clear(options) {
      state.cart.items = [];
      state.cart.type = C.CART_TYPES.STORE;
      state.cart.restaurantId = null;
      state.cart.couponCode = null;
      state.cart.tip = 0;
      state.cart.redeemPoints = 0;
      if (!options || !options.keepSaved) state.cart.saved = [];
      cart.afterChange({ type: 'clear' });
    },

    setCoupon(code) {
      state.cart.couponCode = code ? String(code).trim().toUpperCase() : null;
      cart.afterChange({ type: 'coupon' });
    },

    setTip(value) {
      state.cart.tip = Math.max(0, Number(value) || 0);
      cart.afterChange({ type: 'tip' });
    },

    setRedeemPoints(points) {
      state.cart.redeemPoints = Math.max(0, Math.floor(Number(points) || 0));
      cart.afterChange({ type: 'loyalty' });
    },

    restaurant() {
      return state.cart.restaurantId ? catalog.restaurant(state.cart.restaurantId) : null;
    },

    /** Full bill computed by the shared pricing engine. */
    totals() {
      const restaurant = cart.restaurant();
      return pricing.computeCart({
        items: state.cart.items,
        settings: state.settings,
        cartType: state.cart.type,
        restaurantId: state.cart.restaurantId,
        restaurantMinOrder: restaurant ? restaurant.minOrder : 0,
        restaurantName: restaurant ? restaurant.name : '',
        deliveryFeeOverride: restaurant ? restaurant.deliveryFee : location.deliveryFee(),
        coupon: state.cart.couponCode ? catalog.coupon(state.cart.couponCode) : null,
        tip: state.cart.tip,
        redeemPoints: state.cart.redeemPoints,
        availablePoints: state.rewards.points,
        orderCount: state.orders.filter((o) => o.status !== C.CANCELLED).length,
        couponUses: state.couponUses,
        isNewUser: state.orders.length === 0,
      });
    },

    afterChange(change) {
      persistNow();
      emit('cart:changed', { cart: state.cart, totals: cart.totals(), change });
    },

    /** Merge a guest cart into a signed-in cart without duplicating lines. */
    mergeGuestLines(incomingLines) {
      let merged = 0;
      (incomingLines || []).forEach((line) => {
        const existing = cart.findLine(line.key);
        if (existing) {
          existing.qty = Math.min(existing.qty + line.qty, maxQtyFor(existing));
          merged += 1;
        } else {
          const catalogItem = catalog.product(line.itemId);
          if (!catalogItem) return;
          const built = buildLine(catalogItem, line.qty, line.addons, line.selection);
          built.key = line.key;
          state.cart.items.push(built);
          merged += 1;
        }
      });
      if (merged) cart.afterChange({ type: 'merge', merged });
      return merged;
    },

    hydrate(saved) {
      if (!saved || !Array.isArray(saved.items)) return;
      // Re-price from the catalogue so a stale stored price can never be used.
      state.cart.items = saved.items
        .map((line) => {
          const catalogItem = catalog.product(line.itemId);
          if (!catalogItem) return null;
          const rebuilt = buildLine(catalogItem, line.qty, line.addons, line.selection);
          rebuilt.key = line.key || rebuilt.key;
          rebuilt.addedAt = line.addedAt || rebuilt.addedAt;
          return rebuilt;
        })
        .filter(Boolean);
      state.cart.saved = (saved.saved || []).filter((line) => catalog.product(line.itemId));
      state.cart.type = state.cart.items.length
        ? state.cart.items[0].type
        : C.CART_TYPES.STORE;
      state.cart.restaurantId = state.cart.items.length ? state.cart.items[0].restaurantId || null : null;
      state.cart.couponCode = saved.couponCode && catalog.coupon(saved.couponCode) ? saved.couponCode : null;
      state.cart.tip = Number(saved.tip) || 0;
      state.cart.redeemPoints = Number(saved.redeemPoints) || 0;
    },
  };

  /* ------------------------------------------------------------------ */
  /* Wishlist & recently viewed                                           */
  /* ------------------------------------------------------------------ */

  const wishlist = {
    ids() {
      return state.wishlist.slice();
    },
    has(id) {
      return state.wishlist.indexOf(id) !== -1;
    },
    items() {
      return state.wishlist.map((id) => catalog.product(id)).filter(Boolean);
    },
    count() {
      return state.wishlist.length;
    },
    toggle(id) {
      const index = state.wishlist.indexOf(id);
      if (index === -1) {
        state.wishlist.unshift(id);
        persistNow();
        emit('wishlist:changed', { id, added: true });
        return { added: true };
      }
      state.wishlist.splice(index, 1);
      persistNow();
      emit('wishlist:changed', { id, added: false });
      return { added: false };
    },
    moveToCart(id) {
      const item = catalog.product(id);
      if (!item) return { ok: false, reason: 'Item no longer available.' };
      const result = cart.add(item, { qty: 1 });
      if (result.ok) wishlist.toggle(id);
      return result;
    },
    clear() {
      state.wishlist = [];
      persistNow();
      emit('wishlist:changed', { cleared: true });
    },
  };

  const recent = {
    view(item) {
      if (!item || !item.id) return;
      state.recent = state.recent.filter((entry) => entry.id !== item.id);
      state.recent.unshift({ id: item.id, type: item.type, at: Date.now() });
      state.recent = state.recent.slice(0, FX.config.maxRecentlyViewed);
      persistNow();
      emit('recent:changed', state.recent);
    },
    items() {
      return state.recent.map((entry) => catalog.product(entry.id)).filter(Boolean);
    },
    clear() {
      state.recent = [];
      persistNow();
      emit('recent:changed', state.recent);
    },
  };

  /* ------------------------------------------------------------------ */
  /* Search history                                                       */
  /* ------------------------------------------------------------------ */

  const history = {
    list() {
      return state.searches.slice();
    },
    add(term) {
      const value = String(term || '').trim();
      if (value.length < 2) return;
      state.searches = [value].concat(state.searches.filter((t) => t.toLowerCase() !== value.toLowerCase()));
      state.searches = state.searches.slice(0, FX.config.maxSearchHistory);
      persistNow();
      emit('search:history', state.searches);
    },
    clear() {
      state.searches = [];
      persistNow();
      emit('search:history', state.searches);
    },
  };

  /* ------------------------------------------------------------------ */
  /* Session / auth                                                       */
  /* ------------------------------------------------------------------ */

  function publicUser(account) {
    if (!account) return null;
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone || '',
      role: account.role || C.ROLES.USER,
      avatar: account.avatar || null,
      emailVerified: Boolean(account.emailVerified),
      phoneVerified: Boolean(account.phoneVerified),
      createdAt: account.createdAt,
    };
  }

  const auth = {
    user() {
      return state.session.user;
    },
    isSignedIn() {
      return Boolean(state.session.user);
    },
    isAdmin() {
      return Boolean(state.session.user && state.session.user.role === C.ROLES.ADMIN);
    },
    token() {
      return state.session.token;
    },

    async login(identifier, password, options) {
      const opts = options || {};
      if (FX.backend.useBackend()) {
        const payload = await FX.backend.auth.login({
          [String(identifier).indexOf('@') === -1 ? 'phone' : 'email']: String(identifier).trim().toLowerCase(),
          password,
          remember: Boolean(opts.remember),
        });
        return auth.applyBackendSession(payload);
      }
      return auth.demoLogin(identifier, password, opts);
    },

    async demoLogin(identifier, password, opts) {
      const key = String(identifier || '').trim().toLowerCase();
      const account = state.accounts.find(
        (a) => a.email.toLowerCase() === key || String(a.phone || '').replace(/\D/g, '') === key.replace(/\D/g, '')
      );
      if (!account) {
        const error = new Error('No account found with those details.');
        error.field = 'identifier';
        throw error;
      }
      const hash = await hashPassword(password, account.salt);
      if (hash !== account.passwordHash) {
        const error = new Error('Incorrect password. Please try again.');
        error.field = 'password';
        throw error;
      }
      if (account.lockedUntil && account.lockedUntil > Date.now()) {
        const error = new Error('This account is temporarily locked after repeated failed attempts. Try again shortly.');
        error.field = 'identifier';
        throw error;
      }
      return auth.startSession(account, { remember: opts && opts.remember });
    },

    async register(payload) {
      if (FX.backend.useBackend()) {
        const result = await FX.backend.auth.register(payload);
        return auth.applyBackendSession(result);
      }
      const email = String(payload.email || '').trim().toLowerCase();
      const phone = String(payload.phone || '').replace(/\D/g, '');
      // Validation lives in the UI *and* here: a crafted request must not be
      // able to create a junk account. The backend repeats all of it.
      const problems = [
        [FX.u.validators.minLength(2)(payload.name, 'Name'), 'name'],
        [FX.u.validators.email(email), 'email'],
        [phone ? FX.u.validators.mobile(phone) : null, 'phone'],
        [FX.u.validators.password(payload.password), 'password'],
      ].filter((entry) => entry[0]);
      if (problems.length) {
        const error = new Error(problems[0][0]);
        error.field = problems[0][1];
        throw error;
      }
      if (state.accounts.some((a) => a.email.toLowerCase() === email)) {
        const error = new Error('An account with this email already exists. Try signing in instead.');
        error.field = 'email';
        throw error;
      }
      if (phone && state.accounts.some((a) => String(a.phone || '').replace(/\D/g, '') === phone)) {
        const error = new Error('This mobile number is already registered.');
        error.field = 'phone';
        throw error;
      }
      const salt = randomSalt();
      const account = {
        id: uid('u'),
        name: String(payload.name || '').trim(),
        email,
        phone,
        salt,
        passwordHash: await hashPassword(payload.password, salt),
        role: C.ROLES.USER,
        avatar: null,
        emailVerified: false,
        phoneVerified: false,
        createdAt: new Date().toISOString(),
        resetToken: null,
        resetExpires: null,
        failedAttempts: 0,
      };
      state.accounts.push(account);
      persistNow();
      return auth.startSession(account, { isNew: true });
    },

    applyBackendSession(payload) {
      const data = payload && (payload.data || payload);
      if (!data || !data.user) throw new Error('The backend returned an unexpected session payload.');
      FX.api.setToken(data.token);
      state.session.token = data.token;
      state.session.user = data.user;
      storage.set(K.user, data.user);
      persistNow();
      emit('auth:changed', state.session.user);
      return state.session.user;
    },

    async startSession(account, options) {
      const user = publicUser(account);
      // Demo-mode session token: opaque, non-secret, local only.
      const token = 'demo.' + btoa(unescape(encodeURIComponent(JSON.stringify({ uid: user.id, iat: Date.now() })))).slice(0, 40);
      state.session.user = user;
      state.session.token = token;
      FX.api.setToken(token);
      storage.set(K.user, user);

      // Merge the guest cart into the account cart (no duplicated lines).
      const accountCartKey = 'fx_account_cart_' + user.id;
      const storedCart = storage.get(accountCartKey, null);
      const guestItems = state.cart.items.slice();
      if (storedCart && Array.isArray(storedCart.items)) {
        state.cart.items = storedCart.items.filter((line) => catalog.product(line.itemId));
        state.cart.type = storedCart.type || C.CART_TYPES.STORE;
        state.cart.restaurantId = storedCart.restaurantId || null;
        cart.mergeGuestLines(guestItems);
      } else if (guestItems.length) {
        cart.afterChange({ type: 'merge' });
      }
      if (FX.backend.useBackend() && guestItems.length) {
        try {
          await FX.backend.cart.merge({ items: guestItems.map((l) => ({ itemId: l.itemId, qty: l.qty, selection: l.selection })) });
          const remote = await FX.backend.cart.get();
          if (remote && remote.data) cart.hydrate(remote.data);
        } catch (err) {
          emit('cart:merge-failed', err);
        }
      }
      storage.set(accountCartKey, { items: state.cart.items, type: state.cart.type, restaurantId: state.cart.restaurantId });
      persistNow();
      emit('auth:changed', user);
      emit('session:started', { user, isNew: Boolean(options && options.isNew) });
      return user;
    },

    /** Persist the account cart so signing out does not lose it. */
    stashAccountCart() {
      const user = state.session.user;
      if (!user) return;
      storage.set('fx_account_cart_' + user.id, {
        items: state.cart.items,
        saved: state.cart.saved,
        type: state.cart.type,
        restaurantId: state.cart.restaurantId,
      });
    },

    async logout(options) {
      auth.stashAccountCart();
      if (FX.backend.useBackend()) {
        try {
          await FX.backend.auth.logout();
        } catch (err) {
          // Local sign-out continues even if the server call fails.
        }
      }
      state.session.user = null;
      state.session.token = null;
      FX.api.setToken(null);
      storage.remove(K.user);
      if (options && options.clearCart) {
        state.cart.items = [];
        state.cart.type = C.CART_TYPES.STORE;
        state.cart.restaurantId = null;
        persistNow();
        emit('cart:changed', { cart: state.cart, totals: cart.totals() });
      }
      emit('auth:changed', null);
      return true;
    },

    async updateProfile(patch) {
      if (FX.backend.useBackend()) {
        const result = await FX.backend.auth.updateProfile(patch);
        state.session.user = (result && (result.data || result).user) || Object.assign({}, state.session.user, patch);
      } else {
        const account = state.accounts.find((a) => a.id === state.session.user.id);
        if (!account) throw new Error('Account not found.');
        Object.assign(account, patch);
        state.session.user = publicUser(account);
      }
      storage.set(K.user, state.session.user);
      persistNow();
      emit('auth:changed', state.session.user);
      return state.session.user;
    },

    async changePassword(currentPassword, nextPassword) {
      if (FX.backend.useBackend()) {
        return FX.backend.auth.changePassword({ currentPassword, newPassword: nextPassword });
      }
      const account = state.accounts.find((a) => a.id === state.session.user.id);
      if (!account) throw new Error('Account not found.');
      const currentHash = await hashPassword(currentPassword, account.salt);
      if (currentHash !== account.passwordHash) {
        const error = new Error('Your current password is incorrect.');
        error.field = 'currentPassword';
        throw error;
      }
      account.salt = randomSalt();
      account.passwordHash = await hashPassword(nextPassword, account.salt);
      persistNow();
      notifications.push({
        kind: C.NOTIFICATION_KINDS.ACCOUNT,
        title: 'Password updated',
        message: 'Your Food Express password was changed. If this was not you, contact support.',
      });
      return { ok: true };
    },

    /** Demo-mode password reset: issues a local reset code shown to the user. */
    async forgotPassword(identifier) {
      const key = String(identifier || '').trim().toLowerCase();
      if (FX.backend.useBackend()) return FX.backend.auth.forgotPassword({ email: key });
      const account = state.accounts.find((a) => a.email.toLowerCase() === key);
      if (!account) {
        const error = new Error('No account uses that email address.');
        error.field = 'email';
        throw error;
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      account.resetToken = await hashPassword(code, account.salt);
      account.resetExpires = Date.now() + 15 * 60 * 1000;
      persistNow();
      // No email provider is configured in this build, so the code is shown in
      // the UI and clearly labelled as a demo reset.
      return { ok: true, demoCode: code, channel: 'demo' };
    },

    async resetPassword(identifier, code, newPassword) {
      const key = String(identifier || '').trim().toLowerCase();
      if (FX.backend.useBackend()) return FX.backend.auth.resetPassword({ email: key, token: code, password: newPassword });
      const account = state.accounts.find((a) => a.email.toLowerCase() === key);
      if (!account || !account.resetToken) throw new Error('Start the reset flow again — this link is not valid.');
      if (account.resetExpires < Date.now()) throw new Error('This reset code has expired. Request a new one.');
      const hash = await hashPassword(String(code), account.salt);
      if (hash !== account.resetToken) throw new Error('That reset code is not correct.');
      account.salt = randomSalt();
      account.passwordHash = await hashPassword(newPassword, account.salt);
      account.resetToken = null;
      account.resetExpires = null;
      account.failedAttempts = 0;
      persistNow();
      return { ok: true };
    },

    /** Seed the documented demo accounts (bcrypt-equivalent: salted SHA-256). */
    async seedDemoAccounts() {
      const demo = FX.config.demoCredentials;
      const wanted = [
        { email: demo.admin.email, password: demo.admin.password, name: 'Food Express Admin', role: C.ROLES.ADMIN, phone: '9000000001' },
        { email: demo.user.email, password: demo.user.password, name: 'Test User', role: C.ROLES.USER, phone: '9000000002' },
      ];
      for (const entry of wanted) {
        // eslint-disable-next-line no-await-in-loop
        if (state.accounts.some((a) => a.email === entry.email)) continue;
        const salt = randomSalt();
        // eslint-disable-next-line no-await-in-loop
        const passwordHash = await hashPassword(entry.password, salt);
        state.accounts.push({
          id: uid('u'),
          name: entry.name,
          email: entry.email,
          phone: entry.phone,
          salt,
          passwordHash,
          role: entry.role,
          avatar: null,
          emailVerified: true,
          phoneVerified: entry.role === C.ROLES.ADMIN,
          createdAt: new Date().toISOString(),
          resetToken: null,
          resetExpires: null,
          failedAttempts: 0,
          seeded: true,
        });
      }
      persistNow();
    },
  };

  /* ------------------------------------------------------------------ */
  /* Addresses                                                            */
  /* ------------------------------------------------------------------ */

  const addresses = {
    list() {
      return state.addresses.slice();
    },
    get(id) {
      return state.addresses.find((a) => a.id === id) || null;
    },
    defaultAddress() {
      return state.addresses.find((a) => a.isDefault) || state.addresses[0] || null;
    },
    async create(payload) {
      const record = Object.assign(
        {
          id: uid('addr'),
          label: payload.label || 'Home',
          type: payload.type || 'home',
          receiver: payload.receiver || (state.session.user ? state.session.user.name : 'Guest'),
          phone: payload.phone || (state.session.user ? state.session.user.phone : ''),
          line1: payload.line1,
          line2: payload.line2 || '',
          landmark: payload.landmark || '',
          cityId: payload.cityId || state.location.cityId,
          localityId: payload.localityId || state.location.localityId,
          pincode: payload.pincode,
          isDefault: payload.isDefault || state.addresses.length === 0,
          createdAt: new Date().toISOString(),
        },
        {}
      );
      if (FX.backend.useBackend()) {
        const created = await FX.backend.addresses.create(record);
        Object.assign(record, (created && (created.data || created)) || {});
      }
      if (record.isDefault) state.addresses.forEach((a) => (a.isDefault = false));
      state.addresses.push(record);
      persistNow();
      emit('addresses:changed', state.addresses);
      return record;
    },
    async update(id, patch) {
      const record = addresses.get(id);
      if (!record) throw new Error('Address not found.');
      Object.assign(record, patch);
      if (record.isDefault) state.addresses.forEach((a) => (a.isDefault = a.id === id));
      if (FX.backend.useBackend()) await FX.backend.addresses.update(id, patch);
      persistNow();
      emit('addresses:changed', state.addresses);
      return record;
    },
    async remove(id) {
      const index = state.addresses.findIndex((a) => a.id === id);
      if (index === -1) return false;
      const [removed] = state.addresses.splice(index, 1);
      if (removed.isDefault && state.addresses.length) state.addresses[0].isDefault = true;
      if (FX.backend.useBackend()) {
        try {
          await FX.backend.addresses.remove(id);
        } catch (err) {
          /* keep local state consistent with what the user asked for */
        }
      }
      persistNow();
      emit('addresses:changed', state.addresses);
      return true;
    },
    setDefault(id) {
      state.addresses.forEach((a) => (a.isDefault = a.id === id));
      persistNow();
      emit('addresses:changed', state.addresses);
    },
    cityOf(address) {
      return FX.locations.getCity(address.cityId);
    },
    format(address) {
      const city = FX.locations.getCity(address.cityId);
      return [address.line1, address.line2, address.landmark, city ? city.name : '', address.pincode]
        .filter(Boolean)
        .join(', ');
    },
  };

  /* ------------------------------------------------------------------ */
  /* Notifications                                                        */
  /* ------------------------------------------------------------------ */

  const notifications = {
    list() {
      return state.notifications.slice();
    },
    unreadCount() {
      return state.notifications.filter((n) => !n.read).length;
    },
    push(notification) {
      const record = Object.assign(
        {
          id: uid('n'),
          kind: C.NOTIFICATION_KINDS.ORDER,
          title: 'Update',
          message: '',
          read: false,
          href: null,
          createdAt: new Date().toISOString(),
        },
        notification
      );
      state.notifications.unshift(record);
      state.notifications = state.notifications.slice(0, 60);
      persistNow();
      emit('notifications:changed', state.notifications);
      return record;
    },
    markRead(id) {
      const item = state.notifications.find((n) => n.id === id);
      if (!item) return false;
      item.read = true;
      persistNow();
      emit('notifications:changed', state.notifications);
      return true;
    },
    markAllRead() {
      state.notifications.forEach((n) => (n.read = true));
      persistNow();
      emit('notifications:changed', state.notifications);
    },
    clear() {
      state.notifications = [];
      persistNow();
      emit('notifications:changed', state.notifications);
    },
    remove(id) {
      state.notifications = state.notifications.filter((n) => n.id !== id);
      persistNow();
      emit('notifications:changed', state.notifications);
    },
  };

  /* ------------------------------------------------------------------ */
  /* Rewards & coupons                                                    */
  /* ------------------------------------------------------------------ */

  const rewards = {
    points() {
      return state.rewards.points;
    },
    value() {
      return Math.round(state.rewards.points * state.settings.loyalty.pointValue);
    },
    history() {
      return state.rewards.history.slice();
    },
    credit(points, reason, ref) {
      const amount = Math.max(0, Math.floor(points || 0));
      if (!amount) return 0;
      state.rewards.points += amount;
      state.rewards.history.unshift({
        id: uid('rw'),
        type: 'credit',
        points: amount,
        reason: reason || 'Order reward',
        ref: ref || null,
        at: new Date().toISOString(),
      });
      persistNow();
      emit('rewards:changed', state.rewards);
      return amount;
    },
    debit(points, reason, ref) {
      const amount = Math.max(0, Math.min(Math.floor(points || 0), state.rewards.points));
      if (!amount) return 0;
      state.rewards.points -= amount;
      state.rewards.history.unshift({
        id: uid('rw'),
        type: 'debit',
        points: amount,
        reason: reason || 'Redeemed on order',
        ref: ref || null,
        at: new Date().toISOString(),
      });
      persistNow();
      emit('rewards:changed', state.rewards);
      return amount;
    },
    canRedeem() {
      return state.rewards.points >= state.settings.loyalty.minRedeemPoints;
    },
  };

  const coupons = {
    list() {
      return catalog.coupons();
    },
    active() {
      const now = Date.now();
      return catalog.coupons().filter(
        (c) =>
          c.active !== false &&
          (!c.validFrom || new Date(c.validFrom).getTime() <= now) &&
          (!c.validTo || new Date(c.validTo).getTime() >= now)
      );
    },
    get(code) {
      return catalog.coupon(code);
    },
    validate(code) {
      const coupon = catalog.coupon(code);
      if (!coupon) return { ok: false, reason: 'We could not find the code ' + String(code || '').toUpperCase() + '.' };
      const totals = cart.totals();
      return pricing.validateCoupon(coupon, {
        items: state.cart.items,
        eligibleSubtotal: totals.eligibleSubtotal,
        cartType: state.cart.type,
        restaurantId: state.cart.restaurantId,
        orderCount: state.orders.filter((o) => o.status !== C.CANCELLED).length,
        couponUses: state.couponUses,
        isNewUser: state.orders.length === 0,
      });
    },
    apply(code) {
      const result = coupons.validate(code);
      if (!result.ok) {
        state.cart.couponCode = null;
        cart.afterChange({ type: 'coupon-invalid' });
        return result;
      }
      cart.setCoupon(result.coupon.code);
      return Object.assign({ applied: true }, result);
    },
    remove() {
      cart.setCoupon(null);
      return { ok: true };
    },
    usesOf(code) {
      return state.couponUses[code] || 0;
    },
  };

  /* ------------------------------------------------------------------ */
  /* Orders                                                               */
  /* ------------------------------------------------------------------ */

  const orders = {
    list() {
      return state.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    get(id) {
      return state.orders.find((o) => o.id === id) || null;
    },

    /**
     * Place an order. Prices, stock and coupon eligibility are re-validated
     * here (and again by the backend in backend mode) — the UI totals are
     * never trusted blindly.
     */
    async place(payload) {
      const draft = payload || {};
      if (!state.cart.items.length) throw new Error('Your cart is empty.');
      if (!location.isServiceable()) {
        throw new Error('Delivery is not available for the selected location yet.');
      }
      const address = draft.addressId ? addresses.get(draft.addressId) : draft.address;
      if (!address) throw new Error('Choose a delivery address to continue.');
      if (draft.paymentMethod === C.PAYMENT_METHODS.DEMO && !state.settings.features.demoPayments) {
        throw new Error('Demo payments are disabled in settings.');
      }

      // Re-validate stock against the catalogue.
      const outOfStock = [];
      state.cart.items.forEach((line) => {
        const item = catalog.product(line.itemId);
        if (!item || item.stock < line.qty) outOfStock.push(line.name);
      });
      if (outOfStock.length) {
        throw new Error('Out of stock: ' + outOfStock.join(', ') + '. Update the quantity and try again.');
      }

      const totals = cart.totals();
      if (!totals.canCheckout) {
        throw new Error(totals.belowMinOrder || totals.restaurantMinOrder || 'This cart cannot be checked out yet.');
      }

      let record;
      if (FX.backend.useBackend()) {
        const response = await FX.backend.orders.place({
          addressId: draft.addressId,
          paymentMethod: draft.paymentMethod,
          couponCode: state.cart.couponCode,
          tip: state.cart.tip,
          redeemPoints: state.cart.redeemPoints,
          deliverySlot: draft.deliverySlot || 'standard',
          notes: draft.notes || '',
        });
        record = (response && (response.data || response)) || null;
        if (!record) throw new Error('The backend did not return an order.');
      } else {
        record = {
          id: FX.u.orderId(),
          createdAt: new Date().toISOString(),
          userId: state.session.user ? state.session.user.id : 'guest',
          userName: state.session.user ? state.session.user.name : address.receiver,
          cartType: state.cart.type,
          restaurantId: state.cart.restaurantId,
          restaurantName: state.cart.restaurantId ? (cart.restaurant() || {}).name : null,
          items: state.cart.items.map((line) => clone(line)),
          address: clone(address),
          location: clone(state.location),
          paymentMethod: draft.paymentMethod || C.PAYMENT_METHODS.DEMO,
          paymentStatus:
            draft.paymentMethod === C.PAYMENT_METHODS.COD ? C.PAYMENT_STATUS.PENDING : C.PAYMENT_STATUS.PAID,
          paymentNote:
            draft.paymentMethod === C.PAYMENT_METHODS.DEMO
              ? 'Simulated payment — no real gateway was charged.'
              : draft.paymentMethod === C.PAYMENT_METHODS.COD
                ? 'Cash to be collected on delivery (simulated).'
                : '',
          couponCode: totals.couponCode,
          totals: {
            merchandiseSubtotal: totals.merchandiseSubtotal,
            eligibleSubtotal: totals.eligibleSubtotal,
            itemSavings: totals.itemSavings,
            couponDiscount: totals.couponDiscount,
            autoOfferDiscount: totals.autoOfferDiscount,
            loyaltyDiscount: totals.loyaltyDiscount,
            totalDiscount: totals.discountsTotal,
            discountsTotal: totals.discountsTotal,
            mrpTotal: totals.mrpTotal,
            totalSavings: totals.totalSavings,
            deliveryFee: totals.deliveryFee,
            packingFee: totals.packingFee,
            smallOrderFee: totals.smallOrderFee || 0,
            surgeFee: totals.surgeFee,
            tip: totals.tip,
            configuredDeliveryFee: totals.configuredDeliveryFee,
            gstIncluded: totals.gstIncluded,
            grandTotal: totals.grandTotal,
            freeDeliveryUnlocked: totals.freeDeliveryUnlocked,
            freeDeliveryThreshold: totals.freeDeliveryThreshold,
          },
          status: C.STORE_ORDER_FLOW[0],
          statusHistory: [
            { status: C.STORE_ORDER_FLOW[0], at: new Date().toISOString(), note: 'Order received' },
          ],
          etaMinutes: totals.items.reduce((max, line) => Math.max(max, line.handlingMinutes || 0), 0) + (location.etaMinutes(0) || 20),
          deliverySlot: draft.deliverySlot || 'standard',
          notes: draft.notes || '',
          simulated: true,
          loyaltyEarned: totals.earnedPoints,
          loyaltyRedeemed: totals.redeemPoints,
        };
        record.flow = C.orderFlowFor(record.cartType);
        state.orders.unshift(record);
      }

      // Consume stock in demo mode so inventory stays believable.
      if (!FX.backend.useBackend()) {
        state.cart.items.forEach((line) => {
          const item = catalog.product(line.itemId);
          if (item) item.stock = Math.max(0, item.stock - line.qty);
        });
      }

      // Loyalty + coupon usage bookkeeping.
      if (totals.couponCode) {
        state.couponUses[totals.couponCode] = (state.couponUses[totals.couponCode] || 0) + 1;
      }
      if (totals.redeemPoints) rewards.debit(totals.redeemPoints, 'Redeemed on order ' + record.id, record.id);
      if (totals.earnedPoints) rewards.credit(totals.earnedPoints, 'Earned on order ' + record.id, record.id);

      notifications.push({
        kind: C.NOTIFICATION_KINDS.ORDER,
        title: 'Order ' + record.id + ' placed',
        message:
          money(record.totals ? record.totals.grandTotal : totals.grandTotal) +
          ' · ' +
          (record.items ? record.items.length : state.cart.items.length) +
          ' ' +
          FX.u.pluralize(record.items ? record.items.length : state.cart.items.length, 'item') +
          '. You can track it from your orders.',
        href: FX.url('order', { id: record.id }),
        orderId: record.id,
      });

      if (state.session.user) auth.stashAccountCart();
      cart.clear({ keepSaved: true });
      persistNow();
      emit('order:placed', record);

      if (!FX.backend.useBackend() && state.settings.features.demoPayments) {
        orders.scheduleSimulation(record.id);
      }
      return record;
    },

    /** Clearly labelled simulated status progression for demo orders. */
    scheduleSimulation(orderIdValue, options) {
      const opts = options || {};
      const order = orders.get(orderIdValue);
      if (!order || order.simulationDone) return;
      order.simulationDone = true;
      const flow = C.orderFlowFor(order.cartType);
      const stepMs = opts.stepMs || 22000;
      let index = flow.indexOf(order.status);
      const timer = global.setInterval(() => {
        const current = orders.get(orderIdValue);
        if (!current || current.status === C.CANCELLED) {
          global.clearInterval(timer);
          return;
        }
        index += 1;
        if (index >= flow.length) {
          global.clearInterval(timer);
          return;
        }
        orders.setStatus(orderIdValue, flow[index], {
          note: 'Simulated status update (demo build)',
          silent: opts.silent,
        });
      }, stepMs);
      order.simulationTimer = timer;
    },

    setStatus(orderIdValue, status, options) {
      const order = orders.get(orderIdValue);
      if (!order) return null;
      const opts = options || {};
      order.status = status;
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ status, at: new Date().toISOString(), note: opts.note || '' });
      if (status === C.CANCELLED) {
        order.cancelledAt = new Date().toISOString();
        order.cancelReason = opts.reason || '';
        if (order.paymentStatus === C.PAYMENT_STATUS.PAID) {
          order.paymentStatus = C.PAYMENT_STATUS.REFUNDED;
          order.refundNote = 'Refund simulated — no payment gateway is connected in this build.';
        }
        if (order.couponCode) {
          state.couponUses[order.couponCode] = Math.max(0, (state.couponUses[order.couponCode] || 1) - 1);
        }
        if (order.loyaltyRedeemed) rewards.credit(order.loyaltyRedeemed, 'Returned after cancellation', order.id);
      }
      if (status === 'DELIVERED') order.deliveredAt = new Date().toISOString();
      persistNow();
      if (!opts.silent) {
        notifications.push({
          kind: C.NOTIFICATION_KINDS.ORDER,
          title: 'Order ' + order.id + ' · ' + C.ORDER_STATUS_LABELS[status],
          message: C.ORDER_STATUS_COPY[status] + (opts.note ? ' (' + opts.note + ')' : ''),
          href: FX.url('order', { id: order.id }),
          orderId: order.id,
        });
      }
      emit('order:updated', order);
      return order;
    },

    canCancel(order) {
      if (!order || order.status === C.CANCELLED || order.status === 'DELIVERED') return false;
      return order.status !== 'OUT_FOR_DELIVERY';
    },

    async cancel(orderIdValue, reason) {
      const order = orders.get(orderIdValue);
      if (!order) throw new Error('Order not found.');
      if (!orders.canCancel(order)) throw new Error('This order can no longer be cancelled.');
      if (FX.backend.useBackend()) {
        await FX.backend.orders.cancel(orderIdValue, { reason });
      }
      // Restore stock in demo mode.
      if (!FX.backend.useBackend()) {
        (order.items || []).forEach((line) => {
          const item = catalog.product(line.itemId);
          if (item) item.stock += line.qty;
        });
      }
      return orders.setStatus(orderIdValue, C.CANCELLED, { reason, note: 'Cancelled by customer' });
    },

    /** Reorder: pushes every still-available line back into the cart. */
    reorder(orderIdValue) {
      const order = orders.get(orderIdValue);
      if (!order) return { ok: false, reason: 'Order not found.' };
      const skipped = [];
      let added = 0;
      let needsSwitch = null;
      (order.items || []).forEach((line) => {
        const item = catalog.product(line.itemId);
        if (!item || item.stock <= 0) {
          skipped.push(line.name + ' (unavailable)');
          return;
        }
        // The first line may replace the current cart; later lines must match it.
        const result = cart.add(item, { qty: line.qty, selection: line.selection, forceSwitch: added === 0 });
        if (result.needsSwitch) {
          if (!needsSwitch) needsSwitch = result.conflict;
          skipped.push(line.name);
          return;
        }
        if (result.ok) added += 1;
        else skipped.push(line.name + (result.reason ? ' (' + result.reason + ')' : ''));
      });
      return { ok: added > 0, added, skipped, needsSwitch };
    },

    /** Order-level stats for the account dashboard. */
    stats() {
      const list = orders.list();
      const active = list.filter((o) => o.status !== C.CANCELLED && o.status !== 'DELIVERED');
      const delivered = list.filter((o) => o.status === 'DELIVERED');
      const spend = list
        .filter((o) => o.status !== C.CANCELLED)
        .reduce((sum, o) => sum + ((o.totals && o.totals.grandTotal) || 0), 0);
      return { total: list.length, active: active.length, delivered: delivered.length, spend };
    },
  };

  /* ------------------------------------------------------------------ */
  /* Support tickets                                                      */
  /* ------------------------------------------------------------------ */

  const support = {
    list() {
      return state.tickets.slice();
    },
    async create(payload) {
      const ticket = Object.assign(
        {
          id: 'FXS-' + String(Date.now()).slice(-6),
          status: 'open',
          createdAt: new Date().toISOString(),
          replies: [],
        },
        payload
      );
      if (FX.backend.useBackend()) {
        try {
          const created = await FX.backend.support.createTicket(payload);
          Object.assign(ticket, (created && (created.data || created)) || {});
        } catch (err) {
          throw err;
        }
      }
      state.tickets.unshift(ticket);
      notifications.push({
        kind: C.NOTIFICATION_KINDS.SUPPORT,
        title: 'Support ticket ' + ticket.id + ' created',
        message: 'Our team will respond to “' + ticket.subject + '”. This is an in-app demo ticket.',
      });
      persistNow();
      emit('tickets:changed', state.tickets);
      return ticket;
    },
  };

  /* ------------------------------------------------------------------ */
  /* Preferences & settings                                               */
  /* ------------------------------------------------------------------ */

  const preferences = {
    get() {
      return Object.assign({}, state.preferences);
    },
    update(patch) {
      Object.assign(state.preferences, patch);
      persistNow();
      emit('preferences:changed', state.preferences);
      return preferences.get();
    },
  };

  const settings = {
    get() {
      return state.settings;
    },
    update(patch) {
      state.settings = FX.settings.withSettings(Object.assign({}, state.settings, patch));
      persistNow();
      emit('settings:changed', state.settings);
      cart.afterChange({ type: 'settings' });
      return state.settings;
    },
    reset() {
      state.settings = clone(FX.settings.DEFAULT_SETTINGS);
      persistNow();
      emit('settings:changed', state.settings);
      return state.settings;
    },
  };

  /* ------------------------------------------------------------------ */
  /* Admin mutations (demo mode = localStorage layer over the seed data)  */
  /* ------------------------------------------------------------------ */

  function ensureAdminLayer() {
    if (!state.adminCatalog) {
      state.adminCatalog = { productPatches: [], customProducts: [], menuPatches: [], couponPatches: [], restaurantPatches: [] };
    }
    return state.adminCatalog;
  }

  const admin = {
    async saveProduct(product) {
      if (FX.backend.useBackend()) {
        const isUpdate = Boolean(product.id) && catalog.product(product.id);
        const result = isUpdate
          ? await FX.backend.admin.updateProduct(product.id, product)
          : await FX.backend.admin.createProduct(product);
        const saved = (result && (result.data || result)) || product;
        const index = state.catalog.products.findIndex((p) => p.id === saved.id);
        if (index >= 0) state.catalog.products[index] = saved;
        else state.catalog.products.push(saved);
        return saved;
      }
      const layer = ensureAdminLayer();
      const existing = catalog.product(product.id);
      if (existing) {
        const patch = Object.assign({}, product);
        const idx = layer.productPatches.findIndex((p) => p.id === product.id);
        if (idx >= 0) layer.productPatches[idx] = patch;
        else layer.productPatches.push(patch);
        Object.assign(existing, patch);
      } else {
        const created = Object.assign(
          {
            id: product.id || 'p-' + FX.catalog.slugify(product.name) + '-' + FX.u.uid('x').slice(-4),
            slug: FX.catalog.slugify(product.name),
            type: 'product',
            rating: 0,
            reviewCount: 0,
            popularity: 50,
            active: true,
            tags: [],
            attributes: {},
            variants: [],
            createdAt: new Date().toISOString(),
          },
          product
        );
        created.mrp = created.mrp || created.price;
        created.discountPercent =
          created.mrp > created.price ? Math.round(((created.mrp - created.price) / created.mrp) * 100) : 0;
        created.inStock = created.stock > 0;
        layer.customProducts.push(created);
        state.catalog.products.push(created);
      }
      persistNow();
      emit('catalog:changed', state.catalog);
      return catalog.product(product.id) || product;
    },

    async saveMenuItem(restaurantId, patch) {
      if (FX.backend.useBackend()) {
        return FX.backend.admin.updateProduct(patch.id, Object.assign({ restaurantId }, patch));
      }
      const layer = ensureAdminLayer();
      const idx = layer.menuPatches.findIndex((p) => p.id === patch.id);
      const record = Object.assign({ restaurantId }, patch);
      if (idx >= 0) layer.menuPatches[idx] = record;
      else layer.menuPatches.push(record);
      const item = state.catalog.menuItems.find((m) => m.id === patch.id);
      if (item) Object.assign(item, patch);
      const restaurant = state.catalog.restaurants.find((r) => r.id === restaurantId);
      if (restaurant) {
        const menuItem = restaurant.menu.find((m) => m.id === patch.id);
        if (menuItem) Object.assign(menuItem, patch);
      }
      persistNow();
      emit('catalog:changed', state.catalog);
      return item;
    },

    /**
     * Patch a restaurant record (min order, ETA, fees, visibility, cities).
     * Menu items are edited through saveMenuItem.
     */
    async saveRestaurant(restaurantId, patch) {
      if (FX.backend.useBackend()) {
        return FX.backend.admin.updateProduct(restaurantId, Object.assign({ type: 'restaurant' }, patch));
      }
      const layer = ensureAdminLayer();
      if (!Array.isArray(layer.restaurantPatches)) layer.restaurantPatches = [];
      const record = Object.assign({ id: restaurantId }, patch);
      const idx = layer.restaurantPatches.findIndex((entry) => entry.id === restaurantId);
      if (idx >= 0) layer.restaurantPatches[idx] = Object.assign({}, layer.restaurantPatches[idx], record);
      else layer.restaurantPatches.push(record);
      const restaurant = state.catalog.restaurants.find((entry) => entry.id === restaurantId);
      if (restaurant) Object.assign(restaurant, patch);
      persistNow();
      emit('catalog:changed', state.catalog);
      return restaurant || record;
    },

    async saveCoupon(coupon) {
      if (FX.backend.useBackend()) return FX.backend.admin.saveCoupon(coupon);
      const layer = ensureAdminLayer();
      const code = String(coupon.code || '').trim().toUpperCase();
      const record = Object.assign({}, coupon, { code });
      const idx = layer.couponPatches.findIndex((c) => c.code === code);
      if (idx >= 0) layer.couponPatches[idx] = record;
      else layer.couponPatches.push(record);
      const existing = state.catalog.coupons.findIndex((c) => c.code === code);
      if (existing >= 0) state.catalog.coupons[existing] = Object.assign({}, state.catalog.coupons[existing], record);
      else state.catalog.coupons.push(record);
      persistNow();
      emit('catalog:changed', state.catalog);
      return record;
    },

    async deleteCoupon(code) {
      if (FX.backend.useBackend()) return FX.backend.admin.deleteCoupon(code);
      const key = String(code).toUpperCase();
      const layer = ensureAdminLayer();
      layer.couponPatches = layer.couponPatches.filter((c) => c.code !== key);
      layer.couponPatches.push({ code: key, active: false, deleted: true });
      const idx = state.catalog.coupons.findIndex((c) => c.code === key);
      if (idx >= 0) state.catalog.coupons[idx].active = false;
      persistNow();
      emit('catalog:changed', state.catalog);
      return true;
    },

    async saveSettings(patch) {
      if (FX.backend.useBackend()) {
        await FX.backend.admin.settings.save(patch);
      }
      return settings.update(patch);
    },

    async stats() {
      if (FX.backend.useBackend()) return FX.backend.admin.stats();
      const products = catalog.products();
      const lowStock = products.filter((p) => p.stock <= state.settings.lowStockThreshold);
      const revenue = orders
        .list()
        .filter((o) => o.status !== C.CANCELLED)
        .reduce((sum, o) => sum + ((o.totals && o.totals.grandTotal) || 0), 0);
      return {
        users: state.accounts.length,
        products: products.length,
        restaurants: state.catalog.restaurants.length,
        menuItems: state.catalog.menuItems.length,
        orders: orders.list().length,
        revenue,
        lowStock: lowStock.length,
        outOfStock: products.filter((p) => p.stock <= 0).length,
        coupons: catalog.coupons().length,
      };
    },
  };

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */

  async function boot(options) {
    const opts = options || {};
    if (state.ready && !opts.force) return state;

    // 1. Restore local persistence first so the UI can paint instantly.
    state.wishlist = storage.get(K.wishlist, []) || [];
    state.recent = storage.get(K.recent, []) || [];
    state.searches = storage.get(K.searches, []) || [];
    state.location = Object.assign(state.location, storage.get(K.location, {}) || {});
    state.addresses = storage.get(K.addresses, []) || [];
    state.orders = storage.get(K.orders, []) || [];
    state.notifications = storage.get(K.notifications, []) || [];
    state.rewards = Object.assign({ points: 0, history: [] }, storage.get(K.rewards, {}) || {});
    state.couponUses = storage.get(K.couponsWallet, {}) || {};
    state.preferences = Object.assign(state.preferences, storage.get(K.preferences, {}) || {});
    state.tickets = storage.get(K.tickets, []) || [];
    state.accounts = storage.get(K.demoAccounts, []) || [];
    state.adminCatalog = storage.get(K.adminCatalog, null);
    const storedSettings = storage.get(K.settings, null);
    if (storedSettings) state.settings = FX.settings.withSettings(storedSettings);

    // 2. Seed the demo catalogue, then layer admin edits on top.
    seedDemoCatalog();
    applyAdminOverrides();
    state.catalog.loaded = true;

    // 3. Session.
    const storedUser = storage.get(K.user, null);
    const storedToken = FX.api.getToken();
    if (storedUser && storedToken) {
      state.session.user = storedUser;
      state.session.token = storedToken;
    }

    // 4. Cart (re-priced from the catalogue).
    cart.hydrate(storage.get(K.cart, null));

    // 5. Probe the backend and, when available, prefer it as the source of truth.
    const mode = await FX.backend.probe(opts.forceProbe);
    state.mode = mode === 'backend' ? 'backend' : 'demo';

    if (state.mode === 'backend') {
      try {
        await loadFromBackend();
      } catch (err) {
        state.catalog.error = err;
        emit('catalog:error', err);
      }
    } else if (!FX.backend.useBackend()) {
      await auth.seedDemoAccounts();
      // Restore a demo session if the stored user still exists locally.
      if (state.session.user) {
        const account = state.accounts.find((a) => a.id === state.session.user.id);
        if (!account) {
          state.session.user = null;
          state.session.token = null;
          FX.api.setToken(null);
          storage.remove(K.user);
        }
      }
    }

    state.ready = true;
    emit('store:ready', { mode: state.mode });
    emit('cart:changed', { cart: state.cart, totals: cart.totals() });
    emit('wishlist:changed', {});
    emit('notifications:changed', state.notifications);
    return state;
  }

  async function loadFromBackend() {
    const results = await Promise.allSettled([
      FX.backend.catalog.products({ limit: 500 }),
      FX.backend.catalog.categories(),
      FX.backend.catalog.restaurants({ limit: 100 }),
      FX.backend.catalog.settings(),
      FX.backend.coupons.list(),
    ]);
    const [products, categories, restaurants, remoteSettings, remoteCoupons] = results;
    if (products.status === 'fulfilled' && products.value && products.value.data) {
      state.catalog.products = products.value.data;
      state.catalog.source = 'backend';
    }
    if (categories.status === 'fulfilled' && categories.value && categories.value.data) {
      state.catalog.categories = categories.value.data;
    }
    if (restaurants.status === 'fulfilled' && restaurants.value && restaurants.value.data) {
      state.catalog.restaurants = restaurants.value.data;
      state.catalog.menuItems = restaurants.value.data.reduce((acc, r) => acc.concat(r.menu || []), []);
    }
    if (remoteSettings.status === 'fulfilled' && remoteSettings.value && remoteSettings.value.data) {
      state.settings = FX.settings.withSettings(remoteSettings.value.data);
    }
    if (remoteCoupons.status === 'fulfilled' && remoteCoupons.value && remoteCoupons.value.data) {
      state.catalog.coupons = remoteCoupons.value.data;
    }

    // Authenticated data.
    if (state.session.token) {
      const authed = await Promise.allSettled([
        FX.backend.cart.get(),
        FX.backend.orders.list({ limit: 50 }),
        FX.backend.addresses.list(),
        FX.backend.wishlist.get(),
        FX.backend.notifications.list(),
        FX.backend.auth.me(),
      ]);
      const [remoteCart, remoteOrders, remoteAddresses, remoteWishlist, remoteNotifications, me] = authed;
      if (remoteCart.status === 'fulfilled' && remoteCart.value && remoteCart.value.data) cart.hydrate(remoteCart.value.data);
      if (remoteOrders.status === 'fulfilled' && remoteOrders.value && remoteOrders.value.data) state.orders = remoteOrders.value.data;
      if (remoteAddresses.status === 'fulfilled' && remoteAddresses.value && remoteAddresses.value.data) state.addresses = remoteAddresses.value.data;
      if (remoteWishlist.status === 'fulfilled' && remoteWishlist.value && remoteWishlist.value.data) {
        state.wishlist = (remoteWishlist.value.data.items || remoteWishlist.value.data).map((i) => i.itemId || i);
      }
      if (remoteNotifications.status === 'fulfilled' && remoteNotifications.value && remoteNotifications.value.data) {
        state.notifications = remoteNotifications.value.data;
      }
      if (me.status === 'fulfilled' && me.value && me.value.data) {
        state.session.user = me.value.data.user || me.value.data;
        storage.set(K.user, state.session.user);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Merchandising helpers for the homepage                               */
  /* ------------------------------------------------------------------ */

  const home = {
    bestSellers(limit) {
      return catalog
        .query(catalog.products(), { sort: 'popular' })
        .filter((p) => (p.tags || []).indexOf('bestseller') !== -1 || p.popularity >= 85)
        .slice(0, limit || 12);
    },
    popularNearYou(limit) {
      const city = location.city();
      const seed = (city ? city.id : 'vijayawada') + (state.session.user ? state.session.user.id : 'guest');
      const picks = FX.catalog.seededPick(seed, 40).filter((p) => catalog.products().some((c) => c.id === p.id));
      picks.sort((a, b) => b.popularity - a.popularity);
      return picks.slice(0, limit || 12);
    },
    trending(limit) {
      return catalog
        .products()
        .filter((p) => (p.tags || []).indexOf('trending') !== -1)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit || 12);
    },
    deals(limit) {
      return catalog
        .products()
        .filter((p) => (p.tags || []).indexOf('deal') !== -1 && p.stock > 0)
        .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0) || b.popularity - a.popularity)
        .slice(0, limit || 12);
    },
    under(price, limit) {
      const max = price || 99;
      return catalog
        .products()
        .filter((p) => p.price <= max && p.stock > 0)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit || 12);
    },
    freshArrivals(limit) {
      return catalog
        .products()
        .filter((p) => (p.tags || []).indexOf('new') !== -1 || (p.tags || []).indexOf('fresh') !== -1)
        .slice(0, limit || 12);
    },
    seasonal(limit) {
      return catalog
        .products()
        .filter((p) => (p.tags || []).indexOf('seasonal') !== -1)
        .slice(0, limit || 12);
    },
    essentials(limit) {
      return catalog
        .products()
        .filter((p) => (p.tags || []).indexOf('essential') !== -1)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit || 12);
    },
    freshProduce(limit) {
      return catalog
        .products()
        .filter((p) => p.categoryId === 'fruits-vegetables')
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit || 12);
    },
    recommended(limit) {
      const base = [];
      wishlist.items().forEach((item) => base.push(item.categoryId));
      recent.items().forEach((item) => base.push(item.categoryId));
      cart.items.forEach((line) => base.push(line.categoryId));
      if (!base.length) {
        const seed = (state.session.user ? state.session.user.id : 'guest') + location.cityId;
        return FX.catalog.seededPick(seed, limit || 12).filter((p) => catalog.products().some((c) => c.id === p.id));
      }
      const counts = {};
      base.forEach((cat) => (counts[cat] = (counts[cat] || 0) + 1));
      const preferred = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      const seen = new Set();
      const out = [];
      preferred.forEach((categoryId) => {
        catalog
          .query(catalog.byCategory ? catalog.products() : catalog.products(), { categoryId, sort: 'popular', inStock: true })
          .slice(0, 4)
          .forEach((p) => {
            if (out.length >= (limit || 12) || seen.has(p.id)) return;
            seen.add(p.id);
            out.push(p);
          });
      });
      return out;
    },
    reorderFavourites(limit) {
      const bought = {};
      orders.list().forEach((order) => {
        if (order.status === C.CANCELLED) return;
        (order.items || []).forEach((line) => {
          bought[line.itemId] = (bought[line.itemId] || 0) + line.qty;
        });
      });
      const ids = Object.keys(bought).sort((a, b) => bought[b] - bought[a]);
      return ids
        .map((id) => catalog.product(id))
        .filter(Boolean)
        .slice(0, limit || 12);
    },
    recentlyViewed(limit) {
      return recent.items().slice(0, limit || 12);
    },
    topRestaurants(limit) {
      return catalog
        .restaurants(location.cityId)
        .slice()
        .sort((a, b) => (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0) || b.rating - a.rating)
        .slice(0, limit || 8);
    },
    featuredBrands(limit) {
      return catalog
        .brands()
        .slice()
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, limit || 10);
    },
    frequentlyBoughtTogether(productId) {
      return FX.catalog.frequentlyBoughtTogether(productId).filter((p) => catalog.products().some((c) => c.id === p.id));
    },
  };

  /* ------------------------------------------------------------------ */

  /**
   * Clear the shopper's local data (used by Account → Privacy & data).
   * Accounts are kept by default so the sign-in details still work; the
   * catalogue is re-seeded from `shared/` rather than deleted.
   */
  function resetLocalData(options) {
    const opts = options || {};

    // Catalogue-only reset: discard admin edits and re-seed, keep shopper data.
    if (opts.catalogueOnly) {
      state.adminCatalog = null;
      storage.remove(K.adminCatalog);
      state.settings = clone(FX.settings.DEFAULT_SETTINGS);
      persistNow();
      seedDemoCatalog();
      emit('settings:changed', state.settings);
      emit('catalog:changed', state.catalog);
      return true;
    }

    state.cart = { type: C.CART_TYPES.STORE, restaurantId: null, items: [], saved: [], couponCode: null, tip: 0, redeemPoints: 0 };
    state.wishlist = [];
    state.recent = [];
    state.searches = [];
    state.addresses = [];
    state.orders = [];
    state.notifications = [];
    state.rewards = { points: 0, history: [] };
    state.couponUses = {};
    state.tickets = [];
    state.preferences = { vegOnly: false, notifyPromo: true, notifyOrder: true, deliveryPreference: 'standard', favouriteCategories: [] };
    state.settings = clone(FX.settings.DEFAULT_SETTINGS);
    state.adminCatalog = null;
    if (!opts.keepAccounts) {
      state.accounts = [];
      storage.remove(K.demoAccounts);
    }
    if (!opts.keepLocation) state.location = { cityId: FX.locations.defaultCityId, localityId: null, label: (FX.locations.getCity(FX.locations.defaultCityId) || {}).name || 'Vijayawada' };
    storage.remove(K.adminCatalog);
    persistNow();
    // Re-seed the demo catalogue so product/stock edits made in the admin
    // panel are rolled back along with the rest of the local data.
    seedDemoCatalog();
    emit('store:reset', {});
    emit('cart:changed', { cart: state.cart, totals: cart.totals() });
    emit('wishlist:changed', {});
    emit('notifications:changed', state.notifications);
    emit('rewards:changed', state.rewards);
    emit('addresses:changed', state.addresses);
    emit('settings:changed', state.settings);
    emit('preferences:changed', state.preferences);
    emit('catalog:changed', state.catalog);
    return true;
  }

  FX.store = {
    state,
    bus,
    boot,
    emit,
    persist: persistNow,
    catalog,
    search,
    suggestions,
    query: catalog.query ? catalog.query : query,
    facets,
    location,
    cart,
    wishlist,
    recent,
    history,
    auth,
    addresses,
    notifications,
    rewards,
    coupons,
    orders,
    support,
    preferences,
    settings,
    admin,
    home,
    hashPassword,
    randomSalt,
    resetLocalData,
    isDemo: () => state.mode !== 'backend',
    mode: () => state.mode,
  };

  // `catalog.query` is the faceted query helper.
  catalog.query = query;
  FX.store.query = query;
})(typeof globalThis !== 'undefined' ? globalThis : this);

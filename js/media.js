/**
 * Food Express — js/media.js
 *
 * Catalogue imagery. This build ships no binary photos, so every product,
 * menu item, restaurant and banner is rendered as a deterministic, generated
 * SVG "art card" — crisp at any size, zero network cost, and impossible to
 * break. If an item ever carries a real `photo` URL it is used first, with the
 * generated card as the onerror fallback.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const cache = new Map();

  const TONES = {
    neutral: ['#eef3f0', '#dfe8e2'],
    brand: ['#e7f4ec', '#cfe8da'],
    green: ['#e8f5e9', '#cfe9d3'],
    saffron: ['#fdf0e2', '#f8ddc0'],
    plum: ['#f7eaf2', '#ecd4e5'],
    indigo: ['#e9edf9', '#d3dcf2'],
    teal: ['#e5f3f4', '#cbe6e8'],
    warm: ['#fdf1e7', '#f9ddc8'],
    cool: ['#eaf2f8', '#d3e4f0'],
  };

  function toneFor(item) {
    if (item && item.tone && TONES[item.tone]) return TONES[item.tone];
    const category = item && item.categoryId ? FX.catalog.CATEGORIES.find((c) => c.id === item.categoryId) : null;
    if (category && category.color) {
      return [hexToRgba(category.color, 0.1), hexToRgba(category.color, 0.22)];
    }
    return TONES.brand;
  }

  function hexToRgba(hex, alpha) {
    const value = String(hex).replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const num = parseInt(full, 0, 16);
    if (Number.isNaN(num)) return 'rgba(31,122,76,' + alpha + ')';
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /** Greedy word wrap into up to `maxLines` lines. */
  function wrap(text, maxChars, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    words.forEach((word) => {
      if (!current.length) current = word;
      else if ((current + ' ' + word).length <= maxChars) current += ' ' + word;
      else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      kept[maxLines - 1] = kept[maxLines - 1].replace(/[,.\-]?$/, '') + '…';
      return kept;
    }
    return lines;
  }

  function svgToDataUri(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ------------------------------------------------------------------ */
  /* Generators                                                           */
  /* ------------------------------------------------------------------ */

  /** Square art card for a catalogue item (product or menu item). */
  function itemCard(item, opts) {
    const options = opts || {};
    const size = options.size || 400;
    const [top, bottom] = toneFor(item);
    const emoji = (item && item.emoji) || '🛍️';
    const name = (item && item.name) || 'Food Express';
    const meta = options.meta || (item && item.unit) || (item && item.brand) || '';
    const lines = wrap(name, 20, 2);
    const fontSize = size / 15;
    const emojiSize = size / 3.4;
    const showMeta = Boolean(meta) && !options.hideMeta;

    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bottom + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="' + size + '" height="' + size + '" fill="url(#g)"/>' +
      '<circle cx="' + size * 0.84 + '" cy="' + size * 0.16 + '" r="' + size * 0.16 + '" fill="rgba(255,255,255,0.35)"/>' +
      '<text x="50%" y="' + (showMeta ? 46 : 54) + '%" text-anchor="middle" font-size="' + emojiSize + '">' + esc(emoji) + '</text>' +
      lines
        .map(
          (line, i) =>
            '<text x="50%" y="' +
            (74 + i * 8) +
            '%" text-anchor="middle" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="' +
            fontSize +
            '" font-weight="600" fill="#14201a">' +
            esc(line) +
            '</text>'
        )
        .join('') +
      (showMeta
        ? '<text x="50%" y="' + (74 + lines.length * 8 + 7) + '%" text-anchor="middle" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="' + fontSize * 0.78 + '" fill="#5f6f67">' + esc(meta) + '</text>'
        : '') +
      '</svg>';
    return svgToDataUri(svg);
  }

  /** Wide art card for restaurants (16:9). */
  function restaurantCard(restaurant, opts) {
    const options = opts || {};
    const width = options.width || 640;
    const height = Math.round(width / (16 / 9));
    const [top, bottom] = toneFor(restaurant);
    const emoji = restaurant.emoji || '🍽️';
    const lines = wrap(restaurant.name || 'Restaurant', 24, 2);
    const sub = (restaurant.cuisines || []).join(' · ') || restaurant.area || '';
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bottom + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="' + width + '" height="' + height + '" fill="url(#g)"/>' +
      '<circle cx="' + width * 0.88 + '" cy="' + height * 0.78 + '" r="' + height * 0.42 + '" fill="rgba(255,255,255,0.3)"/>' +
      '<text x="' + width * 0.08 + '" y="' + height * 0.5 + '" font-size="' + height * 0.4 + '">' + esc(emoji) + '</text>' +
      lines
        .map(
          (line, i) =>
            '<text x="' +
            width * 0.08 +
            '" y="' +
            (height * 0.72 + i * height * 0.12) +
            '" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="' +
            height * 0.1 +
            '" font-weight="700" fill="#14201a">' +
            esc(line) +
            '</text>'
        )
        .join('') +
      (sub
        ? '<text x="' + width * 0.08 + '" y="' + (height * 0.72 + lines.length * height * 0.12 + height * 0.02) + '" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="' + height * 0.07 + '" fill="#5f6f67">' + esc(sub) + '</text>'
        : '') +
      '</svg>';
    return svgToDataUri(svg);
  }

  /** Spec card — used as an extra PDP "gallery" view (honest, no fake photos). */
  function specCard(item) {
    const size = 400;
    const [top, bottom] = toneFor(item);
    const rows = Object.keys(item.attributes || {}).slice(0, 6);
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bottom + '"/></linearGradient></defs>' +
      '<rect width="' + size + '" height="' + size + '" fill="url(#g)"/>' +
      '<rect x="30" y="30" width="340" height="340" rx="18" fill="rgba(255,255,255,0.72)"/>' +
      '<text x="50" y="76" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="19" font-weight="700" fill="#14201a">Specifications</text>' +
      '<text x="50" y="100" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="13" fill="#5f6f67">' + esc(item.brand || '') + ' · ' + esc(item.unit || '') + '</text>' +
      rows
        .map((key, i) => {
          const y = 138 + i * 36;
          const valueLines = wrap(String(item.attributes[key]), 26, 1);
          return (
            '<text x="50" y="' + y + '" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="13" fill="#5f6f67">' + esc(key) + '</text>' +
            '<text x="350" y="' + y + '" text-anchor="end" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="13" font-weight="600" fill="#14201a">' + esc(valueLines[0] || '') + '</text>'
          );
        })
        .join('') +
      (rows.length
        ? ''
        : '<text x="50" y="150" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="13" fill="#5f6f67">No specifications published for this item.</text>') +
      '<text x="50" y="352" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="11" fill="#83918a">Demo catalogue · sample data</text>' +
      '</svg>';
    return svgToDataUri(svg);
  }

  /** Brand card — third PDP gallery view. */
  function brandCard(item) {
    const size = 400;
    const [top, bottom] = toneFor(item);
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bottom + '"/></linearGradient></defs>' +
      '<rect width="' + size + '" height="' + size + '" fill="url(#g)"/>' +
      '<circle cx="200" cy="170" r="86" fill="rgba(255,255,255,0.75)"/>' +
      '<text x="200" y="200" text-anchor="middle" font-size="80">' + esc(item.emoji || '🏷️') + '</text>' +
      '<text x="200" y="300" text-anchor="middle" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="22" font-weight="700" fill="#14201a">' + esc(item.brand || 'Food Express') + '</text>' +
      '<text x="200" y="326" text-anchor="middle" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="13" fill="#5f6f67">' + esc(item.categoryName || '') + '</text>' +
      '</svg>';
    return svgToDataUri(svg);
  }

  /** Neutral fallback used when an <img> fails to load. */
  function fallback(kind) {
    const size = 400;
    const label = kind === 'restaurant' ? 'Restaurant' : 'Product image';
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<rect width="' + size + '" height="' + size + '" fill="#f2f5f3"/>' +
      '<circle cx="200" cy="176" r="60" fill="#e2e8e4"/>' +
      '<text x="200" y="196" text-anchor="middle" font-size="52">🛍️</text>' +
      '<text x="200" y="288" text-anchor="middle" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="16" fill="#83918a">' + esc(label) + '</text>' +
      '<text x="200" y="310" text-anchor="middle" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="12" fill="#a9b6b0">Unavailable right now</text>' +
      '</svg>';
    return svgToDataUri(svg);
  }

  /** Gallery views for a product details page. */
  function galleryFor(item) {
    if (!item) return [fallback()];
    const cacheKey = 'gallery:' + item.id;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const views = [];
    if (item.photo) views.push(item.photo);
    views.push(itemCard(item, { size: 520 }));
    views.push(specCard(item));
    views.push(brandCard(item));
    if (item.type === 'menu-item' && item.restaurantName) {
      views.push(itemCard(Object.assign({}, item, { name: item.restaurantName, emoji: '👨‍🍳', unit: 'Kitchen view' }), { size: 520 }));
    }
    cache.set(cacheKey, views);
    return views;
  }

  function imageFor(item, opts) {
    if (!item) return fallback();
    const key =
      'img:' + (item.id || item.name || '') + ':' + (opts && opts.kind ? opts.kind : 'card') + ':' + (opts && opts.size ? opts.size : '');
    if (cache.has(key)) return cache.get(key);
    let uri;
    if (opts && opts.kind === 'restaurant') uri = restaurantCard(item, opts);
    else uri = itemCard(item, opts);
    cache.set(key, uri);
    return uri;
  }

  /**
   * Mount an <img> with lazy loading, generated artwork and a hard fallback.
   * Returns the element so callers can chain.
   */
  function img(item, attrs) {
    const props = Object.assign(
      {
        loading: 'lazy',
        decoding: 'async',
        alt: item ? item.name + (item.unit ? ' · ' + item.unit : '') : 'Food Express',
      },
      attrs || {}
    );
    const el = FX.u.h('img', props);
    el.src = item && item.photo ? item.photo : imageFor(item, props.kind === 'restaurant' ? { kind: 'restaurant' } : {});
    el.addEventListener('error', function onError() {
      el.removeEventListener('error', onError);
      if (el.dataset.fallbackApplied) return;
      el.dataset.fallbackApplied = '1';
      el.src = item ? imageFor(item) : fallback();
    });
    // Second-level fallback if the generated card itself somehow fails.
    el.addEventListener('error', function onFinalError() {
      el.removeEventListener('error', onFinalError);
      if (el.dataset.finalFallback) return;
      el.dataset.finalFallback = '1';
      el.src = fallback(props.kind === 'restaurant' ? 'restaurant' : 'product');
    });
    return el;
  }

  FX.media = { itemCard, restaurantCard, specCard, brandCard, fallback, galleryFor, imageFor, img, toneFor, TONES };
})(typeof globalThis !== 'undefined' ? globalThis : this);

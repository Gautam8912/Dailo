/**
 * Food Express — js/components/bottom-nav.js
 * Mobile bottom navigation with a live cart badge.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, clear } = FX.u;
  const store = FX.store;
  const bus = FX.bus;

  const ITEMS = [
    { id: 'home', label: 'Home', emoji: '🏠', href: 'index.html', match: ['index.html', ''] },
    { id: 'categories', label: 'Categories', emoji: '🧺', href: 'category.html', match: ['category.html', 'search.html'] },
    { id: 'cart', label: 'Cart', emoji: '🛒', href: 'cart.html', match: ['cart.html', 'checkout.html'], badge: true },
    { id: 'food', label: 'Food', emoji: '🍽️', href: 'restaurants.html', match: ['restaurants.html', 'restaurant.html'] },
    { id: 'account', label: 'Account', emoji: '👤', href: 'account.html', match: ['account.html', 'orders.html', 'wishlist.html', 'notifications.html', 'login.html', 'register.html'] },
  ];

  function render(mount) {
    const target = mount || FX.u.$('#fx-bottomnav');
    if (!target) return null;
    clear(target);

    const page = (global.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const nav = h('nav', { class: 'fx-bottomnav fx-no-print', 'aria-label': 'Primary' });
    const inner = h('div', { class: 'fx-bottomnav-inner' });

    ITEMS.forEach((item) => {
      const active = item.match.some((match) => match === page) || (item.id === 'home' && page === '');
      const link = h('a', {
        class: 'fx-bnav-item' + (active ? ' is-active' : ''),
        href: item.href,
        'aria-current': active ? 'page' : undefined,
      }, [
        h('span', { class: 'fx-bnav-emoji', 'aria-hidden': 'true', text: item.emoji }),
        h('span', { text: item.label }),
      ]);
      if (item.badge) {
        const badge = h('span', { class: 'fx-bnav-count', hidden: true, text: '0' });
        link.appendChild(badge);
        const update = () => {
          const qty = store.cart.count();
          badge.textContent = String(qty > 99 ? '99+' : qty);
          badge.hidden = qty === 0;
        };
        update();
        bus.on('cart:changed', update);
      }
      inner.appendChild(link);
    });

    nav.appendChild(inner);
    target.appendChild(nav);
    document.body.classList.add('fx-has-bottomnav');
    return nav;
  }

  FX.components = FX.components || {};
  FX.components.bottomNav = { render, ITEMS };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/**
 * Food Express — js/components/header.js
 * Site header: logo, location selector, live search with suggestions,
 * account menu, wishlist, notifications and the live cart badge.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, $$, clear, money, debounce, escapeHtml } = FX.u;
  const store = FX.store;
  const bus = FX.bus;
  const ui = FX.ui;

  let searchTimer = null;

  function buildSearch() {
    const wrap = h('div', { class: 'fx-search', role: 'search' });
    const input = h('input', {
      class: 'fx-search-input',
      type: 'search',
      id: 'fx-search-input',
      name: 'q',
      placeholder: 'Search “atta”, “paneer”, “biryani”, “earphones”…',
      autocomplete: 'off',
      'aria-label': 'Search products, restaurants and dishes',
      'aria-controls': 'fx-search-suggest',
      'aria-expanded': 'false',
      role: 'combobox',
      value: FX.u.qs('q') && document.body.dataset.searchPrefill === 'true' ? FX.u.qs('q') : '',
    });
    const clearBtn = h('button', {
      class: 'fx-search-clear',
      type: 'button',
      'aria-label': 'Clear search',
      html: '&times;',
      onClick: () => {
        input.value = '';
        wrap.classList.remove('has-value');
        closeSuggest();
        input.focus();
      },
    });
    const field = h('div', { class: 'fx-search-field' }, [
      ui.icon('search'),
      input,
      clearBtn,
      h('button', {
        class: 'fx-btn fx-btn-primary fx-btn-sm fx-hide-mobile',
        type: 'button',
        text: 'Search',
        onClick: () => submit(input.value),
      }),
    ]);
    const suggest = h('div', { class: 'fx-suggest', id: 'fx-search-suggest', role: 'listbox', hidden: true });
    wrap.appendChild(field);
    wrap.appendChild(suggest);

    let activeIndex = -1;

    function submit(value) {
      const term = String(value || '').trim();
      closeSuggest();
      if (!term) {
        global.location.href = 'search.html';
        return;
      }
      store.history.add(term);
      global.location.href = FX.url('search', { q: term });
    }

    function closeSuggest() {
      suggest.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      activeIndex = -1;
      clear(suggest);
    }

    function openSuggest() {
      suggest.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function renderSuggest(term) {
      clear(suggest);
      const value = String(term || '').trim();
      if (!value) {
        const history = store.history.list();
        if (history.length) {
          suggest.appendChild(h('div', { class: 'fx-suggest-group', text: 'Recent searches' }));
          history.slice(0, 5).forEach((entry) => {
            suggest.appendChild(
              h('button', { class: 'fx-suggest-item', type: 'button', role: 'option', onClick: () => submit(entry) }, [
                h('span', { 'aria-hidden': 'true', text: '🕘' }),
                h('span', { class: 'fx-suggest-main', text: entry }),
              ])
            );
          });
          suggest.appendChild(
            h('button', {
              class: 'fx-suggest-item',
              type: 'button',
              onClick: () => {
                store.history.clear();
                ui.notify.info('Search history cleared');
                closeSuggest();
              },
            }, [h('span', { 'aria-hidden': 'true', text: '🗑️' }), h('span', { class: 'fx-suggest-main', text: 'Clear search history' })])
          );
        }
        const trending = store.home.trending(5);
        if (trending.length) {
          suggest.appendChild(h('div', { class: 'fx-suggest-group', text: 'Trending now' }));
          trending.forEach((item) => suggest.appendChild(suggestRow(item, value)));
        }
        if (!history.length && !trending.length) closeSuggest();
        else openSuggest();
        return;
      }

      const results = store.suggestions(value, 6);
      const total = results.products.length + results.restaurants.length + results.categories.length;
      if (!total) {
        suggest.appendChild(h('div', { class: 'fx-suggest-group', text: 'No matches' }));
        suggest.appendChild(
          h('div', { class: 'fx-suggest-item', style: { cursor: 'default' } }, [
            h('span', { class: 'fx-suggest-main' }, [
              h('div', { text: 'Nothing matched “' + value + '”.' }),
              h('div', { class: 'fx-suggest-sub', text: 'Press Enter to see all results and recommendations.' }),
            ]),
          ])
        );
        openSuggest();
        return;
      }

      if (results.categories.length) {
        suggest.appendChild(h('div', { class: 'fx-suggest-group', text: 'Categories' }));
        results.categories.forEach((category) => {
          suggest.appendChild(
            h('button', {
              class: 'fx-suggest-item',
              type: 'button',
              role: 'option',
              onClick: () => {
                global.location.href = category.id === 'food' ? 'restaurants.html' : FX.url('category', { cat: category.id });
              },
            }, [
              h('span', { class: 'fx-suggest-thumb fx-center', style: { fontSize: '18px' }, 'aria-hidden': 'true', text: category.emoji }),
              h('span', { class: 'fx-suggest-main' }, [
                h('div', { html: FX.u.highlight(category.name, value) }),
                h('div', { class: 'fx-suggest-sub', text: category.blurb || '' }),
              ]),
            ])
          );
        });
      }
      if (results.restaurants.length) {
        suggest.appendChild(h('div', { class: 'fx-suggest-group', text: 'Restaurants' }));
        results.restaurants.forEach((restaurant) => {
          suggest.appendChild(
            h('button', {
              class: 'fx-suggest-item',
              type: 'button',
              role: 'option',
              onClick: () => {
                global.location.href = FX.url('restaurant', { id: restaurant.slug });
              },
            }, [
              h('span', { class: 'fx-suggest-thumb fx-center', style: { fontSize: '18px' }, 'aria-hidden': 'true', text: restaurant.emoji }),
              h('span', { class: 'fx-suggest-main' }, [
                h('div', { html: FX.u.highlight(restaurant.name, value) }),
                h('div', { class: 'fx-suggest-sub', text: restaurant.cuisines.join(', ') }),
              ]),
              h('span', { class: 'fx-suggest-price', text: FX.u.etaLabel(restaurant.etaMinutes) }),
            ])
          );
        });
      }
      if (results.products.length) {
        suggest.appendChild(h('div', { class: 'fx-suggest-group', text: 'Products & dishes' }));
        results.products.forEach((item) => suggest.appendChild(suggestRow(item, value)));
      }
      suggest.appendChild(
        h('button', { class: 'fx-suggest-item', type: 'button', style: { color: 'var(--fx-primary-600)', fontWeight: '600' }, onClick: () => submit(value) }, [
          h('span', { 'aria-hidden': 'true', text: '🔎' }),
          h('span', { class: 'fx-suggest-main', text: 'See all results for “' + value + '”' }),
        ])
      );
      openSuggest();
    }

    function suggestRow(item, value) {
      const isMenu = item.type === 'menu-item';
      return h('button', {
        class: 'fx-suggest-item',
        type: 'button',
        role: 'option',
        onClick: () => {
          global.location.href = isMenu
            ? FX.url('restaurant', { id: item.restaurantId, item: item.id })
            : FX.url('product', { id: item.id });
        },
      }, [
        h('img', { class: 'fx-suggest-thumb', src: FX.media.imageFor(item), alt: '', loading: 'lazy', decoding: 'async' }),
        h('span', { class: 'fx-suggest-main' }, [
          h('div', { class: 'fx-truncate', html: FX.u.highlight(item.name, value) }),
          h('div', { class: 'fx-suggest-sub fx-truncate', text: (isMenu ? item.restaurantName + ' · ' : item.brand + ' · ') + (item.unit || '') }),
        ]),
        h('span', { class: 'fx-suggest-price', text: money(item.price) }),
      ]);
    }

    const onInput = debounce((event) => renderSuggest(event.target.value), FX.config.searchDebounceMs);
    input.addEventListener('input', (event) => {
      wrap.classList.toggle('has-value', Boolean(event.target.value));
      onInput(event);
    });
    input.addEventListener('focus', () => renderSuggest(input.value));
    input.addEventListener('keydown', (event) => {
      const items = $$('.fx-suggest-item[role="option"]', suggest);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!items.length) return;
        event.preventDefault();
        activeIndex = event.key === 'ArrowDown' ? (activeIndex + 1) % items.length : (activeIndex - 1 + items.length) % items.length;
        items.forEach((item, index) => item.classList.toggle('is-active', index === activeIndex));
        items[activeIndex].scrollIntoView({ block: 'nearest' });
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].click();
        else submit(input.value);
        return;
      }
      if (event.key === 'Escape') {
        closeSuggest();
        input.blur();
      }
    });
    document.addEventListener('click', (event) => {
      if (!wrap.contains(event.target)) closeSuggest();
    });

    return wrap;
  }

  function buildLocationButton() {
    const button = h('button', {
      class: 'fx-location',
      type: 'button',
      'aria-label': 'Change delivery location',
      onClick: () => FX.components.locationModal.open(),
    });
    function render() {
      clear(button);
      const city = store.location.city();
      const label = store.location.label();
      button.appendChild(h('span', { class: 'fx-location-icon', 'aria-hidden': 'true', text: '📍' }));
      button.appendChild(
        h('span', { class: 'fx-location-text' }, [
          h('span', { class: 'fx-location-label', text: city && city.coverage === FX.constants.COVERAGE.COMING_SOON ? 'Not serviceable' : 'Deliver to' }),
          h('span', { class: 'fx-location-value', text: label }),
        ])
      );
      button.appendChild(ui.icon('chevronDown', 'fx-ic fx-ic-sm'));
    }
    render();
    bus.on('location:changed', render);
    return button;
  }

  function buildAccountMenu() {
    const wrap = h('div', { class: 'fx-menu' });
    const button = h('button', { class: 'fx-haction', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false' });
    const panel = h('div', { class: 'fx-menu-panel', hidden: true, role: 'menu' });

    function renderButton() {
      const user = store.auth.user();
      clear(button);
      button.appendChild(h('span', { class: 'fx-haction-icon', 'aria-hidden': 'true', text: user ? '' : '👤' }));
      if (user) {
        const av = ui.avatar(user, 'sm');
        button.firstChild.textContent = '';
        button.replaceChild(av, button.firstChild);
      }
      button.appendChild(h('span', { text: user ? (user.name || '').split(' ')[0] : 'Login' }));
      button.appendChild(ui.icon('chevronDown', 'fx-ic fx-ic-sm'));
      button.setAttribute('aria-label', user ? 'Account menu for ' + user.name : 'Login or create an account');
    }

    function renderPanel() {
      clear(panel);
      const user = store.auth.user();
      if (user) {
        panel.appendChild(
          h('div', { class: 'fx-menu-user' }, [
            ui.avatar(user),
            h('div', { class: 'fx-menu-user-meta' }, [
              h('div', { class: 'fx-menu-user-name', text: user.name }),
              h('div', { class: 'fx-menu-user-mail', text: user.email }),
            ]),
          ])
        );
        const links = [
          { label: 'My account', href: 'account.html', icon: '👤' },
          { label: 'My orders', href: 'orders.html', icon: '📦' },
          { label: 'Wishlist', href: 'wishlist.html', icon: '❤️' },
          { label: 'Addresses', href: 'account.html?tab=addresses', icon: '📍' },
          { label: 'Coupons & rewards', href: 'account.html?tab=coupons', icon: '🎟️' },
          { label: 'Notifications', href: 'notifications.html', icon: '🔔' },
          { label: 'Help centre', href: 'support.html', icon: '💬' },
        ];
        links.forEach((link) => {
          panel.appendChild(h('a', { class: 'fx-menu-item', href: link.href, role: 'menuitem' }, [h('span', { 'aria-hidden': 'true', text: link.icon }), h('span', { text: link.label })]));
        });
        if (store.auth.isAdmin()) {
          panel.appendChild(h('div', { class: 'fx-menu-sep' }));
          panel.appendChild(
            h('a', { class: 'fx-menu-item', href: 'admin.html', role: 'menuitem' }, [
              h('span', { 'aria-hidden': 'true', text: '🛠️' }),
              h('span', { text: 'Admin dashboard' }),
            ])
          );
        }
        panel.appendChild(h('div', { class: 'fx-menu-sep' }));
        panel.appendChild(
          h('button', {
            class: 'fx-menu-item is-danger',
            type: 'button',
            role: 'menuitem',
            onClick: async () => {
              close();
              await store.auth.logout();
              ui.notify.info('You have been signed out.');
              global.location.href = 'index.html';
            },
          }, [h('span', { 'aria-hidden': 'true', text: '🚪' }), h('span', { text: 'Sign out' })])
        );
      } else {
        panel.appendChild(
          h('div', { style: { padding: '8px 12px 12px' } }, [
            h('p', { class: 'fx-small fx-muted', style: { margin: '0 0 10px' }, text: 'Sign in for order tracking, saved addresses and your wishlist across devices.' }),
            h('a', { class: 'fx-btn fx-btn-primary fx-btn-block', href: 'login.html', text: 'Login' }),
            h('a', { class: 'fx-btn fx-btn-outline fx-btn-block', href: 'register.html', style: { marginTop: '8px' }, text: 'Create account' }),
            h('a', { class: 'fx-link-btn', href: 'index.html', style: { display: 'block', marginTop: '10px', textAlign: 'center' }, text: 'Continue as guest' }),
          ])
        );
      }
    }

    function open() {
      renderPanel();
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
    }
    function close() {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (panel.hidden) open();
      else close();
    });
    document.addEventListener('click', (event) => {
      if (!wrap.contains(event.target)) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    bus.on('auth:changed', () => {
      renderButton();
      if (!panel.hidden) renderPanel();
    });
    renderButton();
    wrap.appendChild(button);
    wrap.appendChild(panel);
    return wrap;
  }

  function buildCartButton() {
    const button = h('a', {
      class: 'fx-haction fx-haction-cart',
      href: 'cart.html',
      'aria-label': 'Cart',
      onClick: (event) => {
        if (global.innerWidth < 861) return; // let the link navigate on mobile
        event.preventDefault();
        FX.components.cartDrawer.open();
      },
    });
    const count = h('span', { class: 'fx-count is-zero', text: '0' });
    button.appendChild(h('span', { class: 'fx-haction-icon', 'aria-hidden': 'true' }, [document.createTextNode('🛒'), count]));
    button.appendChild(h('span', {}, [
      h('span', { class: 'fx-cart-total', text: money(0) }),
    ]));

    function render() {
      const totals = store.cart.totals();
      const qty = totals.totalQty;
      count.textContent = String(qty > 99 ? '99+' : qty);
      count.classList.toggle('is-zero', qty === 0);
      $('.fx-cart-total', button).textContent = qty ? money(totals.grandTotal) : 'Cart';
      button.setAttribute('aria-label', qty ? 'Cart, ' + qty + ' items, ' + money(totals.grandTotal) : 'Cart, empty');
    }
    render();
    bus.on('cart:changed', render);
    return button;
  }

  function buildWishlistButton() {
    const button = h('a', { class: 'fx-haction fx-hide-mobile', href: 'wishlist.html', 'aria-label': 'Wishlist' }, [
      h('span', { class: 'fx-haction-icon', 'aria-hidden': 'true' }, [
        document.createTextNode('🤍'),
        h('span', { class: 'fx-count is-zero', text: '0' }),
      ]),
      h('span', { text: 'Wishlist' }),
    ]);
    function render() {
      const n = store.wishlist.count();
      const badge = $('.fx-count', button);
      badge.textContent = String(n);
      badge.classList.toggle('is-zero', n === 0);
      button.setAttribute('aria-label', n ? 'Wishlist, ' + n + ' saved items' : 'Wishlist, empty');
    }
    render();
    bus.on('wishlist:changed', render);
    return button;
  }

  function buildNotificationButton() {
    const button = h('a', { class: 'fx-haction fx-btn-icon fx-hide-mobile', href: 'notifications.html', 'aria-label': 'Notifications', style: { padding: '8px' } }, [
      h('span', { class: 'fx-haction-icon', 'aria-hidden': 'true', text: '🔔' }),
    ]);
    function render() {
      const unread = store.notifications.unreadCount();
      let dot = $('.fx-count-dot', button);
      if (unread && !dot) {
        dot = h('span', { class: 'fx-count-dot' });
        $('.fx-haction-icon', button).appendChild(dot);
      } else if (!unread && dot) {
        dot.remove();
      }
      button.setAttribute('aria-label', unread ? 'Notifications, ' + unread + ' unread' : 'Notifications');
    }
    render();
    bus.on('notifications:changed', render);
    return button;
  }

  function buildCategoryNav() {
    const nav = h('nav', { class: 'fx-nav fx-no-print', 'aria-label': 'Product categories' });
    const inner = h('div', { class: 'fx-container fx-nav-inner' });
    const current = FX.u.qs('cat');
    const page = document.body.dataset.page || '';

    const links = [{ id: 'all', name: 'All categories', emoji: '🧺', href: 'category.html' }];
    store.catalog.categories().forEach((category) => {
      links.push({
        id: category.id,
        name: category.name,
        emoji: category.emoji,
        href: category.id === 'food' ? 'restaurants.html' : FX.url('category', { cat: category.id }),
      });
    });

    links.forEach((link) => {
      const active = (current && current === link.id) || (page === 'restaurants' && link.id === 'food');
      inner.appendChild(
        h('a', { class: 'fx-nav-link' + (active ? ' is-active' : ''), href: link.href, 'aria-current': active ? 'page' : undefined }, [
          h('span', { class: 'fx-nav-emoji', 'aria-hidden': 'true', text: link.emoji }),
          h('span', { text: link.name }),
        ])
      );
    });

    inner.appendChild(
      h('div', { class: 'fx-nav-cta' }, [
        h('a', { class: 'fx-nav-link', href: 'search.html?sort=discount', style: { color: 'var(--fx-accent-700)', fontWeight: '700' } }, [
          h('span', { class: 'fx-nav-emoji', 'aria-hidden': 'true', text: '🔥' }),
          h('span', { text: "Today's deals" }),
        ]),
      ])
    );
    nav.appendChild(inner);
    return nav;
  }

  function render(mount) {
    const target = mount || $('#fx-header');
    if (!target) return null;
    clear(target);

    const strip = h('div', { class: 'fx-strip fx-no-print' }, [
      h('div', { class: 'fx-container fx-strip-inner' }, [
        h('span', { 'aria-hidden': 'true', text: '🛵' }),
        h('span', { text: 'Free delivery above ' + money(store.settings.get().freeDeliveryThreshold) + ' · ' }),
        h('a', { href: 'account.html?tab=coupons', text: 'View demo coupons' }),
        h('span', { class: 'fx-hide-mobile', text: '· Demo build: sample catalogue, no live delivery network' }),
      ]),
    ]);

    const header = h('header', { class: 'fx-header', id: 'fx-site-header' });
    const top = h('div', { class: 'fx-container fx-header-top' });

    top.appendChild(
      h('a', { class: 'fx-logo', href: 'index.html', 'aria-label': 'Food Express home' }, [
        h('span', { class: 'fx-logo-mark', 'aria-hidden': 'true', text: '🛵' }),
        h('span', { class: 'fx-logo-text' }, [
          h('span', { class: 'fx-logo-name', html: 'Food<em>Express</em>' }),
          h('span', { class: 'fx-logo-tag fx-hide-mobile', text: FX.config.appTagline }),
        ]),
      ])
    );

    top.appendChild(buildLocationButton());
    top.appendChild(buildSearch());

    const actions = h('div', { class: 'fx-header-actions' }, [
      buildWishlistButton(),
      buildNotificationButton(),
      buildAccountMenu(),
      buildCartButton(),
    ]);
    top.appendChild(actions);

    header.appendChild(top);
    header.appendChild(buildCategoryNav());
    target.appendChild(strip);
    target.appendChild(header);
    return header;
  }

  FX.components = FX.components || {};
  FX.components.header = { render };
})(typeof globalThis !== 'undefined' ? globalThis : this);

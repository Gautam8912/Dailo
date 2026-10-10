/**
 * Food Express — js/pages/restaurant.js
 * Restaurant details + menu with customisation modal, section navigation and
 * restaurant-specific cart rules.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  let menuQuery = '';
  let vegOnly = false;

  function customisationModal(item, onAdd) {
    const selection = {};
    let unitPrice = item.price;

    const priceEl = h('span', { class: 'fx-price fx-lg', text: money(unitPrice) });
    const body = h('div', { class: 'fx-stack' });

    function refresh() {
      const priced = FX.restaurants.priceMenuItem(item, selection);
      unitPrice = priced.price;
      priceEl.textContent = money(unitPrice);
      addonsEl.textContent = priced.addons.length ? '+ ' + priced.addons.map((a) => a.label).join(', ') : 'No add-ons selected';
    }

    const addonsEl = h('div', { class: 'fx-xs fx-muted', text: 'No add-ons selected' });

    body.appendChild(
      h('div', { class: 'fx-row fx-gap-3' }, [
        h('img', { src: FX.media.imageFor(item), alt: '', style: { width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover' } }),
        h('div', {}, [
          h('div', { class: 'fx-strong', text: item.name }),
          h('div', { class: 'fx-xs fx-muted', text: item.restaurantName + ' · ' + item.subcategory }),
          h('div', { class: 'fx-row fx-gap-2', style: { marginTop: '4px' } }, [
            h('span', { class: item.veg ? 'fx-diet' : 'fx-diet fx-diet-nonveg', role: 'img', 'aria-label': item.veg ? 'Vegetarian' : 'Non-vegetarian' }),
            ui.ratingChip(item),
          ]),
        ]),
      ])
    );

    item.customisations.forEach((group) => {
      const groupEl = h('div', { class: 'fx-custom-group' });
      groupEl.appendChild(
        h('div', { class: 'fx-custom-group-head' }, [
          h('h4', { text: group.name }),
          h('span', { class: 'fx-xs fx-muted', text: group.required ? 'Required' : 'Optional' }),
        ])
      );
      group.options.forEach((option, index) => {
        const type = group.type === 'multi' ? 'checkbox' : 'radio';
        const defaultChecked = group.type === 'single' && group.required && index === (group.options.findIndex((o) => o.price === 0) === -1 ? 0 : group.options.findIndex((o) => o.price === 0));
        if (defaultChecked) selection[group.id] = [option.id];
        groupEl.appendChild(
          h('label', { class: 'fx-custom-option' }, [
            h('input', {
              type,
              name: 'grp-' + group.id,
              value: option.id,
              checked: defaultChecked,
              onChange: (event) => {
                const current = selection[group.id] || [];
                if (type === 'radio') selection[group.id] = [option.id];
                else if (event.target.checked) selection[group.id] = current.concat([option.id]);
                else selection[group.id] = current.filter((id) => id !== option.id);
                refresh();
              },
            }),
            h('span', { text: option.label }),
            option.price
              ? h('span', { class: 'fx-opt-price', text: option.mode === 'multiplier' ? Math.round(option.price * 100) + '% off' : '+ ' + money(option.price) })
              : h('span', { class: 'fx-opt-price fx-muted', text: 'included' }),
          ])
        );
      });
      body.appendChild(groupEl);
    });

    body.appendChild(
      h('div', { class: 'fx-row-between', style: { borderTop: '1px solid var(--fx-border)', paddingTop: '12px' } }, [
        h('div', {}, [h('div', { class: 'fx-xs fx-muted', text: 'Item total' }), priceEl, addonsEl]),
      ])
    );

    const instance = ui.modal({
      title: 'Customise · ' + item.name,
      content: body,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Add to cart · ' + money(unitPrice),
          variant: 'primary',
          onClick: (close) => {
            const missing = item.customisations.filter((group) => group.required && !(selection[group.id] || []).length);
            if (missing.length) {
              ui.notify.error('Please choose ' + missing.map((g) => g.name.toLowerCase()).join(' and ') + '.');
              return;
            }
            close();
            onAdd(selection, unitPrice);
          },
        },
      ],
    });
    // Keep the confirm button's price in sync.
    const confirmBtn = instance.foot ? instance.foot.lastChild : null;
    if (confirmBtn) {
      const originalRefresh = refresh;
      refresh = function patched() {
        originalRefresh();
        confirmBtn.textContent = 'Add to cart · ' + money(unitPrice);
      };
    }
    refresh();
    return instance;
  }

  function menuRow(item, restaurant) {
    const line = store.cart.lineFor(item.id);
    const row = h('div', { class: 'fx-menu-row', id: 'item-' + item.id });
    row.appendChild(
      h('div', {}, [
        h('h3', { class: 'fx-menu-row-name' }, [
          h('span', { class: item.veg ? 'fx-diet' : 'fx-diet fx-diet-nonveg', role: 'img', 'aria-label': item.veg ? 'Vegetarian' : 'Non-vegetarian' }),
          document.createTextNode(item.name),
          item.popularity > 90 ? h('span', { class: 'fx-badge fx-badge-accent', text: 'Bestseller' }) : null,
          item.stock <= 0 ? h('span', { class: 'fx-badge fx-badge-danger', text: 'Unavailable' }) : null,
        ].filter(Boolean)),
        h('div', { class: 'fx-menu-row-desc', text: item.description }),
        h('div', { class: 'fx-row fx-gap-3 fx-wrap', style: { alignItems: 'center' } }, [
          h('span', { class: 'fx-price', text: money(item.price) }),
          item.mrp > item.price ? h('span', { class: 'fx-xs fx-strike', text: money(item.mrp) }) : null,
          h('span', { class: 'fx-xs fx-muted', text: '⚡ ' + FX.u.etaLabel(item.prepMinutes) + ' prep' }),
          ui.ratingChip(item),
          item.customisations && item.customisations.length
            ? h('span', { class: 'fx-badge', text: 'Customisable' })
            : null,
        ].filter(Boolean)),
      ])
    );

    const art = h('div', { class: 'fx-menu-row-art' }, [
      h('img', { src: FX.media.imageFor(item), alt: item.name, loading: 'lazy', decoding: 'async' }),
    ]);
    const controlHost = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } });
    art.appendChild(controlHost);

    function renderControl() {
      clear(controlHost);
      const currentLine = store.cart.lineFor(item.id);
      if (item.stock <= 0) {
        controlHost.appendChild(h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', disabled: true, text: 'Unavailable' }));
        return;
      }
      if (currentLine) {
        controlHost.appendChild(ui.quantityStepper(currentLine, { size: 'sm' }));
        return;
      }
      controlHost.appendChild(
        h('button', {
          class: 'fx-btn fx-btn-soft fx-btn-sm fx-btn-block',
          type: 'button',
          text: item.customisations && item.customisations.length ? 'ADD ▾' : 'ADD',
          'aria-label': 'Add ' + item.name + ' to cart',
          onClick: () => {
            if (item.customisations && item.customisations.length) {
              customisationModal(item, (selection) => {
                ui.handleAdd(item, 1, null, { selection });
                renderControl();
              });
              return;
            }
            ui.handleAdd(item, 1, null).then(() => renderControl());
          },
        })
      );
    }
    renderControl();
    FX.bus.on('cart:changed', () => {
      if (document.body.contains(row)) renderControl();
    });

    row.appendChild(art);
    return row;
  }

  function render() {
    const mount = $('#restaurant-mount');
    const crumbs = $('#rest-crumbs');
    if (!mount) return;
    clear(mount);
    if (crumbs) clear(crumbs);

    const id = FX.u.qs('id');
    const restaurant = store.catalog.restaurant(id);
    if (!restaurant) {
      mount.appendChild(
        ui.emptyState({
          icon: '🍽️',
          title: 'Restaurant not found',
          message: 'This kitchen is not part of the demo catalogue, or it no longer serves your location.',
          actions: [{ label: 'See all restaurants', href: 'restaurants.html', variant: 'primary' }],
        })
      );
      return;
    }

    document.title = restaurant.name + ' · ' + restaurant.cuisines.join(', ') + ' · Food Express';
    if (crumbs) {
      crumbs.appendChild(
        ui.crumbs([
          { label: 'Home', href: 'index.html' },
          { label: 'Restaurants', href: 'restaurants.html' },
          { label: restaurant.name },
        ])
      );
    }

    const servesHere = restaurant.cityIds.indexOf(store.location.current.cityId) !== -1;

    /* Hero */
    mount.appendChild(
      h('div', { class: 'fx-restaurant-hero', style: { marginBottom: '20px' } }, [
        h('div', { class: 'fx-restaurant-hero-art' }, [FX.media.img(restaurant, { kind: 'restaurant', alt: restaurant.name })]),
        h('div', { class: 'fx-restaurant-hero-body' }, [
          h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
            restaurant.promoted ? h('span', { class: 'fx-badge fx-badge-dark', text: 'Promoted' }) : null,
            restaurant.pureVeg ? h('span', { class: 'fx-badge fx-badge-success', text: 'Pure veg kitchen' }) : null,
            ui.ratingChip(restaurant),
            servesHere
              ? h('span', { class: 'fx-badge fx-badge-info', text: 'Delivers to ' + store.location.label() })
              : h('span', { class: 'fx-badge fx-badge-warning', text: 'Does not deliver here' }),
          ].filter(Boolean)),
          h('h1', { text: restaurant.name }),
          h('p', { class: 'fx-muted fx-small', style: { margin: 0, maxWidth: '64ch' }, text: restaurant.blurb }),
          h('div', { class: 'fx-restaurant-hero-meta' }, [
            h('span', { text: restaurant.cuisines.join(' · ') }),
            h('span', { text: restaurant.area }),
            h('span', { text: restaurant.hours }),
          ]),
          h('div', { class: 'fx-restaurant-stats' }, [
            h('div', { class: 'fx-restaurant-stat' }, [h('b', { text: FX.u.etaLabel(restaurant.etaMinutes) }), h('span', { text: 'Delivery time' })]),
            h('div', { class: 'fx-restaurant-stat' }, [h('b', { text: money(restaurant.minOrder) }), h('span', { text: 'Minimum order' })]),
            h('div', { class: 'fx-restaurant-stat' }, [h('b', { text: restaurant.deliveryFee ? money(restaurant.deliveryFee) : 'Free' }), h('span', { text: 'Delivery fee' })]),
            h('div', { class: 'fx-restaurant-stat' }, [h('b', { text: money(restaurant.priceForTwo) }), h('span', { text: 'Cost for two' })]),
            h('div', { class: 'fx-restaurant-stat' }, [h('b', { text: restaurant.menu.length }), h('span', { text: 'Dishes' })]),
          ]),
          restaurant.offers && restaurant.offers.length
            ? h('div', { class: 'fx-row fx-gap-2 fx-wrap', style: { marginTop: '8px' } },
                restaurant.offers.map((offer) => h('span', { class: 'fx-badge fx-badge-accent', text: '🎟️ ' + offer })))
            : null,
        ].filter(Boolean)),
      ])
    );

    if (!servesHere) {
      mount.appendChild(
        h('div', { class: 'fx-alert fx-alert-warning', style: { marginBottom: '16px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
          h('div', {}, [
            h('strong', { text: 'This kitchen does not deliver to ' + store.location.label() + '. ' }),
            document.createTextNode('It serves ' + restaurant.cityIds.map((c) => (FX.locations.getCity(c) || {}).name).join(', ') + '. '),
            h('button', { class: 'fx-link-btn', type: 'button', text: 'Change location', onClick: () => FX.components.locationModal.open() }),
          ]),
        ])
      );
    }
    if (!store.location.isServiceable()) {
      mount.appendChild(
        h('div', { class: 'fx-alert fx-alert-danger', style: { marginBottom: '16px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⛔' }),
          h('div', { text: 'Checkout is disabled because the selected city is not serviceable in this build.' }),
        ])
      );
    }

    /* Cart conflict notice */
    const conflictHost = h('div', {});
    mount.appendChild(conflictHost);
    function renderConflict() {
      clear(conflictHost);
      const cart = store.state.cart;
      if (!cart.items.length) return;
      if (cart.type === FX.constants.CART_TYPES.RESTAURANT && cart.restaurantId !== restaurant.id) {
        conflictHost.appendChild(
          h('div', { class: 'fx-alert fx-alert-info', style: { marginBottom: '16px' } }, [
            h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '🛒' }),
            h('div', {}, [
              h('strong', { text: 'Your cart has items from ' + cart.items[0].restaurantName + '. ' }),
              document.createTextNode('Orders from two kitchens cannot be combined. Adding a dish here will ask you to confirm replacing the cart.'),
            ]),
          ])
        );
      } else if (cart.type === FX.constants.CART_TYPES.STORE) {
        conflictHost.appendChild(
          h('div', { class: 'fx-alert fx-alert-info', style: { marginBottom: '16px' } }, [
            h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '🛒' }),
            h('div', { text: 'Your cart has store (grocery) items. Restaurant orders are delivered separately, so adding a dish here will start a new cart after your confirmation.' }),
          ])
        );
      }
    }
    renderConflict();
    FX.bus.on('cart:changed', renderConflict);

    /* Menu controls */
    const searchInput = h('input', {
      class: 'fx-input',
      type: 'search',
      placeholder: 'Search this menu…',
      'aria-label': 'Search the ' + restaurant.name + ' menu',
      onInput: FX.u.debounce((event) => {
        menuQuery = event.target.value.trim().toLowerCase();
        renderMenu();
      }, FX.config.searchDebounceMs),
    });

    const sectionNav = h('div', { class: 'fx-pill-row fx-scroll-x', id: 'menu-nav' });
    restaurant.sections.forEach((section) => {
      sectionNav.appendChild(
        h('a', { class: 'fx-pill', href: '#section-' + section.id, text: section.name })
      );
    });

    mount.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginBottom: '18px' } }, [
        h('div', { class: 'fx-row fx-gap-3 fx-wrap' }, [
          h('div', { class: 'fx-grow', style: { minWidth: '220px' } }, [searchInput]),
          h('button', {
            class: 'fx-pill' + (vegOnly ? ' is-active' : ''),
            type: 'button',
            'aria-pressed': vegOnly ? 'true' : 'false',
            text: '🌱 Veg only',
            onClick: (event) => {
              vegOnly = !vegOnly;
              event.currentTarget.classList.toggle('is-active', vegOnly);
              event.currentTarget.setAttribute('aria-pressed', vegOnly ? 'true' : 'false');
              renderMenu();
            },
          }),
        ]),
        h('div', { style: { marginTop: '12px' } }, [sectionNav]),
      ])
    );

    const menuHost = h('div', { id: 'menu-host' });
    mount.appendChild(menuHost);

    function renderMenu() {
      clear(menuHost);
      let visibleCount = 0;
      restaurant.sections.forEach((section) => {
        let items = restaurant.menu.filter((item) => item.sectionId === section.id);
        if (vegOnly) items = items.filter((item) => item.veg);
        if (menuQuery) {
          items = items.filter(
            (item) =>
              item.name.toLowerCase().indexOf(menuQuery) !== -1 ||
              item.description.toLowerCase().indexOf(menuQuery) !== -1
          );
        }
        if (!items.length) return;
        visibleCount += items.length;
        const block = h('section', { class: 'fx-menu-section', id: 'section-' + section.id, 'aria-labelledby': 'sec-' + section.id });
        block.appendChild(
          h('div', { class: 'fx-menu-section-head' }, [
            h('h3', { id: 'sec-' + section.id, text: section.name }),
            h('span', { class: 'fx-xs fx-muted', text: items.length + ' ' + FX.u.pluralize(items.length, 'dish') }),
          ])
        );
        items.forEach((item) => block.appendChild(menuRow(item, restaurant)));
        menuHost.appendChild(block);
      });

      if (!visibleCount) {
        menuHost.appendChild(
          ui.emptyState({
            icon: '🍽️',
            title: 'No dishes match',
            message: menuQuery ? 'Nothing in this menu matches “' + menuQuery + '”.' : 'This kitchen has no dishes for the current filter.',
            actions: [
              { label: 'Clear menu search', variant: 'primary', onClick: () => { menuQuery = ''; searchInput.value = ''; vegOnly = false; renderMenu(); } },
              { label: 'Browse other kitchens', href: 'restaurants.html', variant: 'outline' },
            ],
          })
        );
      }
    }
    renderMenu();

    /* Restaurant policies */
    mount.appendChild(
      h('section', { class: 'fx-section-tight' }, [
        h('div', { class: 'fx-grid fx-grid-3' }, [
          h('div', { class: 'fx-card fx-card-pad' }, [
            h('h4', { text: 'Delivery information' }),
            h('ul', { class: 'fx-small fx-muted', style: { lineHeight: '1.7' } }, [
              h('li', { text: 'Minimum order ' + money(restaurant.minOrder) + ' — enforced at checkout.' }),
              h('li', { text: 'Delivery fee ' + (restaurant.deliveryFee ? money(restaurant.deliveryFee) : 'free') + ' plus a ' + money(restaurant.packingFee) + ' packing charge.' }),
              h('li', { text: 'Simulated delivery window ' + FX.u.etaLabel(restaurant.etaMinutes) + ' for ' + store.location.label() + '.' }),
            ]),
          ]),
          h('div', { class: 'fx-card fx-card-pad' }, [
            h('h4', { text: 'Cart rules' }),
            h('ul', { class: 'fx-small fx-muted', style: { lineHeight: '1.7' } }, [
              h('li', { text: 'One restaurant per cart — kitchens prepare and dispatch separately.' }),
              h('li', { text: 'Store products cannot be combined with restaurant dishes.' }),
              h('li', { text: 'Customisations are priced per option and shown on the cart line.' }),
            ]),
          ]),
          h('div', { class: 'fx-card fx-card-pad' }, [
            h('h4', { text: 'Good to know' }),
            h('ul', { class: 'fx-small fx-muted', style: { lineHeight: '1.7' } }, [
              h('li', { text: 'Hours: ' + restaurant.hours + '.' }),
              h('li', { text: 'Prepared food cannot be returned; raise a quality claim within 24 hours.' }),
              h('li', { text: 'This is a demo kitchen — no live order is sent anywhere.' }),
            ]),
          ]),
        ]),
      ])
    );

    // Deep-link to a specific dish from search suggestions.
    const focusItem = FX.u.qs('item');
    if (focusItem) {
      const target = $('#item-' + focusItem);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.outline = '2px solid var(--fx-primary-300)';
        target.style.borderRadius = '12px';
        global.setTimeout(() => { target.style.outline = ''; }, 2600);
      }
    }
  }

  FX.pages = FX.pages || {};
  FX.pages.restaurant = { render, customisationModal };

  FX.app.onReady(() => {
    render();
    FX.bus.on('location:changed', render);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

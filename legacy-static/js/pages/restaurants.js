/**
 * Food Express — js/pages/restaurants.js
 * Restaurant discovery: cuisine filters, sorting, veg-only toggle and search
 * across kitchens and dishes.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  const SORTS = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating', label: 'Rating (demo)' },
    { value: 'eta', label: 'Delivery time' },
    { value: 'min-order', label: 'Min order: low to high' },
    { value: 'cost', label: 'Cost for two' },
  ];

  let state = {
    q: FX.u.qs('q') || '',
    cuisines: (FX.u.qs('cuisine') || '').split(',').filter(Boolean),
    sort: FX.u.qs('sort') || 'relevance',
    pureVeg: FX.u.qs('veg') === '1',
    offersOnly: FX.u.qs('offers') === '1',
  };

  function syncUrl() {
    FX.u.setQs(
      {
        q: state.q || null,
        cuisine: state.cuisines.length ? state.cuisines.join(',') : null,
        sort: state.sort === 'relevance' ? null : state.sort,
        veg: state.pureVeg ? '1' : null,
        offers: state.offersOnly ? '1' : null,
      },
      { replace: true }
    );
  }

  function filteredRestaurants() {
    const cityId = store.location.current.cityId;
    let list = store.catalog.restaurants(cityId);
    if (state.pureVeg) list = list.filter((r) => r.pureVeg);
    if (state.offersOnly) list = list.filter((r) => r.offers && r.offers.length);
    if (state.cuisines.length) list = list.filter((r) => r.cuisines.some((c) => state.cuisines.indexOf(c) !== -1));
    if (state.q) {
      const q = state.q.toLowerCase();
      const nameHits = list.filter(
        (r) =>
          r.name.toLowerCase().indexOf(q) !== -1 ||
          r.cuisines.some((c) => c.toLowerCase().indexOf(q) !== -1) ||
          r.blurb.toLowerCase().indexOf(q) !== -1
      );
      const dishHits = store
        .search(state.q, { pool: store.catalog.menuItems() })
        .filter((item) => item.restaurantId && list.some((r) => r.id === item.restaurantId))
        .map((item) => store.catalog.restaurant(item.restaurantId));
      list = FX.u.uniqueBy(nameHits.concat(dishHits), (r) => r.id);
    }
    switch (state.sort) {
      case 'rating':
        list = list.slice().sort((a, b) => b.rating - a.rating);
        break;
      case 'eta':
        list = list.slice().sort((a, b) => a.etaMinutes - b.etaMinutes);
        break;
      case 'min-order':
        list = list.slice().sort((a, b) => a.minOrder - b.minOrder);
        break;
      case 'cost':
        list = list.slice().sort((a, b) => a.priceForTwo - b.priceForTwo);
        break;
      default:
        list = list.slice().sort((a, b) => (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0) || b.rating - a.rating);
    }
    return list;
  }

  function dishResults() {
    if (!state.q) return [];
    return store.search(state.q, { pool: store.catalog.menuItems() }).slice(0, 8);
  }

  function render() {
    const mount = $('#restaurants-mount');
    if (!mount) return;
    clear(mount);

    const city = store.location.city();
    const serviceable = store.location.isServiceable();
    document.title = 'Restaurants in ' + (city ? city.name : 'your area') + ' · Food Express';

    mount.appendChild(
      h('div', { class: 'fx-hero fx-hero-compact', style: { borderRadius: 'var(--fx-radius-lg)', margin: '20px 0' } }, [
        h('div', {}, [
          h('h1', { class: 'fx-page-title', text: 'Restaurants near you' }),
          h('p', { class: 'fx-page-sub', style: { marginBottom: '12px' }, text: (city ? city.name + ', ' + city.state : '') + ' · ' + FX.locations.COVERAGE_LABELS[store.location.coverage()] }),
          h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
            h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', onClick: () => FX.components.locationModal.open() }, [
              h('span', { 'aria-hidden': 'true', text: '📍' }),
              document.createTextNode(' ' + store.location.label()),
            ]),
            h('span', { class: 'fx-xs fx-muted', text: 'Simulated delivery windows · demo kitchens' }),
          ]),
        ]),
      ])
    );

    if (!serviceable) {
      mount.appendChild(
        h('div', { class: 'fx-alert fx-alert-warning', style: { marginBottom: '16px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
          h('div', {}, [
            h('strong', { text: (city ? city.name : 'This city') + ' is marked “coming soon”. ' }),
            document.createTextNode('You can browse these kitchens, but checkout is blocked for this location. No city in this build has a live delivery network.'),
          ]),
        ])
      );
    }

    /* Search + filters */
    const searchInput = h('input', {
      class: 'fx-input',
      type: 'search',
      placeholder: 'Search restaurants, cuisines or dishes (e.g. biryani, dosa, pizza)',
      value: state.q,
      'aria-label': 'Search restaurants and dishes',
      onInput: FX.u.debounce((event) => {
        state.q = event.target.value.trim();
        syncUrl();
        render();
      }, FX.config.searchDebounceMs),
    });

    mount.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginBottom: '18px' } }, [
        h('div', { class: 'fx-row fx-gap-3 fx-wrap' }, [
          h('div', { class: 'fx-grow', style: { minWidth: '240px' } }, [searchInput]),
          h('label', { class: 'fx-sr-only', for: 'rest-sort', text: 'Sort restaurants' }),
          h('select', {
            class: 'fx-select',
            id: 'rest-sort',
            style: { minWidth: '200px' },
            onChange: (event) => {
              state.sort = event.target.value;
              syncUrl();
              render();
            },
          }, SORTS.map((sort) => h('option', { value: sort.value, selected: sort.value === state.sort, text: sort.label }))),
        ]),
        h('div', { class: 'fx-row fx-gap-2 fx-wrap', style: { marginTop: '12px' } }, [
          h('button', {
            class: 'fx-pill' + (state.pureVeg ? ' is-active' : ''),
            type: 'button',
            'aria-pressed': state.pureVeg ? 'true' : 'false',
            text: '🌱 Pure veg',
            onClick: () => { state.pureVeg = !state.pureVeg; syncUrl(); render(); },
          }),
          h('button', {
            class: 'fx-pill' + (state.offersOnly ? ' is-active' : ''),
            type: 'button',
            'aria-pressed': state.offersOnly ? 'true' : 'false',
            text: '🎟️ With offers',
            onClick: () => { state.offersOnly = !state.offersOnly; syncUrl(); render(); },
          }),
          h('span', { class: 'fx-xs fx-muted', style: { marginLeft: '4px' }, text: 'Cuisines:' }),
          ...FX.restaurants.CUISINES.slice(0, 10).map((cuisine) =>
            h('button', {
              class: 'fx-pill' + (state.cuisines.indexOf(cuisine) !== -1 ? ' is-active' : ''),
              type: 'button',
              'aria-pressed': state.cuisines.indexOf(cuisine) !== -1 ? 'true' : 'false',
              text: cuisine,
              onClick: () => {
                const index = state.cuisines.indexOf(cuisine);
                if (index === -1) state.cuisines.push(cuisine);
                else state.cuisines.splice(index, 1);
                syncUrl();
                render();
              },
            })
          ),
          state.cuisines.length
            ? h('button', { class: 'fx-link-btn', type: 'button', text: 'Clear cuisines', onClick: () => { state.cuisines = []; syncUrl(); render(); } })
            : null,
        ].filter(Boolean)),
      ])
    );

    /* Dish matches */
    const dishes = dishResults();
    if (dishes.length) {
      const dishSection = h('section', { class: 'fx-section-tight' }, [
        ui.sectionHead('Dishes matching “' + state.q + '”', { emoji: '🍽️', subtitle: 'Tap a dish to open its kitchen and customise it.' }),
      ]);
      const rail = h('div', { class: 'fx-rail fx-scroll-x' });
      dishes.forEach((dish) => {
        rail.appendChild(
          h('a', { class: 'fx-product-card', href: FX.url('restaurant', { id: dish.restaurantId, item: dish.id }) }, [
            h('div', { class: 'fx-product-media' }, [
              FX.media.img(dish, { alt: dish.name }),
              h('div', { class: 'fx-product-flags' }, [
                h('span', { class: dish.veg ? 'fx-diet' : 'fx-diet fx-diet-nonveg', role: 'img', 'aria-label': dish.veg ? 'Vegetarian' : 'Non-vegetarian' }),
              ]),
            ]),
            h('div', { class: 'fx-product-body' }, [
              h('div', { class: 'fx-product-eta', text: '⚡ Ready in ' + FX.u.etaLabel(dish.prepMinutes) }),
              h('h3', { class: 'fx-product-name', text: dish.name }),
              h('div', { class: 'fx-product-unit', text: dish.restaurantName }),
              h('div', { class: 'fx-product-price-row' }, [h('span', { class: 'fx-product-price', text: money(dish.price) })]),
            ]),
          ])
        );
      });
      dishSection.appendChild(rail);
      mount.appendChild(dishSection);
    }

    /* Restaurant grid */
    const list = filteredRestaurants();
    mount.appendChild(
      h('div', { class: 'fx-toolbar' }, [
        h('div', { class: 'fx-toolbar-left' }, [h('strong', { text: list.length + ' ' + FX.u.pluralize(list.length, 'kitchen') + ' delivering here' })]),
      ])
    );

    if (!list.length) {
      mount.appendChild(
        ui.emptyState({
          icon: '🍽️',
          title: 'No restaurants match',
          message: 'Try clearing a cuisine filter, or switch to a city with wider demo coverage such as Hyderabad or Vijayawada.',
          actions: [
            { label: 'Clear filters', variant: 'primary', onClick: () => { state = { q: '', cuisines: [], sort: 'relevance', pureVeg: false, offersOnly: false }; syncUrl(); render(); } },
            { label: 'Change location', variant: 'outline', onClick: () => FX.components.locationModal.open() },
          ],
        })
      );
      return;
    }

    const grid = h('div', { class: 'fx-grid fx-grid-3' });
    list.forEach((restaurant) => grid.appendChild(ui.restaurantCard(restaurant)));
    mount.appendChild(grid);

    mount.appendChild(
      h('div', { class: 'fx-alert fx-alert-info', style: { marginTop: '24px' } }, [
        h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: 'ℹ️' }),
        h('div', { text: 'Ratings marked “demo” are merchandising values, not verified customer reviews. Delivery times are simulated for this build.' }),
      ])
    );
  }

  FX.pages = FX.pages || {};
  FX.pages.restaurants = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('location:changed', render);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

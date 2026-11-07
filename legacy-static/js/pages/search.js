/**
 * Food Express — js/pages/search.js
 * Search results with live URL-synced filters, typo tolerance, recent searches
 * and useful empty states.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  function readParams() {
    return {
      q: FX.u.qs('q') || '',
      cat: FX.u.qs('cat') || '',
      sub: FX.u.qs('sub') || '',
      brand: FX.u.qs('brand') || '',
      tag: FX.u.qs('tag') || '',
      max: FX.u.qs('max') ? Number(FX.u.qs('max')) : undefined,
      min: FX.u.qs('min') ? Number(FX.u.qs('min')) : undefined,
      sort: FX.u.qs('sort') || 'popular',
      stock: FX.u.qs('stock') === '1',
      type: FX.u.qs('type') || '',
    };
  }

  function basePool(params) {
    if (params.type === 'restaurant') return store.catalog.restaurants();
    if (params.type === 'food') return store.catalog.menuItems();
    return store.catalog.all();
  }

  function emptyStateFor(params) {
    const suggestions = store.home.trending(8);
    return h('div', { class: 'fx-stack' }, [
      ui.emptyState({
        icon: '🔍',
        title: params.q ? 'No matches for “' + params.q + '”' : 'Nothing to show yet',
        message: params.q
          ? 'We searched product names, brands, categories, cuisines and descriptions — including close spellings. Try a broader term or clear a filter.'
          : 'Type a search term, or start from one of the shortcuts below.',
        actions: [
          { label: 'Clear filters', variant: 'primary', onClick: () => { global.location.href = 'search.html' + (params.q ? '?q=' + encodeURIComponent(params.q) : ''); } },
          { label: 'Browse categories', href: 'category.html', variant: 'outline' },
        ],
      }),
      suggestions.length
        ? h('section', { class: 'fx-section-tight' }, [
            ui.sectionHead('Trending instead', { emoji: '🔥', subtitle: 'Popular right now in the demo catalogue.' }),
            ui.rail(suggestions, {}),
          ])
        : null,
    ]);
  }

  function render() {
    const mount = $('#search-mount');
    if (!mount) return;
    const params = readParams();
    clear(mount);

    const pool = basePool(params);
    let items;
    if (params.q) {
      items = store.search(params.q, { pool });
      store.history.add(params.q);
    } else {
      items = pool.slice();
    }

    // Apply URL filters that search() does not handle itself.
    const filters = {
      sort: params.sort,
      maxPrice: params.max,
      minPrice: params.min,
      inStock: params.stock || undefined,
      tag: params.tag || undefined,
    };
    if (params.cat) filters.categories = [params.cat];
    if (params.brand) filters.brands = [params.brand];
    if (params.sub) {
      items = items.filter((item) => item.subcategory === params.sub);
    }
    if (params.type === 'restaurant') filters.type = 'restaurant';
    if (params.type === 'restaurant' && store.location.current.cityId) filters.cityId = store.location.current.cityId;
    if (store.preferences.get().vegOnly) filters.vegOnly = true;

    const filtered = store.query(items, filters);
    const category = params.cat ? store.catalog.category(params.cat) : null;
    const brand = params.brand ? store.catalog.brands().find((b) => b.id === params.brand) : null;

    let title = 'All products';
    if (params.q) title = 'Results for “' + params.q + '”';
    else if (params.tag) title = tagTitle(params.tag);
    else if (category) title = category.name;
    else if (brand) title = brand.name;
    else if (params.type === 'restaurant') title = 'Restaurants';

    const subtitleBits = [];
    subtitleBits.push(filtered.length + ' ' + FX.u.pluralize(filtered.length, 'match', 'matches'));
    if (params.q) subtitleBits.push('searched across ' + store.catalog.products().length + ' products and ' + store.catalog.menuItems().length + ' dishes');
    if (params.max) subtitleBits.push('under ' + money(params.max));
    if (brand) subtitleBits.push('brand · ' + brand.productCount + ' products in catalogue');

    document.title = (params.q ? params.q + ' — search' : title) + ' · Food Express';

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 4px' } }, [
        h('div', {}, [
          h('h1', { class: 'fx-page-title', text: title }),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: subtitleBits.join(' · ') }),
        ]),
        h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
          h('button', { class: 'fx-btn fx-btn-soft fx-btn-sm', type: 'button', text: '📍 ' + store.location.label(), onClick: () => FX.components.locationModal.open() }),
          params.type === 'restaurant' ? null : h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: 'restaurants.html', text: 'Search restaurants' }),
        ].filter(Boolean)),
      ])
    );

    // Quick shortcuts: recent + trending searches
    if (!params.q) {
      const recent = store.history.list();
      const trending = ['atta', 'milk', 'biryani', 'chips', 'sunscreen', 'earphones', 'poha', 'paneer'];
      mount.appendChild(
        h('div', { class: 'fx-stack', style: { gap: '10px', marginBottom: '18px' } }, [
          recent.length
            ? h('div', { class: 'fx-row fx-gap-2 fx-wrap', style: { alignItems: 'center' } }, [
                h('span', { class: 'fx-xs fx-uppercase fx-muted', text: 'Recent' }),
                ...recent.map((term) => h('a', { class: 'fx-pill', href: FX.url('search', { q: term }), text: term })),
                h('button', {
                  class: 'fx-link-btn',
                  type: 'button',
                  text: 'Clear',
                  onClick: () => {
                    store.history.clear();
                    ui.notify.info('Search history cleared');
                    render();
                  },
                }),
              ])
            : null,
          h('div', { class: 'fx-row fx-gap-2 fx-wrap', style: { alignItems: 'center' } }, [
            h('span', { class: 'fx-xs fx-uppercase fx-muted', text: 'Popular' }),
            ...trending.map((term) => h('a', { class: 'fx-pill', href: FX.url('search', { q: term }), text: term })),
          ]),
        ].filter(Boolean))
      );
    }

    const list = FX.components.listing.listing({
      items: filtered,
      facets: store.facets(filtered),
      filters: Object.assign({ sort: params.sort }, params.max ? { maxPrice: params.max } : {}),
      pageSize: FX.config.pageSize,
      showFilters: params.type !== 'restaurant',
      renderer: params.type === 'restaurant' ? (item) => ui.restaurantCard(item) : undefined,
      empty: emptyStateFor(params),
      onFiltersChange: (next) => {
        FX.u.setQs({
          sort: next.sort === 'popular' ? null : next.sort,
          max: next.maxPrice || null,
          stock: next.inStock ? '1' : null,
        }, { replace: true });
      },
    });
    // The listing already applied its own default filters; push URL filters in.
    Object.assign(list.state.filters, filters);
    list.state.items = filtered;
    list.state.facets = store.facets(filtered);
    list.render();
    mount.appendChild(list.element);
  }

  function tagTitle(tag) {
    const map = {
      deal: "Today's deals",
      bestseller: 'Best sellers',
      trending: 'Trending now',
      essential: 'Daily essentials',
      fresh: 'Fresh picks',
      new: 'Fresh arrivals',
      seasonal: 'Seasonal offers',
      under99: 'Under ₹99',
    };
    return map[tag] || 'Tagged: ' + tag;
  }

  FX.pages = FX.pages || {};
  FX.pages.search = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('location:changed', render);
    global.addEventListener('popstate', render);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

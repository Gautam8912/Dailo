/**
 * Food Express — js/pages/category.js
 * Category directory (no ?cat) and single-category listing (?cat=).
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  function crumbsFor(category) {
    const crumbs = $('#cat-crumbs');
    if (!crumbs) return;
    clear(crumbs);
    crumbs.appendChild(
      ui.crumbs(
        category
          ? [{ label: 'Home', href: 'index.html' }, { label: 'Categories', href: 'category.html' }, { label: category.name }]
          : [{ label: 'Home', href: 'index.html' }, { label: 'Categories' }]
      )
    );
  }

  function directory(mount) {
    document.title = 'All categories · Food Express';
    crumbsFor(null);
    clear(mount);

    mount.appendChild(
      h('div', { class: 'fx-hero fx-hero-compact', style: { borderRadius: 'var(--fx-radius-lg)', margin: '20px 0' } }, [
        h('div', { class: 'fx-container', style: { padding: 0 } }, [
          h('h1', { class: 'fx-page-title', text: 'Every category, one app' }),
          h('p', { class: 'fx-page-sub', text: store.catalog.products().length + ' products across ' + (store.catalog.categories().length - 1) + ' shopping categories, plus ' + store.catalog.restaurants().length + ' restaurant kitchens.' }),
          h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
            h('a', { class: 'fx-btn fx-btn-primary', href: 'search.html', text: 'Search everything' }),
            h('a', { class: 'fx-btn fx-btn-outline', href: 'restaurants.html', text: 'Order food' }),
            h('a', { class: 'fx-btn fx-btn-ghost', href: 'search.html?max=99', text: 'Under ₹99' }),
          ]),
        ]),
      ])
    );

    const grid = h('div', { class: 'fx-cat-grid', style: { marginBottom: '28px' } });
    store.catalog.categories().forEach((category) => grid.appendChild(ui.categoryTile(category)));
    mount.appendChild(grid);

    // Per-category preview rails for the first few shopping categories.
    store.catalog
      .categories()
      .filter((category) => category.id !== 'food')
      .slice(0, 4)
      .forEach((category) => {
        const items = store.query(store.catalog.products(), { categoryId: category.id, sort: 'popular' }).slice(0, 10);
        if (!items.length) return;
        const section = ui.section(category.name, items, {
          id: 'cat-' + category.id,
          emoji: category.emoji,
          subtitle: category.blurb + ' · from ' + money(category.startingPrice),
          href: FX.url('category', { cat: category.id }),
          linkLabel: 'See all ' + category.productCount,
        });
        if (section) mount.appendChild(section);
      });

    mount.appendChild(
      h('section', { class: 'fx-section-tight' }, [
        ui.sectionHead('All products', { emoji: '🧺', subtitle: 'Filter and sort the entire catalogue.' }),
      ])
    );
    const list = FX.components.listing.listing({
      items: store.catalog.products(),
      showFilters: true,
      title: '',
      pageSize: FX.config.pageSize,
    });
    list.element.querySelector('.fx-section-head').remove();
    mount.appendChild(list.element);
  }

  function categoryPage(mount, category) {
    document.title = category.name + ' · Food Express';
    crumbsFor(category);
    clear(mount);

    if (category.id === 'food') {
      global.location.replace('restaurants.html');
      return;
    }

    const items = store.catalog.products().filter((p) => p.categoryId === category.id);

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-4', style: { padding: '20px 0 8px' } }, [
        h('div', {}, [
          h('h1', { class: 'fx-page-title' }, [h('span', { 'aria-hidden': 'true', text: category.emoji + ' ' }), document.createTextNode(category.name)]),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: category.blurb + ' · ' + items.length + ' products · from ' + money(category.startingPrice) }),
        ]),
        h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
          h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: FX.url('search', { cat: category.id, sort: 'discount' }), text: 'Deals in ' + category.name }),
          h('button', { class: 'fx-btn fx-btn-soft fx-btn-sm', type: 'button', text: '📍 ' + store.location.label(), onClick: () => FX.components.locationModal.open() }),
        ]),
      ])
    );

    // Subcategory shortcuts
    const subs = Array.from(new Set(items.map((item) => item.subcategory).filter(Boolean)));
    if (subs.length > 1) {
      mount.appendChild(
        h('div', { class: 'fx-pill-row fx-scroll-x', style: { marginBottom: '16px' } },
          subs.map((sub) =>
            h('a', { class: 'fx-pill', href: FX.url('search', { cat: category.id, sub }) }, [document.createTextNode(sub)])
          )
        )
      );
    }

    const list = FX.components.listing.listing({
      items,
      lockCategory: true,
      lockCategories: [category.id],
      filters: { categories: [category.id], sort: FX.u.qs('sort') || 'popular', maxPrice: FX.u.qs('max') ? Number(FX.u.qs('max')) : undefined },
      pageSize: FX.config.pageSize,
      onFiltersChange: (filters) => {
        FX.u.setQs({ sort: filters.sort === 'popular' ? null : filters.sort, max: filters.maxPrice || null }, { replace: true });
      },
    });
    mount.appendChild(list.element);
  }

  function render() {
    const mount = $('#cat-mount');
    if (!mount) return;
    const catId = FX.u.qs('cat');
    if (!catId) {
      directory(mount);
      return;
    }
    const category = store.catalog.category(catId);
    if (!category) {
      clear(mount);
      mount.appendChild(
        ui.emptyState({
          icon: '🧭',
          title: 'Unknown category',
          message: '“' + catId + '” is not a category in this catalogue.',
          actions: [{ label: 'See all categories', href: 'category.html', variant: 'primary' }],
        })
      );
      return;
    }
    categoryPage(mount, category);
  }

  FX.pages = FX.pages || {};
  FX.pages.category = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('location:changed', render);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

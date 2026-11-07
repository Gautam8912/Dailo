/**
 * Food Express — js/components/listing.js
 * Shared catalogue listing: filter sidebar, sort control, active-filter chips,
 * responsive product grid and incremental loading. Used by the category and
 * search result pages so filtering logic exists once.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  const SORTS = [
    { value: 'popular', label: 'Popularity' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'discount', label: 'Discount' },
    { value: 'rating', label: 'Rating (demo data)' },
    { value: 'newest', label: 'Newest' },
    { value: 'name', label: 'Name A–Z' },
  ];

  function listing(options) {
    const opts = options || {};
    const state = Object.assign(
      {
        items: [],
        filters: { sort: 'popular' },
        facets: null,
        pageSize: FX.config.pageSize,
        page: 1,
        title: 'Products',
        subtitle: '',
        renderer: null,
        showFilters: true,
        empty: null,
      },
      opts
    );

    const root = h('div', {});
    const head = h('div', {});
    const layout = h('div', { class: 'fx-two-col fx-two-col-wide' });
    const aside = h('aside', { class: 'fx-card fx-card-pad', 'aria-label': 'Filters' });
    const content = h('div', {});
    const toolbar = h('div', { class: 'fx-toolbar' });
    const chips = h('div', { class: 'fx-active-filters' });
    const gridHost = h('div', {});
    const pagerHost = h('div', {});

    layout.appendChild(aside);
    layout.appendChild(content);
    content.appendChild(toolbar);
    content.appendChild(chips);
    content.appendChild(gridHost);
    content.appendChild(pagerHost);
    root.appendChild(head);
    root.appendChild(layout);

    function applySortAndFilter() {
      const filters = Object.assign({}, state.filters);
      if (store.preferences.get().vegOnly) filters.vegOnly = true;
      return store.query(state.items, filters);
    }

    function renderHead() {
      clear(head);
      head.appendChild(
        h('div', { class: 'fx-section-head' }, [
          h('div', {}, [
            h('h1', { class: 'fx-page-title', text: state.title }),
            state.subtitle ? h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: state.subtitle }) : null,
          ]),
          h('div', { class: 'fx-row fx-gap-2' }, [
            h('button', {
              class: 'fx-btn fx-btn-outline fx-btn-sm fx-hide-desktop',
              type: 'button',
              onClick: () => ui.modal({ title: 'Filters & sorting', content: buildFilters(), size: 'wide' }),
            }, [ui.icon('filter', 'fx-ic fx-ic-sm'), 'Filters']),
          ]),
        ].filter(Boolean))
      );
    }

    function buildFilters() {
      const wrap = h('div', { class: 'fx-filters' });
      const facets = state.facets || store.facets(state.items);

      /* Category */
      if (!state.lockCategory) {
        const cats = Object.keys(facets.categories || {});
        if (cats.length > 1) {
          const block = h('div', { class: 'fx-filter-block' }, [h('h4', { text: 'Category' })]);
          const list = h('ul', { class: 'fx-filter-list' });
          cats.forEach((catId) => {
            const category = store.catalog.category(catId);
            if (!category) return;
            const checked = (state.filters.categories || []).indexOf(catId) !== -1;
            list.appendChild(
              h('li', {}, [
                h('label', { class: 'fx-check' }, [
                  h('input', {
                    type: 'checkbox',
                    checked,
                    onChange: (event) => {
                      const current = (state.filters.categories || []).slice();
                      state.filters.categories = event.target.checked
                        ? current.concat([catId])
                        : current.filter((id) => id !== catId);
                      state.page = 1;
                      if (opts.onFiltersChange) opts.onFiltersChange(state.filters);
                      render();
                    },
                  }),
                  h('span', { text: category.name }),
                  h('span', { class: 'fx-filter-count', text: String(facets.categories[catId]) }),
                ]),
              ])
            );
          });
          block.appendChild(list);
          wrap.appendChild(block);
        }
      }

      /* Price */
      wrap.appendChild(
        h('div', { class: 'fx-filter-block' }, [
          h('h4', { text: 'Price' }),
          h('div', { class: 'fx-stack', style: { gap: '8px' } }, [
            h('div', { class: 'fx-range' }, [
              h('span', { class: 'fx-xs fx-muted', text: money(facets.minPrice) }),
              h('input', {
                type: 'range',
                min: facets.minPrice,
                max: facets.maxPrice,
                step: 10,
                value: state.filters.maxPrice != null ? state.filters.maxPrice : facets.maxPrice,
                'aria-label': 'Maximum price',
                onInput: FX.u.debounce((event) => {
                  state.filters.maxPrice = Number(event.target.value);
                  state.page = 1;
                  render();
                }, 200),
              }),
              h('span', { class: 'fx-xs fx-muted', text: money(facets.maxPrice) }),
            ]),
            h('div', { class: 'fx-xs fx-muted', text: 'Showing up to ' + money(state.filters.maxPrice != null ? state.filters.maxPrice : facets.maxPrice) }),
            h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
              { label: 'Under ₹99', value: 99 },
              { label: 'Under ₹199', value: 199 },
              { label: 'Under ₹499', value: 499 },
            ].map((preset) =>
              h('button', {
                class: 'fx-pill' + (Number(state.filters.maxPrice) === preset.value ? ' is-active' : ''),
                type: 'button',
                'aria-pressed': Number(state.filters.maxPrice) === preset.value ? 'true' : 'false',
                text: preset.label,
                onClick: () => {
                  state.filters.maxPrice = state.filters.maxPrice === preset.value ? undefined : preset.value;
                  state.page = 1;
                  render();
                },
              })
            )),
          ]),
        ])
      );

      /* Brand */
      const brands = Object.keys(facets.brands || {});
      if (brands.length > 1) {
        const block = h('div', { class: 'fx-filter-block' }, [h('h4', { text: 'Brand' })]);
        const list = h('ul', { class: 'fx-filter-list', style: { maxHeight: '220px', overflowY: 'auto' } });
        brands
          .sort((a, b) => facets.brands[b] - facets.brands[a])
          .forEach((brandId) => {
            const brand = store.catalog.brands().find((b) => b.id === brandId);
            const checked = (state.filters.brands || []).indexOf(brandId) !== -1;
            list.appendChild(
              h('li', {}, [
                h('label', { class: 'fx-check' }, [
                  h('input', {
                    type: 'checkbox',
                    checked,
                    onChange: (event) => {
                      const current = (state.filters.brands || []).slice();
                      if (event.target.checked) current.push(brandId);
                      state.filters.brands = event.target.checked ? current : current.filter((id) => id !== brandId);
                      state.page = 1;
                      render();
                    },
                  }),
                  h('span', { text: brand ? brand.name : brandId }),
                  h('span', { class: 'fx-filter-count', text: String(facets.brands[brandId]) }),
                ]),
              ])
            );
          });
        block.appendChild(list);
        wrap.appendChild(block);
      }

      /* Availability & discount */
      wrap.appendChild(
        h('div', { class: 'fx-filter-block' }, [
          h('h4', { text: 'Availability & offers' }),
          h('div', { class: 'fx-stack', style: { gap: '8px' } }, [
            h('label', { class: 'fx-check' }, [
              h('input', {
                type: 'checkbox',
                checked: Boolean(state.filters.inStock),
                onChange: (event) => {
                  state.filters.inStock = event.target.checked;
                  state.page = 1;
                  render();
                },
              }),
              h('span', { text: 'In stock only (' + facets.inStock + ')' }),
            ]),
            h('label', { class: 'fx-check' }, [
              h('input', {
                type: 'checkbox',
                checked: Boolean(state.filters.minDiscount),
                onChange: (event) => {
                  state.filters.minDiscount = event.target.checked ? 10 : undefined;
                  state.page = 1;
                  render();
                },
              }),
              h('span', { text: 'Discounted items (' + facets.discounted + ')' }),
            ]),
            h('label', { class: 'fx-check' }, [
              h('input', {
                type: 'checkbox',
                checked: store.preferences.get().vegOnly,
                onChange: (event) => {
                  store.preferences.update({ vegOnly: event.target.checked });
                  render();
                },
              }),
              h('span', { text: 'Vegetarian only' }),
            ]),
          ]),
        ])
      );

      wrap.appendChild(
        h('button', {
          class: 'fx-btn fx-btn-ghost fx-btn-block fx-btn-sm',
          type: 'button',
          text: 'Clear all filters',
          onClick: () => {
            state.filters = { sort: state.filters.sort || 'popular' };
            if (state.lockCategory) state.filters.categories = state.lockCategories;
            state.page = 1;
            if (opts.onFiltersChange) opts.onFiltersChange(state.filters);
            render();
          },
        })
      );
      return wrap;
    }

    function renderToolbar(filtered) {
      clear(toolbar);
      toolbar.appendChild(
        h('div', { class: 'fx-toolbar-left' }, [
          h('strong', { text: filtered.length + ' ' + FX.u.pluralize(filtered.length, 'result') }),
          state.filters.sort && state.filters.sort !== 'popular'
            ? h('span', { text: '· sorted by ' + (SORTS.find((s) => s.value === state.filters.sort) || {}).label })
            : null,
        ])
      );
      toolbar.appendChild(
        h('div', { class: 'fx-toolbar-right' }, [
          h('label', { class: 'fx-sr-only', for: 'listing-sort', text: 'Sort by' }),
          h(
            'select',
            {
              class: 'fx-select',
              id: 'listing-sort',
              style: { minWidth: '190px' },
              onChange: (event) => {
                state.filters.sort = event.target.value;
                state.page = 1;
                if (opts.onFiltersChange) opts.onFiltersChange(state.filters);
                render();
              },
            },
            SORTS.map((sort) => h('option', { value: sort.value, selected: sort.value === state.filters.sort, text: sort.label }))
          ),
        ])
      );
    }

    function renderChips() {
      clear(chips);
      const active = [];
      (state.filters.categories || []).forEach((catId) => {
        const category = store.catalog.category(catId);
        active.push({ label: category ? category.name : catId, clear: () => { state.filters.categories = (state.filters.categories || []).filter((id) => id !== catId); } });
      });
      (state.filters.brands || []).forEach((brandId) => {
        const brand = store.catalog.brands().find((b) => b.id === brandId);
        active.push({ label: brand ? brand.name : brandId, clear: () => { state.filters.brands = (state.filters.brands || []).filter((id) => id !== brandId); } });
      });
      if (state.filters.maxPrice != null) active.push({ label: 'Under ' + money(state.filters.maxPrice), clear: () => { state.filters.maxPrice = undefined; } });
      if (state.filters.minDiscount) active.push({ label: state.filters.minDiscount + '% off or more', clear: () => { state.filters.minDiscount = undefined; } });
      if (state.filters.inStock) active.push({ label: 'In stock', clear: () => { state.filters.inStock = undefined; } });
      if (store.preferences.get().vegOnly) active.push({ label: 'Vegetarian only', clear: () => store.preferences.update({ vegOnly: false }) });

      active.forEach((chip) => {
        chips.appendChild(
          h('span', { class: 'fx-filter-chip' }, [
            document.createTextNode(chip.label),
            h('button', {
              type: 'button',
              'aria-label': 'Remove filter ' + chip.label,
              html: '&times;',
              onClick: () => {
                chip.clear();
                state.page = 1;
                if (opts.onFiltersChange) opts.onFiltersChange(state.filters);
                render();
              },
            }),
          ])
        );
      });
    }

    function renderGrid(filtered) {
      clear(gridHost);
      if (!filtered.length) {
        gridHost.appendChild(
          state.empty ||
            ui.emptyState({
              icon: '🧐',
              title: 'No products match these filters',
              message: 'Try widening the price range, clearing a filter, or searching for something else.',
              actions: [
                { label: 'Clear filters', variant: 'primary', onClick: () => { state.filters = { sort: state.filters.sort }; if (state.lockCategory) state.filters.categories = state.lockCategories; state.page = 1; render(); } },
                { label: 'Browse all categories', href: 'category.html', variant: 'outline' },
              ],
            })
        );
        return;
      }
      const pageSize = state.pageSize;
      const visible = filtered.slice(0, state.page * pageSize);
      const grid = h('div', { class: 'fx-product-grid' });
      visible.forEach((item) => grid.appendChild(state.renderer ? state.renderer(item) : ui.productCard(item)));
      gridHost.appendChild(grid);

      clear(pagerHost);
      if (visible.length < filtered.length) {
        pagerHost.appendChild(
          h('div', { class: 'fx-center', style: { marginTop: '24px' } }, [
            h('button', {
              class: 'fx-btn fx-btn-outline',
              type: 'button',
              text: 'Load ' + Math.min(pageSize, filtered.length - visible.length) + ' more',
              onClick: (event) => {
                ui.setBusy(event.currentTarget, true, 'Loading…');
                global.setTimeout(() => {
                  state.page += 1;
                  render();
                }, 120);
              },
            }),
            h('span', { class: 'fx-xs fx-muted', style: { marginLeft: '12px' }, text: visible.length + ' of ' + filtered.length + ' shown' }),
          ])
        );
      }
    }

    function render() {
      renderHead();
      const filtered = applySortAndFilter();
      if (state.showFilters) {
        clear(aside);
        aside.appendChild(h('h3', { style: { fontSize: 'var(--fx-text-md)', marginBottom: '16px' }, text: 'Filters' }));
        aside.appendChild(buildFilters());
        aside.classList.remove('fx-hide-desktop');
      } else {
        aside.remove();
        layout.classList.remove('fx-two-col', 'fx-two-col-wide');
      }
      renderToolbar(filtered);
      renderChips();
      renderGrid(filtered);
      if (opts.onRender) opts.onRender(filtered);
    }

    render();
    return { element: root, render, state, setItems(items) { state.items = items; state.facets = store.facets(items); state.page = 1; render(); } };
  }

  FX.components = FX.components || {};
  FX.components.listing = { listing, SORTS };
})(typeof globalThis !== 'undefined' ? globalThis : this);

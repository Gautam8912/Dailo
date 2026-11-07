/**
 * Food Express — js/pages/wishlist.js
 * Saved items, move to cart, remove, and honest empty states.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  let sort = 'recent';
  const SORTS = [
    { value: 'recent', label: 'Recently added' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'discount', label: 'Discount' },
    { value: 'name', label: 'Name A–Z' },
  ];

  function sorted(items) {
    const list = items.slice();
    switch (sort) {
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price);
      case 'discount':
        return list.sort((a, b) => FX.u.discountPercent(b) - FX.u.discountPercent(a));
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }

  function moveAll(items) {
    const inStock = items.filter((p) => p.stock > 0);
    if (!inStock.length) {
      ui.notify.warning('Everything in your wishlist is out of stock right now.');
      return;
    }
    inStock.forEach((product) => store.cart.add(product, { qty: 1 }));
    const skipped = items.length - inStock.length;
    ui.notify.success(inStock.length + ' items moved to your cart' + (skipped ? ' · ' + skipped + ' out of stock skipped' : ''), {
      action: { label: 'View cart', onClick: () => FX.components.cartDrawer.open() },
    });
  }

  function render() {
    const mount = $('#wishlist-mount');
    if (!mount) return;
    clear(mount);

    const items = sorted(store.wishlist.items());
    const totalValue = items.reduce((sum, p) => sum + p.price, 0);
    document.title = 'Wishlist (' + items.length + ') · Food Express';

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 12px' } }, [
        h('div', {}, [
          h('h1', { class: 'fx-page-title' }, [document.createTextNode('Your wishlist '), h('span', { class: 'fx-count', text: items.length })]),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: items.length ? items.length + ' saved items worth ' + money(totalValue) + ' · saved on this device' + (store.auth.isSignedIn() ? ' and to your account' : '') : 'Save items you want to buy later' }),
        ]),
        h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
          h('select', {
            class: 'fx-select',
            'aria-label': 'Sort wishlist',
            onChange: (event) => {
              sort = event.target.value;
              render();
            },
          }, SORTS.map((entry) => h('option', { value: entry.value, selected: sort === entry.value, text: entry.label }))),
          items.length
            ? h('button', { class: 'fx-btn fx-btn-soft fx-btn-sm', type: 'button', text: 'Move all to cart', onClick: () => moveAll(items) })
            : null,
          items.length
            ? h('button', {
                class: 'fx-btn fx-btn-ghost fx-btn-sm',
                type: 'button',
                text: 'Clear wishlist',
                onClick: async () => {
                  const ok = await ui.confirmDialog({ title: 'Clear your wishlist?', message: 'All ' + items.length + ' saved items will be removed.', confirmLabel: 'Clear all', danger: true });
                  if (!ok) return;
                  store.wishlist.clear();
                  ui.notify.info('Wishlist cleared.');
                },
              })
            : null,
        ].filter(Boolean)),
      ])
    );

    if (!items.length) {
      mount.appendChild(
        ui.emptyState({
          icon: '💚',
          title: 'Nothing saved yet',
          message: 'Tap the heart on any product to keep it here. Your wishlist survives page reloads and navigation.',
          actions: [
            { label: 'Browse best sellers', href: 'search.html?tag=bestseller', variant: 'primary' },
            { label: "See today's deals", href: 'search.html?tag=deal', variant: 'outline' },
          ],
        })
      );
      return;
    }

    const grid = ui.productGrid(items, {
      wishlist: true,
      actions: (product) => [
        h('div', { class: 'fx-row fx-gap-2' }, [
          ui.addButton(product, { block: true, size: 'sm' }),
          h('button', {
            class: 'fx-btn fx-btn-ghost fx-btn-sm fx-icon-btn',
            type: 'button',
            'aria-label': 'Remove ' + product.name + ' from wishlist',
            onClick: () => {
              store.wishlist.toggle(product.id);
              ui.notify.info(product.name + ' removed from wishlist.', { action: { label: 'Undo', onClick: () => store.wishlist.toggle(product.id) } });
            },
          }, [ui.icon('trash')]),
        ]),
      ],
    });
    mount.appendChild(grid);

    const outOfStock = items.filter((p) => p.stock === 0).length;
    if (outOfStock) {
      mount.appendChild(
        h('div', { class: 'fx-alert fx-alert-warning', style: { marginTop: '16px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
          h('div', { text: outOfStock + ' saved ' + FX.u.pluralize(outOfStock, 'item is', 'items are') + ' out of stock. We will keep them in your wishlist until stock returns.' }),
        ])
      );
    }

    const savedIds = items.map((item) => item.id);
    const similar = store.home
      .recommended(16)
      .filter((product) => savedIds.indexOf(product.id) === -1)
      .slice(0, 10);
    if (similar.length) {
      mount.appendChild(
        h('section', { class: 'fx-section' }, [
          ui.sectionHead('Popular right now', { emoji: '🔥', subtitle: 'Things other shoppers are adding this week.', href: 'search.html', linkLabel: 'See all' }),
          ui.rail(similar, { wishlist: true }),
        ])
      );
    }
  }

  FX.pages = FX.pages || {};
  FX.pages.wishlist = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('wishlist:changed', render);
    FX.bus.on('cart:changed', render);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

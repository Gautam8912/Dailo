/**
 * Food Express — js/pages/orders.js
 * Order history with status filters, search, reorder and tracking links.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  const FILTERS = [
    { id: 'all', label: 'All orders' },
    { id: 'active', label: 'In progress' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'restaurant', label: 'Restaurant orders' },
  ];

  let filter = FX.u.qs('status') || 'all';
  let query = '';

  function statusMatches(order, id) {
    switch (id) {
      case 'active':
        return order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
      case 'delivered':
        return order.status === 'DELIVERED';
      case 'cancelled':
        return order.status === 'CANCELLED';
      case 'restaurant':
        return order.cartType === FX.constants.CART_TYPES.RESTAURANT;
      default:
        return true;
    }
  }

  function queryMatches(order) {
    if (!query) return true;
    const haystack = [order.id, order.restaurantName || '', ...(order.items || []).map((i) => i.name)].join(' ').toLowerCase();
    return haystack.indexOf(query.toLowerCase()) !== -1;
  }

  function matches(order) {
    return statusMatches(order, filter) && queryMatches(order);
  }

  function countFor(id) {
    return store.orders.list().filter((order) => statusMatches(order, id)).length;
  }

  function orderCard(order) {
    const card = h('div', { class: 'fx-order-card' });
    card.appendChild(
      h('div', {}, [
        h('div', { class: 'fx-order-card-head' }, [
          h('b', { text: order.id }),
          h('span', { text: FX.u.formatDate(order.createdAt, true) }),
          h('span', { text: (order.items || []).length + ' ' + FX.u.pluralize((order.items || []).length, 'item') }),
          h('span', { text: order.cartType === 'restaurant' ? '🍽️ ' + (order.restaurantName || 'Restaurant') : '🛒 Store order' }),
          ui.statusBadge(order.status),
        ]),
        h('div', { class: 'fx-order-items' },
          (order.items || []).slice(0, 6).map((line) =>
            h('img', { src: FX.media.imageFor(store.catalog.product(line.itemId) || line), alt: line.name, title: line.name + ' × ' + line.qty, loading: 'lazy' })
          )
        ),
        h('div', { class: 'fx-xs fx-muted', style: { marginTop: '8px' }, text: 'Delivering to ' + (order.address ? (order.address.label || 'Address') + ' · ' + (order.address.line1 || '') : '—') }),
        h('div', { class: 'fx-row fx-gap-2 fx-wrap', style: { marginTop: '10px' } }, [
          h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: FX.url('order', { id: order.id }), text: 'View & track' }),
          h('button', {
            class: 'fx-btn fx-btn-soft fx-btn-sm',
            type: 'button',
            text: 'Reorder',
            onClick: () => {
              const result = store.orders.reorder(order.id);
              if (!result.ok) {
                ui.notify.error(result.skipped.length ? 'None of these items are available right now.' : 'Could not reorder.');
                return;
              }
              ui.notify.success(result.added + ' items added to your cart' + (result.skipped.length ? ' · ' + result.skipped.length + ' skipped' : ''), {
                action: { label: 'View cart', onClick: () => FX.components.cartDrawer.open() },
              });
            },
          }),
          order.status === 'CANCELLED'
            ? h('span', { class: 'fx-xs fx-muted', text: order.cancelReason ? 'Reason: ' + order.cancelReason : '' })
            : null,
        ].filter(Boolean)),
      ])
    );
    card.appendChild(
      h('div', { class: 'fx-order-side' }, [
        h('div', { class: 'fx-price fx-lg', text: money((order.totals && order.totals.grandTotal) || 0) }),
        h('span', { class: 'fx-badge ' + (order.paymentStatus === 'paid' ? 'fx-badge-success' : order.paymentStatus === 'refunded' ? 'fx-badge-danger' : 'fx-badge-warning'), text: 'Payment ' + order.paymentStatus }),
        order.etaMinutes ? h('span', { class: 'fx-xs fx-muted', text: 'ETA ' + FX.u.etaLabel(order.etaMinutes) }) : null,
      ])
    );
    return card;
  }

  function render() {
    const mount = $('#orders-mount');
    if (!mount) return;
    clear(mount);

    const all = store.orders.list();
    document.title = 'Your orders · Food Express';

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 12px' } }, [
        h('div', {}, [
          h('h1', { class: 'fx-page-title', text: 'Your orders' }),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: all.length ? all.length + ' orders · ' + money(all.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + ((o.totals && o.totals.grandTotal) || 0), 0)) + ' lifetime spend' : 'Orders you place will appear here' }),
        ]),
        h('div', { class: 'fx-row fx-gap-2' }, [
          h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: 'account.html', text: 'Account' }),
          h('a', { class: 'fx-btn fx-btn-primary fx-btn-sm', href: 'index.html', text: 'Start a new order' }),
        ]),
      ])
    );

    mount.appendChild(
      h('div', { class: 'fx-toolbar' }, [
        h('div', { class: 'fx-pill-row fx-scroll-x' },
          FILTERS.map((entry) =>
            h('button', {
              class: 'fx-pill' + (filter === entry.id ? ' is-active' : ''),
              type: 'button',
              'aria-pressed': filter === entry.id ? 'true' : 'false',
              text: entry.label + ' (' + countFor(entry.id) + ')',
              onClick: () => {
                filter = entry.id;
                FX.u.setQs({ status: entry.id === 'all' ? null : entry.id }, { replace: true });
                render();
              },
            })
          )
        ),
        h('div', { class: 'fx-toolbar-right' }, [
          h('input', {
            class: 'fx-input',
            type: 'search',
            placeholder: 'Search by order ID or item',
            'aria-label': 'Search your orders',
            value: query,
            style: { minWidth: '240px' },
            onInput: FX.u.debounce((event) => {
              query = event.target.value.trim();
              render();
            }, FX.config.searchDebounceMs),
          }),
        ]),
      ])
    );

    const list = all.filter(matches);
    if (!all.length) {
      mount.appendChild(
        ui.emptyState({
          icon: '📦',
          title: 'No orders yet',
          message: 'When you place your first order it will show up here with live status, the full bill and one-tap reorder.',
          actions: [
            { label: 'Shop daily essentials', href: 'search.html?tag=essential', variant: 'primary' },
            { label: 'Order from a restaurant', href: 'restaurants.html', variant: 'outline' },
          ],
        })
      );
      return;
    }
    if (!list.length) {
      mount.appendChild(
        ui.emptyState({
          icon: '🔎',
          title: 'No orders match this filter',
          message: query ? 'Nothing matches “' + query + '”.' : 'Try a different status filter.',
          actions: [{ label: 'Show all orders', variant: 'primary', onClick: () => { filter = 'all'; query = ''; render(); } }],
        })
      );
      return;
    }
    list.forEach((order) => mount.appendChild(orderCard(order)));
  }

  FX.pages = FX.pages || {};
  FX.pages.orders = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('order:updated', render);
    FX.bus.on('order:placed', render);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

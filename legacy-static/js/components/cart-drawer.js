/**
 * Food Express — js/components/cart-drawer.js
 * Persistent slide-over cart: live totals, the ₹150 free-delivery progress,
 * quantity steppers, save-for-later and checkout shortcuts.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const bus = FX.bus;

  let instance = null;

  function renderLine(line) {
    const item = store.catalog.product(line.itemId);
    const row = h('div', { class: 'fx-line', dataset: { key: line.key } }, [
      h('a', { class: 'fx-line-media', href: item && item.type === 'menu-item' ? FX.url('restaurant', { id: line.restaurantId, item: line.itemId }) : FX.url('product', { id: line.itemId }) }, [
        h('img', { src: FX.media.imageFor(item || line), alt: line.name, loading: 'lazy', decoding: 'async' }),
      ]),
      h('div', {}, [
        h('h4', { class: 'fx-line-name' }, [h('a', { href: FX.url('product', { id: line.itemId }), text: line.name })]),
        h('div', { class: 'fx-line-meta' }, [
          line.unit ? h('span', { text: line.unit }) : null,
          line.veg === true ? h('span', { class: 'fx-diet', title: 'Vegetarian', role: 'img', 'aria-label': 'Vegetarian' }) : null,
          line.veg === false ? h('span', { class: 'fx-diet fx-diet-nonveg', title: 'Non-vegetarian', role: 'img', 'aria-label': 'Non-vegetarian' }) : null,
          line.restaurantName ? h('span', { class: 'fx-badge', text: line.restaurantName }) : null,
        ].filter(Boolean)),
        line.addons && line.addons.length
          ? h('div', { class: 'fx-line-addon', text: '+ ' + line.addons.map((a) => a.label).join(', ') })
          : null,
        h('div', { class: 'fx-line-actions' }, [
          ui.quantityStepper(line, { size: 'sm' }),
          h('button', {
            class: 'fx-link-btn',
            type: 'button',
            text: 'Save for later',
            onClick: () => {
              store.cart.saveForLater(line.key);
              ui.notify.info(line.name + ' moved to Saved for later');
            },
          }),
        ]),
      ]),
      h('div', { class: 'fx-line-price' }, [
        h('div', { class: 'fx-price', text: money(line.unitPrice * line.qty) }),
        line.mrp > line.price ? h('div', { class: 'fx-xs fx-strike', text: money(line.mrp * line.qty) }) : null,
      ]),
    ]);
    return row;
  }

  function render(body, foot) {
    clear(body);
    clear(foot);
    const totals = store.cart.totals();

    if (!store.cart.items.length) {
      body.appendChild(
        ui.emptyState({
          icon: '🛒',
          title: 'Your cart is empty',
          message: 'Add groceries, essentials or a meal from a nearby kitchen — free delivery unlocks at ' + money(store.settings.get().freeDeliveryThreshold) + '.',
          actions: [
            { label: 'Start shopping', href: 'index.html', variant: 'primary' },
            { label: 'Browse restaurants', href: 'restaurants.html', variant: 'outline' },
          ],
        })
      );
      if (store.cart.saved.length) body.appendChild(savedBlock());
      return;
    }

    body.appendChild(ui.thresholdWidget(totals));

    if (store.cart.type === FX.constants.CART_TYPES.RESTAURANT) {
      const restaurant = store.cart.restaurant();
      body.appendChild(
        h('div', { class: 'fx-alert fx-alert-info', style: { marginTop: '12px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '🍽️' }),
          h('div', {}, [
            h('strong', { text: (restaurant ? restaurant.name : 'Restaurant') + ' order. ' }),
            document.createTextNode(
              'This cart holds menu items from one kitchen only. Store products and other restaurants need a separate order.'
            ),
          ]),
        ])
      );
    }

    const list = h('div', { style: { marginTop: '12px' } });
    store.cart.items.forEach((line) => list.appendChild(renderLine(line)));
    body.appendChild(list);

    if (store.cart.saved.length) body.appendChild(savedBlock());

    body.appendChild(
      h('div', { style: { marginTop: '16px' } }, [
        h('h4', { class: 'fx-uppercase fx-muted', text: 'Bill summary' }),
        ui.priceBreakdown(totals),
      ])
    );

    foot.appendChild(
      h('div', { class: 'fx-stack', style: { gap: '10px' } }, [
        h('div', { class: 'fx-row-between' }, [
          h('span', { class: 'fx-muted fx-small', text: totals.totalQty + ' ' + FX.u.pluralize(totals.totalQty, 'item') + ' · To pay' }),
          h('span', { class: 'fx-price fx-lg', text: money(totals.grandTotal) }),
        ]),
        h('div', { class: 'fx-row fx-gap-2' }, [
          h('a', { class: 'fx-btn fx-btn-outline fx-btn-block', href: 'cart.html', text: 'View cart' }),
          h('a', { class: 'fx-btn fx-btn-primary fx-btn-block', href: 'checkout.html', text: 'Checkout' }),
        ]),
      ])
    );
  }

  function savedBlock() {
    const wrap = h('div', { style: { marginTop: '20px' } });
    wrap.appendChild(
      h('div', { class: 'fx-row-between', style: { marginBottom: '8px' } }, [
        h('h4', { class: 'fx-uppercase fx-muted', style: { margin: 0 }, text: 'Saved for later (' + store.cart.saved.length + ')' }),
        h('button', {
          class: 'fx-link-btn',
          type: 'button',
          text: 'Clear all',
          onClick: async () => {
            const ok = await ui.confirmDialog({ title: 'Clear saved items?', message: 'This removes every saved-for-later item.', confirmLabel: 'Clear', danger: true });
            if (!ok) return;
            store.cart.saved.splice(0, store.cart.saved.length);
            store.persist();
            bus.emit('cart:changed', { cart: store.state.cart, totals: store.cart.totals() });
          },
        }),
      ])
    );
    store.cart.saved.forEach((line) => {
      const item = store.catalog.product(line.itemId);
      wrap.appendChild(
        h('div', { class: 'fx-saved-item' }, [
          h('img', { src: FX.media.imageFor(item || line), alt: '', loading: 'lazy' }),
          h('div', { class: 'fx-grow' }, [
            h('div', { class: 'fx-small fx-strong', text: line.name }),
            h('div', { class: 'fx-xs fx-muted', text: money(line.price) + (line.unit ? ' · ' + line.unit : '') }),
          ]),
          h('button', {
            class: 'fx-btn fx-btn-soft fx-btn-sm',
            type: 'button',
            text: 'Move to cart',
            disabled: !item || item.stock <= 0,
            onClick: () => {
              const result = store.cart.moveToCart(line.key);
              if (!result.ok) ui.notify.error(result.reason || 'Could not move that item back to the cart.');
              else ui.notify.success(line.name + ' moved to cart');
            },
          }),
        ])
      );
    });
    return wrap;
  }

  function open() {
    if (instance) return instance;
    instance = ui.drawer({
      title: 'Your cart',
      footer: true,
      onClose: () => {
        instance = null;
      },
    });
    render(instance.body, instance.foot);
    const off = bus.on('cart:changed', () => {
      if (instance) render(instance.body, instance.foot);
    });
    const originalClose = instance.close;
    instance.close = () => {
      off();
      originalClose();
    };
    return instance;
  }

  FX.components = FX.components || {};
  FX.components.cartDrawer = { open, renderLine };
})(typeof globalThis !== 'undefined' ? globalThis : this);

/**
 * Food Express — js/pages/order-success.js
 * Order confirmation screen.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  function render() {
    const mount = $('#success-mount');
    if (!mount) return;
    clear(mount);

    const id = FX.u.qs('id');
    const order = id ? store.orders.get(id) : store.orders.list()[0];

    if (!order) {
      mount.appendChild(
        ui.emptyState({
          icon: '🧾',
          title: 'No recent order to show',
          message: 'If you just placed an order, open your order history to see it.',
          actions: [
            { label: 'Go to orders', href: 'orders.html', variant: 'primary' },
            { label: 'Continue shopping', href: 'index.html', variant: 'outline' },
          ],
        })
      );
      return;
    }

    document.title = 'Order ' + order.id + ' confirmed · Food Express';
    const eta = order.etaMinutes ? FX.u.etaLabel(order.etaMinutes) : '—';
    const totals = order.totals || {};

    mount.appendChild(
      h('div', { class: 'fx-card', style: { marginTop: '20px' } }, [
        h('div', { class: 'fx-success-hero' }, [
          h('div', { class: 'fx-success-ring', 'aria-hidden': 'true', text: '✓' }),
          h('h1', { style: { marginBottom: '6px' }, text: 'Order confirmed' }),
          h('p', { class: 'fx-muted', style: { maxWidth: '56ch', marginInline: 'auto' }, text: 'Thank you, ' + (order.userName || 'friend') + '. Your order ' + order.id + ' is ' + (FX.constants.ORDER_STATUS_LABELS[order.status] || order.status).toLowerCase() + '.' }),
          h('div', { class: 'fx-row fx-gap-2 fx-wrap', style: { justifyContent: 'center', marginTop: '16px' } }, [
            h('span', { class: 'fx-badge fx-badge-brand', text: 'Estimated delivery · ' + eta }),
            h('span', { class: 'fx-badge', text: FX.constants.PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod }),
            h('span', { class: 'fx-badge ' + (order.paymentStatus === FX.constants.PAYMENT_STATUS.PAID ? 'fx-badge-success' : 'fx-badge-warning'), text: 'Payment ' + (FX.constants.PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus) }),
            h('span', { class: 'fx-badge fx-badge-info', text: money(totals.grandTotal || 0) + ' paid' }),
          ]),
          h('div', { class: 'fx-btn-group', style: { justifyContent: 'center', marginTop: '20px' } }, [
            h('a', { class: 'fx-btn fx-btn-primary', href: FX.url('order', { id: order.id }), text: 'Track order' }),
            h('a', { class: 'fx-btn fx-btn-outline', href: 'orders.html', text: 'All orders' }),
            h('a', { class: 'fx-btn fx-btn-ghost', href: 'index.html', text: 'Continue shopping' }),
          ]),
        ]),
      ])
    );

    if (order.paymentMethod === FX.constants.PAYMENT_METHODS.DEMO) {
      mount.appendChild(
        h('div', { class: 'fx-alert fx-alert-warning', style: { margin: '16px 0' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '🧪' }),
          h('div', {}, [
            h('strong', { text: 'Simulated payment. ' }),
            document.createTextNode('No payment gateway was contacted and no money moved. This order exists only in the ' + (store.isDemo() ? 'local demo store' : 'connected backend') + '.'),
          ]),
        ])
      );
    }
    if (order.simulated) {
      mount.appendChild(
        h('div', { class: 'fx-alert fx-alert-info', style: { marginBottom: '16px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⏱️' }),
          h('div', { text: 'Order status will advance automatically in this demo build. Those updates are simulated — no live GPS tracking or delivery partner is connected.' }),
        ])
      );
    }

    const grid = h('div', { class: 'fx-checkout-grid', style: { marginTop: '8px' } });
    const left = h('div', { class: 'fx-stack' });
    const right = h('div', { class: 'fx-stack' });

    left.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h3', { style: { fontSize: 'var(--fx-text-md)' }, text: 'Items in this order (' + (order.items || []).length + ')' }),
        ...(order.items || []).map((line) =>
          h('div', { class: 'fx-line' }, [
            h('div', { class: 'fx-line-media' }, [h('img', { src: FX.media.imageFor(store.catalog.product(line.itemId) || line), alt: '', loading: 'lazy' })]),
            h('div', {}, [
              h('h4', { class: 'fx-line-name', text: line.name }),
              h('div', { class: 'fx-line-meta' }, [
                h('span', { text: 'Qty ' + line.qty }),
                line.unit ? h('span', { text: line.unit }) : null,
                line.addons && line.addons.length ? h('span', { text: '+ ' + line.addons.map((a) => a.label).join(', ') }) : null,
              ].filter(Boolean)),
            ]),
            h('div', { class: 'fx-line-price' }, [h('div', { class: 'fx-price', text: money(line.unitPrice * line.qty) })]),
          ])
        ),
      ])
    );

    left.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h3', { style: { fontSize: 'var(--fx-text-md)' }, text: 'Delivery address' }),
        h('p', { class: 'fx-small fx-muted', style: { margin: 0 } }, [
          h('strong', { class: 'fx-block', text: (order.address.label || FX.constants.ADDRESS_TYPE_LABELS[order.address.type] || 'Address') + ' · ' + order.address.receiver }),
          document.createTextNode(store.addresses.format(order.address)),
          h('span', { class: 'fx-block', text: 'Phone ' + (order.address.phone || '—') }),
          order.notes ? h('span', { class: 'fx-block', text: 'Notes: ' + order.notes }) : null,
          h('span', { class: 'fx-block fx-muted', text: 'Slot: ' + (FX.constants.DELIVERY_SLOT_LABELS[order.deliverySlot] || order.deliverySlot || 'Standard delivery') }),
        ]),
      ])
    );

    right.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h3', { style: { fontSize: 'var(--fx-text-md)' }, text: 'Bill summary' }),
        h('dl', { class: 'fx-bill', style: { margin: 0 } }, [
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Item total' }), h('dd', { text: money(totals.merchandiseSubtotal || 0) })]),
          totals.totalDiscount ? h('div', { class: 'fx-bill-row is-discount' }, [h('dt', { text: 'Discounts' }), h('dd', { text: '− ' + money(totals.totalDiscount) })]) : null,
          totals.gstIncluded ? h('div', { class: 'fx-bill-row fx-bill-muted' }, [h('dt', { text: 'GST incl.' }), h('dd', { text: money(totals.gstIncluded) })]) : null,
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Delivery fee' }), h('dd', { text: totals.deliveryFee ? money(totals.deliveryFee) : 'FREE' })]),
          totals.packingFee ? h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Packing charge' }), h('dd', { text: money(totals.packingFee) })]) : null,
          totals.tip ? h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Delivery tip' }), h('dd', { text: money(totals.tip) })]) : null,
          h('div', { class: 'fx-bill-row fx-bill-total' }, [h('dt', { text: 'Total paid' }), h('dd', { text: money(totals.grandTotal || 0) })]),
        ].filter(Boolean)),
        order.loyaltyEarned
          ? h('p', { class: 'fx-xs', style: { color: 'var(--fx-success)', marginTop: '10px' }, text: '🎁 You earned ' + order.loyaltyEarned + ' reward points on this order.' })
          : null,
      ])
    );

    right.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h3', { style: { fontSize: 'var(--fx-text-md)' }, text: 'What happens next' }),
        h('ol', { class: 'fx-small fx-muted', style: { lineHeight: '1.8' } }, [
          h('li', { text: 'The order is confirmed and assigned to a fulfilment partner.' }),
          h('li', { text: order.cartType === 'restaurant' ? 'The kitchen starts preparing your food.' : 'Items are picked and packed at the store.' }),
          h('li', { text: 'You get a notification when it goes out for delivery.' }),
          h('li', { text: 'Track every step from the order details page.' }),
        ]),
        h('a', { class: 'fx-btn fx-btn-outline fx-btn-block fx-btn-sm', href: FX.url('order', { id: order.id }), style: { marginTop: '10px' }, text: 'Open tracking page' }),
      ])
    );

    grid.appendChild(left);
    grid.appendChild(right);
    mount.appendChild(grid);

    const recommended = store.home.recommended(10);
    if (recommended.length) {
      mount.appendChild(
        h('section', { class: 'fx-section' }, [
          ui.sectionHead('Shop more while you wait', { emoji: '✨', subtitle: 'Free delivery unlocks again at ' + money(store.settings.get().freeDeliveryThreshold) + '.' }),
          ui.rail(recommended, {}),
        ])
      );
    }
  }

  FX.pages = FX.pages || {};
  FX.pages.orderSuccess = { render };
  FX.app.onReady(render);
})(typeof globalThis !== 'undefined' ? globalThis : this);

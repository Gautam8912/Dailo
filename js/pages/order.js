/**
 * Food Express — js/pages/order.js
 * Order details: simulated status timeline, bill, address, payment, actions.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const C = FX.constants;

  let currentId = FX.u.qs('id');

  function historyEntry(order, status) {
    const entries = (order.statusHistory || []).filter((entry) => entry.status === status);
    return entries.length ? entries[entries.length - 1] : null;
  }

  function timeline(order) {
    const baseFlow = order.flow && order.flow.length ? order.flow : C.orderFlowFor(order.cartType);
    const flow = order.status === C.CANCELLED ? baseFlow.concat([C.CANCELLED]) : baseFlow;
    const currentIndex = flow.indexOf(order.status);
    const box = h('div', { class: 'fx-card fx-card-pad' });

    box.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-2' }, [
        h('h2', { class: 'fx-section-title', text: 'Order progress' }),
        order.etaMinutes && order.status !== 'DELIVERED' && order.status !== C.CANCELLED
          ? h('span', { class: 'fx-badge fx-badge-brand', text: 'Arriving by ' + FX.u.etaLabel(order.etaMinutes) })
          : null,
      ])
    );

    if (order.status === C.CANCELLED) {
      box.appendChild(
        h('div', { class: 'fx-alert fx-alert-danger', style: { marginBottom: '12px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '✕' }),
          h('div', {}, [
            h('strong', { text: 'This order was cancelled. ' }),
            document.createTextNode(order.cancelReason ? 'Reason: ' + order.cancelReason + '. ' : ''),
            order.refundNote ? document.createTextNode(order.refundNote) : null,
          ]),
        ])
      );
    }

    const steps = h('div', { class: 'fx-timeline' });
    flow.forEach((status, index) => {
      const done = index < currentIndex;
      const current = index === currentIndex;
      const entry = historyEntry(order, status);
      steps.appendChild(
        h('div', { class: 'fx-timeline-item' + (done ? ' is-done' : '') + (current ? ' is-current' : '') }, [
          h('span', { class: 'fx-timeline-dot', 'aria-hidden': 'true', text: status === C.CANCELLED ? '✕' : done ? '✓' : current ? '●' : String(index + 1) }),
          h('div', {}, [
            h('h3', { class: 'fx-timeline-title', text: C.ORDER_STATUS_LABELS[status] || status }),
            h('p', { class: 'fx-timeline-sub' }, [
              h('span', { text: C.ORDER_STATUS_COPY[status] || '' }),
              entry && entry.at ? h('span', { class: 'fx-xs fx-muted', style: { display: 'block' }, text: FX.u.formatDate(entry.at, true) + (entry.note ? ' · ' + entry.note : '') }) : null,
            ]),
          ]),
        ])
      );
    });
    box.appendChild(steps);

    const percent = FX.u.percentage(currentIndex + 1, flow.length);
    box.appendChild(
      h('div', { style: { marginTop: '12px' } }, [
        h('div', {
          class: 'fx-progress',
          role: 'progressbar',
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'aria-valuenow': String(percent),
          'aria-label': 'Order progress',
        }, [h('div', { class: 'fx-progress-fill', style: { width: percent + '%' } })]),
        h('div', { class: 'fx-row-between fx-xs fx-muted', style: { marginTop: '4px' } }, [
          h('span', { text: C.ORDER_STATUS_LABELS[order.status] || order.status }),
          h('span', { text: percent + '% complete' }),
        ]),
      ])
    );

    if (order.simulated && order.status !== 'DELIVERED' && order.status !== C.CANCELLED) {
      box.appendChild(
        h('div', { class: 'fx-alert fx-alert-info', style: { margin: '14px 0 0' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⏱️' }),
          h('div', { text: 'Status updates in this build are simulated and advance on a timer. There is no live delivery-partner feed, GPS tracking or courier integration behind them.' }),
        ])
      );
      if (store.isDemo()) {
        const nextIndex = baseFlow.indexOf(order.status) + 1;
        if (nextIndex < baseFlow.length) {
          box.appendChild(
            h('button', {
              class: 'fx-btn fx-btn-outline fx-btn-sm',
              type: 'button',
              style: { marginTop: '10px' },
              text: 'Advance to ' + (C.ORDER_STATUS_LABELS[baseFlow[nextIndex]] || baseFlow[nextIndex]) + ' (demo control)',
              onClick: () => {
                store.orders.setStatus(order.id, baseFlow[nextIndex], { note: 'Advanced manually from the demo control' });
              },
            })
          );
        }
      }
    }
    return box;
  }

  function actions(order) {
    const box = h('div', { class: 'fx-card fx-card-pad' });
    box.appendChild(h('h2', { class: 'fx-section-title', text: 'Order actions' }));
    const group = h('div', { class: 'fx-stack fx-gap-2' });

    group.appendChild(
      h('button', {
        class: 'fx-btn fx-btn-primary fx-btn-block fx-btn-sm',
        type: 'button',
        text: 'Reorder these items',
        onClick: () => {
          const result = store.orders.reorder(order.id);
          if (!result.ok) {
            ui.notify.error(result.skipped && result.skipped.length ? 'None of these items are available right now.' : result.reason || 'Could not reorder.');
            return;
          }
          ui.notify.success(result.added + ' ' + FX.u.pluralize(result.added, 'line is', 'lines are') + ' back in your cart' + (result.skipped.length ? ' · ' + result.skipped.length + ' skipped' : ''), {
            action: { label: 'View cart', onClick: () => FX.components.cartDrawer.open() },
          });
        },
      })
    );

    if (store.orders.canCancel(order)) {
      group.appendChild(
        h('button', {
          class: 'fx-btn fx-btn-danger-soft fx-btn-block fx-btn-sm',
          type: 'button',
          text: 'Cancel this order',
          onClick: async () => {
            const confirmed = await ui.confirmDialog({
              title: 'Cancel ' + order.id + '?',
              message:
                'Cancelling releases the items back to stock' +
                (order.paymentStatus === C.PAYMENT_STATUS.PAID ? ' and marks the payment for refund' : '') +
                '. This cannot be undone.',
              confirmLabel: 'Cancel order',
              danger: true,
            });
            if (!confirmed) return;
            const reason = await ui.promptDialog({
              title: 'Why are you cancelling?',
              label: 'Reason (optional)',
              placeholder: 'e.g. ordered by mistake',
              confirmLabel: 'Confirm cancellation',
              danger: true,
              maxLength: 160,
            });
            if (reason === null) return;
            try {
              await store.orders.cancel(order.id, reason || 'Cancelled by customer');
              ui.notify.info('Order cancelled.' + (order.paymentStatus === C.PAYMENT_STATUS.REFUNDED ? ' Refund is marked as simulated — no gateway is connected.' : ''));
            } catch (err) {
              ui.notify.error(err.message || 'This order can no longer be cancelled.');
            }
          },
        })
      );
    } else if (order.status !== C.CANCELLED) {
      group.appendChild(
        h('p', { class: 'fx-xs fx-muted', style: { margin: 0 }, text: 'Cancellation is no longer available for this order — it is already ' + (C.ORDER_STATUS_LABELS[order.status] || order.status).toLowerCase() + '. Contact support if you need help.' })
      );
    }

    group.appendChild(
      h('a', { class: 'fx-btn fx-btn-outline fx-btn-block fx-btn-sm', href: FX.url('support', { order: order.id }), text: 'Need help with this order?' })
    );
    group.appendChild(
      h('button', {
        class: 'fx-btn fx-btn-ghost fx-btn-block fx-btn-sm',
        type: 'button',
        text: 'Print / save invoice',
        onClick: () => {
          ui.notify.info('Opening the print view — choose “Save as PDF” to keep a copy.');
          setTimeout(() => window.print(), 400);
        },
      })
    );
    box.appendChild(group);
    return box;
  }

  function render() {
    const mount = $('#order-mount');
    if (!mount) return;
    clear(mount);
    mount.appendChild(ui.crumbs([{ label: 'Orders', href: 'orders.html' }, { label: currentId || 'Order' }]));

    const order = store.orders.get(currentId) || store.orders.list()[0];
    if (!order) {
      mount.appendChild(
        ui.emptyState({
          icon: '🧾',
          title: 'Order not found',
          message: currentId ? 'We could not find order ' + currentId + ' in this browser profile.' : 'You have not placed an order yet.',
          actions: [
            { label: 'See all orders', href: 'orders.html', variant: 'primary' },
            { label: 'Continue shopping', href: 'index.html', variant: 'outline' },
          ],
        })
      );
      return;
    }
    currentId = order.id;
    FX.u.setQs({ id: order.id }, { replace: true });
    document.title = order.id + ' · ' + (C.ORDER_STATUS_LABELS[order.status] || order.status) + ' · Food Express';

    const totals = order.totals || {};
    const city = store.location.cities().find((entry) => entry.id === order.address.cityId) || store.addresses.cityOf(order.address) || {};

    mount.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '12px' } }, [
        h('div', { class: 'fx-row-between fx-wrap fx-gap-3' }, [
          h('div', {}, [
            h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
              h('h1', { class: 'fx-page-title', style: { margin: 0 }, text: order.id }),
              ui.statusBadge(order.status),
              order.simulated ? h('span', { class: 'fx-badge fx-badge-info', text: 'Simulated order' }) : null,
            ]),
            h('p', {
              class: 'fx-page-sub',
              style: { margin: '6px 0 0' },
              text:
                'Placed ' + FX.u.formatDate(order.createdAt, true) + ' · ' + (order.items || []).length + ' ' + FX.u.pluralize((order.items || []).length, 'item') +
                ' · ' + (order.cartType === C.CART_TYPES.RESTAURANT ? '🍽️ ' + (order.restaurantName || 'Restaurant') : '🛒 Store order'),
            }),
          ]),
          h('div', { style: { textAlign: 'right' } }, [
            h('div', { class: 'fx-price fx-lg', text: money(totals.grandTotal || 0) }),
            h('div', { class: 'fx-xs fx-muted', text: (C.PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod) + ' · ' + (C.PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus) }),
          ]),
        ]),
      ])
    );

    const grid = h('div', { class: 'fx-checkout-grid', style: { marginTop: '16px' } });
    const left = h('div', { class: 'fx-stack' });
    const right = h('div', { class: 'fx-stack' });

    left.appendChild(timeline(order));

    left.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Items' }),
        ...(order.items || []).map((line) =>
          h('div', { class: 'fx-line' }, [
            h('div', { class: 'fx-line-media' }, [h('img', { src: FX.media.imageFor(store.catalog.product(line.itemId) || line), alt: '', loading: 'lazy' })]),
            h('div', {}, [
              h('h4', { class: 'fx-line-name' }, [
                store.catalog.product(line.itemId)
                  ? h('a', { href: FX.url('product', { id: line.itemId }), text: line.name })
                  : document.createTextNode(line.name),
              ]),
              h('div', { class: 'fx-line-meta' }, [
                h('span', { text: money(line.unitPrice) + ' × ' + line.qty }),
                line.unit ? h('span', { text: line.unit }) : null,
                line.addons && line.addons.length
                  ? h('span', { text: '+ ' + line.addons.map((addon) => addon.label + (addon.price ? ' (' + money(addon.price) + ')' : '')).join(', ') })
                  : null,
              ].filter(Boolean)),
            ]),
            h('div', { class: 'fx-line-price' }, [h('div', { class: 'fx-price', text: money(line.unitPrice * line.qty) })]),
          ])
        ),
        h('hr', { class: 'fx-divider' }),
        h('dl', { class: 'fx-bill' }, [
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Item total' }), h('dd', { text: money(totals.merchandiseSubtotal || 0) })]),
          totals.gstIncluded ? h('div', { class: 'fx-bill-row fx-bill-muted' }, [h('dt', { text: 'GST incl.' }), h('dd', { text: money(totals.gstIncluded) })]) : null,
          totals.itemSavings ? h('div', { class: 'fx-bill-row is-discount' }, [h('dt', { text: 'Item savings' }), h('dd', { text: '− ' + money(totals.itemSavings) })]) : null,
          totals.autoOfferDiscount ? h('div', { class: 'fx-bill-row is-discount' }, [h('dt', { text: 'Auto offer' }), h('dd', { text: '− ' + money(totals.autoOfferDiscount) })]) : null,
          totals.couponDiscount ? h('div', { class: 'fx-bill-row is-discount' }, [h('dt', { text: 'Coupon ' + (order.couponCode || '') }), h('dd', { text: '− ' + money(totals.couponDiscount) })]) : null,
          totals.loyaltyDiscount ? h('div', { class: 'fx-bill-row is-discount' }, [h('dt', { text: 'Rewards redeemed (' + (order.loyaltyRedeemed || 0) + ' pts)' }), h('dd', { text: '− ' + money(totals.loyaltyDiscount) })]) : null,
          totals.packingFee ? h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Packing charge' }), h('dd', { text: money(totals.packingFee) })]) : null,
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Delivery fee' }), h('dd', { text: totals.deliveryFee ? money(totals.deliveryFee) : 'FREE' })]),
          totals.smallOrderFee ? h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Small order fee' }), h('dd', { text: money(totals.smallOrderFee) })]) : null,
          totals.surgeFee ? h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Demand surge' }), h('dd', { text: money(totals.surgeFee) })]) : null,
          totals.tip ? h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Delivery tip' }), h('dd', { text: money(totals.tip) })]) : null,
          totals.totalDiscount ? h('div', { class: 'fx-bill-row is-discount' }, [h('dt', { text: 'You saved' }), h('dd', { text: money(totals.totalDiscount) })]) : null,
          h('div', { class: 'fx-bill-row fx-bill-total' }, [h('dt', { text: 'Grand total' }), h('dd', { text: money(totals.grandTotal || 0) })]),
        ].filter(Boolean)),
      ])
    );

    right.appendChild(actions(order));

    right.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Delivery details' }),
        h('p', { class: 'fx-small', style: { margin: 0 } }, [
          h('strong', { class: 'fx-block', text: (order.address.label || C.ADDRESS_TYPE_LABELS[order.address.type] || 'Address') + ' · ' + order.address.receiver }),
          document.createTextNode(store.addresses.format(order.address)),
          h('span', { class: 'fx-block', text: 'Phone ' + (order.address.phone || '—') }),
          h('span', { class: 'fx-block fx-muted', text: 'Slot: ' + (C.DELIVERY_SLOT_LABELS[order.deliverySlot] || order.deliverySlot || 'Standard delivery') }),
          order.notes ? h('span', { class: 'fx-block', text: 'Notes: ' + order.notes }) : null,
        ]),
        h('p', {
          class: 'fx-xs fx-muted',
          style: { marginTop: '10px' },
          text:
            'Fulfilment: ' + (order.cartType === C.CART_TYPES.RESTAURANT ? 'Restaurant direct — ' + (order.restaurantName || '') : 'Food Express store') +
            ' · ' + (city.name ? city.name + (city.coverage === C.COVERAGE.COMING_SOON ? ' (demo coverage)' : '') : '—'),
        }),
      ])
    );

    right.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Payment' }),
        h('dl', { class: 'fx-bill' }, [
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Method' }), h('dd', { text: C.PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod })]),
          h('div', { class: 'fx-bill-row' }, [
            h('dt', { text: 'Status' }),
            h('dd', {}, [
              h('span', {
                class: 'fx-badge ' + (order.paymentStatus === C.PAYMENT_STATUS.PAID ? 'fx-badge-success' : order.paymentStatus === C.PAYMENT_STATUS.REFUNDED ? 'fx-badge-danger' : 'fx-badge-warning'),
                text: C.PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus,
              }),
            ]),
          ]),
        ]),
        order.paymentNote ? h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: order.paymentNote }) : null,
        order.refundNote ? h('p', { class: 'fx-xs', style: { marginTop: '6px', color: 'var(--fx-danger)' }, text: order.refundNote }) : null,
        order.paymentMethod === C.PAYMENT_METHODS.DEMO || order.paymentMethod === C.PAYMENT_METHODS.COD
          ? h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'No payment gateway was contacted for this order. Real UPI/card/wallet collection requires a gateway configured on the server with signature verification.' })
          : null,
        order.loyaltyEarned ? h('p', { class: 'fx-xs', style: { marginTop: '10px', color: 'var(--fx-success)' }, text: '🎁 ' + order.loyaltyEarned + ' reward points earned on this order.' }) : null,
      ])
    );

    grid.appendChild(left);
    grid.appendChild(right);
    mount.appendChild(grid);
  }

  FX.pages = FX.pages || {};
  FX.pages.order = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('order:updated', (order) => {
      if (!order || order.id === currentId) render();
    });
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

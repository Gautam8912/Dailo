/**
 * Food Express — js/pages/cart.js
 * Cart page: free-delivery threshold progress, quantity controls, coupons,
 * saved-for-later, full bill summary and checkout hand-off.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  function couponPanel(totals) {
    const wrap = h('div', { class: 'fx-card fx-card-pad' });
    wrap.appendChild(h('h3', { style: { fontSize: 'var(--fx-text-md)' }, text: 'Coupons & offers' }));

    if (totals.coupon) {
      wrap.appendChild(
        h('div', { class: 'fx-alert fx-alert-success', style: { marginTop: '8px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '🎟️' }),
          h('div', { class: 'fx-grow' }, [
            h('strong', { text: totals.coupon.code + ' applied' }),
            h('div', { class: 'fx-xs', text: totals.coupon.title + ' · you saved ' + money(totals.couponDiscount) }),
          ]),
          h('button', {
            class: 'fx-btn fx-btn-ghost fx-btn-sm',
            type: 'button',
            text: 'Remove',
            onClick: () => {
              store.coupons.remove();
              ui.notify.info('Coupon removed');
            },
          }),
        ])
      );
    } else {
      const input = h('input', {
        class: 'fx-input',
        type: 'text',
        placeholder: 'Enter coupon code (e.g. SAVE10)',
        'aria-label': 'Coupon code',
        style: { textTransform: 'uppercase' },
        onKeydown: (event) => {
          if (event.key === 'Enter') applyButton.click();
        },
      });
      const applyButton = h('button', {
        class: 'fx-btn fx-btn-primary',
        type: 'button',
        text: 'Apply',
        onClick: (event) => {
          const code = input.value.trim();
          if (!code) {
            ui.notify.warning('Enter a coupon code first.');
            return;
          }
          ui.setBusy(event.currentTarget, true, 'Checking…');
          const result = store.coupons.apply(code);
          ui.setBusy(event.currentTarget, false);
          if (!result.ok && !result.applied) {
            ui.notify.error(result.reason || 'That coupon cannot be applied to this cart.');
            return;
          }
          ui.notify.success(result.coupon.code + ' applied — ' + result.coupon.title);
        },
      });
      wrap.appendChild(h('div', { class: 'fx-input-group', style: { marginTop: '8px' } }, [input, applyButton]));
      wrap.appendChild(
        h('p', { class: 'fx-hint', text: 'One coupon per order. Minimum spends and category rules are validated against your cart.' })
      );
    }

    if (totals.autoOffer) {
      wrap.appendChild(
        h('div', { class: 'fx-alert fx-alert-info', style: { marginTop: '10px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '✨' }),
          h('div', { class: 'fx-xs' }, [
            h('strong', { text: 'Auto-applied: ' + totals.autoOffer.name + '. ' }),
            document.createTextNode(
              totals.autoOfferDiscount > 0
                ? 'Saved ' + money(totals.autoOfferDiscount) + '.'
                : 'Delivery fee waived for this order.'
            ),
          ]),
        ])
      );
    }

    const available = store.coupons.active();
    if (available.length) {
      wrap.appendChild(h('div', { class: 'fx-divider' }));
      wrap.appendChild(h('h4', { class: 'fx-uppercase fx-muted', text: 'Demo promotions available' }));
      wrap.appendChild(
        h('div', { class: 'fx-stack', style: { gap: '8px' } },
          available.slice(0, 5).map((coupon) =>
            h('div', { class: 'fx-coupon' + (coupon.validTo && new Date(coupon.validTo) < new Date() ? ' is-expired' : '') }, [
              h('div', { class: 'fx-row-between' }, [
                h('span', { class: 'fx-coupon-code', text: coupon.code }),
                h('span', { class: 'fx-badge', text: coupon.badge || 'Demo promotion' }),
              ]),
              h('div', { class: 'fx-coupon-title', text: coupon.title }),
              h('div', { class: 'fx-coupon-desc', text: coupon.description }),
              h('div', { class: 'fx-coupon-foot' }, [
                h('span', { class: 'fx-xs fx-muted', text: coupon.minSubtotal ? 'Min spend ' + money(coupon.minSubtotal) : 'No minimum' }),
                h('button', {
                  class: 'fx-btn fx-btn-soft fx-btn-sm',
                  type: 'button',
                  text: 'Apply',
                  onClick: () => {
                    const result = store.coupons.apply(coupon.code);
                    if (!result.ok && !result.applied) ui.notify.error(result.reason || 'Not applicable to this cart.');
                    else ui.notify.success(coupon.code + ' applied');
                  },
                }),
              ]),
            ])
          )
        )
      );
      wrap.appendChild(
        h('a', { class: 'fx-link-btn', href: 'account.html?tab=coupons', style: { display: 'inline-block', marginTop: '10px' }, text: 'See all coupons in your wallet →' })
      );
    }
    return wrap;
  }

  function render() {
    const mount = $('#cart-mount');
    if (!mount) return;
    clear(mount);

    const totals = store.cart.totals();
    document.title = totals.totalQty ? 'Cart (' + totals.totalQty + ') · Food Express' : 'Your cart · Food Express';

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 12px' } }, [
        h('div', {}, [
          h('h1', { class: 'fx-page-title', text: 'Your cart' }),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: totals.totalQty ? totals.totalQty + ' ' + FX.u.pluralize(totals.totalQty, 'item') + ' · delivering to ' + store.location.label() : 'Nothing here yet' }),
        ]),
        h('div', { class: 'fx-row fx-gap-2' }, [
          h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: '📍 Change location', onClick: () => FX.components.locationModal.open() }),
          h('a', { class: 'fx-btn fx-btn-ghost fx-btn-sm', href: 'index.html', text: 'Continue shopping' }),
        ]),
      ])
    );

    if (!store.location.isServiceable()) {
      mount.appendChild(
        h('div', { class: 'fx-alert fx-alert-danger', style: { marginBottom: '16px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⛔' }),
          h('div', {}, [
            h('strong', { text: 'Delivery is not available at ' + store.location.label() + '. ' }),
            document.createTextNode('Your cart is saved — switch to a serviceable city to check out.'),
          ]),
        ])
      );
    }

    if (!store.cart.items.length) {
      mount.appendChild(
        ui.emptyState({
          icon: '🛒',
          title: 'Your cart is empty',
          message: 'Free delivery unlocks at ' + money(store.settings.get().freeDeliveryThreshold) + ' of eligible items. Start with daily essentials or a meal from a nearby kitchen.',
          actions: [
            { label: 'Shop daily essentials', href: 'search.html?tag=essential', variant: 'primary' },
            { label: 'Order from restaurants', href: 'restaurants.html', variant: 'outline' },
            { label: 'Browse wishlist', href: 'wishlist.html', variant: 'ghost' },
          ],
        })
      );
      if (store.cart.saved.length) mount.appendChild(savedSection());
      return;
    }

    const layout = h('div', { class: 'fx-cart-layout' });
    const left = h('div', { class: 'fx-stack' });
    const right = h('div', { class: 'fx-cart-summary' });

    /* Threshold card */
    left.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        ui.thresholdWidget(totals),
        h('div', { class: 'fx-xs fx-muted', style: { marginTop: '10px' } }, [
          document.createTextNode(
            'Threshold: ' + money(totals.freeDeliveryThreshold) + ' of eligible merchandise. Delivery fee below the threshold: ' + money(totals.configuredDeliveryFee) + '. Tips, packing charges and taxes never count towards it.'
          ),
        ]),
        totals.remainingForFreeDelivery > 0
          ? h('div', { class: 'fx-row fx-gap-2 fx-wrap', style: { marginTop: '12px' } }, [
              h('span', { class: 'fx-xs fx-muted', text: 'Quick picks to get there:' }),
              ...store.home.essentials(40)
                .filter((item) => item.price <= Math.max(20, totals.remainingForFreeDelivery + 20) && item.stock > 0)
                .slice(0, 4)
                .map((item) =>
                  h('button', {
                    class: 'fx-pill',
                    type: 'button',
                    onClick: () => ui.handleAdd(item, 1, null),
                  }, [document.createTextNode(item.name + ' · ' + money(item.price))])
                ),
            ])
          : null,
      ].filter(Boolean))
    );

    /* Restaurant / store notice */
    if (store.cart.type === FX.constants.CART_TYPES.RESTAURANT) {
      const restaurant = store.cart.restaurant();
      left.appendChild(
        h('div', { class: 'fx-alert fx-alert-info' }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '🍽️' }),
          h('div', {}, [
            h('strong', { text: (restaurant ? restaurant.name : 'Restaurant') + ' order. ' }),
            document.createTextNode(
              'Minimum order ' + money(restaurant ? restaurant.minOrder : 0) +
              ' · packing charge ' + money(store.settings.get().packingFee) +
              '. Only this kitchen’s dishes can be in the cart.'
            ),
            restaurant ? h('a', { class: 'fx-link-btn', href: FX.url('restaurant', { id: restaurant.slug }), text: ' Add more dishes →', style: { marginLeft: '6px' } }) : null,
          ].filter(Boolean)),
        ])
      );
      if (totals.restaurantMinOrder) {
        left.appendChild(h('div', { class: 'fx-alert fx-alert-warning' }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
          h('div', { text: totals.restaurantMinOrder }),
        ]));
      }
    }

    /* Lines */
    const linesCard = h('div', { class: 'fx-card fx-card-pad' }, [
      h('div', { class: 'fx-row-between', style: { marginBottom: '8px' } }, [
        h('h2', { style: { margin: 0, fontSize: 'var(--fx-text-lg)' }, text: 'Items' }),
        h('button', {
          class: 'fx-link-btn',
          type: 'button',
          text: 'Clear cart',
          onClick: async () => {
            const ok = await ui.confirmDialog({
              title: 'Clear your cart?',
              message: 'This removes every item. Saved-for-later items are kept.',
              confirmLabel: 'Clear cart',
              danger: true,
            });
            if (!ok) return;
            store.cart.clear({ keepSaved: true });
            ui.notify.info('Cart cleared');
          },
        }),
      ]),
    ]);
    store.cart.items.forEach((line) => linesCard.appendChild(FX.components.cartDrawer.renderLine(line)));
    left.appendChild(linesCard);

    if (store.cart.saved.length) left.appendChild(savedSection());

    /* Recommendations */
    const recommended = store.home.recommended(10);
    if (recommended.length) {
      left.appendChild(
        h('section', { class: 'fx-section-tight' }, [
          ui.sectionHead('Add more to your order', { emoji: '✨', subtitle: 'Handy picks that also push you towards free delivery.' }),
          ui.rail(recommended, {}),
        ])
      );
    }

    /* Summary */
    right.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h3', { style: { fontSize: 'var(--fx-text-md)', marginBottom: '12px' }, text: 'Bill summary' }),
        ui.priceBreakdown(totals),
        h('div', { class: 'fx-divider' }),
        h('div', { class: 'fx-stack', style: { gap: '8px' } }, [
          h('a', {
            class: 'fx-btn fx-btn-primary fx-btn-block fx-btn-lg',
            href: 'checkout.html',
            'aria-disabled': totals.canCheckout && store.location.isServiceable() ? undefined : 'true',
            style: totals.canCheckout && store.location.isServiceable() ? {} : { pointerEvents: 'none', opacity: '0.55' },
            text: totals.canCheckout ? 'Proceed to checkout' : 'Checkout unavailable',
          }),
          totals.totalSavings > 0
            ? h('div', { class: 'fx-center fx-xs', style: { color: 'var(--fx-success)', fontWeight: '600' }, text: '🎉 You save ' + money(totals.totalSavings) + ' on this order' })
            : null,
          h('a', { class: 'fx-btn fx-btn-ghost fx-btn-block', href: 'index.html', text: 'Continue shopping' }),
        ].filter(Boolean)),
        h('p', { class: 'fx-bill-note', style: { marginTop: '10px' }, text: store.isDemo() ? 'Demo mode: totals are calculated locally by the shared pricing engine. With the backend connected, prices and stock are re-validated server-side before an order is accepted.' : 'Backend mode: totals are re-validated by the server at checkout.' }),
      ].filter(Boolean))
    );
    right.appendChild(couponPanel(totals));

    /* Loyalty */
    const points = store.rewards.points();
    right.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h3', { style: { fontSize: 'var(--fx-text-md)' }, text: 'Food Express rewards' }),
        h('p', { class: 'fx-small fx-muted', text: points + ' points available · worth ' + money(store.rewards.value()) + ' · this order earns ' + totals.earnedPoints + ' points' }),
        points >= store.settings.get().loyalty.minRedeemPoints
          ? h('label', { class: 'fx-check', style: { marginTop: '6px' } }, [
              h('input', {
                type: 'checkbox',
                checked: totals.redeemPoints > 0,
                onChange: (event) => {
                  store.cart.setRedeemPoints(event.target.checked ? points : 0);
                },
              }),
              h('span', { text: 'Redeem ' + points + ' points for up to ' + money(store.rewards.value()) + ' off' }),
            ])
          : h('p', { class: 'fx-xs fx-muted', text: 'Redemption opens at ' + store.settings.get().loyalty.minRedeemPoints + ' points.' }),
      ])
    );

    layout.appendChild(left);
    layout.appendChild(right);
    mount.appendChild(layout);

    /* Mobile sticky checkout bar */
    let sticky = $('.fx-sticky-bar');
    if (!sticky) {
      sticky = h('div', { class: 'fx-sticky-bar fx-no-print' });
      document.body.appendChild(sticky);
    }
    clear(sticky);
    sticky.appendChild(h('div', {}, [
      h('div', { class: 'fx-price', text: money(totals.grandTotal) }),
      h('div', { class: 'fx-xs fx-muted', text: totals.totalQty + ' ' + FX.u.pluralize(totals.totalQty, 'item') + (totals.freeDeliveryUnlocked ? ' · free delivery' : '') }),
    ]));
    sticky.appendChild(h('a', { class: 'fx-btn fx-btn-primary', href: 'checkout.html', text: 'Checkout' }));
    sticky.classList.add('is-visible');
    document.body.classList.add('fx-has-sticky');
  }

  function savedSection() {
    const wrap = h('div', { class: 'fx-card fx-card-pad' });
    wrap.appendChild(
      h('div', { class: 'fx-row-between', style: { marginBottom: '8px' } }, [
        h('h3', { style: { margin: 0, fontSize: 'var(--fx-text-md)' }, text: 'Saved for later (' + store.cart.saved.length + ')' }),
        h('button', {
          class: 'fx-link-btn',
          type: 'button',
          text: 'Clear all',
          onClick: async () => {
            const ok = await ui.confirmDialog({ title: 'Clear saved items?', message: 'Every saved-for-later item will be removed.', confirmLabel: 'Clear', danger: true });
            if (!ok) return;
            store.cart.saved.splice(0, store.cart.saved.length);
            store.persist();
            FX.bus.emit('cart:changed', { cart: store.state.cart, totals: store.cart.totals() });
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
            h('div', { class: 'fx-strong fx-small', text: line.name }),
            h('div', { class: 'fx-xs fx-muted', text: money(line.price) + (line.unit ? ' · ' + line.unit : '') + (item && item.stock <= 0 ? ' · out of stock' : '') }),
          ]),
          h('div', { class: 'fx-row fx-gap-2' }, [
            h('button', {
              class: 'fx-btn fx-btn-soft fx-btn-sm',
              type: 'button',
              text: 'Move to cart',
              disabled: !item || item.stock <= 0,
              onClick: () => {
                const result = store.cart.moveToCart(line.key);
                if (!result.ok) ui.notify.error(result.reason || 'Could not move that item.');
                else ui.notify.success(line.name + ' moved back to your cart');
              },
            }),
            h('button', {
              class: 'fx-btn fx-btn-ghost fx-btn-sm',
              type: 'button',
              'aria-label': 'Remove ' + line.name + ' from saved items',
              text: 'Remove',
              onClick: () => {
                store.cart.removeSaved(line.key);
                ui.notify.info(line.name + ' removed from saved items');
              },
            }),
          ]),
        ])
      );
    });
    return wrap;
  }

  FX.pages = FX.pages || {};
  FX.pages.cart = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('cart:changed', render);
    FX.bus.on('location:changed', render);
    FX.bus.on('rewards:changed', render);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

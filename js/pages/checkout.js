/**
 * Food Express — js/pages/checkout.js
 * Multi-step checkout: address → review → delivery option → coupon → payment →
 * bill → place order. Server (or the shared pricing engine in demo mode) is
 * authoritative for every number; duplicate submissions are blocked.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const C = FX.constants;

  const STEPS = [
    { id: 'address', label: 'Address' },
    { id: 'review', label: 'Review items' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'payment', label: 'Payment' },
    { id: 'confirm', label: 'Confirm' },
  ];

  const state = {
    step: 0,
    addressId: null,
    deliverySlot: 'standard',
    paymentMethod: C.PAYMENT_METHODS.DEMO,
    notes: '',
    tip: 0,
    submitting: false,
    idempotencyKey: null,
  };

  function addressForm(existing) {
    const record = existing || {};
    const form = h('form', { class: 'fx-stack', novalidate: true });
    const grid = h('div', { class: 'fx-form-grid' });
    const fields = {
      label: ui.field({ label: 'Address label', name: 'label', value: record.label || 'Home', placeholder: 'Home, Work, Parents…', required: true }),
      type: ui.field({
        label: 'Type',
        name: 'type',
        type: 'select',
        value: record.type || 'home',
        options: C.ADDRESS_TYPES.map((type) => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) })),
      }),
      receiver: ui.field({ label: 'Receiver name', name: 'receiver', value: record.receiver || (store.auth.user() ? store.auth.user().name : ''), required: true, autocomplete: 'name' }),
      phone: ui.field({ label: 'Mobile number', name: 'phone', value: record.phone || (store.auth.user() ? store.auth.user().phone : ''), required: true, inputmode: 'numeric', autocomplete: 'tel', hint: '10-digit Indian mobile number.' }),
      line1: ui.field({ label: 'Flat / house / street', name: 'line1', value: record.line1 || '', required: true, autocomplete: 'address-line1' }),
      line2: ui.field({ label: 'Area / colony', name: 'line2', value: record.line2 || '', autocomplete: 'address-line2' }),
      landmark: ui.field({ label: 'Landmark', name: 'landmark', value: record.landmark || '' }),
      pincode: ui.field({ label: 'PIN code', name: 'pincode', value: record.pincode || '', required: true, inputmode: 'numeric', maxlength: 6, autocomplete: 'postal-code' }),
    };
    Object.keys(fields).forEach((key) => grid.appendChild(fields[key]));
    form.appendChild(grid);

    const city = store.location.city();
    const locality = store.location.locality();
    form.appendChild(
      h('div', { class: 'fx-alert fx-alert-info' }, [
        h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '📍' }),
        h('div', {}, [
          h('strong', { text: 'City: ' + (city ? city.name : '—') + (locality ? ' · ' + locality.name : '') + '. ' }),
          h('button', { class: 'fx-link-btn', type: 'button', text: 'Change', onClick: () => FX.components.locationModal.open() }),
        ]),
      ])
    );
    form.appendChild(
      h('label', { class: 'fx-check' }, [
        h('input', { type: 'checkbox', name: 'isDefault', checked: Boolean(record.isDefault) || store.addresses.list().length === 0 }),
        h('span', { text: 'Save as my default delivery address' }),
      ])
    );
    form.appendChild(
      h('div', { class: 'fx-row fx-gap-2' }, [
        h('button', { class: 'fx-btn fx-btn-primary', type: 'submit', text: record.id ? 'Update address' : 'Save & deliver here' }),
        record.id ? h('button', { class: 'fx-btn fx-btn-ghost', type: 'button', text: 'Cancel', onClick: () => render() }) : null,
      ].filter(Boolean))
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      ui.clearFormErrors(form);
      const values = ui.formValues(form);
      const errors = {
        label: FX.u.validators.required(values.label, 'Address label'),
        receiver: FX.u.validators.required(values.receiver, 'Receiver name'),
        phone: FX.u.validators.mobile(values.phone),
        line1: FX.u.validators.required(values.line1, 'Address line'),
        pincode: FX.u.validators.pincode(values.pincode),
      };
      let invalid = false;
      Object.keys(errors).forEach((key) => {
        if (errors[key]) {
          invalid = true;
          ui.setFieldError(fields[key], errors[key]);
        }
      });
      if (invalid) {
        ui.notify.error('Please correct the highlighted fields.');
        return;
      }
      // Warn (not block) if the PIN does not match the selected locality.
      const pinHit = FX.locations.findByPin(values.pincode);
      if (pinHit && pinHit.city.id !== store.location.current.cityId) {
        const usePin = await ui.confirmDialog({
          title: 'PIN code belongs to another city',
          message: values.pincode + ' is configured for ' + pinHit.city.name + ', but your selected city is ' + (city ? city.name : '—') + '.',
          detail: 'Save anyway with the selected city, or cancel and fix the PIN code.',
          confirmLabel: 'Save anyway',
        });
        if (!usePin) return;
      }
      const payload = Object.assign({}, values, {
        cityId: store.location.current.cityId,
        localityId: store.location.current.localityId,
      });
      try {
        if (record.id) await store.addresses.update(record.id, payload);
        else {
          const created = await store.addresses.create(payload);
          state.addressId = created.id;
        }
        ui.notify.success('Address saved');
        state.step = 1;
        render();
      } catch (err) {
        ui.notify.error(err.message || 'Could not save the address.');
      }
    });
    return form;
  }

  function stepper() {
    const list = h('ol', { class: 'fx-stepper' });
    STEPS.forEach((step, index) => {
      const cls = index === state.step ? 'is-active' : index < state.step ? 'is-done' : '';
      list.appendChild(
        h('li', { class: cls }, [
          h('span', { class: 'fx-step-num', text: index < state.step ? '✓' : String(index + 1) }),
          h('span', { class: 'fx-step-label', text: step.label }),
        ])
      );
      if (index < STEPS.length - 1) list.appendChild(h('li', { class: 'fx-step-sep', 'aria-hidden': 'true' }));
    });
    return list;
  }

  function addressStep() {
    const addresses = store.addresses.list();
    const wrap = h('div', { class: 'fx-checkout-step' });
    wrap.appendChild(
      h('div', { class: 'fx-checkout-step-head' }, [
        h('span', { class: 'fx-checkout-step-num', text: '1' }),
        h('h3', { text: 'Delivery address' }),
        addresses.length ? h('button', { class: 'fx-link-btn', type: 'button', text: '+ Add new address', onClick: () => toggleForm() }) : null,
      ].filter(Boolean))
    );

    if (!store.auth.user()) {
      wrap.appendChild(
        h('div', { class: 'fx-alert fx-alert-info', style: { marginBottom: '12px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '👤' }),
          h('div', {}, [
            h('strong', { text: 'Checking out as a guest. ' }),
            document.createTextNode('Your cart and this address stay on this device. '),
            h('a', { href: FX.url('login', { next: 'checkout.html' }), text: 'Sign in' }),
            document.createTextNode(' to keep order history across devices — your cart merges automatically.'),
          ]),
        ])
      );
    }

    const listHost = h('div', { class: 'fx-grid fx-grid-2', style: { marginBottom: '12px' } });
    const formHost = h('div', {});

    addresses.forEach((address) => {
      listHost.appendChild(
        h('div', {
          class: 'fx-address' + (state.addressId === address.id ? ' is-selected' : ''),
          role: 'button',
          tabindex: '0',
          'aria-pressed': state.addressId === address.id ? 'true' : 'false',
          onClick: () => {
            state.addressId = address.id;
            render();
          },
          onKeydown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              state.addressId = address.id;
              render();
            }
          },
        }, [
          h('div', { class: 'fx-address-head' }, [
            h('span', { class: 'fx-address-type', text: (address.label || address.type || 'Address') + (address.isDefault ? ' · default' : '') }),
            state.addressId === address.id ? h('span', { class: 'fx-badge fx-badge-success', text: 'Selected' }) : null,
          ].filter(Boolean)),
          h('div', { class: 'fx-address-body', text: store.addresses.format(address) }),
          h('div', { class: 'fx-address-body fx-strong', text: (address.receiver || '') + (address.phone ? ' · ' + address.phone : '') }),
          h('div', { class: 'fx-address-actions' }, [
            h('button', { class: 'fx-link-btn', type: 'button', text: 'Edit', onClick: (event) => { event.stopPropagation(); toggleForm(address); } }),
            addresses.length > 1
              ? h('button', {
                  class: 'fx-link-btn',
                  type: 'button',
                  text: 'Delete',
                  onClick: async (event) => {
                    event.stopPropagation();
                    const ok = await ui.confirmDialog({ title: 'Delete this address?', message: store.addresses.format(address), confirmLabel: 'Delete', danger: true });
                    if (!ok) return;
                    await store.addresses.remove(address.id);
                    if (state.addressId === address.id) state.addressId = null;
                    ui.notify.info('Address deleted');
                    render();
                  },
                })
              : null,
            !address.isDefault
              ? h('button', { class: 'fx-link-btn', type: 'button', text: 'Set as default', onClick: (event) => { event.stopPropagation(); store.addresses.setDefault(address.id); ui.notify.success('Default address updated'); render(); } })
              : null,
          ].filter(Boolean)),
        ])
      );
    });

    let formVisible = addresses.length === 0;
    function toggleForm(address) {
      formVisible = !formVisible || Boolean(address);
      clear(formHost);
      if (formVisible) formHost.appendChild(addressForm(address));
    }

    wrap.appendChild(listHost);
    wrap.appendChild(formHost);
    if (addresses.length && !formVisible) {
      wrap.appendChild(
        h('button', { class: 'fx-btn fx-btn-primary', type: 'button', style: { marginTop: '8px' }, text: 'Deliver to this address', onClick: () => { state.step = 1; render(); } })
      );
    }
    if (formVisible) toggleForm();
    return wrap;
  }

  function reviewStep(totals) {
    const wrap = h('div', { class: 'fx-checkout-step' });
    wrap.appendChild(
      h('div', { class: 'fx-checkout-step-head' }, [
        h('span', { class: 'fx-checkout-step-num', text: '2' }),
        h('h3', { text: 'Review items (' + totals.totalQty + ')' }),
        h('a', { class: 'fx-link-btn', href: 'cart.html', text: 'Edit cart' }),
      ])
    );
    const card = h('div', { class: 'fx-card fx-card-pad' });
    store.cart.items.forEach((line) => card.appendChild(FX.components.cartDrawer.renderLine(line)));
    wrap.appendChild(card);

    // Stock & price revalidation notice
    const problems = [];
    store.cart.items.forEach((line) => {
      const item = store.catalog.product(line.itemId);
      if (!item) problems.push(line.name + ' is no longer in the catalogue');
      else if (item.stock < line.qty) problems.push(line.name + ' only has ' + item.stock + ' left');
      else if (item.price !== line.unitPrice && line.type !== C.CART_TYPES.RESTAURANT) problems.push(line.name + ' price changed to ' + money(item.price));
    });
    if (problems.length) {
      wrap.appendChild(
        h('div', { class: 'fx-alert fx-alert-danger', style: { marginTop: '12px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
          h('div', {}, [
            h('strong', { text: 'Cart needs attention before ordering: ' }),
            h('ul', { style: { margin: '6px 0 0' } }, problems.map((problem) => h('li', { text: problem }))),
            h('a', { class: 'fx-link-btn', href: 'cart.html', text: 'Open cart to fix →' }),
          ]),
        ])
      );
    }

    wrap.appendChild(
      h('div', { class: 'fx-field', style: { marginTop: '12px' } }, [
        h('label', { class: 'fx-label', for: 'order-notes', text: 'Delivery notes (optional)' }),
        h('textarea', {
          class: 'fx-textarea',
          id: 'order-notes',
          rows: 2,
          placeholder: 'Gate code, landmark instructions, “call on arrival”…',
          value: state.notes,
          onInput: (event) => { state.notes = event.target.value; },
        }),
      ])
    );

    wrap.appendChild(
      h('button', { class: 'fx-btn fx-btn-primary', type: 'button', disabled: Boolean(problems.length), text: problems.length ? 'Fix cart to continue' : 'Continue to delivery options', onClick: () => { state.step = 2; render(); } })
    );
    return wrap;
  }

  function deliveryStep(totals) {
    const wrap = h('div', { class: 'fx-checkout-step' });
    wrap.appendChild(
      h('div', { class: 'fx-checkout-step-head' }, [
        h('span', { class: 'fx-checkout-step-num', text: '3' }),
        h('h3', { text: 'Delivery option' }),
      ])
    );

    const eta = totals.items.reduce((max, line) => Math.max(max, line.handlingMinutes || 0), 0) + (store.location.etaMinutes(0) || 20);
    const options = FX.constants.DELIVERY_SLOTS.map((slot) =>
      slot.id === 'standard'
        ? Object.assign({}, slot, {
            desc: 'Arrives in about ' + FX.u.etaLabel(eta) + ' · ' + (totals.deliveryFee === 0 ? 'free delivery' : money(totals.deliveryFee) + ' fee'),
          })
        : slot
    );
    options.forEach((option) => {
      wrap.appendChild(
        h('label', { class: 'fx-payment-option' + (state.deliverySlot === option.id ? ' is-selected' : '') }, [
          h('input', {
            type: 'radio',
            name: 'deliverySlot',
            value: option.id,
            checked: state.deliverySlot === option.id,
            onChange: () => {
              state.deliverySlot = option.id;
              render();
            },
          }),
          h('div', { class: 'fx-payment-body' }, [
            h('div', { class: 'fx-payment-title', text: option.label }),
            h('div', { class: 'fx-payment-desc', text: option.desc }),
          ]),
        ])
      );
    });

    /* Tip */
    wrap.appendChild(h('h4', { style: { marginTop: '16px' }, text: 'Tip your delivery partner (optional)' }));
    wrap.appendChild(
      h('div', { class: 'fx-row fx-gap-2 fx-wrap' },
        store.settings.get().tipOptions.map((tip) =>
          h('button', {
            class: 'fx-pill' + (state.tip === tip ? ' is-active' : ''),
            type: 'button',
            'aria-pressed': state.tip === tip ? 'true' : 'false',
            text: tip === 0 ? 'No tip' : money(tip),
            onClick: () => {
              state.tip = tip;
              store.cart.setTip(tip);
              render();
            },
          })
        )
      )
    );
    wrap.appendChild(h('p', { class: 'fx-hint', text: 'Tips go to the delivery partner and never count towards the free-delivery threshold.' }));

    wrap.appendChild(
      h('div', { class: 'fx-row fx-gap-2', style: { marginTop: '16px' } }, [
        h('button', { class: 'fx-btn fx-btn-ghost', type: 'button', text: 'Back', onClick: () => { state.step = 1; render(); } }),
        h('button', { class: 'fx-btn fx-btn-primary', type: 'button', text: 'Continue to payment', onClick: () => { state.step = 3; render(); } }),
      ])
    );
    return wrap;
  }

  function paymentStep(totals) {
    const wrap = h('div', { class: 'fx-checkout-step' });
    wrap.appendChild(
      h('div', { class: 'fx-checkout-step-head' }, [
        h('span', { class: 'fx-checkout-step-num', text: '4' }),
        h('h3', { text: 'Payment method' }),
      ])
    );

    const features = store.settings.get().features;
    const methods = [
      {
        id: C.PAYMENT_METHODS.DEMO,
        icon: '🧪',
        title: 'Demo payment (simulated)',
        desc: 'Marks the order paid inside this build. No gateway is contacted and no money moves. Use it to test the full flow.',
        enabled: features.demoPayments,
        badge: 'Development only',
      },
      {
        id: C.PAYMENT_METHODS.COD,
        icon: '💵',
        title: 'Cash on delivery',
        desc: 'Pay the delivery partner in cash. Simulated in this build — no partner network is connected.',
        enabled: features.codPayments,
        badge: 'Simulated',
      },
      {
        id: C.PAYMENT_METHODS.UPI,
        icon: '📱',
        title: 'UPI',
        desc: 'Requires a payment service provider with server-side verification. Disabled until credentials are configured.',
        enabled: features.upiPayments,
        badge: 'Integration pending',
      },
      {
        id: C.PAYMENT_METHODS.CARD,
        icon: '💳',
        title: 'Credit / debit card',
        desc: 'Card data must be tokenised by a PCI-compliant gateway. Disabled until one is configured.',
        enabled: features.cardPayments,
        badge: 'Integration pending',
      },
    ];

    if (!methods.some((m) => m.enabled)) {
      wrap.appendChild(
        h('div', { class: 'fx-alert fx-alert-danger' }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⛔' }),
          h('div', { text: 'No payment method is enabled in application settings, so orders cannot be placed. Enable demo payments or configure a gateway in the admin dashboard.' }),
        ])
      );
      return wrap;
    }
    if (!methods.some((m) => m.enabled && m.id === state.paymentMethod)) {
      state.paymentMethod = methods.find((m) => m.enabled).id;
    }

    methods.forEach((method) => {
      wrap.appendChild(
        h('label', {
          class: 'fx-payment-option' + (state.paymentMethod === method.id ? ' is-selected' : '') + (method.enabled ? '' : ' is-disabled'),
        }, [
          h('input', {
            type: 'radio',
            name: 'paymentMethod',
            value: method.id,
            checked: state.paymentMethod === method.id,
            disabled: !method.enabled,
            onChange: () => {
              state.paymentMethod = method.id;
              render();
            },
          }),
          h('span', { class: 'fx-payment-icon', 'aria-hidden': 'true', text: method.icon }),
          h('div', { class: 'fx-payment-body' }, [
            h('div', { class: 'fx-payment-title' }, [
              document.createTextNode(method.title),
              h('span', { class: 'fx-badge ' + (method.enabled ? 'fx-badge-success' : 'fx-badge-warning'), text: method.badge }),
            ]),
            h('div', { class: 'fx-payment-desc', text: method.desc }),
          ]),
        ])
      );
    });

    wrap.appendChild(
      h('div', { class: 'fx-alert fx-alert-warning', style: { marginTop: '8px' } }, [
        h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '🔐' }),
        h('div', { text: 'Real online payments are not implemented in this build. A production deployment must verify every payment server-side — the frontend can never be trusted to declare a payment successful.' }),
      ])
    );

    wrap.appendChild(
      h('div', { class: 'fx-row fx-gap-2', style: { marginTop: '16px' } }, [
        h('button', { class: 'fx-btn fx-btn-ghost', type: 'button', text: 'Back', onClick: () => { state.step = 2; render(); } }),
        h('button', { class: 'fx-btn fx-btn-primary', type: 'button', text: 'Review bill', onClick: () => { state.step = 4; render(); } }),
      ])
    );
    return wrap;
  }

  function confirmStep(totals) {
    const wrap = h('div', { class: 'fx-checkout-step' });
    wrap.appendChild(
      h('div', { class: 'fx-checkout-step-head' }, [
        h('span', { class: 'fx-checkout-step-num', text: '5' }),
        h('h3', { text: 'Review & place order' }),
      ])
    );

    const address = state.addressId ? store.addresses.get(state.addressId) : store.addresses.defaultAddress();
    const methodLabel = { demo: 'Demo payment (simulated)', cod: 'Cash on delivery (simulated)', upi: 'UPI', card: 'Card' }[state.paymentMethod] || state.paymentMethod;

    wrap.appendChild(
      h('div', { class: 'fx-grid fx-grid-2', style: { gap: '16px' } }, [
        h('div', { class: 'fx-card fx-card-pad' }, [
          h('h4', { text: 'Delivering to' }),
          address
            ? h('div', { class: 'fx-small' }, [
                h('div', { class: 'fx-strong', text: (address.label || 'Address') + ' · ' + address.receiver }),
                h('div', { class: 'fx-muted', text: store.addresses.format(address) }),
                h('div', { class: 'fx-muted', text: 'Phone ' + address.phone }),
                h('button', { class: 'fx-link-btn', type: 'button', text: 'Change address', onClick: () => { state.step = 0; render(); } }),
              ])
            : h('div', { class: 'fx-alert fx-alert-warning' }, [h('span', { class: 'fx-alert-icon', text: '⚠️' }), h('div', { text: 'No address selected.' })]),
        ]),
        h('div', { class: 'fx-card fx-card-pad' }, [
          h('h4', { text: 'Payment & delivery' }),
          h('div', { class: 'fx-small fx-muted' }, [
            h('div', { text: 'Method: ' + methodLabel }),
            h('div', { text: 'Slot: ' + (FX.constants.DELIVERY_SLOT_LABELS[state.deliverySlot] || state.deliverySlot) }),
            h('div', { text: 'Tip: ' + (state.tip ? money(state.tip) : 'None') }),
            h('div', { text: 'Items: ' + totals.totalQty + ' · ' + (store.cart.type === C.CART_TYPES.RESTAURANT ? 'Restaurant order' : 'Store order') }),
            h('button', { class: 'fx-link-btn', type: 'button', text: 'Change payment', onClick: () => { state.step = 3; render(); } }),
          ]),
        ]),
      ])
    );

    wrap.appendChild(h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '16px' } }, [
      h('h4', { text: 'Final bill' }),
      ui.priceBreakdown(totals),
    ]));

    const blocked = [];
    if (!address) blocked.push('Select a delivery address.');
    if (!store.location.isServiceable()) blocked.push('The selected city is not serviceable in this build.');
    if (!totals.canCheckout) blocked.push(totals.belowMinOrder || totals.restaurantMinOrder || 'This cart cannot be checked out.');
    if (totals.totalQty === 0) blocked.push('Your cart is empty.');

    if (blocked.length) {
      wrap.appendChild(
        h('div', { class: 'fx-alert fx-alert-danger', style: { marginTop: '12px' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⛔' }),
          h('div', {}, blocked.map((reason) => h('div', { text: reason }))),
        ])
      );
    }

    const placeBtn = h('button', {
      class: 'fx-btn fx-btn-primary fx-btn-lg fx-btn-block',
      type: 'button',
      style: { marginTop: '16px' },
      disabled: Boolean(blocked.length),
      text: 'Place order · ' + money(totals.grandTotal),
    });
    placeBtn.addEventListener('click', () => placeOrder(placeBtn, totals));
    wrap.appendChild(placeBtn);
    wrap.appendChild(
      h('p', { class: 'fx-bill-note fx-center-text', style: { marginTop: '10px' }, text: 'By placing this order you accept the draft terms and the cancellation & refund policy. Double-submitting is blocked while the order is being created.' })
    );
    return wrap;
  }

  async function placeOrder(button, totals) {
    if (state.submitting) return;
    state.submitting = true;
    if (!state.idempotencyKey) state.idempotencyKey = FX.u.uid('idem');
    ui.setBusy(button, true, 'Placing your order…');
    const address = state.addressId ? store.addresses.get(state.addressId) : store.addresses.defaultAddress();
    try {
      const order = await store.orders.place({
        addressId: address ? address.id : null,
        address,
        paymentMethod: state.paymentMethod,
        deliverySlot: state.deliverySlot,
        notes: state.notes,
        idempotencyKey: state.idempotencyKey,
      });
      ui.notify.success('Order ' + order.id + ' placed');
      global.location.href = FX.url('orderSuccess', { id: order.id });
    } catch (err) {
      state.submitting = false;
      state.idempotencyKey = null;
      ui.setBusy(button, false);
      ui.notify.error(err.message || 'We could not place this order. Nothing was charged.');
      render();
    }
  }

  function summaryCard(totals) {
    const card = h('div', { class: 'fx-card fx-card-pad' });
    card.appendChild(h('h3', { style: { fontSize: 'var(--fx-text-md)', marginBottom: '10px' }, text: 'Order summary' }));
    card.appendChild(ui.thresholdWidget(totals, { small: true }));
    card.appendChild(h('div', { class: 'fx-divider' }));
    card.appendChild(ui.priceBreakdown(totals));
    card.appendChild(h('div', { class: 'fx-divider' }));
    card.appendChild(
      h('div', { class: 'fx-stack', style: { gap: '8px' } }, [
        h('div', { class: 'fx-xs fx-muted', text: '🛡️ Prices, stock and coupon eligibility are re-validated when the order is placed.' }),
        h('div', { class: 'fx-xs fx-muted', text: store.isDemo() ? 'Demo mode — orders are stored on this device and status updates are simulated.' : 'Backend mode — orders are stored in MongoDB with server-side validation.' }),
      ])
    );
    return card;
  }

  function render() {
    const mount = $('#checkout-mount');
    if (!mount) return;
    clear(mount);

    if (!store.cart.items.length) {
      document.title = 'Checkout · Food Express';
      mount.appendChild(
        ui.emptyState({
          icon: '🛒',
          title: 'Your cart is empty',
          message: 'Add something to your cart before checking out.',
          actions: [
            { label: 'Start shopping', href: 'index.html', variant: 'primary' },
            { label: 'Browse restaurants', href: 'restaurants.html', variant: 'outline' },
          ],
        })
      );
      const sticky = $('.fx-sticky-bar');
      if (sticky) sticky.classList.remove('is-visible');
      document.body.classList.remove('fx-has-sticky');
      return;
    }

    const totals = store.cart.totals();
    document.title = 'Checkout · ' + money(totals.grandTotal) + ' · Food Express';
    if (!state.addressId) {
      const fallback = store.addresses.defaultAddress();
      if (fallback) state.addressId = fallback.id;
    }
    if (state.tip !== store.state.cart.tip) state.tip = store.state.cart.tip;

    mount.appendChild(h('div', { style: { padding: '20px 0 8px' } }, [h('h1', { class: 'fx-page-title', text: 'Checkout' })]));
    mount.appendChild(stepper());

    const grid = h('div', { class: 'fx-checkout-grid' });
    const left = h('div', {});
    const right = h('div', { class: 'fx-cart-summary' });

    const steps = [addressStep(), reviewStep(totals), deliveryStep(totals), paymentStep(totals), confirmStep(totals)];
    steps.forEach((step, index) => {
      if (index === state.step) left.appendChild(step);
      else {
        const locked = h('div', { class: 'fx-checkout-step is-locked' });
        locked.appendChild(
          h('div', { class: 'fx-checkout-step-head' }, [
            h('span', { class: 'fx-checkout-step-num', text: index < state.step ? '✓' : String(index + 1) }),
            h('h3', { class: 'fx-muted', text: STEPS[index].label }),
            index < state.step
              ? h('button', { class: 'fx-link-btn', type: 'button', text: 'Edit', onClick: () => { state.step = index; render(); } })
              : h('span', { class: 'fx-xs fx-muted', text: 'Complete the previous step' }),
          ].filter(Boolean))
        );
        left.appendChild(locked);
      }
    });

    right.appendChild(summaryCard(totals));
    grid.appendChild(left);
    grid.appendChild(right);
    mount.appendChild(grid);

    const sticky = $('.fx-sticky-bar');
    if (sticky) sticky.classList.remove('is-visible');
    document.body.classList.remove('fx-has-sticky');
  }

  FX.pages = FX.pages || {};
  FX.pages.checkout = { render, state };

  FX.app.onReady(() => {
    render();
    FX.bus.on('location:changed', render);
    FX.bus.on('addresses:changed', () => { if (state.step === 0) render(); });
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/**
 * Food Express — js/pages/account.js
 * Signed-in account area: profile, addresses, orders, wishlist, coupons,
 * rewards, preferences, security and local data controls.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, $$, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const C = FX.constants;

  const TABS = [
    { id: 'profile', label: 'Profile', emoji: '👤' },
    { id: 'addresses', label: 'Addresses', emoji: '📍' },
    { id: 'orders', label: 'Orders', emoji: '📦' },
    { id: 'wishlist', label: 'Wishlist', emoji: '💚' },
    { id: 'coupons', label: 'Coupons', emoji: '🎟️' },
    { id: 'rewards', label: 'Rewards', emoji: '⭐' },
    { id: 'preferences', label: 'Preferences', emoji: '⚙️' },
    { id: 'security', label: 'Security', emoji: '🔒' },
    { id: 'data', label: 'Privacy & data', emoji: '🛡️' },
  ];

  let tab = FX.u.qs('tab') || 'profile';
  if (!TABS.some((entry) => entry.id === tab)) tab = 'profile';

  function selectTab(id) {
    tab = id;
    FX.u.setQs({ tab: id }, { replace: true });
    render();
  }

  /* ------------------------------------------------------------- profile */

  function profilePanel(user) {
    const panel = h('div', { class: 'fx-stack' });
    const form = h('form', { class: 'fx-card fx-card-pad fx-stack', novalidate: 'true' });

    form.appendChild(h('h2', { class: 'fx-section-title', text: 'Personal information' }));
    form.appendChild(
      h('p', { class: 'fx-small fx-muted', style: { margin: 0 }, text: 'This is the name and number your delivery partner sees. Your email address is your sign-in ID and cannot be changed here.' })
    );

    const nameField = ui.field({ label: 'Full name', name: 'name', value: user.name || '', required: true, autocomplete: 'name', placeholder: 'e.g. Anitha Reddy' });
    const phoneField = ui.field({ label: 'Mobile number', name: 'phone', value: user.phone || '', required: true, inputmode: 'numeric', autocomplete: 'tel', placeholder: '10-digit mobile number', hint: 'Used for delivery updates only.' });
    const emailField = ui.field({ label: 'Email address', name: 'email', value: user.email || '', disabled: true, hint: 'Contact support to change the email on your account.' });
    const genderField = ui.field({
      label: 'Gender (optional)',
      name: 'gender',
      type: 'select',
      value: user.gender || '',
      options: [
        { value: '', label: 'Prefer not to say' },
        { value: 'female', label: 'Female' },
        { value: 'male', label: 'Male' },
        { value: 'other', label: 'Other' },
      ],
    });

    form.appendChild(h('div', { class: 'fx-form-grid' }, [nameField, phoneField, emailField, genderField]));

    const submit = h('button', { class: 'fx-btn fx-btn-primary', type: 'submit', text: 'Save changes' });
    form.appendChild(h('div', { class: 'fx-btn-group' }, [submit, h('a', { class: 'fx-btn fx-btn-ghost', href: 'notifications.html', text: 'Notification settings' })]));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      ui.clearFormErrors(form);
      const values = ui.formValues(form);
      const errors = {
        name: FX.u.validators.minLength(2)(values.name, 'Name'),
        phone: FX.u.validators.mobile(values.phone),
      };
      let hasError = false;
      Object.keys(errors).forEach((key) => {
        if (!errors[key]) return;
        hasError = true;
        const fieldEl = $('.fx-field[data-field="' + key + '"]', form);
        ui.setFieldError(fieldEl, errors[key]);
      });
      if (hasError) {
        ui.notify.error('Please fix the highlighted fields.');
        return;
      }
      ui.setBusy(submit, true, 'Saving…');
      try {
        await store.auth.updateProfile({ name: values.name, phone: values.phone.replace(/\D/g, ''), gender: values.gender });
        ui.notify.success('Profile updated.');
        render();
      } catch (err) {
        ui.notify.error(err.message || 'Could not save your profile.');
      } finally {
        ui.setBusy(submit, false);
      }
    });

    panel.appendChild(form);

    panel.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Account summary' }),
        h('dl', { class: 'fx-bill' }, [
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Member since' }), h('dd', { text: FX.u.formatDate(user.createdAt || new Date().toISOString()) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Role' }), h('dd', { text: user.role === C.ROLES.ADMIN ? 'Administrator' : 'Customer' })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Orders placed' }), h('dd', { text: String(store.orders.list().length) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Reward points' }), h('dd', { text: store.rewards.points() + ' (worth ' + money(store.rewards.value()) + ')' })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Saved addresses' }), h('dd', { text: String(store.addresses.list().length) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Data mode' }), h('dd', { text: store.isDemo() ? 'Local demo storage' : 'Connected backend' })]),
        ]),
        user.role === C.ROLES.ADMIN ? h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: 'admin.html', style: { marginTop: '10px' }, text: 'Open admin dashboard' }) : null,
      ])
    );

    return panel;
  }

  /* ----------------------------------------------------------- addresses */

  function addressForm(existing) {
    const form = h('form', { class: 'fx-stack', novalidate: 'true' });
    const cities = store.location.cities().map((city) => ({ value: city.id, label: city.name + (city.coverage === C.COVERAGE.COMING_SOON ? ' — launching soon' : '') }));
    const currentCity = (existing && existing.cityId) || store.location.current().cityId;

    const fields = {
      label: ui.field({ label: 'Label', name: 'label', value: (existing && existing.label) || 'Home', required: true, placeholder: 'Home, Work, Amma’s place…' }),
      type: ui.field({
        label: 'Address type',
        name: 'type',
        type: 'select',
        value: (existing && existing.type) || 'home',
        options: C.ADDRESS_TYPES.map((type) => ({ value: type, label: C.ADDRESS_TYPE_LABELS[type] || type })),
      }),
      receiver: ui.field({ label: 'Receiver name', name: 'receiver', value: (existing && existing.receiver) || (store.auth.user() || {}).name || '', required: true }),
      phone: ui.field({ label: 'Phone', name: 'phone', value: (existing && existing.phone) || (store.auth.user() || {}).phone || '', required: true, inputmode: 'numeric' }),
      line1: ui.field({ label: 'Flat / house / street', name: 'line1', value: (existing && existing.line1) || '', required: true, placeholder: 'e.g. 12-3-45, MG Road' }),
      line2: ui.field({ label: 'Area / colony (optional)', name: 'line2', value: (existing && existing.line2) || '' }),
      landmark: ui.field({ label: 'Landmark (optional)', name: 'landmark', value: (existing && existing.landmark) || '' }),
      cityId: ui.field({ label: 'City', name: 'cityId', type: 'select', value: currentCity, options: cities }),
      pincode: ui.field({ label: 'PIN code', name: 'pincode', value: (existing && existing.pincode) || '', required: true, inputmode: 'numeric', maxlength: 6 }),
    };

    form.appendChild(h('div', { class: 'fx-form-grid' }, [fields.label, fields.type, fields.receiver, fields.phone, fields.line1, fields.line2, fields.landmark, fields.cityId, fields.pincode]));

    const defaultWrap = h('label', { class: 'fx-check' }, [
      h('input', { type: 'checkbox', name: 'isDefault', checked: Boolean(existing && existing.isDefault) || store.addresses.list().length === 0 }),
      h('span', { text: 'Make this my default delivery address' }),
    ]);
    form.appendChild(defaultWrap);

    const note = h('p', { class: 'fx-xs fx-muted', style: { margin: 0 } });
    form.appendChild(note);

    function refreshNote() {
      const selectedCityId = fields.cityId.querySelector('select').value;
      const city = store.location.cities().find((entry) => entry.id === selectedCityId);
      if (!city) {
        note.textContent = '';
        return;
      }
      note.textContent =
        city.coverage === C.COVERAGE.COMING_SOON
          ? city.name + ' is marked “launching soon” in this build — orders to this address will be blocked at checkout.'
          : city.name + ' is configured for demo delivery coverage. Serviceability is checked again when you place the order.';
    }
    fields.cityId.querySelector('select').addEventListener('change', refreshNote);
    refreshNote();

    form.fields = fields;
    return form;
  }

  function addressesPanel() {
    const panel = h('div', { class: 'fx-stack' });
    const list = store.addresses.list();

    panel.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-2' }, [
        h('h2', { class: 'fx-section-title', style: { margin: 0 }, text: 'Saved addresses' }),
        h('button', {
          class: 'fx-btn fx-btn-primary fx-btn-sm',
          type: 'button',
          text: '+ Add new address',
          onClick: () => openAddressModal(null),
        }),
      ])
    );

    if (!list.length) {
      panel.appendChild(
        ui.emptyState({
          icon: '📍',
          title: 'No addresses saved',
          message: 'Add a delivery address to speed up checkout. Addresses are stored on this device' + (store.auth.isSignedIn() ? ' and synced to your account when the backend is connected' : '') + '.',
          actions: [{ label: 'Add your first address', variant: 'primary', onClick: () => openAddressModal(null) }],
        })
      );
      return panel;
    }

    list.forEach((address) => {
      const city = store.location.cities().find((entry) => entry.id === address.cityId);
      const card = h('div', { class: 'fx-address' + (address.isDefault ? ' is-selected' : '') });
      card.appendChild(
        h('div', {}, [
          h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
            h('strong', { text: address.label || C.ADDRESS_TYPE_LABELS[address.type] || 'Address' }),
            address.isDefault ? h('span', { class: 'fx-badge fx-badge-success', text: 'Default' }) : null,
            city && city.coverage === C.COVERAGE.COMING_SOON ? h('span', { class: 'fx-badge fx-badge-warning', text: 'Launching soon' }) : null,
          ]),
          h('p', { class: 'fx-small fx-muted', style: { margin: '6px 0 0' }, text: store.addresses.format(address) }),
          h('p', { class: 'fx-xs fx-muted', style: { margin: '2px 0 0' }, text: address.receiver + ' · ' + address.phone }),
        ])
      );
      card.appendChild(
        h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
          address.isDefault
            ? null
            : h('button', { class: 'fx-btn fx-btn-soft fx-btn-sm', type: 'button', text: 'Set as default', onClick: () => { store.addresses.setDefault(address.id); ui.notify.success('Default address updated.'); render(); } }),
          h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Edit', onClick: () => openAddressModal(address) }),
          h('button', {
            class: 'fx-btn fx-btn-ghost fx-btn-sm',
            type: 'button',
            text: 'Remove',
            onClick: async () => {
              const ok = await ui.confirmDialog({ title: 'Remove this address?', message: address.label + ' · ' + store.addresses.format(address), confirmLabel: 'Remove', danger: true });
              if (!ok) return;
              await store.addresses.remove(address.id);
              ui.notify.info('Address removed.', { action: { label: 'Add again', onClick: () => openAddressModal(address) } });
              render();
            },
          }),
        ].filter(Boolean))
      );
      panel.appendChild(card);
    });

    panel.appendChild(
      h('div', { class: 'fx-alert fx-alert-info' }, [
        h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: 'ℹ️' }),
        h('div', { text: 'Delivery coverage in this build is configured per city. Cities marked “launching soon” are shown honestly as unavailable instead of pretending every city is live.' }),
      ])
    );

    return panel;
  }

  function openAddressModal(existing) {
    const form = addressForm(existing);
    const instance = ui.modal({
      title: existing ? 'Edit address' : 'Add a delivery address',
      content: form,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: existing ? 'Save address' : 'Add address',
          variant: 'primary',
          onClick: async (close) => {
            ui.clearFormErrors(form);
            const values = ui.formValues(form);
            values.isDefault = Boolean($('input[name="isDefault"]', form).checked);
            const errors = {
              label: FX.u.validators.required(values.label, 'Label'),
              receiver: FX.u.validators.required(values.receiver, 'Receiver name'),
              phone: FX.u.validators.mobile(values.phone),
              line1: FX.u.validators.required(values.line1, 'Address line'),
              pincode: FX.u.validators.pincode(values.pincode),
            };
            let hasError = false;
            Object.keys(errors).forEach((key) => {
              if (!errors[key]) return;
              hasError = true;
              ui.setFieldError(form.fields[key], errors[key]);
            });
            if (hasError) {
              ui.notify.error('Please fix the highlighted fields.');
              return;
            }
            try {
              if (existing) await store.addresses.update(existing.id, values);
              else await store.addresses.create(values);
              close();
              ui.notify.success(existing ? 'Address updated.' : 'Address saved.');
              render();
            } catch (err) {
              ui.notify.error(err.message || 'Could not save the address.');
            }
          },
        },
      ],
    });
    return instance;
  }

  /* -------------------------------------------------------------- orders */

  function ordersPanel() {
    const panel = h('div', { class: 'fx-stack' });
    const stats = store.orders.stats();
    const recent = store.orders.list().slice(0, 3);

    panel.appendChild(
      h('div', { class: 'fx-stat-row' }, [
        h('div', { class: 'fx-stat' }, [h('span', { class: 'fx-stat-value', text: String(stats.total) }), h('span', { class: 'fx-stat-label', text: 'Total orders' })]),
        h('div', { class: 'fx-stat' }, [h('span', { class: 'fx-stat-value', text: String(stats.active) }), h('span', { class: 'fx-stat-label', text: 'In progress' })]),
        h('div', { class: 'fx-stat' }, [h('span', { class: 'fx-stat-value', text: String(stats.delivered) }), h('span', { class: 'fx-stat-label', text: 'Delivered' })]),
        h('div', { class: 'fx-stat' }, [h('span', { class: 'fx-stat-value', text: money(stats.spend) }), h('span', { class: 'fx-stat-label', text: 'Lifetime spend' })]),
      ])
    );

    if (!recent.length) {
      panel.appendChild(
        ui.emptyState({
          icon: '📦',
          title: 'No orders yet',
          message: 'Your order history, invoices and one-tap reorder will appear here.',
          actions: [{ label: 'Start shopping', href: 'index.html', variant: 'primary' }],
        })
      );
      return panel;
    }

    recent.forEach((order) => {
      panel.appendChild(
        h('div', { class: 'fx-line fx-line-row' }, [
          h('div', {}, [
            h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [h('strong', { text: order.id }), ui.statusBadge(order.status)]),
            h('div', { class: 'fx-xs fx-muted', text: FX.u.formatDate(order.createdAt, true) + ' · ' + (order.items || []).length + ' items · ' + money((order.totals || {}).grandTotal || 0) }),
          ]),
          h('div', { class: 'fx-row fx-gap-2' }, [
            h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: FX.url('order', { id: order.id }), text: 'Track' }),
            h('button', {
              class: 'fx-btn fx-btn-soft fx-btn-sm',
              type: 'button',
              text: 'Reorder',
              onClick: () => {
                const result = store.orders.reorder(order.id);
                if (!result.ok) {
                  ui.notify.error('Those items are not available right now.');
                  return;
                }
                ui.notify.success(result.added + ' lines added back to your cart.', { action: { label: 'View cart', onClick: () => FX.components.cartDrawer.open() } });
              },
            }),
          ]),
        ])
      );
    });

    panel.appendChild(h('a', { class: 'fx-btn fx-btn-outline fx-btn-block fx-btn-sm', href: 'orders.html', text: 'View all ' + stats.total + ' orders' }));
    return panel;
  }

  /* ------------------------------------------------------------ wishlist */

  function wishlistPanel() {
    const panel = h('div', { class: 'fx-stack' });
    const items = store.wishlist.items();
    panel.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-2' }, [
        h('h2', { class: 'fx-section-title', style: { margin: 0 }, text: items.length + ' saved ' + FX.u.pluralize(items.length, 'item') }),
        h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: 'wishlist.html', text: 'Open wishlist' }),
      ])
    );
    if (!items.length) {
      panel.appendChild(ui.emptyState({ icon: '💚', title: 'Nothing saved yet', message: 'Tap the heart on any product to save it for later.', actions: [{ label: 'Browse best sellers', href: 'search.html?tag=bestseller', variant: 'primary' }] }));
      return panel;
    }
    panel.appendChild(ui.productGrid(items.slice(0, 8), { wishlist: true }));
    return panel;
  }

  /* ------------------------------------------------------------- coupons */

  function couponsPanel() {
    const panel = h('div', { class: 'fx-stack' });
    const coupons = store.coupons.list();
    const cartTotals = store.cart.totals();

    panel.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-2' }, [
        h('div', {}, [
          h('h2', { class: 'fx-section-title', style: { margin: 0 }, text: 'Coupons wallet' }),
          h('p', { class: 'fx-xs fx-muted', style: { margin: '4px 0 0' }, text: 'Eligibility is checked live against your current cart (' + money(cartTotals.eligibleSubtotal) + ' eligible subtotal).' }),
        ]),
        h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: 'cart.html', text: 'Open cart' }),
      ])
    );

    panel.appendChild(ui.demoBanner('All coupons below are seeded demo offers for this build — they are not live promotions from any brand.'));

    if (!coupons.length) {
      panel.appendChild(ui.emptyState({ icon: '🎟️', title: 'No coupons available', message: 'When coupons are configured they will appear here with their exact terms.' }));
      return panel;
    }

    coupons.forEach((coupon) => {
      const result = FX.pricing.validateCoupon(coupon, {
        items: store.cart.items,
        eligibleSubtotal: cartTotals.eligibleSubtotal,
        cartType: store.cart.type,
        restaurantId: store.cart.restaurantId,
        orderCount: store.orders.list().filter((o) => o.status !== C.CANCELLED).length,
        couponUses: {},
        isNewUser: store.orders.list().length === 0,
      });
      const used = store.coupons.usesOf(coupon.code);
      const expired = coupon.validTo && new Date(coupon.validTo).getTime() < Date.now();

      panel.appendChild(
        h('div', { class: 'fx-coupon' + (result.ok ? ' is-eligible' : '') }, [
          h('div', { class: 'fx-coupon-value' }, [
            h('strong', { text: coupon.type === C.COUPON_TYPES.PERCENT ? coupon.value + '% OFF' : coupon.type === C.COUPON_TYPES.FREE_DELIVERY ? 'FREE DELIVERY' : money(coupon.value) + ' OFF' }),
            h('span', { class: 'fx-xs', text: coupon.minSubtotal ? 'on orders above ' + money(coupon.minSubtotal) : 'no minimum' }),
          ]),
          h('div', { class: 'fx-coupon-body' }, [
            h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
              h('code', { class: 'fx-code', text: coupon.code }),
              coupon.demo ? h('span', { class: 'fx-badge fx-badge-warning', text: 'Demo coupon' }) : null,
              expired ? h('span', { class: 'fx-badge fx-badge-danger', text: 'Expired' }) : null,
              result.ok ? h('span', { class: 'fx-badge fx-badge-success', text: 'Eligible now' }) : null,
            ]),
            h('p', { class: 'fx-small fx-muted', style: { margin: '6px 0 0' }, text: coupon.description || coupon.title || '' }),
            h('p', {
              class: 'fx-xs fx-muted',
              style: { margin: '4px 0 0' },
              text:
                (result.ok
                  ? coupon.type === C.COUPON_TYPES.FREE_DELIVERY
                    ? 'Waives the ' + money(cartTotals.deliveryFee) + ' delivery fee on this cart.'
                    : 'Saves ' + money(FX.pricing.couponDiscountValue(coupon, cartTotals.eligibleSubtotal)) + ' on this cart.'
                  : result.reason) +
                (coupon.maxDiscount ? ' Capped at ' + money(coupon.maxDiscount) + '.' : '') +
                (used ? ' Used ' + used + '/' + (coupon.maxUsesPerUser || '∞') + ' times by you.' : ''),
            }),
          ]),
          h('div', { class: 'fx-coupon-action' }, [
            h('button', {
              class: 'fx-btn fx-btn-sm ' + (result.ok ? 'fx-btn-primary' : 'fx-btn-outline'),
              type: 'button',
              text: result.ok ? 'Apply to cart' : 'Copy code',
              onClick: () => {
                if (result.ok) {
                  const applied = store.coupons.apply(coupon.code);
                  if (applied.ok) {
                    const saved = store.cart.totals().couponDiscount;
                    ui.notify.success(
                      coupon.code + ' applied' + (saved ? ' — you saved ' + money(saved) : coupon.type === C.COUPON_TYPES.FREE_DELIVERY ? ' — delivery is free' : '') + '.',
                      { action: { label: 'View cart', onClick: () => FX.components.cartDrawer.open() } }
                    );
                  }
                  else ui.notify.error(applied.reason || 'That coupon could not be applied.');
                  render();
                  return;
                }
                FX.u.copyToClipboard(coupon.code);
                ui.notify.info('Code ' + coupon.code + ' copied. ' + (result.reason || ''));
              },
            }),
          ]),
        ])
      );
    });

    return panel;
  }

  /* ------------------------------------------------------------- rewards */

  function rewardsPanel() {
    const panel = h('div', { class: 'fx-stack' });
    const points = store.rewards.points();
    const value = store.rewards.value();
    const loyalty = store.settings.get().loyalty || C.LOYALTY;
    const history = store.rewards.history();
    const tiers = [
      { name: 'Bronze', min: 0 },
      { name: 'Silver', min: 250 },
      { name: 'Gold', min: 750 },
      { name: 'Platinum', min: 1500 },
    ];
    const tier = tiers.slice().reverse().find((entry) => points >= entry.min) || tiers[0];
    const next = tiers.find((entry) => entry.min > points);

    panel.appendChild(
      h('div', { class: 'fx-card fx-card-pad fx-rewards-hero' }, [
        h('div', {}, [
          h('p', { class: 'fx-xs fx-muted', style: { margin: 0 }, text: 'Reward balance' }),
          h('div', { class: 'fx-price fx-xl', text: points + ' pts' }),
          h('p', { class: 'fx-small fx-muted', style: { margin: 0 }, text: 'Worth ' + money(value) + ' at ' + money(loyalty.pointValue) + ' per point · ' + tier.name + ' tier' }),
        ]),
        h('div', { style: { minWidth: '220px', flex: '1' } }, [
          h('div', { class: 'fx-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(next ? next.min : points), 'aria-valuenow': String(points), 'aria-label': 'Progress to next tier' }, [
            h('div', { class: 'fx-progress-fill', style: { width: FX.u.percentage(points, next ? next.min : points) + '%' } }),
          ]),
          h('p', { class: 'fx-xs fx-muted', style: { marginTop: '6px' }, text: next ? (next.min - points) + ' points to ' + next.name : 'You are on the highest tier.' }),
        ]),
      ])
    );

    panel.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'How rewards work here' }),
        h('ul', { class: 'fx-list fx-small' }, [
          h('li', { text: 'Earn ' + Math.round(loyalty.earnRate * 100) + '% of the payable merchandise value as points on every delivered order.' }),
          h('li', { text: 'Each point is worth ' + money(loyalty.pointValue) + '. Minimum redemption is ' + loyalty.minRedeemPoints + ' points.' }),
          h('li', { text: 'Redemption is capped at ' + Math.round(loyalty.maxRedeemPercent * 100) + '% of the merchandise value of a single order.' }),
          h('li', { text: 'Points from a cancelled order are returned automatically; points redeemed on it are credited back.' }),
        ]),
        h('p', { class: 'fx-xs fx-muted', style: { margin: '10px 0 0' }, text: 'Rewards are calculated locally in this demo build. No external loyalty provider is connected.' }),
      ])
    );

    panel.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Points history' }),
        history.length
          ? h('div', { class: 'fx-stack fx-gap-2' }, history.slice(0, 12).map((entry) =>
              h('div', { class: 'fx-line fx-line-row' }, [
                h('div', {}, [
                  h('strong', { class: 'fx-small', text: entry.reason }),
                  h('div', { class: 'fx-xs fx-muted', text: FX.u.formatDate(entry.at, true) + (entry.ref ? ' · ' + entry.ref : '') }),
                ]),
                h('span', { class: 'fx-badge ' + (entry.type === 'credit' ? 'fx-badge-success' : 'fx-badge-warning'), text: (entry.type === 'credit' ? '+' : '−') + entry.points + ' pts' }),
              ])
            ))
          : ui.emptyState({ icon: '⭐', title: 'No point activity yet', message: 'Points appear here as soon as you place an order or redeem a reward.' }),
      ])
    );

    return panel;
  }

  /* --------------------------------------------------------- preferences */

  function preferencesPanel() {
    const panel = h('div', { class: 'fx-stack' });
    const prefs = store.preferences.get();
    const categories = store.catalog.categories();

    const form = h('form', { class: 'fx-card fx-card-pad fx-stack', novalidate: 'true' });
    form.appendChild(h('h2', { class: 'fx-section-title', text: 'Shopping preferences' }));

    function toggle(name, label, hint, checked) {
      return h('label', { class: 'fx-switch-row' }, [
        h('input', { type: 'checkbox', name, checked: Boolean(checked) }),
        h('span', { class: 'fx-switch-track', 'aria-hidden': 'true' }, [h('span', { class: 'fx-switch-thumb' })]),
        h('span', {}, [h('span', { class: 'fx-switch-label', text: label }), hint ? h('span', { class: 'fx-switch-hint', text: hint }) : null]),
      ]);
    }

    form.appendChild(toggle('vegOnly', 'Show vegetarian items first', 'Filters restaurant menus and hides non-veg suggestions on the home page.', prefs.vegOnly));
    form.appendChild(toggle('notifyOrder', 'Order updates', 'Status changes, delivery ETA and cancellation notices.', prefs.notifyOrder));
    form.appendChild(toggle('notifyPromo', 'Offers and promotions', 'New coupons, deal drops and price alerts. Always labelled as demo offers.', prefs.notifyPromo));

    form.appendChild(
      ui.field({
        label: 'Preferred delivery window',
        name: 'deliveryPreference',
        type: 'select',
        value: prefs.deliveryPreference || 'standard',
        options: C.DELIVERY_SLOTS.map((slot) => ({ value: slot.id, label: slot.label })),
        hint: 'Used as the pre-selected option at checkout. Scheduled windows are simulated in this build.',
      })
    );

    form.appendChild(h('h3', { class: 'fx-subsection-title', text: 'Favourite categories' }));
    const favourites = new Set(prefs.favouriteCategories || []);
    const chipRow = h('div', { class: 'fx-pill-row fx-wrap' });
    categories.forEach((category) => {
      chipRow.appendChild(
        h('button', {
          class: 'fx-pill' + (favourites.has(category.id) ? ' is-active' : ''),
          type: 'button',
          'aria-pressed': favourites.has(category.id) ? 'true' : 'false',
          text: (category.emoji ? category.emoji + ' ' : '') + category.name,
          onClick: (event) => {
            if (favourites.has(category.id)) favourites.delete(category.id);
            else favourites.add(category.id);
            event.currentTarget.classList.toggle('is-active', favourites.has(category.id));
            event.currentTarget.setAttribute('aria-pressed', favourites.has(category.id) ? 'true' : 'false');
          },
        })
      );
    });
    form.appendChild(chipRow);
    form.appendChild(h('p', { class: 'fx-xs fx-muted', style: { margin: 0 }, text: 'Favourites decide which sections appear first on your home page.' }));

    const save = h('button', { class: 'fx-btn fx-btn-primary', type: 'submit', text: 'Save preferences' });
    form.appendChild(h('div', { class: 'fx-btn-group' }, [save, h('button', { class: 'fx-btn fx-btn-ghost', type: 'button', text: 'Reset to defaults', onClick: () => { store.preferences.update({ vegOnly: false, notifyPromo: true, notifyOrder: true, deliveryPreference: 'standard', favouriteCategories: [] }); ui.notify.info('Preferences reset.'); render(); } })]));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = ui.formValues(form);
      store.preferences.update({
        vegOnly: Boolean(values.vegOnly),
        notifyOrder: Boolean(values.notifyOrder),
        notifyPromo: Boolean(values.notifyPromo),
        deliveryPreference: values.deliveryPreference || 'standard',
        favouriteCategories: Array.from(favourites),
      });
      ui.notify.success('Preferences saved.');
      render();
    });

    panel.appendChild(form);

    panel.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Notification centre' }),
        h('p', { class: 'fx-small fx-muted', text: 'You have ' + store.notifications.unreadCount() + ' unread ' + FX.u.pluralize(store.notifications.unreadCount(), 'notification') + '. In-app notifications are stored on this device; no SMS or push provider is connected.' }),
        h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: 'notifications.html', text: 'Open notifications' }),
      ])
    );

    return panel;
  }

  /* ------------------------------------------------------------ security */

  function securityPanel() {
    const panel = h('div', { class: 'fx-stack' });
    const user = store.auth.user() || {};

    const form = h('form', { class: 'fx-card fx-card-pad fx-stack', novalidate: 'true' });
    form.appendChild(h('h2', { class: 'fx-section-title', text: 'Change password' }));
    form.appendChild(
      h('p', { class: 'fx-small fx-muted', style: { margin: 0 }, text: store.isDemo() ? 'Demo mode: passwords are stored on this device as a salted SHA-256 hash — never as plain text. With the backend connected, bcrypt hashing and JWT sessions are used server-side.' : 'Your password is updated on the server. Existing sessions stay signed in until they expire.' })
    );

    const currentField = ui.field({ label: 'Current password', name: 'currentPassword', type: 'password', required: true, autocomplete: 'current-password' });
    const nextField = ui.field({ label: 'New password', name: 'newPassword', type: 'password', required: true, autocomplete: 'new-password', hint: 'At least 8 characters with a letter and a number.' });
    const confirmField = ui.field({ label: 'Confirm new password', name: 'confirmPassword', type: 'password', required: true, autocomplete: 'new-password' });

    const meter = h('div', { class: 'fx-strength' }, [
      h('div', { class: 'fx-progress' }, [h('div', { class: 'fx-progress-fill', style: { width: '0%' } })]),
      h('span', { class: 'fx-xs fx-muted', text: 'Strength: —' }),
    ]);
    const nextInput = $('input', nextField);
    nextInput.addEventListener('input', () => {
      const strength = FX.u.passwordStrength(nextInput.value);
      $('.fx-progress-fill', meter).style.width = strength.percent + '%';
      $('span', meter).textContent = 'Strength: ' + strength.label;
    });

    form.appendChild(currentField);
    form.appendChild(nextField);
    form.appendChild(meter);
    form.appendChild(confirmField);

    const submit = h('button', { class: 'fx-btn fx-btn-primary', type: 'submit', text: 'Update password' });
    form.appendChild(submit);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      ui.clearFormErrors(form);
      const values = ui.formValues(form);
      const errors = {
        currentPassword: FX.u.validators.required(values.currentPassword, 'Current password'),
        newPassword: FX.u.validators.password(values.newPassword),
        confirmPassword: values.newPassword === values.confirmPassword ? null : 'Both passwords must match.',
      };
      let hasError = false;
      Object.keys(errors).forEach((key) => {
        if (!errors[key]) return;
        hasError = true;
        ui.setFieldError(form.querySelector('.fx-field[data-field="' + key + '"]'), errors[key]);
      });
      if (hasError) {
        ui.notify.error('Please fix the highlighted fields.');
        return;
      }
      ui.setBusy(submit, true, 'Updating…');
      try {
        await store.auth.changePassword(values.currentPassword, values.newPassword);
        form.reset();
        $('.fx-progress-fill', meter).style.width = '0%';
        $('span', meter).textContent = 'Strength: —';
        ui.notify.success('Password updated.');
      } catch (err) {
        ui.notify.error(err.message || 'Could not change the password.');
        if (err.field) ui.setFieldError(form.querySelector('.fx-field[data-field="' + err.field + '"]'), err.message);
      } finally {
        ui.setBusy(submit, false);
      }
    });

    panel.appendChild(form);

    panel.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Session' }),
        h('dl', { class: 'fx-bill' }, [
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Signed in as' }), h('dd', { text: user.email || '—' })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Session type' }), h('dd', { text: store.auth.token() ? 'Token session' : 'Local demo session' })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Cart merge' }), h('dd', { text: 'Guest items merge into your account on sign-in — quantities combine, they are never duplicated.' })]),
        ]),
        h('div', { class: 'fx-btn-group', style: { marginTop: '10px' } }, [
          h('button', {
            class: 'fx-btn fx-btn-danger-soft fx-btn-sm',
            type: 'button',
            text: 'Sign out',
            onClick: async () => {
              const ok = await ui.confirmDialog({ title: 'Sign out?', message: 'Your cart stays on this device, so you can continue where you left off.', confirmLabel: 'Sign out' });
              if (!ok) return;
              await store.auth.logout();
              ui.notify.info('You have been signed out.');
              FX.navigate('index.html');
            },
          }),
          h('a', { class: 'fx-btn fx-btn-ghost fx-btn-sm', href: 'forgot-password.html', text: 'Forgot password?' }),
        ]),
      ])
    );

    return panel;
  }

  /* ---------------------------------------------------------------- data */

  function dataPanel() {
    const panel = h('div', { class: 'fx-stack' });

    panel.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'What Food Express stores' }),
        h('ul', { class: 'fx-list fx-small' }, [
          h('li', { text: 'Profile: name, email, mobile number and a hashed password (never plain text).' }),
          h('li', { text: 'Shopping data: cart, saved-for-later items, wishlist, recently viewed products and search history.' }),
          h('li', { text: 'Fulfilment data: addresses, orders, order status history and support tickets.' }),
          h('li', { text: 'Engagement data: reward points, coupon usage counts, notification list and preferences.' }),
          h('li', { text: store.isDemo() ? 'In this demo build all of the above lives in your browser’s localStorage. Clearing site data removes it.' : 'With the backend connected, the same data is stored server-side against your account.' }),
        ]),
        h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'No third-party analytics, ad trackers or payment gateways are loaded by this build.' }),
      ])
    );

    panel.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Your controls' }),
        h('div', { class: 'fx-btn-group fx-wrap' }, [
          h('button', {
            class: 'fx-btn fx-btn-outline fx-btn-sm',
            type: 'button',
            text: 'Export my data (JSON)',
            onClick: () => {
              const user = store.auth.user() || {};
              const payload = {
                exportedAt: new Date().toISOString(),
                mode: store.mode(),
                profile: { name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt },
                addresses: store.addresses.list(),
                orders: store.orders.list(),
                wishlist: store.wishlist.ids(),
                recentlyViewed: store.recent.items().map((item) => item.id),
                searchHistory: store.history.list(),
                rewards: { points: store.rewards.points(), history: store.rewards.history() },
                notifications: store.notifications.list(),
                preferences: store.preferences.get(),
                supportTickets: store.support.list(),
                cart: store.cart.items,
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = h('a', { href: url, download: 'food-express-data-' + new Date().toISOString().slice(0, 10) + '.json' });
              document.body.appendChild(link);
              link.click();
              link.remove();
              setTimeout(() => URL.revokeObjectURL(url), 4000);
              ui.notify.success('Your data export has been downloaded.');
            },
          }),
          h('button', {
            class: 'fx-btn fx-btn-outline fx-btn-sm',
            type: 'button',
            text: 'Clear search & browsing history',
            onClick: async () => {
              const ok = await ui.confirmDialog({ title: 'Clear history?', message: 'Search history and recently viewed products will be removed. Your cart, wishlist and orders are kept.', confirmLabel: 'Clear history', danger: true });
              if (!ok) return;
              store.history.clear();
              store.recent.clear();
              ui.notify.info('Search and browsing history cleared.');
              render();
            },
          }),
          h('button', {
            class: 'fx-btn fx-btn-danger-soft fx-btn-sm',
            type: 'button',
            text: 'Delete my data on this device',
            onClick: async () => {
              const ok = await ui.confirmDialog({
                title: 'Delete local data?',
                message: 'This clears the cart, wishlist, addresses, orders, notifications, rewards and preferences stored in this browser. It cannot be undone.',
                confirmLabel: 'Delete everything',
                danger: true,
              });
              if (!ok) return;
              store.resetLocalData({ keepAccounts: true });
              await store.auth.logout({ clearCart: true });
              ui.notify.success('Local data deleted. You have been signed out.');
              FX.navigate('index.html');
            },
          }),
        ]),
        h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'Account deletion against the connected backend is a support action in this build — see the privacy policy for the documented process.' }),
      ])
    );

    panel.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Policies' }),
        h('div', { class: 'fx-btn-group fx-wrap' }, [
          h('a', { class: 'fx-btn fx-btn-ghost fx-btn-sm', href: 'privacy.html', text: 'Privacy policy' }),
          h('a', { class: 'fx-btn fx-btn-ghost fx-btn-sm', href: 'terms.html', text: 'Terms of use' }),
          h('a', { class: 'fx-btn fx-btn-ghost fx-btn-sm', href: 'shipping.html', text: 'Shipping & delivery' }),
          h('a', { class: 'fx-btn fx-btn-ghost fx-btn-sm', href: 'refunds.html', text: 'Cancellation & refunds' }),
        ]),
        h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'Policy text in this build is draft business content, not reviewed legal advice.' }),
      ])
    );

    return panel;
  }

  /* --------------------------------------------------------------- render */

  function panelFor(id, user) {
    switch (id) {
      case 'addresses':
        return addressesPanel();
      case 'orders':
        return ordersPanel();
      case 'wishlist':
        return wishlistPanel();
      case 'coupons':
        return couponsPanel();
      case 'rewards':
        return rewardsPanel();
      case 'preferences':
        return preferencesPanel();
      case 'security':
        return securityPanel();
      case 'data':
        return dataPanel();
      default:
        return profilePanel(user);
    }
  }

  function render() {
    const mount = $('#account-mount');
    if (!mount) return;
    clear(mount);

    const user = store.auth.user();
    if (!user) {
      mount.appendChild(
        ui.emptyState({
          icon: '🔐',
          title: 'Sign in to view your account',
          message: 'Your profile, addresses, orders, wishlist and rewards live behind sign-in.',
          actions: [
            { label: 'Sign in', href: 'login.html', variant: 'primary' },
            { label: 'Create an account', href: 'register.html', variant: 'outline' },
          ],
        })
      );
      return;
    }

    document.title = (TABS.find((entry) => entry.id === tab) || {}).label + ' · My account · Food Express';

    const stats = store.orders.stats();
    mount.appendChild(
      h('div', { class: 'fx-account-hero fx-card', style: { marginTop: '20px' } }, [
        ui.avatar(user, 'lg'),
        h('div', {}, [
          h('h1', { class: 'fx-page-title', style: { margin: 0 }, text: user.name || 'Welcome' }),
          h('p', { class: 'fx-page-sub', style: { margin: '2px 0 0' }, text: user.email + (user.phone ? ' · +91 ' + user.phone : '') }),
          h('div', { class: 'fx-row fx-gap-2 fx-wrap', style: { marginTop: '8px' } }, [
            h('span', { class: 'fx-badge', text: stats.total + ' orders' }),
            h('span', { class: 'fx-badge', text: store.rewards.points() + ' points' }),
            h('span', { class: 'fx-badge', text: store.wishlist.count() + ' saved' }),
            h('span', { class: 'fx-badge', text: store.addresses.list().length + ' addresses' }),
            user.role === C.ROLES.ADMIN ? h('span', { class: 'fx-badge fx-badge-brand', text: 'Administrator' }) : null,
            h('span', { class: 'fx-badge ' + (store.isDemo() ? 'fx-badge-warning' : 'fx-badge-success'), text: store.isDemo() ? 'Demo storage' : 'Backend connected' }),
          ].filter(Boolean)),
        ]),
      ])
    );

    const grid = h('div', { class: 'fx-account-grid' });
    const nav = h('nav', { class: 'fx-account-nav', 'aria-label': 'Account sections' });
    TABS.forEach((entry) => {
      nav.appendChild(
        h('button', {
          class: 'fx-account-nav-item' + (entry.id === tab ? ' is-active' : ''),
          type: 'button',
          'aria-current': entry.id === tab ? 'page' : null,
          onClick: () => selectTab(entry.id),
        }, [h('span', { 'aria-hidden': 'true', text: entry.emoji }), h('span', { text: entry.label })])
      );
    });
    nav.appendChild(
      h('button', {
        class: 'fx-account-nav-item fx-account-nav-signout',
        type: 'button',
        onClick: async () => {
          const ok = await ui.confirmDialog({ title: 'Sign out?', message: 'Your cart stays on this device.', confirmLabel: 'Sign out' });
          if (!ok) return;
          await store.auth.logout();
          ui.notify.info('You have been signed out.');
          FX.navigate('index.html');
        },
      }, [h('span', { 'aria-hidden': 'true', text: '🚪' }), h('span', { text: 'Sign out' })])
    );

    const content = h('div', { class: 'fx-account-content' });
    content.appendChild(panelFor(tab, user));

    grid.appendChild(nav);
    grid.appendChild(content);
    mount.appendChild(grid);
  }

  FX.pages = FX.pages || {};
  FX.pages.account = { render, selectTab };

  FX.app.onReady(() => {
    render();
    FX.bus.on('auth:changed', render);
    FX.bus.on('addresses:changed', () => { if (tab === 'addresses') render(); });
    FX.bus.on('order:placed', () => { if (tab === 'orders') render(); });
    FX.bus.on('order:updated', () => { if (tab === 'orders') render(); });
    FX.bus.on('wishlist:changed', () => { if (tab === 'wishlist') render(); });
    FX.bus.on('rewards:changed', () => { if (tab === 'rewards') render(); });
    FX.bus.on('cart:changed', () => { if (tab === 'coupons') render(); });
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

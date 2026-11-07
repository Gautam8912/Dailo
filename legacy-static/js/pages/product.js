/**
 * Food Express — js/pages/product.js
 * Product (and restaurant dish) details page.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  function customisationUI(item, state) {
    if (!item.customisations || !item.customisations.length) return null;
    const wrap = h('div', { class: 'fx-stack', style: { gap: '10px' } });
    wrap.appendChild(h('h4', { style: { margin: 0 }, text: 'Customise your dish' }));
    item.customisations.forEach((group) => {
      const groupEl = h('div', { class: 'fx-custom-group' });
      groupEl.appendChild(
        h('div', { class: 'fx-custom-group-head' }, [
          h('h4', { text: group.name }),
          h('span', { class: 'fx-xs fx-muted', text: group.required ? 'Required · pick one' : 'Optional' + (group.type === 'multi' ? ' · pick any' : '') }),
        ])
      );
      group.options.forEach((option) => {
        const inputType = group.type === 'multi' ? 'checkbox' : 'radio';
        const name = 'custom-' + group.id;
        const selected = group.type === 'single' && group.required && option.price === 0 && !state.selection[group.id];
        if (selected) state.selection[group.id] = [option.id];
        const input = h('input', {
          type: inputType,
          name,
          value: option.id,
          checked: (state.selection[group.id] || []).indexOf(option.id) !== -1,
          onChange: (event) => {
            const current = state.selection[group.id] || [];
            if (inputType === 'radio') state.selection[group.id] = [option.id];
            else if (event.target.checked) state.selection[group.id] = current.concat([option.id]);
            else state.selection[group.id] = current.filter((id) => id !== option.id);
            state.refreshPrice();
          },
        });
        groupEl.appendChild(
          h('label', { class: 'fx-custom-option' }, [
            input,
            option.veg === true ? h('span', { class: 'fx-diet', title: 'Vegetarian', role: 'img', 'aria-label': 'Vegetarian' }) : null,
            option.veg === false ? h('span', { class: 'fx-diet fx-diet-nonveg', title: 'Non-vegetarian', role: 'img', 'aria-label': 'Non-vegetarian' }) : null,
            h('span', { text: option.label }),
            option.price
              ? h('span', { class: 'fx-opt-price', text: (option.mode === 'multiplier' ? Math.round(option.price * 100) + '% off' : '+ ' + money(option.price)) })
              : null,
          ].filter(Boolean))
        );
      });
      wrap.appendChild(groupEl);
    });
    return wrap;
  }

  function gallery(item) {
    const views = FX.media.galleryFor(item);
    const main = h('div', { class: 'fx-gallery-main' });
    const imgEl = h('img', { src: views[0], alt: item.name, decoding: 'async' });
    main.appendChild(imgEl);
    const thumbs = h('div', { class: 'fx-gallery-thumbs', role: 'tablist', 'aria-label': 'Product images' });
    views.forEach((view, index) => {
      thumbs.appendChild(
        h('button', {
          class: 'fx-gallery-thumb',
          type: 'button',
          role: 'tab',
          'aria-current': index === 0 ? 'true' : 'false',
          'aria-label': 'View image ' + (index + 1),
          onClick: () => {
            imgEl.src = view;
            Array.from(thumbs.children).forEach((child, i) => child.setAttribute('aria-current', i === index ? 'true' : 'false'));
          },
        }, [h('img', { src: view, alt: '', loading: 'lazy' })])
      );
    });
    return h('div', { class: 'fx-gallery' }, [main, thumbs]);
  }

  function renderNotFound(mount) {
    clear(mount);
    mount.appendChild(
      ui.emptyState({
        icon: '🔍',
        title: 'We could not find that product',
        message: 'The link may be old, or the item was removed from the catalogue.',
        actions: [
          { label: 'Back to home', href: 'index.html', variant: 'primary' },
          { label: 'Browse categories', href: 'category.html', variant: 'outline' },
        ],
      })
    );
  }

  function render() {
    const mount = $('#pdp-mount');
    const extra = $('#pdp-extra');
    const crumbs = $('#pdp-crumbs');
    if (!mount) return;

    const id = FX.u.qs('id');
    const item = store.catalog.product(id);
    clear(mount);
    if (extra) clear(extra);
    if (crumbs) clear(crumbs);

    if (!item) {
      renderNotFound(mount);
      document.title = 'Product not found · Food Express';
      return;
    }

    store.recent.view(item);
    document.title = item.name + ' · ' + (item.brand || '') + ' · Food Express';

    if (crumbs) {
      const category = store.catalog.category(item.categoryId);
      crumbs.appendChild(
        ui.crumbs([
          { label: 'Home', href: 'index.html' },
          item.type === 'menu-item'
            ? { label: 'Restaurants', href: 'restaurants.html' }
            : { label: category ? category.name : 'Categories', href: category ? FX.url('category', { cat: category.id }) : 'category.html' },
          item.type === 'menu-item'
            ? { label: item.restaurantName, href: FX.url('restaurant', { id: item.restaurantId }) }
            : { label: item.subcategory || '', href: FX.url('search', { cat: item.categoryId }) },
          { label: item.name },
        ])
      );
    }

    const state = {
      qty: 1,
      selection: {},
      refreshPrice() {
        const priced = item.type === 'menu-item' ? FX.restaurants.priceMenuItem(item, state.selection) : { price: item.price, addons: [] };
        unitPrice = priced.price;
        priceNow.textContent = money(unitPrice * state.qty);
        if (item.mrp > item.price) {
          const saving = (item.mrp - item.price) * state.qty;
          priceWas.textContent = money(item.mrp * state.qty);
          priceOff.textContent = saving > 0 ? 'Save ' + money(saving) : '';
        }
      },
    };
    let unitPrice = item.price;

    const layout = h('div', { class: 'fx-pdp' });
    layout.appendChild(gallery(item));

    /* ---------------- Right column ---------------- */
    const info = h('div', {});
    info.appendChild(
      h('div', { class: 'fx-row fx-gap-2 fx-wrap', style: { marginBottom: '8px' } }, [
        h('a', { class: 'fx-badge fx-badge-brand', href: item.type === 'menu-item' ? FX.url('restaurant', { id: item.restaurantId }) : FX.url('search', { brand: item.brandId }), text: item.brand || item.restaurantName }),
        h('a', { class: 'fx-badge', href: FX.url('category', { cat: item.categoryId }), text: item.categoryName }),
        item.subcategory ? h('span', { class: 'fx-badge', text: item.subcategory }) : null,
        item.veg === true ? h('span', { class: 'fx-badge fx-badge-success', text: '● Vegetarian' }) : null,
        item.veg === false ? h('span', { class: 'fx-badge fx-badge-danger', text: '● Non-vegetarian' }) : null,
        ui.ratingChip(item),
      ].filter(Boolean))
    );

    info.appendChild(h('h1', { class: 'fx-pdp-title', text: item.name }));
    info.appendChild(
      h('div', { class: 'fx-pdp-meta' }, [
        h('span', { text: item.unit || '' }),
        item.stock > 0
          ? h('span', { class: 'fx-badge fx-badge-success', text: item.stock <= 10 ? 'Only ' + item.stock + ' left' : 'In stock' })
          : h('span', { class: 'fx-badge fx-badge-danger', text: 'Out of stock' }),
        h('span', { text: 'ID: ' + item.id }),
      ])
    );

    const priceNow = h('span', { class: 'fx-now', text: money(item.price) });
    const priceWas = h('span', { class: 'fx-was', text: item.mrp > item.price ? money(item.mrp) : '' });
    const priceOff = h('span', { class: 'fx-off', text: item.mrp > item.price ? item.discountPercent + '% off' : '' });
    info.appendChild(h('div', { class: 'fx-pdp-price' }, [priceNow, priceWas, priceOff]));
    info.appendChild(
      h('p', { class: 'fx-xs fx-muted', style: { margin: '0 0 12px' }, text: 'Inclusive of GST where applicable · prices re-validated at checkout' })
    );

    /* Delivery estimate */
    const etaMinutes = item.type === 'menu-item' ? (item.prepMinutes || 12) + (store.location.etaMinutes(0) || 20) : store.location.etaMinutes(item.handlingMinutes);
    info.appendChild(
      h('div', { class: 'fx-alert', style: { marginBottom: '12px' } }, [
        h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚡' }),
        h('div', {}, [
          h('strong', { text: store.location.isServiceable() ? FX.u.etaLabel(etaMinutes) + ' to ' + store.location.label() : 'Not serviceable at ' + store.location.label() }),
          h('div', { class: 'fx-xs fx-muted', text: store.location.isServiceable() ? 'Simulated estimate for this build — no live delivery network is connected.' : 'Choose a serviceable city to see delivery times.' }),
          h('button', { class: 'fx-link-btn', type: 'button', text: 'Change location', onClick: () => FX.components.locationModal.open() }),
        ]),
      ])
    );

    info.appendChild(h('p', { class: 'fx-muted', style: { lineHeight: '1.65' }, text: item.description }));

    /* Buy box */
    const qtyValue = h('output', { class: 'fx-qty-value', 'aria-live': 'polite', text: '1' });
    const qtyWrap = h('div', { class: 'fx-qty', role: 'group', 'aria-label': 'Quantity' }, [
      h('button', {
        type: 'button',
        'aria-label': 'Decrease quantity',
        onClick: () => {
          if (state.qty <= 1) return;
          state.qty -= 1;
          qtyValue.textContent = String(state.qty);
          plusBtn.disabled = false;
          state.refreshPrice();
        },
      }, [ui.icon('minus', 'fx-ic fx-ic-sm')]),
      qtyValue,
      h('button', {
        type: 'button',
        'aria-label': 'Increase quantity',
        onClick: () => {
          const max = Math.min(store.settings.get().maxQuantityPerItem, item.stock);
          if (state.qty >= max) {
            ui.notify.warning('Only ' + max + ' available for this item.');
            return;
          }
          state.qty += 1;
          qtyValue.textContent = String(state.qty);
          state.refreshPrice();
        },
      }, [ui.icon('plus', 'fx-ic fx-ic-sm')]),
    ]);
    const plusBtn = qtyWrap.lastChild;

    const customUI = customisationUI(item, state);
    if (customUI) info.appendChild(customUI);

    const addBtn = h('button', { class: 'fx-btn fx-btn-primary fx-btn-lg', type: 'button', disabled: item.stock <= 0 }, [
      ui.icon('cart', 'fx-ic'),
      document.createTextNode(item.stock <= 0 ? 'Out of stock' : 'Add to cart'),
    ]);
    const buyBtn = h('button', { class: 'fx-btn fx-btn-accent fx-btn-lg', type: 'button', disabled: item.stock <= 0, text: 'Buy now' });
    const wishBtn = h('button', {
      class: 'fx-btn fx-btn-outline fx-btn-lg',
      type: 'button',
      'aria-pressed': store.wishlist.has(item.id) ? 'true' : 'false',
      text: store.wishlist.has(item.id) ? '♥ Saved' : '♡ Wishlist',
      onClick: () => {
        const result = store.wishlist.toggle(item.id);
        wishBtn.textContent = result.added ? '♥ Saved' : '♡ Wishlist';
        wishBtn.setAttribute('aria-pressed', result.added ? 'true' : 'false');
        ui.notify.info(result.added ? item.name + ' saved to wishlist' : item.name + ' removed from wishlist');
      },
    });

    addBtn.addEventListener('click', () =>
      ui.handleAdd(item, state.qty, null, { selection: state.selection })
    );
    buyBtn.addEventListener('click', async () => {
      const result = await ui.handleAdd(item, state.qty, null, { selection: state.selection });
      if (result && result.ok) global.location.href = 'checkout.html';
    });

    info.appendChild(
      h('div', { class: 'fx-pdp-buybox' }, [
        qtyWrap,
        h('div', { class: 'fx-pdp-actions', style: { gridTemplateColumns: '1fr 1fr' } }, [addBtn, buyBtn]),
        wishBtn,
        store.location.isServiceable()
          ? null
          : h('div', { class: 'fx-alert fx-alert-warning' }, [
              h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
              h('div', { text: 'Checkout is disabled for this location. Pick a serviceable city to place an order.' }),
            ]),
        h('div', { class: 'fx-row fx-gap-4 fx-wrap fx-xs fx-muted' }, [
          h('span', { text: '🔒 Secure checkout' }),
          h('span', { text: '🛵 Free delivery above ' + money(store.settings.get().freeDeliveryThreshold) }),
          h('span', { text: '↩️ ' + (item.categoryId === 'fruits-vegetables' || item.categoryId === 'dairy-bakery' || item.type === 'menu-item' ? 'Quality-checked perishable' : '7-day return on sealed items') }),
        ]),
      ].filter(Boolean))
    );

    /* Specifications / ingredients */
    const attrKeys = Object.keys(item.attributes || {});
    info.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '20px' } }, [
        h('h3', { style: { fontSize: 'var(--fx-text-lg)' }, text: item.type === 'menu-item' ? 'Dish information' : 'Specifications & ingredients' }),
        attrKeys.length
          ? h('table', { class: 'fx-spec' }, [
              h('tbody', {}, attrKeys.map((key) => h('tr', {}, [h('th', { scope: 'row', text: key }), h('td', { text: String(item.attributes[key]) })]))),
            ])
          : h('p', { class: 'fx-muted fx-small', text: 'No specifications published for this item yet.' }),
        h('table', { class: 'fx-spec', style: { marginTop: '8px' } }, [
          h('tbody', {}, [
            h('tr', {}, [h('th', { scope: 'row', text: 'Brand / kitchen' }), h('td', { text: item.brand || item.restaurantName || '—' })]),
            h('tr', {}, [h('th', { scope: 'row', text: 'Category' }), h('td', { text: item.categoryName + (item.subcategory ? ' · ' + item.subcategory : '') })]),
            h('tr', {}, [h('th', { scope: 'row', text: 'Unit' }), h('td', { text: item.unit || '—' })]),
            h('tr', {}, [h('th', { scope: 'row', text: 'Availability' }), h('td', { text: item.stock > 0 ? item.stock + ' units in stock' : 'Out of stock' })]),
            h('tr', {}, [h('th', { scope: 'row', text: 'Handling time' }), h('td', { text: FX.u.etaLabel(item.handlingMinutes || item.prepMinutes || 0) })]),
          ]),
        ]),
      ])
    );

    /* Ratings & reviews — honest, no fabricated review data */
    info.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '20px' } }, [
        h('h3', { style: { fontSize: 'var(--fx-text-lg)' }, text: 'Ratings & reviews' }),
        h('div', { class: 'fx-row fx-gap-3', style: { marginBottom: '10px' } }, [
          ui.ratingChip(item),
          h('span', { class: 'fx-xs fx-muted', text: item.reviewCount + ' verified reviews' }),
        ]),
        h('div', { class: 'fx-alert fx-alert-info' }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: 'ℹ️' }),
          h('div', { text: store.settings.get().features.reviewsEnabled ? 'Reviews are enabled.' : 'Reviews are disabled in this build. The star value shown is a demo merchandising figure, not a verified customer rating, and no review text is fabricated.' }),
        ]),
        store.settings.get().features.reviewsEnabled
          ? null
          : h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', style: { marginTop: '12px' }, disabled: true, text: 'Write a review (disabled)' }),
      ])
    );

    /* Return / refund information */
    info.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '20px' } }, [
        h('h3', { style: { fontSize: 'var(--fx-text-lg)' }, text: 'Returns & refunds' }),
        h('ul', { class: 'fx-small fx-muted', style: { lineHeight: '1.7' } }, [
          h('li', { text: 'Perishables (fresh produce, dairy, bakery, prepared food) are quality-checked rather than returned. Raise a support ticket within 24 hours of delivery.' }),
          h('li', { text: 'Sealed non-perishable items can be returned within 7 days of delivery with proof of purchase.' }),
          h('li', { text: 'Electronics carry manufacturer warranty where applicable; a replacement promise applies to accessories in this demo catalogue.' }),
          h('li', { text: 'Refunds for prepaid orders return to the original method. In this build refunds are simulated and recorded in the order timeline.' }),
        ]),
        h('a', { class: 'fx-link-btn', href: 'refunds.html', text: 'Read the full cancellation & refund policy →' }),
      ])
    );

    layout.appendChild(info);
    mount.appendChild(layout);

    /* ---------------- Below the fold ---------------- */
    if (extra) {
      const fbt = store.home.frequentlyBoughtTogether(item.id);
      if (fbt.length) {
        const fbtWrap = h('section', { class: 'fx-section', 'aria-labelledby': 'pdp-fbt' });
        fbtWrap.appendChild(ui.sectionHead('Frequently bought together', { id: 'pdp-fbt', emoji: '🧺' }));
        const total = fbt.reduce((sum, p) => sum + p.price, 0) + unitPrice;
        fbtWrap.appendChild(
          h('div', { class: 'fx-card fx-card-pad' }, [
            h('div', { class: 'fx-row fx-gap-3 fx-wrap', style: { alignItems: 'center' } }, [
              h('img', { src: FX.media.imageFor(item), alt: '', style: { width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover' } }),
              h('span', { class: 'fx-lg fx-muted', text: '+' }),
              ...fbt.map((p) =>
                h('a', { href: FX.url('product', { id: p.id }), style: { width: '72px' }, title: p.name }, [
                  h('img', { src: FX.media.imageFor(p), alt: p.name, loading: 'lazy', style: { width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover' } }),
                ])
              ),
              h('div', { class: 'fx-grow' }, [
                h('div', { class: 'fx-price fx-lg', text: money(total) }),
                h('div', { class: 'fx-xs fx-muted', text: 'for ' + (fbt.length + 1) + ' items' }),
              ]),
              h('button', {
                class: 'fx-btn fx-btn-primary',
                type: 'button',
                text: 'Add all to cart',
                onClick: async () => {
                  let added = 0;
                  const first = await ui.handleAdd(item, state.qty, null, { selection: state.selection });
                  if (first && first.ok) added += 1;
                  for (const p of fbt) {
                    // eslint-disable-next-line no-await-in-loop
                    const result = store.cart.add(p, { qty: 1 });
                    if (result.ok) added += 1;
                  }
                  if (added) ui.notify.success(added + ' items added to your cart');
                },
              }),
            ]),
          ])
        );
        extra.appendChild(fbtWrap);
      }

      const related = FX.catalog.relatedProducts(item, 10);
      if (related.length) {
        const relSection = h('section', { class: 'fx-section-tight', 'aria-labelledby': 'pdp-related' });
        relSection.appendChild(
          ui.sectionHead('Related products', {
            id: 'pdp-related',
            emoji: '🔗',
            subtitle: 'More from ' + (item.subcategory || item.categoryName),
            href: FX.url('category', { cat: item.categoryId }),
            linkLabel: 'See category',
          })
        );
        relSection.appendChild(ui.rail(related, {}));
        extra.appendChild(relSection);
      }

      const recentItems = store.home.recentlyViewed(10).filter((p) => p.id !== item.id);
      if (recentItems.length) {
        const recentSection = h('section', { class: 'fx-section-tight', 'aria-labelledby': 'pdp-recent' });
        recentSection.appendChild(ui.sectionHead('Recently viewed', { id: 'pdp-recent', emoji: '🕘' }));
        recentSection.appendChild(ui.rail(recentItems, {}));
        extra.appendChild(recentSection);
      }
    }

    state.refreshPrice();
  }

  FX.pages = FX.pages || {};
  FX.pages.product = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('location:changed', render);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

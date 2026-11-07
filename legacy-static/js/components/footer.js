/**
 * Food Express — js/components/footer.js
 * Site footer: category links, account links, help & legal pages, city
 * coverage and the honest demo-build disclosure.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, clear, money } = FX.u;
  const store = FX.store;

  function render(mount) {
    const target = mount || FX.u.$('#fx-footer');
    if (!target) return null;
    clear(target);

    const footer = h('footer', { class: 'fx-footer fx-no-print', role: 'contentinfo' });
    const container = h('div', { class: 'fx-container' });

    const grid = h('div', { class: 'fx-footer-grid' });

    /* Brand column */
    grid.appendChild(
      h('div', { class: 'fx-footer-brand' }, [
        h('a', { class: 'fx-logo', href: 'index.html', style: { marginBottom: '14px' } }, [
          h('span', { class: 'fx-logo-mark', 'aria-hidden': 'true', text: '🛵' }),
          h('span', { class: 'fx-logo-text' }, [
            h('span', { class: 'fx-logo-name', style: { color: '#fff' }, html: 'Food<em>Express</em>' }),
            h('span', { class: 'fx-logo-tag', style: { color: '#9fb0a8' }, text: 'Groceries · Essentials · Restaurants' }),
          ]),
        ]),
        h('p', {
          text:
            'One app for groceries, fresh produce, daily essentials and restaurant meals. Free delivery above ' +
            money(store.settings.get().freeDeliveryThreshold) +
            ' on eligible orders.',
        }),
        h('div', { class: 'fx-footer-app' }, [
          h('span', { class: 'fx-footer-chip', text: '🔒 Secure checkout' }),
          h('span', { class: 'fx-footer-chip', text: '⚡ ' + store.catalog.products().length + '+ products' }),
          h('span', { class: 'fx-footer-chip', text: '🍽️ ' + store.catalog.restaurants().length + ' kitchens' }),
        ]),
      ])
    );

    /* Shop column */
    const shopLinks = store.catalog
      .categories()
      .slice(0, 8)
      .map((category) => ({
        label: category.name,
        href: category.id === 'food' ? 'restaurants.html' : FX.url('category', { cat: category.id }),
      }));
    grid.appendChild(footerColumn('Shop', shopLinks.concat([{ label: 'All categories', href: 'category.html' }])));

    /* Restaurants & offers */
    grid.appendChild(
      footerColumn('Food & offers', [
        { label: 'Restaurants near you', href: 'restaurants.html' },
        { label: "Today's deals", href: 'search.html?sort=discount' },
        { label: 'Under ₹99 store', href: 'search.html?max=99' },
        { label: 'Fresh arrivals', href: 'search.html?tag=new' },
        { label: 'Coupons & wallet', href: 'account.html?tab=coupons' },
        { label: 'Rewards & loyalty', href: 'account.html?tab=rewards' },
      ])
    );

    /* Account */
    grid.appendChild(
      footerColumn('Your account', [
        { label: 'My account', href: 'account.html' },
        { label: 'Order history', href: 'orders.html' },
        { label: 'Track an order', href: 'orders.html?status=active' },
        { label: 'Wishlist', href: 'wishlist.html' },
        { label: 'Saved addresses', href: 'account.html?tab=addresses' },
        { label: 'Notifications', href: 'notifications.html' },
      ])
    );

    /* Help & legal */
    grid.appendChild(
      footerColumn('Help & policies', [
        { label: 'Help centre', href: 'support.html' },
        { label: 'FAQs', href: 'support.html#faqs' },
        { label: 'Contact us', href: 'contact.html' },
        { label: 'About us', href: 'about.html' },
        { label: 'Shipping & delivery', href: 'shipping.html' },
        { label: 'Cancellation & refunds', href: 'refunds.html' },
        { label: 'Privacy policy', href: 'privacy.html' },
        { label: 'Terms & conditions', href: 'terms.html' },
      ])
    );

    container.appendChild(grid);

    /* City coverage */
    const cityWrap = h('div', { style: { paddingBottom: '28px' } }, [
      h('h4', { style: { color: '#fff', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.07em' }, text: 'Cities in this build' }),
      h(
        'div',
        { class: 'fx-row fx-wrap fx-gap-2' },
        FX.locations.CITIES.map((city) =>
          h('a', {
            class: 'fx-footer-chip',
            href: 'index.html?city=' + city.id,
            style: city.coverage === FX.constants.COVERAGE.COMING_SOON ? { opacity: '0.55' } : {},
            title: FX.locations.COVERAGE_LABELS[city.coverage],
          }, [
            h('span', {
              class: 'fx-dot ' + (city.coverage === FX.constants.COVERAGE.COMING_SOON ? 'fx-dot-off' : 'fx-dot-live'),
              'aria-hidden': 'true',
            }),
            document.createTextNode(city.name),
          ])
        )
      ),
    ]);
    container.appendChild(cityWrap);

    container.appendChild(
      h('div', { class: 'fx-footer-disclaimer' }, [
        h('strong', { text: 'Demo build disclosure. ' }),
        document.createTextNode(
          store.settings.get().disclaimer +
            ' Coupons labelled “demo promotion”, ratings marked “demo” and order status updates marked “simulated” are not live services. Legal pages are draft business content pending review.'
        ),
      ])
    );

    container.appendChild(
      h('div', { class: 'fx-footer-bottom' }, [
        h('span', { text: '© ' + new Date().getFullYear() + ' Food Express · v' + FX.config.version + ' · Built as a full-stack demo (HTML/CSS/JS + Node/Express/MongoDB).' }),
        h('div', { class: 'fx-footer-legal' }, [
          h('a', { href: 'privacy.html', text: 'Privacy' }),
          h('a', { href: 'terms.html', text: 'Terms' }),
          h('a', { href: 'shipping.html', text: 'Shipping' }),
          h('a', { href: 'refunds.html', text: 'Refunds' }),
          h('a', { href: 'support.html', text: 'Support' }),
        ]),
      ])
    );

    footer.appendChild(container);
    target.appendChild(footer);
    return footer;
  }

  function footerColumn(title, links) {
    return h('div', {}, [
      h('h4', { text: title }),
      h(
        'ul',
        { class: 'fx-footer-list' },
        links.map((link) => h('li', {}, [h('a', { href: link.href, text: link.label })]))
      ),
    ]);
  }

  FX.components = FX.components || {};
  FX.components.footer = { render };
})(typeof globalThis !== 'undefined' ? globalThis : this);

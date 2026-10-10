/**
 * Food Express — js/pages/static.js
 * Information pages: about, contact, privacy, terms, shipping, refunds, 404.
 *
 * Legal copy comes from shared/content.js and is presented as draft business
 * content — the pages say so instead of pretending to be reviewed policies.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const content = FX.content;
  const C = FX.constants;

  const page = document.body.dataset.page || 'about';

  const POLICY_PAGES = {
    privacy: { key: 'privacy', title: 'Privacy policy', emoji: '🛡️', related: [['terms.html', 'Terms of use'], ['account.html?tab=data', 'Your data controls'], ['contact.html', 'Contact us']] },
    terms: { key: 'terms', title: 'Terms of use', emoji: '📜', related: [['privacy.html', 'Privacy policy'], ['refunds.html', 'Cancellation & refunds'], ['shipping.html', 'Shipping & delivery']] },
    shipping: { key: 'shipping', title: 'Shipping & delivery', emoji: '🛵', related: [['refunds.html', 'Cancellation & refunds'], ['faq.html', 'FAQs'], ['category.html', 'Browse categories']] },
    refunds: { key: 'refunds', title: 'Cancellation & refunds', emoji: '↩️', related: [['shipping.html', 'Shipping & delivery'], ['support.html', 'Raise a ticket'], ['orders.html', 'Your orders']] },
    about: { key: 'about', title: 'About Food Express', emoji: '🛒', related: [['contact.html', 'Contact us'], ['restaurants.html', 'Restaurants'], ['index.html', 'Start shopping']] },
  };

  function policyBody(mount, meta) {
    const policy = content.POLICIES[meta.key];
    document.title = meta.title + ' · Food Express';

    mount.appendChild(
      h('div', { class: 'fx-page-head' }, [
        h('span', { class: 'fx-page-head-emoji', 'aria-hidden': 'true', text: meta.emoji }),
        h('div', {}, [
          h('h1', { class: 'fx-page-title', text: policy ? policy.title : meta.title }),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: policy && policy.updated ? 'Last updated: ' + policy.updated : '' }),
        ]),
      ])
    );

    mount.appendChild(
      h('div', { class: 'fx-alert fx-alert-warning' }, [
        h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
        h('div', { text: 'Draft business content. This page is included so the application is complete and honest about its own behaviour; it has not been reviewed by legal counsel and is not a live commercial commitment.' }),
      ])
    );

    if (!policy) {
      mount.appendChild(ui.emptyState({ icon: '📄', title: 'Content not available', message: 'This page has no draft content yet.', actions: [{ label: 'Back to home', href: 'index.html', variant: 'primary' }] }));
      return;
    }

    const article = h('article', { class: 'fx-prose fx-card fx-card-pad' });
    (policy.sections || []).forEach((section) => {
      article.appendChild(h('h2', { text: section.h }));
      if (typeof section.p === 'string') article.appendChild(h('p', { text: section.p }));
      if (Array.isArray(section.list)) article.appendChild(h('ul', { class: 'fx-list' }, section.list.map((item) => h('li', { text: item }))));
      if (Array.isArray(section.p)) section.p.forEach((paragraph) => article.appendChild(h('p', { text: paragraph })));
    });
    mount.appendChild(article);

    mount.appendChild(
      h('nav', { class: 'fx-related-links', 'aria-label': 'Related pages' }, meta.related.map((entry) => h('a', { href: entry[0], text: entry[1] })))
    );
  }

  /* ---------------------------------------------------------------- about */

  function renderAbout(mount) {
    const settings = store.settings.get();
    const categories = store.catalog.categories();
    const cities = store.location.cities();
    const liveCities = cities.filter((city) => city.coverage !== C.COVERAGE.COMING_SOON);

    document.title = 'About Food Express';
    mount.appendChild(
      h('div', { class: 'fx-page-head' }, [
        h('span', { class: 'fx-page-head-emoji', 'aria-hidden': 'true', text: '🛒' }),
        h('div', {}, [
          h('h1', { class: 'fx-page-title', text: 'About Food Express' }),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: 'One storefront for daily groceries, fresh produce, essentials and restaurant meals — built as a complete, honest demo platform.' }),
        ]),
      ])
    );

    mount.appendChild(
      h('div', { class: 'fx-stat-row' }, [
        h('div', { class: 'fx-stat' }, [h('span', { class: 'fx-stat-value', text: String(store.catalog.products().length) }), h('span', { class: 'fx-stat-label', text: 'Products in the catalogue' })]),
        h('div', { class: 'fx-stat' }, [h('span', { class: 'fx-stat-value', text: String(categories.length) }), h('span', { class: 'fx-stat-label', text: 'Categories' })]),
        h('div', { class: 'fx-stat' }, [h('span', { class: 'fx-stat-value', text: String(store.catalog.restaurants().length) }), h('span', { class: 'fx-stat-label', text: 'Restaurants' })]),
        h('div', { class: 'fx-stat' }, [h('span', { class: 'fx-stat-value', text: liveCities.length + '/' + cities.length }), h('span', { class: 'fx-stat-label', text: 'Cities with demo coverage' })]),
      ])
    );

    const grid = h('div', { class: 'fx-two-col' });

    grid.appendChild(
      h('div', { class: 'fx-card fx-card-pad fx-prose' }, [
        h('h2', { text: 'What Food Express is' }),
        h('p', { text: 'Food Express is a multi-category delivery and shopping platform. The same cart, checkout, order tracking, rewards and account experience works across groceries, fruits and vegetables, dairy, snacks, personal care, beauty, household supplies, electronics, stationery, pet supplies and restaurant food.' }),
        h('p', { text: 'Restaurant orders follow a separate fulfilment context: a cart holds items from one restaurant at a time, menu items carry their own customisations, and packing charges and minimum-order rules apply exactly as they do on a food-delivery app.' }),
        h('h2', { text: 'How this build works' }),
        h('ul', { class: 'fx-list' }, [
          h('li', { text: 'Demo mode (default): the catalogue, pricing, coupons, orders and accounts run entirely in your browser from the shared seed data. Nothing is sent anywhere.' }),
          h('li', { text: 'Backend mode: set USE_BACKEND and start the Node/Express API to persist the same flows server-side with JWT auth, bcrypt password hashing and server-side price validation.' }),
          h('li', { text: 'Every simulated behaviour is labelled in the interface — demo payments, simulated order progression, seeded coupons, demo support tickets and demo contact channels.' }),
        ]),
        h('h2', { text: 'What is deliberately not claimed' }),
        h('ul', { class: 'fx-list' }, [
          h('li', { text: 'No live GPS tracking, no delivery-partner network, no real-time courier updates.' }),
          h('li', { text: 'No payment gateway. “Demo payment” and cash-on-delivery are recorded without moving money.' }),
          h('li', { text: 'No customer reviews or verified ratings — the rating chips shown are seeded merchandising values, clearly marked as demo.' }),
          h('li', { text: 'No claim of serviceability in every city. Cities marked “launching soon” block checkout.' }),
        ]),
      ])
    );

    const aside = h('div', { class: 'fx-stack' });
    aside.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Delivery promise in this build' }),
        h('dl', { class: 'fx-bill' }, [
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Free delivery above' }), h('dd', { text: FX.u.money(settings.freeDeliveryThreshold) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Standard delivery fee' }), h('dd', { text: FX.u.money(settings.deliveryFee) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Packing charge (restaurants)' }), h('dd', { text: FX.u.money(settings.packingFee) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Loyalty earn rate' }), h('dd', { text: Math.round(settings.loyalty.earnRate * 100) + '% of merchandise value' })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Pricing' }), h('dd', { text: settings.taxInclusive ? 'GST-inclusive prices' : 'GST added at checkout' })]),
        ]),
        h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'All of these are configurable in the admin dashboard — the threshold and fee are never hard-coded in the pages.' }),
        h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm fx-btn-block', href: 'shipping.html', style: { marginTop: '8px' }, text: 'Read the shipping policy' }),
      ])
    );

    aside.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Cities we show' }),
        h('div', { class: 'fx-stack fx-gap-2' }, cities.map((city) =>
          h('div', { class: 'fx-line fx-line-row' }, [
            h('div', {}, [
              h('strong', { class: 'fx-small', text: city.name }),
              h('div', { class: 'fx-xs fx-muted', text: (city.localities || []).length + ' localities configured' }),
            ]),
            h('span', { class: 'fx-badge ' + (city.coverage === C.COVERAGE.COMING_SOON ? 'fx-badge-warning' : 'fx-badge-success'), text: city.coverage === C.COVERAGE.COMING_SOON ? 'Launching soon' : city.coverage === C.COVERAGE.DEMO_LIMITED ? 'Demo · limited' : 'Demo coverage' }),
          ])
        )),
      ])
    );

    aside.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Categories' }),
        h('div', { class: 'fx-pill-row fx-wrap' }, categories.map((category) => h('a', { class: 'fx-pill', href: FX.url('category', { cat: category.id }), text: (category.emoji ? category.emoji + ' ' : '') + category.name }))),
      ])
    );

    grid.appendChild(aside);
    mount.appendChild(grid);

    const policy = content.POLICIES.about;
    if (policy && policy.sections && policy.sections.length) {
      mount.appendChild(
        h('article', { class: 'fx-prose fx-card fx-card-pad', style: { marginTop: '16px' } }, policy.sections.map((section) =>
          h('div', {}, [h('h2', { text: section.h }), typeof section.p === 'string' ? h('p', { text: section.p }) : null, Array.isArray(section.p) ? section.p.map((paragraph) => h('p', { text: paragraph })) : null, Array.isArray(section.list) ? h('ul', { class: 'fx-list' }, section.list.map((item) => h('li', { text: item }))) : null])
        ))
      );
    }

    mount.appendChild(
      h('div', { class: 'fx-card fx-card-pad fx-row-between fx-wrap fx-gap-3', style: { marginTop: '16px' } }, [
        h('div', {}, [h('h3', { style: { margin: 0 }, text: 'Ready to look around?' }), h('p', { class: 'fx-small fx-muted', style: { margin: '4px 0 0' }, text: 'The full shopping experience works in demo mode — no sign-up needed.' })]),
        h('div', { class: 'fx-btn-group' }, [
          h('a', { class: 'fx-btn fx-btn-primary fx-btn-sm', href: 'index.html', text: 'Start shopping' }),
          h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: 'restaurants.html', text: 'Browse restaurants' }),
        ]),
      ])
    );
  }

  /* -------------------------------------------------------------- contact */

  function renderContact(mount) {
    document.title = 'Contact us · Food Express';

    mount.appendChild(
      h('div', { class: 'fx-page-head' }, [
        h('span', { class: 'fx-page-head-emoji', 'aria-hidden': 'true', text: '📮' }),
        h('div', {}, [
          h('h1', { class: 'fx-page-title', text: 'Contact Food Express' }),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: 'Write to us through the form below — it creates a tracked ticket inside this application.' }),
        ]),
      ])
    );

    mount.appendChild(
      h('div', { class: 'fx-alert fx-alert-warning' }, [
        h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
        h('div', { text: 'The email addresses, phone numbers and hours listed on this page are demo content. No mailbox or call centre is staffed by this build, and no message leaves your browser unless the backend API is connected.' }),
      ])
    );

    const grid = h('div', { class: 'fx-two-col' });

    const form = h('form', { class: 'fx-card fx-card-pad fx-stack', novalidate: 'true' });
    form.appendChild(h('h2', { class: 'fx-section-title', text: 'Send a message' }));
    const user = store.auth.user() || {};
    const nameField = ui.field({ label: 'Your name', name: 'name', value: user.name || '', required: true, autocomplete: 'name' });
    const contactField = ui.field({ label: 'Email or phone', name: 'contact', value: user.email || user.phone || '', required: true, autocomplete: 'email' });
    const topicField = ui.field({
      label: 'Topic',
      name: 'topic',
      type: 'select',
      value: content.SUPPORT_TOPICS[0].id,
      options: content.SUPPORT_TOPICS.map((topic) => ({ value: topic.id, label: topic.label })),
    });
    const subjectField = ui.field({ label: 'Subject', name: 'subject', required: true, placeholder: 'How can we help?' });
    const messageField = ui.field({ label: 'Message', name: 'message', type: 'textarea', rows: 6, required: true, placeholder: 'Add any order ID, product name or screenshot reference that helps.' });

    form.appendChild(h('div', { class: 'fx-form-grid' }, [nameField, contactField]));
    form.appendChild(h('div', { class: 'fx-form-grid' }, [topicField, subjectField]));
    form.appendChild(messageField);

    const submit = h('button', { class: 'fx-btn fx-btn-primary', type: 'submit', text: 'Send message' });
    form.appendChild(h('div', { class: 'fx-btn-group' }, [submit, h('a', { class: 'fx-btn fx-btn-ghost', href: 'faq.html', text: 'Read FAQs' })]));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      ui.clearFormErrors(form);
      const values = ui.formValues(form);
      const errors = {
        name: FX.u.validators.minLength(2)(values.name, 'Name'),
        contact: FX.u.validators.required(values.contact, 'Email or phone'),
        subject: FX.u.validators.minLength(4)(values.subject, 'Subject'),
        message: FX.u.validators.minLength(10)(values.message, 'Message'),
      };
      let hasError = false;
      Object.keys(errors).forEach((key) => {
        if (!errors[key]) return;
        hasError = true;
        ui.setFieldError(form.querySelector('.fx-field[data-field="' + key + '"]'), errors[key]);
      });
      if (hasError) {
        ui.notify.error('Please complete the highlighted fields.');
        return;
      }
      ui.setBusy(submit, true, 'Sending…');
      try {
        const topic = content.SUPPORT_TOPICS.find((entry) => entry.id === values.topic) || content.SUPPORT_TOPICS[0];
        const ticket = await store.support.create({
          topic: values.topic,
          topicLabel: topic.label,
          subject: values.subject,
          message: values.message + '\n\nFrom: ' + values.name + ' (' + values.contact + ')',
          contact: values.contact,
          userName: values.name,
          userId: user.id || 'guest',
          orderId: null,
          source: 'contact-page',
        });
        form.reset();
        ui.setBusy(submit, false);
        ui.notify.success('Message recorded as ticket ' + ticket.id + '.', { action: { label: 'View tickets', onClick: () => FX.navigate('support.html') } });
      } catch (err) {
        ui.setBusy(submit, false);
        ui.notify.error(err.message || 'Could not send the message.');
      }
    });

    grid.appendChild(form);

    const aside = h('div', { class: 'fx-stack' });
    aside.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Channels' }),
        h('div', { class: 'fx-stack fx-gap-2' }, content.CONTACT_CHANNELS.map((channel) =>
          h('div', { class: 'fx-line fx-line-row' }, [
            h('div', {}, [h('strong', { class: 'fx-small', text: channel.label }), h('div', { class: 'fx-xs fx-muted', text: channel.note || '' })]),
            h('span', { class: 'fx-mono fx-small', text: channel.value }),
          ])
        )),
      ])
    );
    aside.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Faster answers' }),
        h('ul', { class: 'fx-list fx-small' }, [
          h('li', {}, [h('a', { href: 'faq.html', text: 'FAQs' }), document.createTextNode(' — delivery thresholds, coupons, cancellations, demo limits.')]),
          h('li', {}, [h('a', { href: 'orders.html', text: 'Your orders' }), document.createTextNode(' — status, bill breakdown and reorder.')]),
          h('li', {}, [h('a', { href: 'refunds.html', text: 'Cancellation & refunds' }), document.createTextNode(' — what can be cancelled and when.')]),
          h('li', {}, [h('a', { href: 'account.html?tab=data', text: 'Privacy & data' }), document.createTextNode(' — export or delete your local data.')]),
        ]),
      ])
    );
    grid.appendChild(aside);
    mount.appendChild(grid);
  }

  /* ----------------------------------------------------------------- 404 */

  function render404(mount) {
    document.title = 'Page not found · Food Express';
    const suggestions = store.home.bestSellers(8);

    mount.appendChild(
      h('div', { class: 'fx-404' }, [
        h('div', { class: 'fx-404-code', 'aria-hidden': 'true', text: '404' }),
        h('h1', { class: 'fx-page-title', text: 'We could not find that page' }),
        h('p', { class: 'fx-page-sub', text: 'The link may be outdated, or the page may have moved. Try a search or jump back into the catalogue.' }),
        h('form', {
          class: 'fx-404-search',
          role: 'search',
          onSubmit: (event) => {
            event.preventDefault();
            const input = $('input', event.currentTarget);
            FX.navigate(FX.url('search', { q: input.value.trim() }));
          },
        }, [
          h('input', { class: 'fx-input fx-input-lg', type: 'search', placeholder: 'Search for products, brands or dishes', 'aria-label': 'Search Food Express' }),
          h('button', { class: 'fx-btn fx-btn-primary fx-btn-lg', type: 'submit', text: 'Search' }),
        ]),
        h('div', { class: 'fx-btn-group', style: { justifyContent: 'center' } }, [
          h('a', { class: 'fx-btn fx-btn-outline', href: 'index.html', text: 'Back to home' }),
          h('a', { class: 'fx-btn fx-btn-ghost', href: 'category.html', text: 'All categories' }),
          h('a', { class: 'fx-btn fx-btn-ghost', href: 'restaurants.html', text: 'Restaurants' }),
          h('a', { class: 'fx-btn fx-btn-ghost', href: 'cart.html', text: 'Your cart' }),
        ]),
      ])
    );

    if (suggestions.length) {
      mount.appendChild(
        h('section', { class: 'fx-section' }, [
          ui.sectionHead('Popular right now', { emoji: '🔥', subtitle: 'Best-selling items in your configured city.', href: 'search.html?tag=bestseller', linkLabel: 'See all' }),
          ui.rail(suggestions, {}),
        ])
      );
    }
  }

  /* --------------------------------------------------------------- render */

  function render() {
    const mount = $('#page-mount');
    if (!mount) return;
    clear(mount);

    if (page === 'contact') renderContact(mount);
    else if (page === '404') render404(mount);
    else if (page === 'about') renderAbout(mount);
    else if (POLICY_PAGES[page]) {
      mount.appendChild(ui.crumbs([{ label: 'Home', href: 'index.html' }, { label: POLICY_PAGES[page].title }]));
      policyBody(mount, POLICY_PAGES[page]);
    } else {
      mount.appendChild(ui.emptyState({ icon: '📄', title: 'Nothing to show here', message: 'This page has no content configured.', actions: [{ label: 'Back to home', href: 'index.html', variant: 'primary' }] }));
    }
  }

  FX.pages = FX.pages || {};
  FX.pages.static = { render };
  FX.app.onReady(render);
})(typeof globalThis !== 'undefined' ? globalThis : this);

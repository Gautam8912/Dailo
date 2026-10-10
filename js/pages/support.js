/**
 * Food Express — js/pages/support.js
 * Help centre (support.html) and FAQ (faq.html).
 *
 * Tickets are real records in the store (and in the backend when connected),
 * but the copy is explicit that no human support team receives them in this
 * demo build — no fake "our agent will call you shortly" promises.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const content = FX.content;

  const page = document.body.dataset.page || 'support';

  /* ------------------------------------------------------------- support */

  function ticketForm() {
    const form = h('form', { class: 'fx-card fx-card-pad fx-stack', novalidate: 'true' });
    const user = store.auth.user() || {};
    const orders = store.orders.list();
    const preselectedOrder = FX.u.qs('order') || '';

    form.appendChild(h('h2', { class: 'fx-section-title', text: 'Raise a ticket' }));
    form.appendChild(
      h('p', { class: 'fx-small fx-muted', style: { margin: 0 }, text: 'Tell us what went wrong. Tickets are stored in this build' + (store.isDemo() ? ' on your device' : ' against your account') + ' so you can track them here.' })
    );

    const topicField = ui.field({
      label: 'What is this about?',
      name: 'topic',
      type: 'select',
      value: FX.u.qs('topic') || content.SUPPORT_TOPICS[0].id,
      options: content.SUPPORT_TOPICS.map((topic) => ({ value: topic.id, label: topic.label })),
    });
    const orderField = ui.field({
      label: 'Related order (optional)',
      name: 'orderId',
      type: 'select',
      value: preselectedOrder,
      options: [{ value: '', label: 'Not related to an order' }].concat(orders.slice(0, 20).map((order) => ({ value: order.id, label: order.id + ' · ' + FX.u.formatDate(order.createdAt) + ' · ' + (order.items || []).length + ' items' }))),
    });
    const subjectField = ui.field({ label: 'Subject', name: 'subject', required: true, placeholder: 'e.g. Missing item in order', maxlength: 90 });
    const messageField = ui.field({ label: 'Describe the issue', name: 'message', type: 'textarea', rows: 5, required: true, placeholder: 'What happened, what did you expect, and anything you have already tried?' });
    const contactField = ui.field({ label: 'Contact email or phone', name: 'contact', value: user.email || user.phone || '', required: true, hint: 'Used for the ticket record only — nothing is sent in this build.' });

    form.appendChild(h('div', { class: 'fx-form-grid' }, [topicField, orderField]));
    form.appendChild(subjectField);
    form.appendChild(messageField);
    form.appendChild(contactField);

    const hint = h('p', { class: 'fx-xs fx-muted', style: { margin: 0 }, text: '' });
    form.appendChild(hint);
    const topicSelect = $('select', topicField);
    function syncHint() {
      const topic = content.SUPPORT_TOPICS.find((entry) => entry.id === topicSelect.value);
      hint.textContent = topic && topic.hint ? 'Tip: ' + topic.hint : '';
    }
    topicSelect.addEventListener('change', syncHint);
    syncHint();

    const submit = h('button', { class: 'fx-btn fx-btn-primary', type: 'submit', text: 'Submit ticket' });
    form.appendChild(h('div', { class: 'fx-btn-group' }, [submit, h('a', { class: 'fx-btn fx-btn-ghost', href: 'faq.html', text: 'Check the FAQs first' })]));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      ui.clearFormErrors(form);
      const values = ui.formValues(form);
      const errors = {
        subject: FX.u.validators.minLength(4)(values.subject, 'Subject'),
        message: FX.u.validators.minLength(10)(values.message, 'Description'),
        contact: FX.u.validators.required(values.contact, 'Contact detail'),
      };
      let hasError = false;
      Object.keys(errors).forEach((key) => {
        if (!errors[key]) return;
        hasError = true;
        ui.setFieldError(form.querySelector('.fx-field[data-field="' + key + '"]'), errors[key]);
      });
      if (hasError) {
        ui.notify.error('Please add a little more detail so the ticket is useful.');
        return;
      }

      ui.setBusy(submit, true, 'Submitting…');
      try {
        const topic = content.SUPPORT_TOPICS.find((entry) => entry.id === values.topic) || content.SUPPORT_TOPICS[0];
        const ticket = await store.support.create({
          topic: values.topic,
          topicLabel: topic.label,
          subject: values.subject,
          message: values.message,
          orderId: values.orderId || null,
          contact: values.contact,
          userId: user.id || 'guest',
          userName: user.name || 'Guest',
        });
        form.reset();
        syncHint();
        ui.setBusy(submit, false);
        ui.notify.success('Ticket ' + ticket.id + ' created.', { duration: 6000 });
        ui.modal({
          title: 'Ticket ' + ticket.id + ' recorded',
          content: h('div', { class: 'fx-stack' }, [
            h('p', { class: 'fx-small', style: { margin: 0 }, text: 'Subject: ' + ticket.subject }),
            h('p', { class: 'fx-small fx-muted', style: { margin: 0 }, text: ticket.message }),
            h('div', { class: 'fx-alert fx-alert-warning' }, [
              h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
              h('div', { text: 'This is an in-app demo ticket. No support inbox, email service or CRM is connected, so nobody outside this browser receives it and no response-time promise is being made.' }),
            ]),
          ]),
          actions: [{ label: 'Done', variant: 'primary' }],
        });
        render();
      } catch (err) {
        ui.setBusy(submit, false);
        ui.notify.error(err.message || 'Could not submit the ticket.');
      }
    });

    return form;
  }

  function ticketList() {
    const box = h('div', { class: 'fx-card fx-card-pad' });
    const tickets = store.support.list();
    box.appendChild(h('h2', { class: 'fx-section-title', text: 'Your tickets' }));

    if (!tickets.length) {
      box.appendChild(ui.emptyState({ icon: '🛟', title: 'No tickets yet', message: 'Tickets you raise will be listed here with their status.' }));
      return box;
    }

    tickets.forEach((ticket) => {
      const details = h('div', { class: 'fx-stack fx-gap-2' }, [
        h('p', { class: 'fx-small fx-muted', style: { margin: 0 }, text: ticket.message }),
        ticket.orderId ? h('p', { class: 'fx-xs', style: { margin: 0 } }, [document.createTextNode('Order: '), h('a', { href: FX.url('order', { id: ticket.orderId }), text: ticket.orderId })]) : null,
        (ticket.replies || []).length
          ? h('div', { class: 'fx-stack fx-gap-2' }, ticket.replies.map((reply) =>
              h('div', { class: 'fx-reply' + (reply.by === 'team' ? ' is-team' : '') }, [
                h('div', { class: 'fx-xs fx-muted', text: (reply.by === 'team' ? 'Support (demo reply)' : 'You') + ' · ' + FX.u.formatDate(reply.at, true) }),
                h('p', { class: 'fx-small', style: { margin: '4px 0 0' }, text: reply.message }),
              ])
            ))
          : null,
      ]);

      box.appendChild(
        ui.accordion(
          ticket.id + ' · ' + ticket.subject,
          details,
          { open: tickets.length === 1, meta: (ticket.topicLabel || ticket.topic) + ' · ' + FX.u.formatDate(ticket.createdAt, true) + ' · ' + ticket.status }
        )
      );
    });

    return box;
  }

  function renderSupport(mount) {
    document.title = 'Help & support · Food Express';

    mount.appendChild(
      h('div', { style: { padding: '20px 0 4px' } }, [
        h('h1', { class: 'fx-page-title', text: 'Help & support' }),
        h('p', { class: 'fx-page-sub', text: 'Order problems, refunds, account questions — raise a ticket or read the answers below.' }),
      ])
    );

    mount.appendChild(
      h('div', { class: 'fx-quick-links' }, [
        { href: 'faq.html', emoji: '❓', label: 'FAQs', text: 'Delivery thresholds, coupons, cancellations and demo limits.' },
        { href: 'orders.html', emoji: '📦', label: 'Track an order', text: 'Live (simulated) status, invoices and one-tap reorder.' },
        { href: 'refunds.html', emoji: '↩️', label: 'Cancellation & refunds', text: 'What can be cancelled and how refunds are marked.' },
        { href: 'account.html?tab=data', emoji: '🛡️', label: 'Privacy & data', text: 'Export or delete the data this app holds about you.' },
      ].map((entry) =>
        h('a', { class: 'fx-quick-link', href: entry.href }, [
          h('span', { class: 'fx-quick-link-emoji', 'aria-hidden': 'true', text: entry.emoji }),
          h('span', {}, [h('strong', { text: entry.label }), h('span', { class: 'fx-xs fx-muted', text: entry.text })]),
        ])
      ))
    );

    const grid = h('div', { class: 'fx-support-grid' });
    grid.appendChild(h('div', { class: 'fx-stack' }, [ticketForm(), ticketList()]));

    const aside = h('div', { class: 'fx-stack' });
    aside.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Contact channels' }),
        h('div', { class: 'fx-stack fx-gap-2' }, content.CONTACT_CHANNELS.map((channel) =>
          h('div', { class: 'fx-line fx-line-row' }, [
            h('div', {}, [
              h('strong', { class: 'fx-small', text: channel.label }),
              h('div', { class: 'fx-xs fx-muted', text: channel.note || '' }),
            ]),
            h('span', { class: 'fx-mono fx-small', text: channel.value }),
          ])
        )),
        h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'Every channel above is demo content. No mailbox, phone line or chat widget is actually staffed in this build.' }),
      ])
    );

    aside.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Before you write to us' }),
        h('ul', { class: 'fx-list fx-small' }, [
          h('li', { text: 'Order status and the exact bill breakdown are on the order details page.' }),
          h('li', { text: 'Cancellation is available until the order goes out for delivery — the button disappears after that.' }),
          h('li', { text: 'Coupon eligibility is checked live in Account → Coupons, including the reason a code was rejected.' }),
          h('li', { text: 'Delivery coverage per city is listed on the location selector; “launching soon” cities are genuinely not serviceable.' }),
        ]),
        h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm fx-btn-block', href: 'faq.html', style: { marginTop: '10px' }, text: 'Read the FAQs' }),
      ])
    );

    grid.appendChild(aside);
    mount.appendChild(grid);
  }

  /* ------------------------------------------------------------------ faq */

  let faqQuery = '';

  function renderFaq(mount) {
    document.title = 'FAQs · Food Express';

    mount.appendChild(
      h('div', { style: { padding: '20px 0 4px' } }, [
        h('h1', { class: 'fx-page-title', text: 'Frequently asked questions' }),
        h('p', { class: 'fx-page-sub', text: content.FAQS.length + ' answers covering delivery, pricing, coupons, accounts and what is simulated in this build.' }),
      ])
    );

    const search = h('input', {
      class: 'fx-input fx-input-lg',
      type: 'search',
      placeholder: 'Search the FAQs — try “free delivery”, “coupon”, “cancel”',
      'aria-label': 'Search frequently asked questions',
      value: faqQuery,
      onInput: FX.u.debounce((event) => {
        faqQuery = event.target.value.trim();
        drawList();
      }, FX.config.searchDebounceMs),
    });
    mount.appendChild(h('div', { class: 'fx-faq-search' }, [search]));

    const listMount = h('div', { class: 'fx-stack', style: { marginTop: '16px' } });
    mount.appendChild(listMount);

    function drawList() {
      clear(listMount);
      const q = faqQuery.toLowerCase();
      const hits = q
        ? content.FAQS.filter((faq) => [faq.q, faq.a, faq.topic].join(' ').toLowerCase().indexOf(q) !== -1)
        : content.FAQS;

      if (!hits.length) {
        listMount.appendChild(
          ui.emptyState({
            icon: '🔎',
            title: 'No answers match “' + faqQuery + '”',
            message: 'Try a shorter phrase, or raise a ticket and we will record it in this build.',
            actions: [
              { label: 'Clear search', variant: 'primary', onClick: () => { faqQuery = ''; search.value = ''; drawList(); } },
              { label: 'Raise a ticket', href: 'support.html', variant: 'outline' },
            ],
          })
        );
        return;
      }

      const topics = Array.from(new Set(hits.map((faq) => faq.topic)));
      topics.forEach((topic) => {
        const group = h('section', { class: 'fx-faq-group' }, [
          h('h2', { class: 'fx-section-title', text: topic }),
          h('div', { class: 'fx-stack fx-gap-2' }, hits.filter((faq) => faq.topic === topic).map((faq) =>
            ui.accordion(q ? h('span', { html: FX.u.highlight(faq.q, q) }) : faq.q, h('p', { class: 'fx-small', style: { margin: 0 }, text: faq.a }), { meta: faq.topic })
          )),
        ]);
        listMount.appendChild(group);
      });

      listMount.appendChild(
        h('div', { class: 'fx-card fx-card-pad fx-row-between fx-wrap fx-gap-3' }, [
          h('div', {}, [
            h('h3', { style: { margin: 0 }, text: 'Still stuck?' }),
            h('p', { class: 'fx-small fx-muted', style: { margin: '4px 0 0' }, text: 'Raise a ticket and it will be listed under Your tickets on the support page.' }),
          ]),
          h('div', { class: 'fx-btn-group' }, [
            h('a', { class: 'fx-btn fx-btn-primary fx-btn-sm', href: 'support.html', text: 'Go to support' }),
            h('a', { class: 'fx-btn fx-btn-outline fx-btn-sm', href: 'orders.html', text: 'Check an order' }),
          ]),
        ])
      );
    }

    drawList();
  }

  /* --------------------------------------------------------------- render */

  function render() {
    const mount = $('#page-mount');
    if (!mount) return;
    clear(mount);
    if (page === 'faq') renderFaq(mount);
    else renderSupport(mount);
  }

  FX.pages = FX.pages || {};
  FX.pages.support = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('tickets:changed', () => { if (page !== 'faq') render(); });
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

/**
 * Food Express — js/pages/admin.js
 * Admin dashboard: analytics, orders, catalogue, inventory, restaurants &
 * menus, coupons, cities/coverage, users and business settings (including the
 * free-delivery threshold and delivery fee).
 *
 * Security note: hiding this page is not security. The page re-checks the role
 * here for a clean UX, and every mutating call goes through FX.store.admin →
 * FX.backend.admin, where the Express API enforces `requireRole('admin')` on
 * the trusted layer. In demo mode the edits are layered over the seeded
 * catalogue in localStorage so the seed data is never destroyed.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, $$, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const C = FX.constants;

  const SECTIONS = [
    { id: 'overview', label: 'Overview & analytics', emoji: '📊' },
    { id: 'orders', label: 'Orders', emoji: '🧾' },
    { id: 'products', label: 'Products', emoji: '📦' },
    { id: 'inventory', label: 'Inventory', emoji: '📉' },
    { id: 'restaurants', label: 'Restaurants & menus', emoji: '🍽️' },
    { id: 'coupons', label: 'Coupons', emoji: '🎟️' },
    { id: 'locations', label: 'Cities & coverage', emoji: '🗺️' },
    { id: 'users', label: 'Users', emoji: '👥' },
    { id: 'settings', label: 'Business settings', emoji: '⚙️' },
  ];

  let section = FX.u.qs('tab') || 'overview';
  if (!SECTIONS.some((entry) => entry.id === section)) section = 'overview';
  let productQuery = '';
  let orderFilter = 'all';
  let orderQuery = '';
  let restaurantFilter = '';

  function selectSection(id) {
    section = id;
    FX.u.setQs({ tab: id }, { replace: true });
    render();
  }

  /* ------------------------------------------------------- shared widgets */

  function statCards(cards) {
    return h('div', { class: 'fx-stat-row' }, cards.map((card) =>
      h('div', { class: 'fx-stat' + (card.tone ? ' fx-stat-' + card.tone : '') }, [
        h('span', { class: 'fx-stat-value', text: card.value }),
        h('span', { class: 'fx-stat-label', text: card.label }),
        card.note ? h('span', { class: 'fx-stat-note', text: card.note }) : null,
      ])
    ));
  }

  function table(columns, rows, emptyMessage) {
    if (!rows.length) return ui.emptyState({ icon: '🗂️', title: 'Nothing to show', message: emptyMessage || 'No records match this view.' });
    const wrap = h('div', { class: 'fx-table-wrap' });
    const tableEl = h('table', { class: 'fx-table' });
    tableEl.appendChild(h('thead', {}, [h('tr', {}, columns.map((col) => h('th', { scope: 'col', class: col.align ? 'fx-' + col.align : null, text: col.label })))]));
    const body = h('tbody');
    rows.forEach((row) => {
      body.appendChild(
        h('tr', {}, columns.map((col) => h('td', { class: col.align ? 'fx-' + col.align : null }, [typeof col.render === 'function' ? col.render(row) : document.createTextNode(String(col.value ? col.value(row) : ''))])))
      );
    });
    tableEl.appendChild(body);
    wrap.appendChild(tableEl);
    return wrap;
  }

  function numberInput(value, onChange, opts) {
    const options = opts || {};
    return h('input', {
      class: 'fx-input fx-input-sm',
      type: 'number',
      value: String(value == null ? '' : value),
      min: options.min == null ? 0 : options.min,
      max: options.max,
      step: options.step || 1,
      'aria-label': options.label || 'Value',
      style: { width: options.width || '86px' },
      onChange: (event) => {
        const next = Number(event.target.value);
        if (Number.isNaN(next)) return;
        onChange(next, event.target);
      },
    });
  }

  /* ------------------------------------------------------------ overview */

  async function overviewSection(mount) {
    const stats = await store.admin.stats();
    const orders = store.orders.list();
    const settings = store.settings.get();
    const products = store.catalog.products();
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= settings.lowStockThreshold);
    const outOfStock = products.filter((p) => p.stock <= 0);

    const byStatus = {};
    orders.forEach((order) => { byStatus[order.status] = (byStatus[order.status] || 0) + 1; });
    const restaurantOrders = orders.filter((order) => order.cartType === C.CART_TYPES.RESTAURANT);
    const averageOrder = orders.length ? Math.round(orders.reduce((sum, order) => sum + ((order.totals || {}).grandTotal || 0), 0) / orders.length) : 0;
    const today = new Date().toDateString();
    const todayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === today);

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 12px' } }, [
        h('div', {}, [
          h('h1', { class: 'fx-page-title', text: 'Admin dashboard' }),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: 'Signed in as ' + ((store.auth.user() || {}).email || 'admin') + ' · ' + (store.isDemo() ? 'demo mode (edits are layered over the seeded catalogue in this browser)' : 'backend mode (edits are written through the API)') }),
        ]),
        h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
          h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Refresh', onClick: () => render() }),
          h('a', { class: 'fx-btn fx-btn-ghost fx-btn-sm', href: 'index.html', text: 'View storefront' }),
        ]),
      ])
    );

    mount.appendChild(
      statCards([
        { value: money(stats.revenue), label: 'Revenue (non-cancelled)', note: orders.length + ' orders · avg ' + money(averageOrder) },
        { value: String(stats.orders), label: 'Orders', note: (byStatus.OUT_FOR_DELIVERY || 0) + ' out for delivery · ' + (byStatus.PLACED || 0) + ' just placed' },
        { value: String(stats.products), label: 'Products', note: stats.menuItems + ' menu items · ' + stats.restaurants + ' restaurants' },
        { value: String(stats.users), label: 'Accounts', note: store.isDemo() ? 'stored in this browser' : 'from the users collection' },
        { value: String(stats.lowStock), label: 'Low stock', tone: stats.lowStock ? 'warning' : null, note: 'at or below ' + settings.lowStockThreshold + ' units' },
        { value: String(stats.outOfStock), label: 'Out of stock', tone: stats.outOfStock ? 'danger' : null, note: 'hidden from add-to-cart' },
      ])
    );

    const grid = h('div', { class: 'fx-admin-grid' });

    grid.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Analytics' }),
        h('dl', { class: 'fx-bill' }, [
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Orders today' }), h('dd', { text: String(todayOrders.length) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Store vs restaurant orders' }), h('dd', { text: (orders.length - restaurantOrders.length) + ' / ' + restaurantOrders.length })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Average order value' }), h('dd', { text: money(averageOrder) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Delivered' }), h('dd', { text: String(byStatus.DELIVERED || 0) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Cancelled' }), h('dd', { text: String(byStatus.CANCELLED || 0) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Coupons configured' }), h('dd', { text: String(stats.coupons) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Free-delivery threshold' }), h('dd', { text: money(settings.freeDeliveryThreshold) })]),
          h('div', { class: 'fx-bill-row' }, [h('dt', { text: 'Standard delivery fee' }), h('dd', { text: money(settings.deliveryFee) })]),
        ]),
        h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'Analytics are computed from the orders stored in this profile' + (store.isDemo() ? ' (demo mode)' : ' returned by the API') + '. No third-party analytics service is connected.' }),
      ])
    );

    grid.appendChild(
      h('div', { class: 'fx-card fx-card-pad' }, [
        h('h2', { class: 'fx-section-title', text: 'Orders by status' }),
        ...C.STORE_ORDER_FLOW.concat([C.CANCELLED]).map((status) => {
          const count = byStatus[status] || 0;
          return h('div', { class: 'fx-bar-row' }, [
            h('span', { class: 'fx-bar-label', text: C.ORDER_STATUS_LABELS[status] || status }),
            h('div', { class: 'fx-bar-track' }, [h('div', { class: 'fx-bar-fill', style: { width: FX.u.percentage(count, orders.length || 1) + '%' } })]),
            h('span', { class: 'fx-bar-value', text: String(count) }),
          ]);
        }),
        h('div', { class: 'fx-btn-group', style: { marginTop: '12px' } }, [
          h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Manage orders', onClick: () => selectSection('orders') }),
          h('button', { class: 'fx-btn fx-btn-ghost fx-btn-sm', type: 'button', text: 'Low stock (' + lowStock.length + ')', onClick: () => selectSection('inventory') }),
        ]),
      ])
    );

    mount.appendChild(grid);

    mount.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '16px' } }, [
        h('h2', { class: 'fx-section-title', text: 'Stock alerts' }),
        lowStock.length || outOfStock.length
          ? table(
              [
                { label: 'Item', render: (row) => h('span', {}, [h('strong', { text: row.name }), h('span', { class: 'fx-xs fx-muted fx-block', text: row.categoryName + (row.brand ? ' · ' + row.brand : '') })]) },
                { label: 'Stock', align: 'right', render: (row) => h('span', { class: 'fx-badge ' + (row.stock <= 0 ? 'fx-badge-danger' : 'fx-badge-warning'), text: row.stock <= 0 ? 'Out of stock' : row.stock + ' left' }) },
                { label: 'Price', align: 'right', value: (row) => money(row.price) },
                { label: 'Action', align: 'right', render: (row) => h('button', { class: 'fx-btn fx-btn-soft fx-btn-sm', type: 'button', text: 'Restock +50', onClick: () => quickRestock(row, 50) }) },
              ],
              outOfStock.concat(lowStock).slice(0, 10),
              ''
            )
          : h('p', { class: 'fx-small fx-muted', text: 'Every product is above the low-stock threshold of ' + settings.lowStockThreshold + ' units.' }),
      ])
    );

    mount.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '16px' } }, [
        h('h2', { class: 'fx-section-title', text: 'Latest orders' }),
        orders.length
          ? table(
              [
                { label: 'Order', render: (row) => h('a', { href: FX.url('order', { id: row.id }), text: row.id }) },
                { label: 'Placed', value: (row) => FX.u.formatDate(row.createdAt, true) },
                { label: 'Items', align: 'right', value: (row) => String((row.items || []).length) },
                { label: 'Total', align: 'right', value: (row) => money((row.totals || {}).grandTotal || 0) },
                { label: 'Status', render: (row) => ui.statusBadge(row.status) },
                { label: '', align: 'right', render: (row) => h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Manage', onClick: () => selectSection('orders') }) },
              ],
              orders.slice(0, 6),
              ''
            )
          : ui.emptyState({ icon: '🧾', title: 'No orders yet', message: 'Place a demo order from the storefront and it will appear here instantly.' }),
      ])
    );
  }

  async function quickRestock(product, amount) {
    const nextStock = Math.max(0, (product.stock || 0) + amount);
    await store.admin.saveProduct({ id: product.id, stock: nextStock, inStock: nextStock > 0 });
    ui.notify.success(product.name + ' restocked to ' + nextStock + ' units.');
    render();
  }

  /* -------------------------------------------------------------- orders */

  function ordersSection(mount) {
    const orders = store.orders.list();
    const flows = C.STORE_ORDER_FLOW.concat(C.RESTAURANT_ORDER_FLOW.filter((s) => C.STORE_ORDER_FLOW.indexOf(s) === -1));

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 12px' } }, [
        h('div', {}, [h('h1', { class: 'fx-page-title', text: 'Orders' }), h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: orders.length + ' orders · update a status and the customer’s tracking page reflects it immediately.' })]),
        h('div', { class: 'fx-toolbar-right' }, [
          h('select', {
            class: 'fx-select fx-select-sm',
            'aria-label': 'Filter orders by status',
            onChange: (event) => { orderFilter = event.target.value; render(); },
          }, [{ value: 'all', label: 'All statuses' }].concat(flows.concat([C.CANCELLED]).map((status) => ({ value: status, label: C.ORDER_STATUS_LABELS[status] || status }))).map((option) =>
            h('option', { value: option.value, selected: orderFilter === option.value, text: option.label })
          )),
          h('input', {
            class: 'fx-input fx-input-sm',
            type: 'search',
            placeholder: 'Search order ID',
            'aria-label': 'Search orders',
            value: orderQuery,
            onInput: FX.u.debounce((event) => { orderQuery = event.target.value.trim(); render(); }, FX.config.searchDebounceMs),
          }),
        ]),
      ])
    );

    const rows = orders.filter((order) => {
      if (orderFilter !== 'all' && order.status !== orderFilter) return false;
      if (orderQuery && order.id.toLowerCase().indexOf(orderQuery.toLowerCase()) === -1) return false;
      return true;
    });

    mount.appendChild(
      table(
        [
          { label: 'Order', render: (row) => h('div', {}, [h('a', { class: 'fx-strong', href: FX.url('order', { id: row.id }), text: row.id }), h('div', { class: 'fx-xs fx-muted', text: FX.u.formatDate(row.createdAt, true) })]) },
          { label: 'Customer', render: (row) => h('div', {}, [h('span', { text: row.userName || 'Guest' }), h('div', { class: 'fx-xs fx-muted', text: (row.items || []).length + ' items · ' + (row.cartType === C.CART_TYPES.RESTAURANT ? row.restaurantName || 'Restaurant' : 'Store') })]) },
          { label: 'Total', align: 'right', value: (row) => money((row.totals || {}).grandTotal || 0) },
          { label: 'Payment', render: (row) => h('span', { class: 'fx-badge ' + (row.paymentStatus === C.PAYMENT_STATUS.PAID ? 'fx-badge-success' : row.paymentStatus === C.PAYMENT_STATUS.REFUNDED ? 'fx-badge-danger' : 'fx-badge-warning'), text: (C.PAYMENT_METHOD_LABELS[row.paymentMethod] || row.paymentMethod) + ' · ' + row.paymentStatus }) },
          {
            label: 'Status',
            render: (row) => {
              const flow = row.status === C.CANCELLED ? [C.CANCELLED] : (row.flow && row.flow.length ? row.flow : C.orderFlowFor(row.cartType));
              const select = h('select', {
                class: 'fx-select fx-select-sm',
                'aria-label': 'Status for order ' + row.id,
                onChange: (event) => {
                  const next = event.target.value;
                  store.orders.setStatus(row.id, next, { note: 'Updated from the admin dashboard' });
                  ui.notify.success(row.id + ' → ' + (C.ORDER_STATUS_LABELS[next] || next));
                  render();
                },
              }, flow.concat([C.CANCELLED]).filter((status, index, list) => list.indexOf(status) === index).map((status) => h('option', { value: status, selected: row.status === status, text: C.ORDER_STATUS_LABELS[status] || status })));
              return h('div', { class: 'fx-row fx-gap-2' }, [select, row.simulated ? h('span', { class: 'fx-badge fx-badge-info', text: 'Simulated' }) : null]);
            },
          },
          {
            label: '',
            align: 'right',
            render: (row) =>
              store.orders.canCancel(row)
                ? h('button', {
                    class: 'fx-btn fx-btn-ghost fx-btn-sm',
                    type: 'button',
                    text: 'Cancel',
                    onClick: async () => {
                      const ok = await ui.confirmDialog({ title: 'Cancel ' + row.id + '?', message: 'Stock is restored and any paid amount is marked as a simulated refund.', confirmLabel: 'Cancel order', danger: true });
                      if (!ok) return;
                      try {
                        await store.orders.cancel(row.id, 'Cancelled by admin');
                        ui.notify.info(row.id + ' cancelled.');
                        render();
                      } catch (err) {
                        ui.notify.error(err.message || 'Could not cancel the order.');
                      }
                    },
                  })
                : h('span', { class: 'fx-xs fx-muted', text: '—' }),
          },
        ],
        rows,
        'No orders match this filter.'
      )
    );

    mount.appendChild(
      h('p', { class: 'fx-xs fx-muted', style: { marginTop: '12px' }, text: 'Status changes here are recorded in the order timeline and notified to the customer’s notification centre. In this build they are simulated — no courier or kitchen system is integrated.' })
    );
  }

  /* ------------------------------------------------------------ products */

  function productEditor(existing) {
    const categories = store.catalog.categories();
    const brands = store.catalog.brands();
    const product = existing || {};

    const form = h('form', { class: 'fx-stack', novalidate: 'true' });
    const fields = {
      name: ui.field({ label: 'Product name', name: 'name', value: product.name || '', required: true }),
      brand: ui.field({
        label: 'Brand',
        name: 'brand',
        type: 'select',
        value: product.brand || (brands[0] && brands[0].name) || '',
        options: brands.map((brand) => ({ value: brand.name, label: brand.name })),
      }),
      categoryId: ui.field({
        label: 'Category',
        name: 'categoryId',
        type: 'select',
        value: product.categoryId || (categories[0] && categories[0].id) || '',
        options: categories.map((category) => ({ value: category.id, label: category.name })),
      }),
      subcategory: ui.field({ label: 'Subcategory', name: 'subcategory', value: product.subcategory || '' }),
      price: ui.field({ label: 'Selling price (₹)', name: 'price', type: 'number', value: product.price != null ? String(product.price) : '', required: true, min: 0 }),
      mrp: ui.field({ label: 'MRP (₹)', name: 'mrp', type: 'number', value: product.mrp != null ? String(product.mrp) : '', min: 0, hint: 'Discount is derived from MRP and price.' }),
      unit: ui.field({ label: 'Unit', name: 'unit', value: product.unit || '1 pc', placeholder: 'e.g. 500 g, 1 L, pack of 6' }),
      stock: ui.field({ label: 'Stock', name: 'stock', type: 'number', value: product.stock != null ? String(product.stock) : '0', min: 0 }),
      gstRate: ui.field({
        label: 'GST rate',
        name: 'gstRate',
        type: 'select',
        value: String(product.gstRate != null ? product.gstRate : 0.18),
        options: [0, 0.05, 0.12, 0.18, 0.28].map((rate) => ({ value: String(rate), label: Math.round(rate * 100) + '%' })),
      }),
      handlingMinutes: ui.field({ label: 'Handling time (minutes)', name: 'handlingMinutes', type: 'number', value: String(product.handlingMinutes || 15), min: 0 }),
      emoji: ui.field({ label: 'Emoji / image seed', name: 'emoji', value: product.emoji || '🛒', hint: 'Product imagery is generated locally from this value — no external image URLs are used.' }),
      tags: ui.field({ label: 'Tags', name: 'tags', value: (product.tags || []).join(', '), hint: 'Comma separated: bestseller, deal, under99, fresh, essential, new, trending, seasonal' }),
      description: ui.field({ label: 'Description', name: 'description', type: 'textarea', rows: 3, value: product.description || '' }),
    };

    form.appendChild(h('div', { class: 'fx-form-grid' }, [fields.name, fields.brand, fields.categoryId, fields.subcategory]));
    form.appendChild(h('div', { class: 'fx-form-grid' }, [fields.price, fields.mrp, fields.unit, fields.stock]));
    form.appendChild(h('div', { class: 'fx-form-grid' }, [fields.gstRate, fields.handlingMinutes, fields.emoji]));
    form.appendChild(fields.tags);
    form.appendChild(fields.description);

    const activeWrap = h('label', { class: 'fx-check' }, [
      h('input', { type: 'checkbox', name: 'active', checked: product.active !== false }),
      h('span', { text: 'Visible in the storefront' }),
    ]);
    form.appendChild(activeWrap);
    form.fields = fields;
    return form;
  }

  function openProductEditor(existing) {
    const form = productEditor(existing);
    ui.modal({
      title: existing ? 'Edit ' + existing.name : 'Add a product',
      size: 'wide',
      content: form,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: existing ? 'Save product' : 'Create product',
          variant: 'primary',
          onClick: async (close) => {
            ui.clearFormErrors(form);
            const values = ui.formValues(form);
            const errors = {
              name: FX.u.validators.minLength(2)(values.name, 'Name'),
              price: values.price === '' || Number(values.price) < 0 ? 'Enter a valid price.' : null,
              stock: values.stock === '' || Number(values.stock) < 0 ? 'Enter a valid stock quantity.' : null,
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
            const price = Math.round(Number(values.price));
            const mrp = Math.round(Number(values.mrp || price));
            const stock = Math.max(0, Math.round(Number(values.stock)));
            const category = store.catalog.category(values.categoryId) || {};
            const payload = {
              id: existing ? existing.id : undefined,
              name: values.name,
              brand: values.brand,
              categoryId: values.categoryId,
              categoryName: category.name || values.categoryId,
              subcategory: values.subcategory,
              price,
              mrp: Math.max(mrp, price),
              discountPercent: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
              unit: values.unit,
              stock,
              inStock: stock > 0,
              gstRate: Number(values.gstRate),
              handlingMinutes: Math.max(0, Math.round(Number(values.handlingMinutes || 15))),
              emoji: values.emoji,
              tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
              description: values.description,
              active: Boolean($('input[name="active"]', form).checked),
            };
            try {
              await store.admin.saveProduct(payload);
              close();
              ui.notify.success((existing ? 'Updated ' : 'Created ') + payload.name + '.');
              render();
            } catch (err) {
              ui.notify.error(err.message || 'Could not save the product.');
            }
          },
        },
      ],
    });
  }

  function productsSection(mount) {
    const all = store.catalog.products();
    const q = productQuery.toLowerCase();
    const rows = q
      ? all.filter((product) => [product.name, product.brand, product.categoryName, (product.tags || []).join(' ')].join(' ').toLowerCase().indexOf(q) !== -1)
      : all;

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 12px' } }, [
        h('div', {}, [h('h1', { class: 'fx-page-title', text: 'Products' }), h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: rows.length + ' of ' + all.length + ' products · price and stock edits apply immediately across the storefront.' })]),
        h('div', { class: 'fx-toolbar-right' }, [
          h('input', {
            class: 'fx-input fx-input-sm',
            type: 'search',
            placeholder: 'Search products',
            'aria-label': 'Search products',
            value: productQuery,
            onInput: FX.u.debounce((event) => { productQuery = event.target.value.trim(); render(); }, FX.config.searchDebounceMs),
          }),
          h('button', { class: 'fx-btn fx-btn-primary fx-btn-sm', type: 'button', text: '+ New product', onClick: () => openProductEditor(null) }),
        ]),
      ])
    );

    mount.appendChild(
      table(
        [
          { label: 'Product', render: (row) => h('div', { class: 'fx-row fx-gap-2' }, [h('img', { src: FX.media.imageFor(row), alt: '', loading: 'lazy', style: { width: '34px', height: '34px', borderRadius: '8px' } }), h('div', {}, [h('a', { class: 'fx-strong', href: FX.url('product', { id: row.id }), text: row.name }), h('div', { class: 'fx-xs fx-muted', text: row.brand + ' · ' + row.categoryName + (row.unit ? ' · ' + row.unit : '') })])]) },
          { label: 'Price', align: 'right', render: (row) => h('div', {}, [h('div', { class: 'fx-price', text: money(row.price) }), row.mrp > row.price ? h('div', { class: 'fx-xs fx-muted', text: 'MRP ' + money(row.mrp) + ' · ' + FX.u.discountPercent(row) + '% off' }) : null]) },
          { label: 'Stock', align: 'right', render: (row) => numberInput(row.stock, async (value) => { await store.admin.saveProduct({ id: row.id, stock: Math.max(0, value), inStock: value > 0 }); row.stock = Math.max(0, value); ui.notify.info(row.name + ' stock set to ' + Math.max(0, value) + '.'); }, { label: 'Stock for ' + row.name, width: '74px' }) },
          { label: 'GST', align: 'right', value: (row) => Math.round((row.gstRate || 0) * 100) + '%' },
          { label: 'Status', render: (row) => h('label', { class: 'fx-switch-row fx-switch-row-sm' }, [h('input', { type: 'checkbox', checked: row.active !== false, 'aria-label': 'Visible: ' + row.name, onChange: async (event) => { await store.admin.saveProduct({ id: row.id, active: event.target.checked }); ui.notify.info(row.name + (event.target.checked ? ' is now visible.' : ' is hidden.')); } }), h('span', { class: 'fx-switch-track', 'aria-hidden': 'true' }, [h('span', { class: 'fx-switch-thumb' })])]) },
          { label: '', align: 'right', render: (row) => h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Edit', onClick: () => openProductEditor(row) }) },
        ],
        rows.slice(0, 60),
        'No products match this search.'
      )
    );

    if (rows.length > 60) {
      mount.appendChild(h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'Showing the first 60 of ' + rows.length + ' matches — refine the search to see the rest.' }));
    }
    mount.appendChild(
      h('p', { class: 'fx-xs fx-muted', style: { marginTop: '8px' }, text: store.isDemo() ? 'Demo mode: edits are stored as an override layer on top of the seeded catalogue in this browser, so the original seed data is never destroyed. Connect the backend to persist them in MongoDB.' : 'Backend mode: edits are written through the admin API and re-validated server-side.' })
    );
  }

  /* ----------------------------------------------------------- inventory */

  function inventorySection(mount) {
    const settings = store.settings.get();
    const products = store.catalog.products();
    const outOfStock = products.filter((product) => product.stock <= 0);
    const lowStock = products.filter((product) => product.stock > 0 && product.stock <= settings.lowStockThreshold);
    const healthy = products.length - outOfStock.length - lowStock.length;

    mount.appendChild(
      h('div', { style: { padding: '20px 0 12px' } }, [
        h('h1', { class: 'fx-page-title', text: 'Inventory' }),
        h('p', { class: 'fx-page-sub', text: 'Stock health across ' + products.length + ' products · low-stock threshold is ' + settings.lowStockThreshold + ' units (configurable in Business settings).' }),
      ])
    );

    mount.appendChild(
      statCards([
        { value: String(healthy), label: 'Healthy', tone: 'success', note: 'above ' + settings.lowStockThreshold + ' units' },
        { value: String(lowStock.length), label: 'Low stock', tone: lowStock.length ? 'warning' : null, note: 'reorder soon' },
        { value: String(outOfStock.length), label: 'Out of stock', tone: outOfStock.length ? 'danger' : null, note: 'customers cannot add these' },
        { value: String(products.reduce((sum, product) => sum + (product.stock || 0), 0)), label: 'Total units on hand', note: 'across all categories' },
      ])
    );

    const groups = [
      { title: 'Out of stock', rows: outOfStock, tone: 'danger' },
      { title: 'Low stock', rows: lowStock, tone: 'warning' },
    ];

    groups.forEach((group) => {
      mount.appendChild(
        h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '16px' } }, [
          h('h2', { class: 'fx-section-title', text: group.title + ' (' + group.rows.length + ')' }),
          group.rows.length
            ? table(
                [
                  { label: 'Product', render: (row) => h('div', {}, [h('strong', { text: row.name }), h('div', { class: 'fx-xs fx-muted', text: row.brand + ' · ' + row.categoryName })]) },
                  { label: 'Stock', align: 'right', render: (row) => h('span', { class: 'fx-badge fx-badge-' + group.tone, text: String(row.stock) }) },
                  { label: 'Adjust', align: 'right', render: (row) => h('div', { class: 'fx-row fx-gap-2' }, [
                    h('button', { class: 'fx-btn fx-btn-soft fx-btn-sm', type: 'button', text: '+10', onClick: () => quickRestock(row, 10) }),
                    h('button', { class: 'fx-btn fx-btn-soft fx-btn-sm', type: 'button', text: '+50', onClick: () => quickRestock(row, 50) }),
                    numberInput(row.stock, async (value) => { await store.admin.saveProduct({ id: row.id, stock: Math.max(0, value), inStock: value > 0 }); ui.notify.info(row.name + ' stock set to ' + Math.max(0, value) + '.'); render(); }, { label: 'Set stock for ' + row.name }),
                  ]) },
                ],
                group.rows.slice(0, 25),
                ''
              )
            : h('p', { class: 'fx-small fx-muted', text: 'Nothing here — every product is stocked above the threshold.' }),
        ])
      );
    });

    mount.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '16px' } }, [
        h('h2', { class: 'fx-section-title', text: 'Bulk actions' }),
        h('div', { class: 'fx-btn-group fx-wrap' }, [
          h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Restock every low/out item to 50', onClick: async () => {
            const targets = outOfStock.concat(lowStock);
            if (!targets.length) { ui.notify.info('Nothing needs restocking.'); return; }
            const ok = await ui.confirmDialog({ title: 'Restock ' + targets.length + ' products?', message: 'Each item will be set to 50 units.', confirmLabel: 'Restock all' });
            if (!ok) return;
            for (const product of targets) {
              // eslint-disable-next-line no-await-in-loop
              await store.admin.saveProduct({ id: product.id, stock: 50, inStock: true });
            }
            ui.notify.success(targets.length + ' products restocked to 50 units.');
            render();
          } }),
          h('button', { class: 'fx-btn fx-btn-ghost fx-btn-sm', type: 'button', text: 'Reset catalogue overrides', onClick: async () => {
            const ok = await ui.confirmDialog({ title: 'Discard admin catalogue edits?', message: 'Products, menu items and coupons return to the seeded values. Orders, accounts and settings are kept.', confirmLabel: 'Reset catalogue', danger: true });
            if (!ok) return;
            store.resetLocalData({ keepAccounts: true, keepLocation: true, catalogueOnly: true });
            ui.notify.success('Catalogue overrides discarded.');
            render();
          } }),
        ]),
        h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'Stock is decremented locally when a demo order is placed and restored when an order is cancelled, so inventory numbers stay believable while you test.' }),
      ])
    );
  }

  /* ------------------------------------------------- restaurants & menus */

  function menuItemEditor(restaurant, item) {
    const form = h('form', { class: 'fx-stack', novalidate: 'true' });
    const fields = {
      name: ui.field({ label: 'Dish name', name: 'name', value: item.name || '', required: true }),
      sectionId: ui.field({
        label: 'Menu section',
        name: 'sectionId',
        type: 'select',
        value: item.sectionId || (restaurant.sections[0] && restaurant.sections[0].id) || '',
        options: (restaurant.sections || []).map((entry) => ({ value: entry.id, label: entry.label || entry.name || entry.id })),
      }),
      price: ui.field({ label: 'Price (₹)', name: 'price', type: 'number', value: String(item.price != null ? item.price : ''), required: true, min: 0 }),
      mrp: ui.field({ label: 'MRP (₹)', name: 'mrp', type: 'number', value: String(item.mrp != null ? item.mrp : ''), min: 0 }),
      stock: ui.field({ label: 'Servings available', name: 'stock', type: 'number', value: String(item.stock != null ? item.stock : 0), min: 0 }),
      prepMinutes: ui.field({ label: 'Prep time (minutes)', name: 'prepMinutes', type: 'number', value: String(item.prepMinutes || 15), min: 0 }),
      unit: ui.field({ label: 'Portion label', name: 'unit', value: item.unit || '1 plate' }),
      description: ui.field({ label: 'Description', name: 'description', type: 'textarea', rows: 3, value: item.description || '' }),
    };
    form.appendChild(h('div', { class: 'fx-form-grid' }, [fields.name, fields.sectionId, fields.unit]));
    form.appendChild(h('div', { class: 'fx-form-grid' }, [fields.price, fields.mrp, fields.stock, fields.prepMinutes]));
    form.appendChild(fields.description);
    form.appendChild(h('label', { class: 'fx-check' }, [h('input', { type: 'checkbox', name: 'veg', checked: item.veg !== false }), h('span', { text: 'Vegetarian' })]));
    form.appendChild(h('label', { class: 'fx-check' }, [h('input', { type: 'checkbox', name: 'active', checked: item.active !== false }), h('span', { text: 'Available on the menu' })]));
    form.fields = fields;
    return form;
  }

  function openMenuItemEditor(restaurant, item) {
    const form = menuItemEditor(restaurant, item);
    ui.modal({
      title: 'Edit ' + item.name + ' · ' + restaurant.name,
      size: 'wide',
      content: form,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Save dish',
          variant: 'primary',
          onClick: async (close) => {
            ui.clearFormErrors(form);
            const values = ui.formValues(form);
            const error = FX.u.validators.minLength(2)(values.name, 'Dish name');
            if (error) {
              ui.setFieldError(form.fields.name, error);
              return;
            }
            const price = Math.round(Number(values.price || 0));
            const mrp = Math.round(Number(values.mrp || price));
            const patch = {
              id: item.id,
              name: values.name,
              sectionId: values.sectionId,
              price,
              mrp: Math.max(mrp, price),
              discountPercent: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
              stock: Math.max(0, Math.round(Number(values.stock || 0))),
              inStock: Number(values.stock || 0) > 0,
              prepMinutes: Math.max(0, Math.round(Number(values.prepMinutes || 15))),
              handlingMinutes: Math.max(0, Math.round(Number(values.prepMinutes || 15))),
              unit: values.unit,
              description: values.description,
              veg: Boolean($('input[name="veg"]', form).checked),
              active: Boolean($('input[name="active"]', form).checked),
            };
            try {
              await store.admin.saveMenuItem(restaurant.id, patch);
              close();
              ui.notify.success(patch.name + ' updated.');
              render();
            } catch (err) {
              ui.notify.error(err.message || 'Could not save the dish.');
            }
          },
        },
      ],
    });
  }

  function restaurantsSection(mount) {
    const restaurants = store.catalog.restaurants();
    const q = restaurantFilter.toLowerCase();
    const rows = q ? restaurants.filter((restaurant) => [restaurant.name, restaurant.area, (restaurant.cuisines || []).join(' ')].join(' ').toLowerCase().indexOf(q) !== -1) : restaurants;

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 12px' } }, [
        h('div', {}, [h('h1', { class: 'fx-page-title', text: 'Restaurants & menus' }), h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: restaurants.length + ' restaurants · ' + store.catalog.menuItems().length + ' menu items · edit prices, availability and prep time per dish.' })]),
        h('input', {
          class: 'fx-input fx-input-sm',
          type: 'search',
          placeholder: 'Search restaurants',
          'aria-label': 'Search restaurants',
          value: restaurantFilter,
          style: { minWidth: '220px' },
          onInput: FX.u.debounce((event) => { restaurantFilter = event.target.value.trim(); render(); }, FX.config.searchDebounceMs),
        }),
      ])
    );

    if (!rows.length) {
      mount.appendChild(ui.emptyState({ icon: '🍽️', title: 'No restaurants match', message: 'Try a different name, area or cuisine.' }));
      return;
    }

    rows.forEach((restaurant) => {
      const card = h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '16px' } });
      card.appendChild(
        h('div', { class: 'fx-row-between fx-wrap fx-gap-3' }, [
          h('div', { class: 'fx-row fx-gap-3' }, [
            h('span', { class: 'fx-emoji-lg', 'aria-hidden': 'true', text: restaurant.emoji || '🍽️' }),
            h('div', {}, [
              h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
                h('a', { class: 'fx-strong', href: FX.url('restaurant', { id: restaurant.id }), text: restaurant.name }),
                restaurant.pureVeg ? h('span', { class: 'fx-badge fx-badge-success', text: 'Pure veg' }) : null,
                restaurant.active === false ? h('span', { class: 'fx-badge fx-badge-danger', text: 'Hidden' }) : null,
              ]),
              h('div', { class: 'fx-xs fx-muted', text: (restaurant.cuisines || []).join(', ') + ' · ' + restaurant.area + ' · min order ' + money(restaurant.minOrder) + ' · ETA ' + restaurant.etaMinutes + ' min' }),
              h('div', { class: 'fx-xs fx-muted', text: 'Serves: ' + (restaurant.cityIds || []).map((cityId) => (FX.locations.getCity(cityId) || {}).name || cityId).join(', ') }),
            ]),
          ]),
          h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
            h('div', {}, [
              h('label', { class: 'fx-label fx-label-sm', for: 'min-' + restaurant.id, text: 'Min order ₹' }),
              numberInput(restaurant.minOrder, async (value) => { await store.admin.saveRestaurant(restaurant.id, { minOrder: Math.max(0, value) }); ui.notify.info(restaurant.name + ' minimum order set to ' + money(Math.max(0, value)) + '.'); }, { label: 'Minimum order for ' + restaurant.name, width: '80px' }),
            ]),
            h('div', {}, [
              h('label', { class: 'fx-label fx-label-sm', for: 'eta-' + restaurant.id, text: 'ETA min' }),
              numberInput(restaurant.etaMinutes, async (value) => { await store.admin.saveRestaurant(restaurant.id, { etaMinutes: Math.max(5, value) }); ui.notify.info(restaurant.name + ' ETA set to ' + Math.max(5, value) + ' minutes.'); }, { label: 'ETA for ' + restaurant.name, width: '80px' }),
            ]),
          ]),
        ])
      );

      const menu = (restaurant.menu || []).slice(0, 8);
      card.appendChild(
        table(
          [
            { label: 'Dish', render: (row) => h('div', {}, [h('span', { 'aria-hidden': 'true', text: (row.veg === false ? '🍗 ' : '🥗 ') + (row.emoji || '') + ' ' }), h('strong', { text: row.name }), h('div', { class: 'fx-xs fx-muted', text: (row.unit || '') + ' · prep ' + (row.prepMinutes || row.handlingMinutes || 0) + ' min' })]) },
            { label: 'Price', align: 'right', render: (row) => h('div', {}, [h('div', { class: 'fx-price', text: money(row.price) }), row.mrp > row.price ? h('div', { class: 'fx-xs fx-muted', text: 'MRP ' + money(row.mrp) }) : null]) },
            { label: 'Servings', align: 'right', render: (row) => numberInput(row.stock, async (value) => { await store.admin.saveMenuItem(restaurant.id, { id: row.id, stock: Math.max(0, value), inStock: value > 0 }); row.stock = Math.max(0, value); ui.notify.info(row.name + ' set to ' + Math.max(0, value) + ' servings.'); }, { label: 'Servings for ' + row.name, width: '74px' }) },
            { label: 'Available', render: (row) => h('label', { class: 'fx-switch-row fx-switch-row-sm' }, [h('input', { type: 'checkbox', checked: row.active !== false, 'aria-label': 'Available: ' + row.name, onChange: async (event) => { await store.admin.saveMenuItem(restaurant.id, { id: row.id, active: event.target.checked }); ui.notify.info(row.name + (event.target.checked ? ' is back on the menu.' : ' is unavailable.')); } }), h('span', { class: 'fx-switch-track', 'aria-hidden': 'true' }, [h('span', { class: 'fx-switch-thumb' })])]) },
            { label: '', align: 'right', render: (row) => h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Edit', onClick: () => openMenuItemEditor(restaurant, row) }) },
          ],
          menu,
          'This restaurant has no menu items yet.'
        )
      );
      if ((restaurant.menu || []).length > menu.length) {
        card.appendChild(h('p', { class: 'fx-xs fx-muted', style: { marginTop: '8px' }, text: 'Showing 8 of ' + restaurant.menu.length + ' dishes — open the restaurant page to see the full menu.' }));
      }
      mount.appendChild(card);
    });

    mount.appendChild(
      h('p', { class: 'fx-xs fx-muted', style: { marginTop: '12px' }, text: 'Restaurant records are seeded demo partners. Ratings shown in the storefront are merchandising values, not verified customer ratings.' })
    );
  }

  /* ------------------------------------------------------------- coupons */

  function couponEditor(existing) {
    const coupon = existing || {};
    const form = h('form', { class: 'fx-stack', novalidate: 'true' });
    const fields = {
      code: ui.field({ label: 'Code', name: 'code', value: coupon.code || '', required: true, placeholder: 'SAVE10', hint: 'Uppercase, no spaces.' }),
      title: ui.field({ label: 'Title', name: 'title', value: coupon.title || '', required: true, placeholder: '₹10 off orders above ₹199' }),
      description: ui.field({ label: 'Description', name: 'description', type: 'textarea', rows: 2, value: coupon.description || '' }),
      type: ui.field({
        label: 'Discount type',
        name: 'type',
        type: 'select',
        value: coupon.type || C.COUPON_TYPES.FLAT,
        options: [
          { value: C.COUPON_TYPES.PERCENT, label: 'Percentage off' },
          { value: C.COUPON_TYPES.FLAT, label: 'Flat amount off' },
          { value: C.COUPON_TYPES.FREE_DELIVERY, label: 'Free delivery' },
        ],
      }),
      value: ui.field({ label: 'Value (₹ or %)', name: 'value', type: 'number', value: String(coupon.value != null ? coupon.value : 10), min: 0 }),
      minSubtotal: ui.field({ label: 'Minimum subtotal (₹)', name: 'minSubtotal', type: 'number', value: String(coupon.minSubtotal || 0), min: 0 }),
      maxDiscount: ui.field({ label: 'Maximum discount (₹)', name: 'maxDiscount', type: 'number', value: String(coupon.maxDiscount || 0), min: 0, hint: '0 means no cap.' }),
      maxUsesPerUser: ui.field({ label: 'Max uses per user', name: 'maxUsesPerUser', type: 'number', value: String(coupon.maxUsesPerUser || 3), min: 0 }),
      validFrom: ui.field({ label: 'Valid from', name: 'validFrom', type: 'date', value: coupon.validFrom ? String(coupon.validFrom).slice(0, 10) : '' }),
      validTo: ui.field({ label: 'Valid until', name: 'validTo', type: 'date', value: coupon.validTo ? String(coupon.validTo).slice(0, 10) : '' }),
      cartType: ui.field({
        label: 'Applies to',
        name: 'cartType',
        type: 'select',
        value: coupon.cartType || 'any',
        options: [
          { value: 'any', label: 'Store and restaurant orders' },
          { value: C.CART_TYPES.STORE, label: 'Store orders only' },
          { value: C.CART_TYPES.RESTAURANT, label: 'Restaurant orders only' },
        ],
      }),
    };
    form.appendChild(h('div', { class: 'fx-form-grid' }, [fields.code, fields.title]));
    form.appendChild(fields.description);
    form.appendChild(h('div', { class: 'fx-form-grid' }, [fields.type, fields.value, fields.minSubtotal, fields.maxDiscount]));
    form.appendChild(h('div', { class: 'fx-form-grid' }, [fields.maxUsesPerUser, fields.validFrom, fields.validTo, fields.cartType]));
    form.appendChild(h('label', { class: 'fx-check' }, [h('input', { type: 'checkbox', name: 'stacksWithCoupon', checked: Boolean(coupon.stacksWithCoupon) }), h('span', { text: 'Stacks with automatic offers' })]));
    form.appendChild(h('label', { class: 'fx-check' }, [h('input', { type: 'checkbox', name: 'firstOrderOnly', checked: Boolean(coupon.firstOrderOnly) }), h('span', { text: 'First order only' })]));
    form.appendChild(h('label', { class: 'fx-check' }, [h('input', { type: 'checkbox', name: 'active', checked: coupon.active !== false }), h('span', { text: 'Active' })]));
    form.appendChild(h('label', { class: 'fx-check' }, [h('input', { type: 'checkbox', name: 'demo', checked: coupon.demo !== false }), h('span', { text: 'Label as a demo coupon in the customer UI' })]));
    form.fields = fields;
    return form;
  }

  function openCouponEditor(existing) {
    const form = couponEditor(existing);
    ui.modal({
      title: existing ? 'Edit coupon ' + existing.code : 'Create a coupon',
      size: 'wide',
      content: form,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: existing ? 'Save coupon' : 'Create coupon',
          variant: 'primary',
          onClick: async (close) => {
            ui.clearFormErrors(form);
            const values = ui.formValues(form);
            const errors = {
              code: /^[A-Z0-9]{3,20}$/i.test(String(values.code || '').trim()) ? null : 'Use 3–20 letters or numbers.',
              title: FX.u.validators.minLength(4)(values.title, 'Title'),
            };
            let hasError = false;
            Object.keys(errors).forEach((key) => {
              if (!errors[key]) return;
              hasError = true;
              ui.setFieldError(form.fields[key], errors[key]);
            });
            if (hasError) return;

            const payload = {
              code: String(values.code).trim().toUpperCase(),
              title: values.title,
              description: values.description,
              type: values.type,
              value: Number(values.value || 0),
              minSubtotal: Number(values.minSubtotal || 0),
              maxDiscount: Number(values.maxDiscount || 0),
              maxUsesPerUser: Number(values.maxUsesPerUser || 3),
              validFrom: values.validFrom || null,
              validTo: values.validTo || null,
              cartType: values.cartType === 'any' ? null : values.cartType,
              stacksWithCoupon: Boolean($('input[name="stacksWithCoupon"]', form).checked),
              firstOrderOnly: Boolean($('input[name="firstOrderOnly"]', form).checked),
              active: Boolean($('input[name="active"]', form).checked),
              demo: Boolean($('input[name="demo"]', form).checked),
            };
            try {
              await store.admin.saveCoupon(payload);
              close();
              ui.notify.success('Coupon ' + payload.code + ' saved.');
              render();
            } catch (err) {
              ui.notify.error(err.message || 'Could not save the coupon.');
            }
          },
        },
      ],
    });
  }

  function couponsSection(mount) {
    const coupons = store.coupons.list();
    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 12px' } }, [
        h('div', {}, [h('h1', { class: 'fx-page-title', text: 'Coupons' }), h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: coupons.length + ' coupons · eligibility rules are enforced by the same pricing engine the cart uses.' })]),
        h('button', { class: 'fx-btn fx-btn-primary fx-btn-sm', type: 'button', text: '+ New coupon', onClick: () => openCouponEditor(null) }),
      ])
    );

    mount.appendChild(
      table(
        [
          { label: 'Code', render: (row) => h('div', {}, [h('code', { class: 'fx-code', text: row.code }), h('div', { class: 'fx-xs fx-muted', text: row.title })]) },
          { label: 'Discount', align: 'right', value: (row) => (row.type === C.COUPON_TYPES.PERCENT ? row.value + '%' : row.type === C.COUPON_TYPES.FREE_DELIVERY ? 'Free delivery' : money(row.value)) + (row.maxDiscount ? ' (cap ' + money(row.maxDiscount) + ')' : '') },
          { label: 'Minimum', align: 'right', value: (row) => (row.minSubtotal ? money(row.minSubtotal) : '—') },
          { label: 'Validity', value: (row) => (row.validTo ? 'until ' + FX.u.formatDate(row.validTo) : 'no end date') + (row.firstOrderOnly ? ' · first order' : '') },
          { label: 'Applies to', value: (row) => (row.cartType === C.CART_TYPES.RESTAURANT ? 'Restaurants' : row.cartType === C.CART_TYPES.STORE ? 'Store' : 'Both') },
          { label: 'Uses', align: 'right', value: (row) => store.coupons.usesOf(row.code) + '/' + (row.maxUsesPerUser || '∞') },
          { label: 'State', render: (row) => h('div', { class: 'fx-row fx-gap-2' }, [
            row.active === false ? h('span', { class: 'fx-badge fx-badge-danger', text: 'Inactive' }) : row.validTo && new Date(row.validTo).getTime() < Date.now() ? h('span', { class: 'fx-badge fx-badge-warning', text: 'Expired' }) : h('span', { class: 'fx-badge fx-badge-success', text: 'Live' }),
            row.demo !== false ? h('span', { class: 'fx-badge', text: 'Demo' }) : null,
          ].filter(Boolean)) },
          { label: '', align: 'right', render: (row) => h('div', { class: 'fx-row fx-gap-2' }, [
            h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Edit', onClick: () => openCouponEditor(row) }),
            h('button', { class: 'fx-btn fx-btn-ghost fx-btn-sm', type: 'button', text: row.active === false ? 'Activate' : 'Deactivate', onClick: async () => { await store.admin.saveCoupon({ code: row.code, active: row.active === false }); ui.notify.info(row.code + (row.active === false ? ' activated.' : ' deactivated.')); render(); } }),
          ]) },
        ],
        coupons,
        'No coupons configured yet.'
      )
    );

    mount.appendChild(
      h('p', { class: 'fx-xs fx-muted', style: { marginTop: '12px' }, text: 'Coupons marked “Demo” are seeded sample offers for this build. The customer UI shows the exact rejection reason (minimum spend, expiry, usage cap, category or restaurant restriction) instead of a generic failure.' })
    );
  }

  /* ----------------------------------------------------------- locations */

  function locationsSection(mount) {
    const cities = store.location.cities();
    const coverageOverrides = Object.assign({}, store.settings.get().cityCoverage || {});
    const feeOverrides = Object.assign({}, store.settings.get().cityDeliveryFee || {});

    mount.appendChild(
      h('div', { style: { padding: '20px 0 12px' } }, [
        h('h1', { class: 'fx-page-title', text: 'Cities & coverage' }),
        h('p', { class: 'fx-page-sub', text: 'Decide where Food Express accepts orders. “Not serviceable yet” blocks checkout for that city instead of pretending it is live.' }),
      ])
    );

    mount.appendChild(
      table(
        [
          { label: 'City', render: (row) => h('div', {}, [h('strong', { text: row.name }), h('div', { class: 'fx-xs fx-muted', text: row.state + ' · ' + (row.localities || []).length + ' localities · base ETA ' + row.etaMinutes + ' min' })]) },
          {
            label: 'Coverage',
            render: (row) =>
              h('select', {
                class: 'fx-select fx-select-sm',
                'aria-label': 'Coverage for ' + row.name,
                onChange: (event) => {
                  const next = Object.assign({}, coverageOverrides);
                  next[row.id] = event.target.value;
                  store.admin.saveSettings({ cityCoverage: next });
                  ui.notify.success(row.name + ' coverage set to “' + (FX.locations.COVERAGE_LABELS[event.target.value] || event.target.value) + '”.');
                  render();
                },
              }, Object.keys(C.COVERAGE).map((key) => {
                const value = C.COVERAGE[key];
                return h('option', { value, selected: row.coverage === value, text: FX.locations.COVERAGE_LABELS[value] || value });
              })),
          },
          {
            label: 'Delivery fee (₹)',
            align: 'right',
            render: (row) =>
              numberInput(typeof row.deliveryFee === 'number' ? row.deliveryFee : store.settings.get().deliveryFee, (value) => {
                const next = Object.assign({}, feeOverrides);
                next[row.id] = Math.max(0, value);
                store.admin.saveSettings({ cityDeliveryFee: next });
                ui.notify.info(row.name + ' delivery fee set to ' + money(Math.max(0, value)) + '.');
              }, { label: 'Delivery fee for ' + row.name }),
          },
          { label: 'Source', render: (row) => (row.overridden ? h('span', { class: 'fx-badge fx-badge-brand', text: 'Admin override' }) : h('span', { class: 'fx-xs fx-muted', text: 'Seeded' })) },
          {
            label: 'Localities',
            render: (row) => h('span', { class: 'fx-xs fx-muted', text: (row.localities || []).slice(0, 3).map((locality) => locality.name + ' ' + locality.pin).join(' · ') + ((row.localities || []).length > 3 ? ' …' : '') }),
          },
        ],
        cities,
        'No cities configured.'
      )
    );

    mount.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '16px' } }, [
        h('h2', { class: 'fx-section-title', text: 'Zones & serviceability' }),
        h('ul', { class: 'fx-list fx-small' }, [
          h('li', { text: 'Coverage and per-city delivery fees are stored in app settings, so the storefront, cart and checkout all read the same numbers.' }),
          h('li', { text: 'Localities and PIN codes come from the seeded location list; the location selector searches them and warns when a PIN maps to a city that is not serviceable.' }),
          h('li', { text: 'Surge pricing, if enabled in Business settings, is added on top of the city fee and is always itemised in the bill.' }),
        ]),
        h('div', { class: 'fx-btn-group', style: { marginTop: '10px' } }, [
          h('button', {
            class: 'fx-btn fx-btn-outline fx-btn-sm',
            type: 'button',
            text: 'Clear city overrides',
            onClick: async () => {
              const ok = await ui.confirmDialog({ title: 'Clear city overrides?', message: 'Coverage and delivery fees return to their seeded values for every city.', confirmLabel: 'Clear overrides', danger: true });
              if (!ok) return;
              await store.admin.saveSettings({ cityCoverage: {}, cityDeliveryFee: {} });
              ui.notify.success('City overrides cleared.');
              render();
            },
          }),
          h('button', { class: 'fx-btn fx-btn-ghost fx-btn-sm', type: 'button', text: 'Open location selector', onClick: () => FX.components.locationModal.open() }),
        ]),
      ])
    );
  }

  /* --------------------------------------------------------------- users */

  function usersSection(mount) {
    const accounts = (store.state.accounts || []).slice();
    const orders = store.orders.list();

    mount.appendChild(
      h('div', { style: { padding: '20px 0 12px' } }, [
        h('h1', { class: 'fx-page-title', text: 'Users' }),
        h('p', { class: 'fx-page-sub', text: accounts.length + ' accounts in this profile · passwords are stored as salted hashes, never in plain text.' }),
      ])
    );

    if (!accounts.length) {
      mount.appendChild(
        ui.emptyState({
          icon: '👥',
          title: 'No accounts yet',
          message: 'Register from the sign-up page, or seed the documented demo accounts from the sign-in page.',
          actions: [{ label: 'Open sign-in', href: 'login.html', variant: 'primary' }],
        })
      );
      return;
    }

    mount.appendChild(
      table(
        [
          { label: 'User', render: (row) => h('div', { class: 'fx-row fx-gap-2' }, [ui.avatar(row), h('div', {}, [h('strong', { text: row.name }), h('div', { class: 'fx-xs fx-muted', text: row.email + (row.phone ? ' · +91 ' + row.phone : '') })])]) },
          { label: 'Role', render: (row) => h('span', { class: 'fx-badge ' + (row.role === C.ROLES.ADMIN ? 'fx-badge-brand' : ''), text: row.role === C.ROLES.ADMIN ? 'Admin' : 'Customer' }) },
          { label: 'Joined', value: (row) => FX.u.formatDate(row.createdAt) },
          { label: 'Orders', align: 'right', value: (row) => String(orders.filter((order) => order.userId === row.id).length) },
          { label: 'Spend', align: 'right', value: (row) => money(orders.filter((order) => order.userId === row.id && order.status !== C.CANCELLED).reduce((sum, order) => sum + ((order.totals || {}).grandTotal || 0), 0)) },
          { label: 'Verified', render: (row) => h('span', { class: 'fx-xs fx-muted', text: (row.emailVerified ? 'email ✓' : 'email ✗') + ' · ' + (row.phoneVerified ? 'phone ✓' : 'phone ✗') }) },
        ],
        accounts,
        ''
      )
    );

    mount.appendChild(
      h('div', { class: 'fx-alert fx-alert-info', style: { marginTop: '16px' } }, [
        h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: 'ℹ️' }),
        h('div', { text: 'Role changes and account deletion are backend operations (PUT /api/admin/users/:id/role). This demo profile lists the locally stored accounts read-only; the API enforces the admin role check server-side, so hiding this page is never the only protection.' }),
      ])
    );
  }

  /* ------------------------------------------------------------ settings */

  function settingsSection(mount) {
    const settings = store.settings.get();
    const form = h('form', { class: 'fx-stack', novalidate: 'true' });

    const pricingCard = h('div', { class: 'fx-card fx-card-pad fx-stack' });
    pricingCard.appendChild(h('h2', { class: 'fx-section-title', text: 'Pricing & delivery rules' }));
    pricingCard.appendChild(
      h('p', { class: 'fx-small fx-muted', style: { margin: 0 }, text: 'These values drive every calculation in the cart, checkout, coupons and orders. The free-delivery threshold and delivery fee are configured here only — no page hard-codes them.' })
    );

    const pricingFields = {
      freeDeliveryThreshold: ui.field({ label: 'Free delivery above (₹)', name: 'freeDeliveryThreshold', type: 'number', value: String(settings.freeDeliveryThreshold), min: 0, required: true, hint: 'Compared against the eligible merchandise subtotal.' }),
      deliveryFee: ui.field({ label: 'Standard delivery fee (₹)', name: 'deliveryFee', type: 'number', value: String(settings.deliveryFee), min: 0, required: true }),
      packingFee: ui.field({ label: 'Restaurant packing charge (₹)', name: 'packingFee', type: 'number', value: String(settings.packingFee), min: 0 }),
      smallOrderFee: ui.field({ label: 'Small order fee (₹)', name: 'smallOrderFee', type: 'number', value: String(settings.smallOrderFee), min: 0 }),
      smallOrderFeeBelow: ui.field({ label: 'Small order fee applies below (₹)', name: 'smallOrderFeeBelow', type: 'number', value: String(settings.smallOrderFeeBelow), min: 0 }),
      minOrderValue: ui.field({ label: 'Minimum order value (₹)', name: 'minOrderValue', type: 'number', value: String(settings.minOrderValue), min: 0 }),
      lowStockThreshold: ui.field({ label: 'Low-stock threshold (units)', name: 'lowStockThreshold', type: 'number', value: String(settings.lowStockThreshold), min: 1 }),
      maxQuantityPerItem: ui.field({ label: 'Max quantity per line', name: 'maxQuantityPerItem', type: 'number', value: String(settings.maxQuantityPerItem), min: 1 }),
      defaultGstRate: ui.field({
        label: 'Default GST rate',
        name: 'defaultGstRate',
        type: 'select',
        value: String(settings.defaultGstRate),
        options: [0, 0.05, 0.12, 0.18, 0.28].map((rate) => ({ value: String(rate), label: Math.round(rate * 100) + '%' })),
      }),
      surgeFee: ui.field({ label: 'Demand surge fee (₹)', name: 'surgeFee', type: 'number', value: String(settings.surgeFee || 0), min: 0, hint: 'Set to 0 to disable surge pricing.' }),
    };
    pricingCard.appendChild(h('div', { class: 'fx-form-grid' }, Object.keys(pricingFields).map((key) => pricingFields[key])));
    pricingCard.appendChild(h('label', { class: 'fx-check' }, [h('input', { type: 'checkbox', name: 'taxInclusive', checked: settings.taxInclusive }), h('span', { text: 'Prices already include GST (shown as “GST incl.” in the bill)' })]));
    pricingCard.appendChild(h('label', { class: 'fx-check' }, [h('input', { type: 'checkbox', name: 'enforceRestaurantMinOrder', checked: settings.enforceRestaurantMinOrder }), h('span', { text: 'Enforce per-restaurant minimum order value' })]));
    form.appendChild(pricingCard);

    const loyaltyCard = h('div', { class: 'fx-card fx-card-pad fx-stack' });
    loyaltyCard.appendChild(h('h2', { class: 'fx-section-title', text: 'Loyalty programme' }));
    const loyaltyFields = {
      earnRate: ui.field({ label: 'Earn rate (fraction of merchandise value)', name: 'earnRate', type: 'number', step: '0.01', value: String(settings.loyalty.earnRate), min: 0, max: 1 }),
      pointValue: ui.field({ label: 'Value per point (₹)', name: 'pointValue', type: 'number', step: '0.05', value: String(settings.loyalty.pointValue), min: 0 }),
      minRedeemPoints: ui.field({ label: 'Minimum points to redeem', name: 'minRedeemPoints', type: 'number', value: String(settings.loyalty.minRedeemPoints), min: 0 }),
      maxRedeemPercent: ui.field({ label: 'Max redemption (fraction of order)', name: 'maxRedeemPercent', type: 'number', step: '0.05', value: String(settings.loyalty.maxRedeemPercent), min: 0, max: 1 }),
    };
    loyaltyCard.appendChild(h('div', { class: 'fx-form-grid' }, Object.keys(loyaltyFields).map((key) => loyaltyFields[key])));
    form.appendChild(loyaltyCard);

    const featuresCard = h('div', { class: 'fx-card fx-card-pad fx-stack' });
    featuresCard.appendChild(h('h2', { class: 'fx-section-title', text: 'Feature flags' }));
    featuresCard.appendChild(h('p', { class: 'fx-small fx-muted', style: { margin: 0 }, text: 'Anything switched off here is hidden or blocked in the storefront — the UI never claims a capability that is not implemented.' }));
    const featureLabels = {
      guestCheckout: 'Allow guest checkout',
      demoPayments: 'Allow the labelled demo payment method',
      codPayments: 'Allow cash on delivery',
      upiPayments: 'UPI payments (requires a gateway on the server)',
      cardPayments: 'Card payments (requires a gateway on the server)',
      walletPayments: 'Wallet payments (requires a gateway on the server)',
      liveGpsTracking: 'Live GPS tracking (not implemented — keep off)',
      reviewsEnabled: 'Customer reviews & verified ratings (not implemented — keep off)',
      referralProgramme: 'Referral programme (not implemented — keep off)',
    };
    Object.keys(featureLabels).forEach((key) => {
      featuresCard.appendChild(
        h('label', { class: 'fx-switch-row' }, [
          h('input', { type: 'checkbox', name: 'feature-' + key, checked: Boolean(settings.features[key]) }),
          h('span', { class: 'fx-switch-track', 'aria-hidden': 'true' }, [h('span', { class: 'fx-switch-thumb' })]),
          h('span', {}, [h('span', { class: 'fx-switch-label', text: featureLabels[key] }), h('span', { class: 'fx-switch-hint', text: settings.features[key] ? 'Enabled' : 'Disabled' })]),
        ])
      );
    });
    form.appendChild(featuresCard);

    const tipCard = h('div', { class: 'fx-card fx-card-pad fx-stack' });
    tipCard.appendChild(h('h2', { class: 'fx-section-title', text: 'Tips & disclaimer' }));
    tipCard.appendChild(ui.field({ label: 'Tip presets (comma separated ₹)', name: 'tipOptions', value: (settings.tipOptions || []).join(', '), hint: 'Shown at checkout. Tips are excluded from the free-delivery threshold calculation.' }));
    tipCard.appendChild(ui.field({ label: 'Storefront disclaimer', name: 'disclaimer', type: 'textarea', rows: 3, value: settings.disclaimer || '' }));
    form.appendChild(tipCard);

    const actions = h('div', { class: 'fx-btn-group fx-wrap' }, [
      h('button', { class: 'fx-btn fx-btn-primary', type: 'submit', text: 'Save settings' }),
      h('button', {
        class: 'fx-btn fx-btn-ghost',
        type: 'button',
        text: 'Reset to seeded defaults',
        onClick: async () => {
          const ok = await ui.confirmDialog({ title: 'Reset business settings?', message: 'Threshold, fees, loyalty rules, feature flags and city overrides return to the seeded defaults.', confirmLabel: 'Reset settings', danger: true });
          if (!ok) return;
          store.settings.reset();
          ui.notify.success('Settings reset to defaults.');
          render();
        },
      }),
    ]);
    form.appendChild(actions);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = ui.formValues(form);
      const threshold = Math.max(0, Math.round(Number(values.freeDeliveryThreshold)));
      const features = {};
      Object.keys(featureLabels).forEach((key) => { features[key] = Boolean(values['feature-' + key]); });
      const patch = {
        freeDeliveryThreshold: threshold,
        deliveryFee: Math.max(0, Math.round(Number(values.deliveryFee))),
        packingFee: Math.max(0, Math.round(Number(values.packingFee))),
        smallOrderFee: Math.max(0, Math.round(Number(values.smallOrderFee))),
        smallOrderFeeBelow: Math.max(0, Math.round(Number(values.smallOrderFeeBelow))),
        minOrderValue: Math.max(0, Math.round(Number(values.minOrderValue))),
        lowStockThreshold: Math.max(1, Math.round(Number(values.lowStockThreshold))),
        maxQuantityPerItem: Math.max(1, Math.round(Number(values.maxQuantityPerItem))),
        defaultGstRate: Number(values.defaultGstRate),
        surgeFee: Math.max(0, Math.round(Number(values.surgeFee || 0))),
        taxInclusive: Boolean(values.taxInclusive),
        enforceRestaurantMinOrder: Boolean(values.enforceRestaurantMinOrder),
        loyalty: {
          earnRate: Math.min(1, Math.max(0, Number(values.earnRate))),
          pointValue: Math.max(0, Number(values.pointValue)),
          minRedeemPoints: Math.max(0, Math.round(Number(values.minRedeemPoints))),
          maxRedeemPercent: Math.min(1, Math.max(0, Number(values.maxRedeemPercent))),
        },
        tipOptions: values.tipOptions.split(',').map((entry) => Math.max(0, Math.round(Number(entry)))).filter((entry) => !Number.isNaN(entry)),
        disclaimer: values.disclaimer,
        features,
      };
      try {
        await store.admin.saveSettings(patch);
        ui.notify.success('Settings saved — free delivery now unlocks at ' + money(patch.freeDeliveryThreshold) + ' with a ' + money(patch.deliveryFee) + ' fee below it.');
        render();
      } catch (err) {
        ui.notify.error(err.message || 'Could not save settings.');
      }
    });

    mount.appendChild(
      h('div', { style: { padding: '20px 0 12px' } }, [
        h('h1', { class: 'fx-page-title', text: 'Business settings' }),
        h('p', { class: 'fx-page-sub', text: 'One source of truth for the money rules. The storefront, cart, checkout and backend all read these values.' }),
      ])
    );
    mount.appendChild(form);

    mount.appendChild(
      h('div', { class: 'fx-card fx-card-pad', style: { marginTop: '16px' } }, [
        h('h2', { class: 'fx-section-title', text: 'Automatic offers' }),
        (settings.autoOffers || []).length
          ? h('ul', { class: 'fx-list fx-small' }, settings.autoOffers.map((offer) =>
              h('li', {
                text:
                  offer.name +
                  ' — ' +
                  (offer.kind === 'free_delivery' ? 'waives the delivery fee' : offer.kind === 'flat' ? money(offer.value) + ' off' : (offer.value || 0) + '% off') +
                  ' on eligible subtotals above ' + money(offer.minSubtotal) +
                  (offer.stacksWithCoupon ? ' · stacks with coupons' : ' · keeps whichever saves more vs a coupon') +
                  (offer.active === false ? ' · currently disabled' : ''),
              })
            ))
          : h('p', { class: 'fx-small fx-muted', text: 'No automatic offers configured.' }),
        h('p', { class: 'fx-xs fx-muted', style: { marginTop: '10px' }, text: 'Automatic offers are defined in shared/settings.js and applied by the pricing engine. When an offer does not stack with a coupon, the engine keeps whichever saves the customer more.' }),
      ])
    );
  }

  /* --------------------------------------------------------------- render */

  function notAuthorised(mount) {
    mount.appendChild(
      ui.emptyState({
        icon: '🔒',
        title: 'Administrator access required',
        message: 'This dashboard is restricted to accounts with the admin role. Sign in with an admin account to continue — the role is enforced by the API, not just by this page.',
        actions: [
          { label: 'Sign in as admin', href: 'login.html?next=admin.html', variant: 'primary' },
          { label: 'Back to storefront', href: 'index.html', variant: 'outline' },
        ],
      })
    );
  }

  async function render() {
    const mount = $('#page-mount');
    if (!mount) return;
    clear(mount);

    if (!store.auth.isAdmin()) {
      notAuthorised(mount);
      return;
    }

    document.title = (SECTIONS.find((entry) => entry.id === section) || {}).label + ' · Admin · Food Express';

    const shell = h('div', { class: 'fx-admin-shell' });
    const nav = h('nav', { class: 'fx-admin-nav', 'aria-label': 'Admin sections' });
    SECTIONS.forEach((entry) => {
      nav.appendChild(
        h('button', {
          class: 'fx-admin-nav-item' + (entry.id === section ? ' is-active' : ''),
          type: 'button',
          'aria-current': entry.id === section ? 'page' : null,
          onClick: () => selectSection(entry.id),
        }, [h('span', { 'aria-hidden': 'true', text: entry.emoji }), h('span', { text: entry.label })])
      );
    });
    const content = h('div', { class: 'fx-admin-content' });
    content.appendChild(ui.spinner('Loading admin data…'));
    shell.appendChild(nav);
    shell.appendChild(content);
    mount.appendChild(shell);

    try {
      clear(content);
      switch (section) {
        case 'orders':
          ordersSection(content);
          break;
        case 'products':
          productsSection(content);
          break;
        case 'inventory':
          inventorySection(content);
          break;
        case 'restaurants':
          restaurantsSection(content);
          break;
        case 'coupons':
          couponsSection(content);
          break;
        case 'locations':
          locationsSection(content);
          break;
        case 'users':
          usersSection(content);
          break;
        case 'settings':
          settingsSection(content);
          break;
        default:
          await overviewSection(content);
      }
    } catch (err) {
      clear(content);
      content.appendChild(ui.errorState(err.message || 'Could not load the admin dashboard.', () => render()));
    }
  }

  FX.pages = FX.pages || {};
  FX.pages.admin = { render, selectSection };

  FX.app.onReady(() => {
    render();
    FX.bus.on('auth:changed', render);
    FX.bus.on('order:placed', () => { if (section === 'orders' || section === 'overview') render(); });
    FX.bus.on('order:updated', () => { if (section === 'orders' || section === 'overview') render(); });
    FX.bus.on('catalog:changed', () => { if (['products', 'inventory', 'restaurants', 'coupons', 'overview'].indexOf(section) !== -1) render(); });
    FX.bus.on('settings:changed', () => { if (section === 'settings' || section === 'locations' || section === 'overview') render(); });
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

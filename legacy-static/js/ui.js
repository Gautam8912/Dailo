/**
 * Food Express — js/ui.js
 * Reusable UI primitives: toasts, modals, drawers, skeletons, empty states,
 * product cards, quantity steppers, rating chips and small render helpers.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, $$, clear, money, escapeHtml } = FX.u;
  const store = FX.store;
  const bus = FX.bus;

  /* ------------------------------ Icons -------------------------------- */
  /* Inline SVG keeps the app dependency-free and iconography consistent. */

  const ICONS = {
    search: '<path d="M21 21l-4.3-4.3M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"/>',
    cart: '<path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
    heart: '<path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0112 8a4.2 4.2 0 017 2.7C19 15.6 12 20 12 20z"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0115 0"/>',
    pin: '<path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    bell: '<path d="M18 15V10a6 6 0 10-12 0v5l-1.5 2.5h15L18 15z"/><path d="M10 20a2 2 0 004 0"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    bolt: '<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-6.2-6.2a2 2 0 01-.6-1.6l.5-6.4A2 2 0 016.3 4.6l6.4-.5a2 2 0 011.6.6l6.3 6.3a2 2 0 010 2.4z"/><circle cx="9" cy="9" r="1.3"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9 6.7 19.7l1.1-5.9L3.5 9.7l5.9-.8L12 3.5z"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    home: '<path d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8z"/>',
    bag: '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
    box: '<path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3z"/><path d="M4 7.2l8 4.3 8-4.3M12 11.5V21"/>',
    store: '<path d="M4 9h16v11H4z"/><path d="M4 9l1.5-5h13L20 9"/><path d="M9 20v-6h6v6"/>',
    truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 12.5h2.5"/><path d="M3 10h18"/>',
    logout: '<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2v.2a2 2 0 11-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 004 15a2 2 0 01-2-1.7 2 2 0 012-1.7 1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0011 4.6a2 2 0 013.4-1.4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14.5 5.5l4 4"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 6.3"/><path d="M20 5v6h-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 4l9 16H3l9-16z"/><path d="M12 10v4M12 17h.01"/>',
    shield: '<path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 13h16M12 9v11"/><path d="M12 9S10.5 5 8.5 5a2 2 0 000 4H12zM12 9s1.5-4 3.5-4a2 2 0 010 4H12z"/>',
    leaf: '<path d="M5 19c0-8 6-13 14-13 0 8-5 13-12 13H5z"/><path d="M5 19l7-7"/>',
  };

  function icon(name, className) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', className || 'fx-ic');
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }

  /* ------------------------------ Toasts -------------------------------- */

  let toastStack = null;

  function ensureToastStack() {
    if (toastStack && document.body.contains(toastStack)) return toastStack;
    toastStack = h('div', { class: 'fx-toast-stack', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(toastStack);
    return toastStack;
  }

  const TOAST_ICONS = { success: '✅', error: '⛔', warning: '⚠️', info: 'ℹ️' };

  function toast(message, options) {
    const opts = options || {};
    const variant = opts.variant || (opts.type || 'info');
    const stack = ensureToastStack();
    const duration = opts.duration || (variant === 'error' ? 6000 : 3400);

    const el = h('div', { class: 'fx-toast fx-toast-' + variant, role: variant === 'error' ? 'alert' : 'status' }, [
      h('span', { class: 'fx-toast-icon', 'aria-hidden': 'true', text: TOAST_ICONS[variant] || 'ℹ️' }),
      h('div', { class: 'fx-toast-body' }, [
        opts.title ? h('div', { class: 'fx-toast-title', text: opts.title }) : null,
        h('div', { class: 'fx-toast-msg', html: typeof message === 'string' ? escapeHtml(message) : '' }),
      ]),
      opts.action && opts.action.label
        ? h('button', {
            class: 'fx-toast-action',
            type: 'button',
            text: opts.action.label,
            onClick: () => {
              close();
              opts.action.onClick();
            },
          })
        : null,
      h('button', { class: 'fx-toast-close', type: 'button', 'aria-label': 'Dismiss notification', html: '&times;', onClick: close }),
    ]);

    if (typeof message !== 'string') {
      el.querySelector('.fx-toast-msg').textContent = '';
      el.querySelector('.fx-toast-msg').appendChild(message);
    }

    let timer = global.setTimeout(close, duration);
    el.addEventListener('mouseenter', () => global.clearTimeout(timer));
    el.addEventListener('mouseleave', () => {
      timer = global.setTimeout(close, 1200);
    });

    function close() {
      global.clearTimeout(timer);
      if (!el.parentNode) return;
      el.classList.add('is-leaving');
      global.setTimeout(() => el.remove(), 200);
    }

    stack.appendChild(el);
    while (stack.children.length > 4) stack.removeChild(stack.firstChild);
    return { close };
  }

  const notify = {
    success: (message, options) => toast(message, Object.assign({ variant: 'success' }, options)),
    error: (message, options) => toast(message, Object.assign({ variant: 'error' }, options)),
    warning: (message, options) => toast(message, Object.assign({ variant: 'warning' }, options)),
    info: (message, options) => toast(message, Object.assign({ variant: 'info' }, options)),
  };

  /* ------------------------------ Modals -------------------------------- */

  const openLayers = [];

  function modal(options) {
    const opts = options || {};
    const backdrop = h('div', { class: 'fx-modal-backdrop', role: 'presentation' });
    const panel = h('div', {
      class: 'fx-modal' + (opts.size === 'wide' ? ' fx-modal-wide' : ''),
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': opts.title || 'Dialog',
    });

    const titleEl = opts.title ? h(opts.titleTag || 'h2', { text: opts.title }) : null;
    const closeBtn = h(
      'button',
      { class: 'fx-modal-close', type: 'button', 'aria-label': 'Close dialog', onClick: () => close() },
      [icon('close')]
    );

    if (opts.title || opts.dismissible !== false) {
      panel.appendChild(h('div', { class: 'fx-modal-head' }, [titleEl, opts.dismissible === false ? null : closeBtn]));
    }
    const body = h('div', { class: 'fx-modal-body' });
    if (typeof opts.content === 'string') body.innerHTML = opts.content;
    else if (opts.content instanceof global.Node) body.appendChild(opts.content);
    else if (Array.isArray(opts.content)) opts.content.forEach((child) => body.appendChild(child));
    panel.appendChild(body);

    let foot = null;
    if (opts.actions && opts.actions.length) {
      foot = h('div', { class: 'fx-modal-foot' });
      opts.actions.forEach((action) => {
        foot.appendChild(
          h(
            'button',
            {
              class: 'fx-btn ' + (action.variant ? 'fx-btn-' + action.variant : 'fx-btn-ghost'),
              type: 'button',
              text: action.label,
              onClick: () => {
                if (action.onClick) action.onClick(close, body);
                else close();
              },
            }
          )
        );
      });
      panel.appendChild(foot);
    }

    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    const previouslyFocused = document.activeElement;
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop && opts.dismissible !== false) close();
    });

    function onKeydown(event) {
      if (event.key === 'Escape' && opts.dismissible !== false) {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', panel);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeydown);

    function close() {
      document.removeEventListener('keydown', onKeydown);
      backdrop.remove();
      const stillOpen = openLayers.some((layer) => layer !== close && document.body.contains(layer.el));
      if (!stillOpen) document.body.style.overflow = '';
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      if (opts.onClose) opts.onClose();
    }

    openLayers.push({ el: backdrop, close });
    global.setTimeout(() => {
      const focusTarget = opts.focus ? $(opts.focus, panel) : $('input,select,textarea,button.fx-btn-primary', panel) || closeBtn;
      if (focusTarget && focusTarget.focus) focusTarget.focus();
    }, 40);

    return { close, panel, body, foot, backdrop };
  }

  function confirmDialog(options) {
    const opts = options || {};
    return new Promise((resolve) => {
      let settled = false;
      const instance = modal({
        title: opts.title || 'Please confirm',
        content: h('div', { class: 'fx-stack' }, [
          h('p', { class: 'fx-muted', style: { margin: 0 }, text: opts.message || 'Are you sure?' }),
          opts.detail ? h('div', { class: 'fx-alert fx-alert-info' }, [h('span', { class: 'fx-alert-icon', text: 'ℹ️' }), h('div', { text: opts.detail })]) : null,
        ]),
        actions: [
          {
            label: opts.cancelLabel || 'Cancel',
            variant: 'ghost',
            onClick: (close) => {
              settled = true;
              close();
              resolve(false);
            },
          },
          {
            label: opts.confirmLabel || 'Confirm',
            variant: opts.danger ? 'danger' : 'primary',
            onClick: (close) => {
              settled = true;
              close();
              resolve(true);
            },
          },
        ],
        onClose: () => {
          if (!settled) resolve(false);
        },
      });
      return instance;
    });
  }

  /**
   * Single-field prompt dialog. Resolves the trimmed string, or null when dismissed.
   * Used for cancellation reasons, feedback notes and short admin inputs.
   */
  function promptDialog(options) {
    const opts = options || {};
    return new Promise((resolve) => {
      let settled = false;
      const input = h(opts.multiline ? 'textarea' : 'input', {
        class: opts.multiline ? 'fx-textarea' : 'fx-input',
        type: opts.multiline ? undefined : opts.type || 'text',
        id: 'fx-prompt-' + FX.u.uid('p'),
        placeholder: opts.placeholder || '',
        value: opts.value || '',
        'aria-label': opts.label || opts.title || 'Input',
      });
      if (opts.multiline) input.rows = opts.rows || 4;
      const errorEl = h('p', { class: 'fx-field-error', role: 'alert', hidden: true });

      const fieldWrap = h('div', { class: 'fx-field' }, [
        opts.label ? h('label', { class: 'fx-label', for: input.id, text: opts.label }) : null,
        input,
        errorEl,
        opts.hint ? h('p', { class: 'fx-hint', text: opts.hint }) : null,
      ]);

      function submit(close) {
        const value = String(input.value || '').trim();
        if (opts.required && !value) {
          errorEl.hidden = false;
          errorEl.textContent = opts.requiredMessage || 'This field is required.';
          input.focus();
          return;
        }
        if (opts.maxLength && value.length > opts.maxLength) {
          errorEl.hidden = false;
          errorEl.textContent = 'Please keep it under ' + opts.maxLength + ' characters.';
          input.focus();
          return;
        }
        settled = true;
        close();
        resolve(value);
      }

      const instance = modal({
        title: opts.title || 'Please enter a value',
        content: h('div', { class: 'fx-stack' }, [
          opts.message ? h('p', { class: 'fx-muted fx-small', style: { margin: 0 }, text: opts.message }) : null,
          fieldWrap,
        ]),
        actions: [
          {
            label: opts.cancelLabel || 'Cancel',
            variant: 'ghost',
            onClick: (close) => {
              settled = true;
              close();
              resolve(null);
            },
          },
          { label: opts.confirmLabel || 'Save', variant: opts.danger ? 'danger' : 'primary', onClick: submit },
        ],
        onClose: () => {
          if (!settled) resolve(null);
        },
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !opts.multiline) {
          event.preventDefault();
          const buttons = instance.foot ? instance.foot.querySelectorAll('button') : [];
          const confirmBtn = buttons[buttons.length - 1];
          if (confirmBtn) confirmBtn.click();
        }
      });
      setTimeout(() => input.focus(), 60);
      return instance;
    });
  }

  function drawer(options) {
    const opts = options || {};
    const backdrop = h('div', { class: 'fx-drawer-backdrop', role: 'presentation' });
    const panel = h('div', {
      class: 'fx-drawer',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': opts.title || 'Panel',
    });
    const body = h('div', { class: 'fx-drawer-body' });
    const foot = h('div', { class: 'fx-drawer-foot' });

    panel.appendChild(
      h('div', { class: 'fx-drawer-head' }, [
        h('h3', { style: { margin: 0 }, text: opts.title || '' }),
        h('button', { class: 'fx-modal-close', type: 'button', 'aria-label': 'Close panel', onClick: () => close() }, [icon('close')]),
      ])
    );
    panel.appendChild(body);
    if (opts.footer) panel.appendChild(foot);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) close();
    });
    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }
    document.addEventListener('keydown', onKeydown);
    function close() {
      document.removeEventListener('keydown', onKeydown);
      backdrop.remove();
      if (!openLayers.some((layer) => document.body.contains(layer.el))) document.body.style.overflow = '';
      if (opts.onClose) opts.onClose();
    }
    openLayers.push({ el: backdrop, close });
    return { close, body, foot, panel };
  }

  /* ----------------------------- Skeletons ------------------------------ */

  function productSkeleton() {
    return h('div', { class: 'fx-skel-card', 'aria-hidden': 'true' }, [
      h('div', { class: 'fx-skeleton fx-skel-media' }),
      h('div', { class: 'fx-skeleton fx-skel-line fx-skel-line-lg' }),
      h('div', { class: 'fx-skeleton fx-skel-line fx-skel-line-sm' }),
      h('div', { class: 'fx-skeleton fx-skel-line' }),
      h('div', { class: 'fx-skeleton fx-skel-btn' }),
    ]);
  }

  function gridSkeleton(count, container) {
    const target = container || document.body;
    const grid = h('div', { class: 'fx-product-grid' });
    for (let i = 0; i < (count || 8); i += 1) grid.appendChild(productSkeleton());
    target.appendChild(grid);
    return grid;
  }

  function railSkeleton(count, container) {
    const target = container || document.body;
    const rail = h('div', { class: 'fx-rail' });
    for (let i = 0; i < (count || 6); i += 1) rail.appendChild(productSkeleton());
    target.appendChild(rail);
    return rail;
  }

  function bannerSkeleton(container) {
    const target = container || document.body;
    const el = h('div', { class: 'fx-skeleton fx-skel-banner' });
    target.appendChild(el);
    return el;
  }

  function spinner(label) {
    return h('div', { class: 'fx-loading-block', role: 'status' }, [
      h('div', { class: 'fx-spinner fx-spinner-lg' }),
      label ? h('p', { class: 'fx-muted fx-small', style: { margin: 0 }, text: label }) : null,
    ]);
  }

  /* ---------------------------- Empty states ---------------------------- */

  function emptyState(options) {
    const opts = options || {};
    return h('div', { class: 'fx-empty' }, [
      h('div', { class: 'fx-empty-icon', 'aria-hidden': 'true', text: opts.icon || '🔍' }),
      h('h3', { text: opts.title || 'Nothing here yet' }),
      opts.message ? h('p', { text: opts.message }) : null,
      opts.actions && opts.actions.length
        ? h(
            'div',
            { class: 'fx-btn-group' },
            opts.actions.map((action) =>
              h(
                action.href ? 'a' : 'button',
                Object.assign(
                  {
                    class: 'fx-btn ' + (action.variant ? 'fx-btn-' + action.variant : 'fx-btn-outline'),
                    text: action.label,
                    type: action.href ? undefined : 'button',
                    onClick: action.onClick,
                  },
                  action.href ? { href: action.href } : {}
                )
              )
            )
          )
        : null,
    ]);
  }

  function errorState(message, onRetry) {
    return h('div', { class: 'fx-empty' }, [
      h('div', { class: 'fx-empty-icon', 'aria-hidden': 'true', text: '📡' }),
      h('h3', { text: 'Something went wrong' }),
      h('p', { text: message || 'We could not load this section.' }),
      onRetry
        ? h('div', { class: 'fx-btn-group' }, [
            h('button', { class: 'fx-btn fx-btn-primary', type: 'button', onClick: onRetry }, [icon('refresh', 'fx-ic fx-ic-sm'), 'Retry']),
          ])
        : null,
    ]);
  }

  /* --------------------------- Rating & badges --------------------------- */

  function ratingChip(item, options) {
    const opts = options || {};
    if (!item || !item.rating) {
      return h('span', { class: 'fx-badge', text: opts.emptyLabel || 'No ratings yet' });
    }
    const cls = item.rating >= 4.2 ? 'fx-rating-good' : item.rating >= 3.5 ? 'fx-rating-mid' : '';
    const chip = h('span', {
      class: 'fx-rating fx-rating-demo ' + cls,
      title: 'Demo merchandising rating — not a verified customer rating.',
    }, [
      h('span', { 'aria-hidden': 'true', text: '★' }),
      h('span', { text: Number(item.rating).toFixed(1) }),
    ]);
    if (opts.withCount && item.reviewCount) chip.appendChild(h('span', { class: 'fx-muted-2', text: '(' + item.reviewCount + ')' }));
    return chip;
  }

  function discountBadge(item) {
    if (!item || !item.discountPercent) return null;
    return h('span', { class: 'fx-badge fx-badge-accent', text: item.discountPercent + '% OFF' });
  }

  function stockBadge(item) {
    if (!item) return null;
    if (item.stock <= 0) return h('span', { class: 'fx-badge fx-badge-danger', text: 'Out of stock' });
    if (item.stock <= (store.settings.get().lowStockThreshold || 10)) {
      return h('span', { class: 'fx-badge fx-badge-warning', text: 'Only ' + item.stock + ' left' });
    }
    return null;
  }

  /* --------------------------- Product card ----------------------------- */

  /**
   * ProductCard. The card body links to the product page; the Add button is a
   * separate control so clicking the card never adds to cart by accident.
   */
  function productCard(item, options) {
    const opts = options || {};
    const product = item;
    const href = FX.url(product.type === 'menu-item' ? 'restaurant' : 'product', {
      id: product.type === 'menu-item' ? product.restaurantId : product.id,
      item: product.type === 'menu-item' ? product.id : undefined,
    });
    const eta = store.location.etaLabel(product.handlingMinutes);
    const inWishlist = store.wishlist.has(product.id);
    const line = store.cart.lineFor(product.id);

    const card = h('article', {
      class: 'fx-product-card' + (product.stock <= 0 ? ' is-oos' : ''),
      dataset: { id: product.id },
    });

    const flags = h('div', { class: 'fx-product-flags' }, [
      discountBadge(product),
      product.veg === true ? h('span', { class: 'fx-diet', title: 'Vegetarian', role: 'img', 'aria-label': 'Vegetarian' }) : null,
      product.veg === false ? h('span', { class: 'fx-diet fx-diet-nonveg', title: 'Non-vegetarian', role: 'img', 'aria-label': 'Non-vegetarian' }) : null,
    ].filter(Boolean));

    const mediaLink = h('a', { class: 'fx-product-media', href, 'aria-label': product.name + ' — view details' }, [
      FX.media.img(product, { alt: product.name }),
      flags,
      product.stock <= 0 ? h('div', { class: 'fx-oos-flag', text: 'Out of stock' }) : null,
    ]);

    const wish = h(
      'button',
      {
        class: 'fx-product-wish',
        type: 'button',
        'aria-pressed': inWishlist ? 'true' : 'false',
        'aria-label': (inWishlist ? 'Remove ' : 'Save ') + product.name + (inWishlist ? ' from' : ' to') + ' wishlist',
        title: inWishlist ? 'Remove from wishlist' : 'Save to wishlist',
        onClick: (event) => {
          event.preventDefault();
          event.stopPropagation();
          const result = store.wishlist.toggle(product.id);
          wish.setAttribute('aria-pressed', result.added ? 'true' : 'false');
          wish.innerHTML = result.added ? '♥' : '♡';
          notify.info(result.added ? product.name + ' saved to wishlist' : product.name + ' removed from wishlist');
          bus.emit('wishlist:changed', {});
        },
      },
      [document.createTextNode(inWishlist ? '♥' : '♡')]
    );
    mediaLink.appendChild(wish);
    card.appendChild(mediaLink);

    card.appendChild(
      h('div', { class: 'fx-product-body' }, [
        opts.hideEta
          ? null
          : h('div', { class: 'fx-product-eta' }, [
              h('span', { 'aria-hidden': 'true', text: '⚡' }),
              h('span', { text: product.type === 'menu-item' ? 'Ready in ' + FX.u.etaLabel(product.prepMinutes || 12) : eta }),
            ]),
        h('h3', { class: 'fx-product-name' }, [h('a', { href, text: product.name })]),
        h('div', { class: 'fx-product-unit', text: product.unit || '' }),
        h('div', { class: 'fx-product-price-row' }, [
          h('span', { class: 'fx-product-price', text: money(product.price) }),
          product.mrp > product.price ? h('span', { class: 'fx-product-mrp', text: money(product.mrp) }) : null,
          product.discountPercent ? h('span', { class: 'fx-product-off', text: product.discountPercent + '% off' }) : null,
        ]),
      ].filter(Boolean))
    );

    const actions = h('div', { class: 'fx-product-actions' });
    actions.appendChild(addButton(product, { block: true, line }));
    card.appendChild(actions);
    return card;
  }

  /**
   * Add-to-cart button that becomes a quantity stepper once the item is in the
   * cart. Exactly one unit per click; a second click on the same product makes
   * quantity 2 on the SAME line.
   */
  function addButton(product, options) {
    const opts = options || {};
    const line = opts.line || store.cart.lineFor(product.id);
    if (product.stock <= 0) {
      return h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm' + (opts.block ? ' fx-btn-block' : ''), type: 'button', disabled: true, text: 'Out of stock' });
    }
    if (!line) {
      return h(
        'button',
        {
          class: 'fx-btn fx-btn-soft fx-btn-sm' + (opts.block ? ' fx-btn-block' : ''),
          type: 'button',
          'data-add': product.id,
          'aria-label': 'Add ' + product.name + ' to cart',
          onClick: (event) => {
            event.preventDefault();
            event.stopPropagation();
            handleAdd(product, 1, event.currentTarget);
          },
        },
        ['ADD']
      );
    }
    return quantityStepper(line, { size: opts.size || 'sm', block: opts.block });
  }

  function quantityStepper(line, options) {
    const opts = options || {};
    const wrap = h('div', {
      class: 'fx-qty' + (opts.size === 'sm' ? ' fx-qty-sm' : '') + (opts.block ? ' fx-qty-block' : ''),
      role: 'group',
      'aria-label': 'Quantity for ' + line.name,
    });
    const value = h('output', { class: 'fx-qty-value', 'aria-live': 'polite', text: String(line.qty) });
    const minus = h(
      'button',
      {
        type: 'button',
        'aria-label': 'Decrease quantity of ' + line.name,
        onClick: () => handleDecrement(line, wrap, value, minus, plus, opts),
      },
      [icon('minus', 'fx-ic fx-ic-sm')]
    );
    const plus = h(
      'button',
      {
        type: 'button',
        'aria-label': 'Increase quantity of ' + line.name,
        onClick: () => {
          const result = store.cart.increment(line.key);
          if (!result.ok) {
            notify.warning(result.reason || 'No more stock available.');
            return;
          }
          syncQty();
          bus.emit('cart:line-updated', result.line);
        },
      },
      [icon('plus', 'fx-ic fx-ic-sm')]
    );

    function syncQty() {
      const current = store.cart.findLine(line.key);
      if (!current) {
        wrap.remove();
        return;
      }
      value.textContent = String(current.qty);
      plus.disabled = current.qty >= current.maxQty;
      minus.setAttribute('aria-label', current.qty === 1 ? 'Remove ' + current.name + ' from cart' : 'Decrease quantity of ' + current.name);
    }
    syncQty();
    wrap.appendChild(minus);
    wrap.appendChild(value);
    wrap.appendChild(plus);
    return wrap;
  }

  async function handleDecrement(line, wrap, value, minus, plus, opts) {
    const current = store.cart.findLine(line.key);
    if (!current) return;
    if (current.qty <= 1) {
      // Consistent, explicit removal: confirm, then remove the line.
      const confirmed = await confirmDialog({
        title: 'Remove ' + current.name + '?',
        message: 'This will remove the item from your cart.',
        confirmLabel: 'Remove item',
        cancelLabel: 'Keep it',
        danger: true,
      });
      if (!confirmed) return;
      store.cart.remove(current.key);
      notify.info(current.name + ' removed from cart', {
        action: { label: 'Undo', onClick: () => undoRemove(current) },
      });
      return;
    }
    store.cart.decrement(current.key);
    const after = store.cart.findLine(line.key);
    if (after) {
      value.textContent = String(after.qty);
      plus.disabled = after.qty >= after.maxQty;
    }
  }

  function undoRemove(line) {
    const item = store.catalog.product(line.itemId);
    if (!item) return;
    store.cart.add(item, { qty: line.qty, selection: line.selection, forceSwitch: true });
    notify.success('Item restored to your cart');
  }

  /** Shared add-to-cart handler used by cards, PDP and menu rows. */
  async function handleAdd(product, qty, buttonEl, extra) {
    const options = Object.assign({ qty: qty || 1 }, extra || {});
    let result = store.cart.add(product, options);

    if (result.needsSwitch) {
      const confirmed = await confirmDialog({
        title: 'Start a new cart?',
        message: result.conflict.message,
        detail: 'Your current cart items will be removed. You can reorder them later from Order history.',
        confirmLabel: 'Replace cart',
        cancelLabel: 'Keep current cart',
        danger: true,
      });
      if (!confirmed) {
        notify.info('Kept your current cart.', { variant: 'info' });
        return null;
      }
      result = store.cart.add(product, Object.assign({}, options, { forceSwitch: true }));
    }

    if (!result.ok) {
      notify.error(result.reason || 'Could not add that item to your cart.');
      return null;
    }

    if (result.capped) notify.warning('Stock limit reached — ' + result.line.maxQty + ' is the maximum available.');
    else notify.success('Added to cart · ' + product.name + ' × ' + result.line.qty, {
      variant: 'success',
      action: { label: 'View cart', onClick: () => FX.components.cartDrawer.open() },
    });

    if (buttonEl) {
      const replacement = addButton(product, { line: result.line, block: buttonEl.classList.contains('fx-btn-block'), size: 'sm' });
      buttonEl.replaceWith(replacement);
    }
    bus.emit('cart:line-updated', result.line);
    return result;
  }

  /* ------------------------------ Sections ------------------------------ */

  function sectionHead(title, options) {
    const opts = options || {};
    return h('div', { class: 'fx-rail-head' }, [
      h('div', {}, [
        h(opts.tag || 'h2', { id: opts.id || undefined }, [
          opts.emoji ? h('span', { 'aria-hidden': 'true', text: opts.emoji + ' ' }) : null,
          document.createTextNode(title),
        ]),
        opts.subtitle ? h('p', { class: 'fx-rail-sub', text: opts.subtitle }) : null,
      ]),
      opts.href
        ? h('a', { class: 'fx-rail-link', href: opts.href }, [opts.linkLabel || 'See all', icon('chevronRight', 'fx-ic fx-ic-sm')])
        : opts.action
          ? h('button', { class: 'fx-link-btn', type: 'button', onClick: opts.action.onClick, text: opts.action.label })
          : null,
    ]);
  }

  function rail(items, options) {
    const opts = options || {};
    const el = h('div', { class: 'fx-rail fx-scroll-x' + (opts.narrow ? ' fx-rail-narrow' : '') + (opts.wide ? ' fx-rail-wide' : '') });
    items.forEach((item) => el.appendChild(opts.renderer ? opts.renderer(item) : productCard(item, opts.card || {})));
    return el;
  }

  function section(title, items, options) {
    const opts = options || {};
    if (!items || !items.length) return null;
    const wrap = h('section', { class: 'fx-section-tight', 'aria-labelledby': opts.id || undefined });
    wrap.appendChild(sectionHead(title, opts));
    wrap.appendChild(opts.grid ? productGrid(items, opts) : rail(items, opts));
    return wrap;
  }

  function productGrid(items, options) {
    const opts = options || {};
    const grid = h('div', { class: opts.class || 'fx-product-grid' });
    items.forEach((item) => grid.appendChild(opts.renderer ? opts.renderer(item) : productCard(item, opts.card || {})));
    return grid;
  }

  function restaurantCard(restaurant) {
    const href = FX.url('restaurant', { id: restaurant.slug });
    const card = h('a', { class: 'fx-restaurant-card', href });
    card.appendChild(
      h('div', { class: 'fx-restaurant-media' }, [
        FX.media.img(restaurant, { kind: 'restaurant', alt: restaurant.name + ' restaurant' }),
        h('div', { class: 'fx-restaurant-badges' }, [
          restaurant.promoted ? h('span', { class: 'fx-badge fx-badge-dark', text: 'Promoted' }) : null,
          restaurant.pureVeg ? h('span', { class: 'fx-badge fx-badge-success', text: 'Pure veg' }) : null,
          restaurant.offers && restaurant.offers.length ? h('span', { class: 'fx-badge fx-badge-accent', text: restaurant.offers[0] }) : null,
        ].filter(Boolean)),
      ])
    );
    card.appendChild(
      h('div', { class: 'fx-restaurant-body' }, [
        h('h3', { class: 'fx-restaurant-name', text: restaurant.name }),
        h('div', { class: 'fx-restaurant-meta' }, [
          ratingChip(restaurant),
          h('span', { text: restaurant.cuisines.slice(0, 3).join(', ') }),
        ]),
        h('div', { class: 'fx-restaurant-meta' }, [h('span', { text: restaurant.area + ' · ' + restaurant.hours })]),
        h('div', { class: 'fx-restaurant-foot' }, [
          h('span', {}, [h('span', { 'aria-hidden': 'true', text: '⚡ ' }), document.createTextNode(FX.u.etaLabel(restaurant.etaMinutes))]),
          h('span', { text: money(restaurant.minOrder) + ' min order' }),
          h('span', { text: restaurant.deliveryFee ? money(restaurant.deliveryFee) + ' delivery' : 'Free delivery' }),
        ]),
      ])
    );
    return card;
  }

  function categoryTile(category) {
    const isFood = category.id === 'food';
    const href = isFood ? 'restaurants.html' : FX.url('category', { cat: category.id });
    return h('a', { class: 'fx-cat-tile', href }, [
      h('span', {
        class: 'fx-cat-icon',
        style: { background: FX.media.toneFor({ categoryId: category.id })[0] },
        'aria-hidden': 'true',
        text: category.emoji,
      }),
      h('span', { text: category.name }),
      isFood
        ? h('span', { class: 'fx-cat-meta', text: FX.store.catalog.restaurants().length + ' kitchens' })
        : h('span', { class: 'fx-cat-meta', text: category.productCount + ' items' }),
    ]);
  }

  /* ------------------------------- Forms -------------------------------- */

  function field(options) {
    const opts = options || {};
    const id = opts.id || 'f-' + FX.u.uid('f');
    const inputProps = {
      id,
      class: 'fx-input' + (opts.inputClass ? ' ' + opts.inputClass : ''),
      name: opts.name || id,
      type: opts.type === 'textarea' ? undefined : opts.type || 'text',
      placeholder: opts.placeholder,
      value: opts.value,
      required: opts.required,
      autocomplete: opts.autocomplete,
      inputmode: opts.inputmode,
      pattern: opts.pattern,
      minlength: opts.minlength,
      maxlength: opts.maxlength,
      min: opts.min,
      max: opts.max,
      step: opts.step,
      disabled: opts.disabled,
      'aria-describedby': opts.hint ? id + '-hint' : undefined,
    };
    const control =
      opts.type === 'textarea'
        ? h('textarea', Object.assign({ class: 'fx-textarea', rows: opts.rows || 4 }, inputProps), [opts.value ? document.createTextNode(opts.value) : null])
        : opts.type === 'select'
          ? h('select', Object.assign({ class: 'fx-select' }, inputProps), (opts.options || []).map((option) =>
              h('option', { value: option.value, selected: option.value === opts.value, text: option.label })
            ))
          : h('input', inputProps);

    if (opts.type === 'password') {
      const toggle = h('button', {
        class: 'fx-toggle-pw',
        type: 'button',
        text: 'Show',
        'aria-label': 'Show password',
        onClick: () => {
          const isPassword = control.type === 'password';
          control.type = isPassword ? 'text' : 'password';
          toggle.textContent = isPassword ? 'Hide' : 'Show';
          toggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
          control.focus();
        },
      });
      return h('div', { class: 'fx-field', dataset: { field: opts.name || id } }, [
        opts.label ? h('label', { class: 'fx-label', for: id }, [opts.label, opts.required ? h('span', { class: 'fx-req', text: ' *' }) : null]) : null,
        h('div', { class: 'fx-password-wrap' }, [control, toggle]),
        opts.hint ? h('div', { class: 'fx-hint', id: id + '-hint', text: opts.hint }) : null,
        h('div', { class: 'fx-error-text', hidden: true }),
      ]);
    }

    return h('div', { class: 'fx-field', dataset: { field: opts.name || id } }, [
      opts.label ? h('label', { class: 'fx-label', for: id }, [opts.label, opts.required ? h('span', { class: 'fx-req', text: ' *' }) : null]) : null,
      control,
      opts.hint ? h('div', { class: 'fx-hint', id: id + '-hint', text: opts.hint }) : null,
      h('div', { class: 'fx-error-text', hidden: true }),
    ]);
  }

  function setFieldError(fieldEl, message) {
    if (!fieldEl) return;
    const errorEl = $('.fx-error-text', fieldEl);
    const control = $('input,select,textarea', fieldEl);
    if (errorEl) {
      errorEl.hidden = !message;
      errorEl.textContent = message || '';
    }
    if (control) control.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function clearFormErrors(form) {
    $$('.fx-field', form).forEach((el) => setFieldError(el, null));
  }

  function formValues(form) {
    const data = {};
    $$('input,select,textarea', form).forEach((control) => {
      if (!control.name) return;
      if (control.type === 'checkbox') data[control.name] = control.checked;
      else if (control.type === 'radio') {
        if (control.checked) data[control.name] = control.value;
      } else data[control.name] = control.value.trim ? control.value.trim() : control.value;
    });
    return data;
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '';
      const spinnerEl = h('span', { class: 'fx-spinner' });
      button.appendChild(spinnerEl);
      button.appendChild(document.createTextNode(busyLabel || 'Please wait…'));
    } else {
      button.disabled = false;
      if (button.dataset.label) button.innerHTML = button.dataset.label;
    }
  }

  /* --------------------------- Price breakdown -------------------------- */

  function priceBreakdown(totals, options) {
    const opts = options || {};
    const rows = [];
    const row = (label, value, cls, note) =>
      h('div', { class: 'fx-bill-row' + (cls ? ' ' + cls : '') }, [
        h('dt', {}, [document.createTextNode(label), note ? h('span', { class: 'fx-bill-note', text: ' ' + note }) : null]),
        h('dd', { text: value }),
      ]);

    rows.push(row(opts.itemLabel || 'Item total (' + totals.totalQty + ' ' + FX.u.pluralize(totals.totalQty, 'item') + ')', money(totals.merchandiseSubtotal)));
    if (totals.itemSavings > 0) rows.push(row('Catalogue savings', '− ' + money(totals.itemSavings), 'is-discount'));
    if (totals.couponDiscount > 0) rows.push(row('Coupon ' + totals.couponCode, '− ' + money(totals.couponDiscount), 'is-discount'));
    if (totals.autoOfferDiscount > 0) rows.push(row('Offer · ' + (totals.autoOffer ? totals.autoOffer.name : 'Promotion'), '− ' + money(totals.autoOfferDiscount), 'is-discount'));
    if (totals.loyaltyDiscount > 0) rows.push(row('Rewards (' + totals.redeemPoints + ' pts)', '− ' + money(totals.loyaltyDiscount), 'is-discount'));
    rows.push(
      row(
        'Delivery fee',
        totals.deliveryFee === 0 ? 'FREE' : money(totals.deliveryFee),
        totals.deliveryFee === 0 ? 'is-discount' : '',
        totals.deliveryFee === 0 && !totals.freeDeliveryUnlocked ? '' : totals.freeDeliveryUnlocked && totals.configuredDeliveryFee ? '(was ' + money(totals.configuredDeliveryFee) + ')' : ''
      )
    );
    if (totals.packingFee > 0) rows.push(row('Packing charge', money(totals.packingFee)));
    if (totals.surgeFee > 0) rows.push(row('Surge fee', money(totals.surgeFee)));
    if (totals.smallOrderFee > 0) rows.push(row('Small order fee', money(totals.smallOrderFee)));
    if (totals.tip > 0) rows.push(row('Delivery partner tip', money(totals.tip)));
    rows.push(row('GST', 'incl. ' + money(totals.gstIncluded), '', '(inside item prices)'));
    rows.push(
      h('div', { class: 'fx-bill-row fx-bill-total' }, [h('dt', { text: 'To pay' }), h('dd', { text: money(totals.grandTotal) })])
    );
    if (totals.totalSavings > 0) {
      rows.push(h('div', { class: 'fx-bill-note', style: { color: 'var(--fx-success)', fontWeight: '600' }, text: 'You save ' + money(totals.totalSavings) + ' on this order' }));
    }
    return h('dl', { class: 'fx-bill', style: { margin: 0 } }, rows);
  }

  function thresholdWidget(totals, options) {
    const opts = options || {};
    const complete = totals.freeDeliveryUnlocked;
    const wrap = h('div', { class: 'fx-threshold' + (complete ? ' is-complete' : ''), role: 'status' });
    wrap.appendChild(
      h('div', { class: 'fx-threshold-msg' }, [
        h('span', { 'aria-hidden': 'true', text: complete ? '🎉' : '🛵' }),
        h('span', { text: totals.freeDeliveryMessage }),
      ])
    );
    const bar = h('div', { class: 'fx-progress' + (complete ? ' is-complete' : '') + (opts.small ? ' fx-progress-sm' : '') }, [
      h('span', { style: { width: Math.min(100, totals.progressPercent) + '%' } }),
    ]);
    wrap.appendChild(bar);
    wrap.appendChild(
      h('div', { class: 'fx-threshold-meta', 'aria-label': 'Progress towards free delivery' }, [
        h('span', { text: money(totals.eligibleSubtotal) + ' of ' + money(totals.freeDeliveryThreshold) + ' · ' }),
        h('span', { text: complete ? 'Free delivery unlocked' : money(totals.configuredDeliveryFee) + ' delivery fee applies' }),
      ])
    );
    return wrap;
  }

  /* ------------------------- Accordion / tabs --------------------------- */

  function accordion(title, content, options) {
    const opts = options || {};
    const id = 'acc-' + FX.u.uid('a');
    const body = typeof content === 'string' ? h('div', { html: content }) : content;
    body.classList.add('fx-accordion-body');
    body.id = id;
    if (!opts.open) body.hidden = true;
    const head = h(
      'button',
      {
        class: 'fx-accordion-head',
        type: 'button',
        'aria-expanded': opts.open ? 'true' : 'false',
        'aria-controls': id,
        onClick: (event) => {
          const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
          event.currentTarget.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          body.hidden = expanded;
        },
      },
      [
        h('span', { class: 'fx-accordion-title' }, [
          typeof title === 'string' ? document.createTextNode(title) : title,
          opts.meta ? h('span', { class: 'fx-accordion-meta', text: opts.meta }) : null,
        ]),
        icon('chevronDown', 'fx-ic fx-chevron'),
      ]
    );
    return h('div', { class: 'fx-accordion' + (opts.class ? ' ' + opts.class : '') }, [head, body]);
  }

  function tabs(container, items, options) {
    const opts = options || {};
    const list = h('div', { class: 'fx-tabs', role: 'tablist' });
    const panel = h('div', { class: 'fx-tab-panel', role: 'tabpanel', tabindex: '0' });
    let activeId = opts.active || (items[0] && items[0].id);

    function render() {
      clear(list);
      items.forEach((item) => {
        const button = h('button', {
          class: 'fx-tab',
          type: 'button',
          role: 'tab',
          id: 'tab-' + item.id,
          'aria-selected': item.id === activeId ? 'true' : 'false',
          'aria-controls': 'panel-' + item.id,
          text: item.label + (item.count !== undefined ? ' (' + item.count + ')' : ''),
          onClick: () => {
            activeId = item.id;
            render();
            if (opts.onChange) opts.onChange(item.id);
          },
        });
        list.appendChild(button);
      });
      const active = items.find((item) => item.id === activeId) || items[0];
      clear(panel);
      panel.id = 'panel-' + active.id;
      panel.setAttribute('aria-labelledby', 'tab-' + active.id);
      const content = typeof active.render === 'function' ? active.render() : active.content;
      if (content instanceof global.Node) panel.appendChild(content);
      else if (typeof content === 'string') panel.innerHTML = content;
    }
    render();
    container.appendChild(list);
    container.appendChild(panel);
    return {
      setActive(id) {
        activeId = id;
        render();
      },
      refresh: render,
    };
  }

  /* ---------------------------- Misc widgets ---------------------------- */

  function avatar(user, size) {
    const initials = String((user && user.name) || 'G')
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    const el = h('div', { class: 'fx-avatar' + (size ? ' fx-avatar-' + size : ''), 'aria-hidden': 'true' });
    if (user && user.avatar) el.appendChild(h('img', { src: user.avatar, alt: '' }));
    else el.textContent = initials || 'F';
    return el;
  }

  function statusBadge(status) {
    const map = {
      PLACED: 'fx-badge-info',
      CONFIRMED: 'fx-badge-info',
      PACKING: 'fx-badge-warning',
      PREPARING: 'fx-badge-warning',
      OUT_FOR_DELIVERY: 'fx-badge-accent',
      DELIVERED: 'fx-badge-success',
      CANCELLED: 'fx-badge-danger',
    };
    return h('span', { class: 'fx-badge ' + (map[status] || ''), text: FX.constants.ORDER_STATUS_LABELS[status] || status });
  }

  function crumbs(entries) {
    const list = h('nav', { class: 'fx-crumbs', 'aria-label': 'Breadcrumb' });
    const ol = h('ol', { style: { display: 'flex', gap: '6px', alignItems: 'center', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' } });
    entries.forEach((entry, index) => {
      const li = h('li', { style: { display: 'flex', gap: '6px', alignItems: 'center' } });
      if (index === entries.length - 1) li.appendChild(h('span', { 'aria-current': 'page', text: entry.label }));
      else li.appendChild(h('a', { href: entry.href || '#', text: entry.label }));
      if (index < entries.length - 1) li.appendChild(h('span', { 'aria-hidden': 'true', text: '/' , style:{color:'var(--fx-muted-2)'} }));
      ol.appendChild(li);
    });
    list.appendChild(ol);
    return list;
  }

  function demoBanner(message) {
    return h('div', { class: 'fx-alert fx-alert-warning', role: 'note' }, [
      h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
      h('div', { html: escapeHtml(message || FX.settings.DEFAULT_SETTINGS.disclaimer) }),
    ]);
  }

  FX.ui = {
    icon,
    ICONS,
    toast,
    notify,
    modal,
    confirmDialog,
    promptDialog,
    drawer,
    productSkeleton,
    gridSkeleton,
    railSkeleton,
    bannerSkeleton,
    spinner,
    emptyState,
    errorState,
    ratingChip,
    discountBadge,
    stockBadge,
    productCard,
    addButton,
    quantityStepper,
    handleAdd,
    sectionHead,
    rail,
    section,
    productGrid,
    restaurantCard,
    categoryTile,
    field,
    setFieldError,
    clearFormErrors,
    formValues,
    setBusy,
    priceBreakdown,
    thresholdWidget,
    accordion,
    tabs,
    avatar,
    statusBadge,
    crumbs,
    demoBanner,
    undoRemove,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

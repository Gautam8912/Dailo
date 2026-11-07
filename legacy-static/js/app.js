/**
 * Food Express — js/app.js
 * Application bootstrap: branded splash/onboarding, chrome (header, footer,
 * bottom nav), route guards, global keyboard shortcuts, cart-control syncing
 * and the error boundary. Pages register their controller via FX.app.onReady().
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, $$, clear, money, storage } = FX.u;
  const store = FX.store;
  const bus = FX.bus;
  const ui = FX.ui;
  const C = FX.constants;

  const SPLASH_FLAG = 'fx_splash_session_v1';
  let readyPromise = null;
  let booted = false;
  const queue = [];

  /* ------------------------------------------------------------------ */
  /* Splash / onboarding                                                  */
  /* ------------------------------------------------------------------ */

  const STEPS = [
    { key: 'backend', label: 'Connecting to services' },
    { key: 'catalog', label: 'Loading categories & catalogue' },
    { key: 'session', label: 'Restoring your session & cart' },
    { key: 'ready', label: 'Ready' },
  ];

  function shouldShowSplash() {
    const params = new URLSearchParams(global.location.search);
    if (params.get('splash') === '1') return true;
    if (params.get('splash') === '0') return false;
    if (document.body.dataset.splash === 'never') return false;
    if (FX.config.onboarding.replayPerSession) return true;
    try {
      return !global.sessionStorage.getItem(SPLASH_FLAG);
    } catch (err) {
      return true;
    }
  }

  function markSplashShown() {
    try {
      global.sessionStorage.setItem(SPLASH_FLAG, String(Date.now()));
    } catch (err) {
      /* private mode — ignore */
    }
  }

  function createSplash() {
    const messages = FX.config.onboarding.messages.length ? FX.config.onboarding.messages : ['Preparing your shopping experience…'];
    let messageIndex = 0;

    const messageEl = h('p', { text: messages[0] });
    const barFill = h('span', { style: { width: '6%' } });
    const bar = h('div', { class: 'fx-splash-bar' }, [barFill]);
    const stepsEl = h('div', { class: 'fx-splash-steps' });

    const errorWrap = h('div', { class: 'fx-splash-error' }, [
      h('h2', { text: 'We could not finish loading' }),
      h('p', { class: 'fx-splash-error-detail', text: '' }),
      h('div', { class: 'fx-btn-group' }, [
        h('button', { class: 'fx-btn fx-btn-primary', type: 'button', text: 'Retry', onClick: () => global.location.reload() }),
        h('button', {
          class: 'fx-btn fx-btn-ghost',
          type: 'button',
          text: 'Continue in demo mode',
          onClick: () => {
            FX.config.USE_BACKEND = false;
            global.location.reload();
          },
        }),
      ]),
    ]);

    const splash = h('div', { class: 'fx-splash', id: 'fx-splash', role: 'status', 'aria-live': 'polite' }, [
      h('div', { class: 'fx-splash-brand' }, [
        h('div', { class: 'fx-splash-logo', 'aria-hidden': 'true', text: '🛵' }),
        h('h1', { class: 'fx-splash-name', html: 'Food<em>Express</em>' }),
        h('p', { class: 'fx-splash-tag', text: FX.config.appTagline }),
      ]),
      h('div', { class: 'fx-splash-scene', 'aria-hidden': 'true' }, [
        h('span', { class: 'fx-splash-parcel', text: '🥦' }),
        h('span', { class: 'fx-splash-parcel', text: '🛍️' }),
        h('span', { class: 'fx-splash-parcel', text: '🍱' }),
        h('span', { class: 'fx-splash-scooter', text: '🛵' }),
        h('div', { class: 'fx-splash-road' }),
      ]),
      h('div', { class: 'fx-splash-msg' }, [
        messageEl,
        h('small', { text: 'Demo build · sample catalogue · no live delivery network' }),
      ]),
      h('div', { class: 'fx-splash-progress' }, [bar, stepsEl]),
      errorWrap,
      h('div', { class: 'fx-splash-foot', text: 'v' + FX.config.version + ' · HTML/CSS/JS + Node/Express/MongoDB' }),
    ]);

    const rotate = global.setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      messageEl.style.animation = 'none';
      // Force reflow so the entry animation replays.
      void messageEl.offsetWidth;
      messageEl.style.animation = '';
      messageEl.textContent = messages[messageIndex];
    }, FX.config.onboarding.messageRotateMs);

    function renderSteps(doneKey) {
      clear(stepsEl);
      STEPS.forEach((step) => {
        const doneIndex = STEPS.findIndex((s) => s.key === doneKey);
        const index = STEPS.indexOf(step);
        stepsEl.appendChild(
          h('span', {}, [
            index <= doneIndex ? h('b', { text: '✓ ' + step.label }) : h('span', { text: step.label }),
          ])
        );
      });
    }

    function setProgress(key, percent) {
      if (percent != null) {
        bar.classList.remove('is-indeterminate');
        barFill.style.width = Math.min(100, percent) + '%';
      } else {
        bar.classList.add('is-indeterminate');
      }
      renderSteps(key);
    }

    function fail(message) {
      splash.classList.add('is-error');
      $('.fx-splash-error-detail', splash).textContent = message;
      global.clearInterval(rotate);
    }

    function dismiss() {
      global.clearInterval(rotate);
      splash.classList.add('is-leaving');
      global.setTimeout(() => splash.remove(), 460);
    }

    document.body.appendChild(splash);
    document.body.style.overflow = 'hidden';
    setProgress('backend', 12);

    // Safety ceiling so a stuck request can never trap the user.
    const ceiling = global.setTimeout(() => {
      if (!booted) fail('Loading took longer than expected. Retry, or continue with the local demo catalogue.');
    }, FX.config.onboarding.maxSplashMs);

    return {
      setProgress,
      fail,
      dismiss() {
        global.clearTimeout(ceiling);
        document.body.style.overflow = '';
        dismiss();
      },
      element: splash,
    };
  }

  /* ------------------------------------------------------------------ */
  /* First-run welcome flow                                               */
  /* ------------------------------------------------------------------ */

  function maybeWelcome() {
    if (storage.get(K_onboardingSeen(), false)) return Promise.resolve(false);
    if (new URLSearchParams(global.location.search).get('welcome') === '0') return Promise.resolve(false);

    return new Promise((resolve) => {
      let step = 0;
      const chosen = { cityId: store.location.current.cityId, localityId: store.location.current.localityId, vegOnly: false, categories: [] };
      const body = h('div', {});
      const instance = ui.modal({
        title: 'Welcome to Food Express',
        content: body,
        size: 'wide',
        dismissible: true,
        onClose: () => finish(false),
      });

      function finish(completed) {
        storage.set(K_onboardingSeen(), true);
        store.preferences.update({ vegOnly: chosen.vegOnly, favouriteCategories: chosen.categories });
        if (chosen.localityId || chosen.cityId !== store.location.current.cityId) store.location.set(chosen.cityId, chosen.localityId);
        instance.close();
        resolve(completed);
      }

      function render() {
        clear(body);
        if (step === 0) {
          body.appendChild(
            h('div', { class: 'fx-welcome-step' }, [
              h('h3', { text: 'Where should we deliver?' }),
              h('p', { text: 'Pick a city and locality. Coverage shown here is demo coverage — no city in this build has a live delivery network.' }),
              h(
                'div',
                { class: 'fx-loc-grid' },
                FX.locations.CITIES.map((city) =>
                  h('button', {
                    class: 'fx-loc-item' + (city.id === chosen.cityId ? ' is-active' : ''),
                    type: 'button',
                    onClick: () => {
                      chosen.cityId = city.id;
                      chosen.localityId = null;
                      render();
                    },
                  }, [
                    document.createTextNode(city.name),
                    h('small', { text: FX.locations.COVERAGE_LABELS[city.coverage] }),
                  ])
                )
              ),
              h('div', { class: 'fx-row fx-gap-2', style: { marginTop: '12px', justifyContent: 'flex-end' } }, [
                h('button', { class: 'fx-btn fx-btn-ghost', type: 'button', text: 'Skip for now', onClick: () => finish(false) }),
                h('button', { class: 'fx-btn fx-btn-primary', type: 'button', text: 'Continue', onClick: () => { step = 1; render(); } }),
              ]),
            ])
          );
          return;
        }
        if (step === 1) {
          const city = FX.locations.getCity(chosen.cityId);
          body.appendChild(
            h('div', { class: 'fx-welcome-step' }, [
              h('h3', { text: 'Choose your locality' }),
              h('p', { text: city ? city.name + ' · ' + FX.locations.COVERAGE_LABELS[city.coverage] : '' }),
              h(
                'div',
                { class: 'fx-loc-grid' },
                (city ? city.localities : []).map((locality) =>
                  h('button', {
                    class: 'fx-loc-item' + (locality.id === chosen.localityId ? ' is-active' : ''),
                    type: 'button',
                    onClick: () => {
                      chosen.localityId = locality.id;
                      render();
                    },
                  }, [document.createTextNode(locality.name), h('small', { text: 'PIN ' + locality.pin })])
                )
              ),
              h('div', { class: 'fx-row fx-gap-2', style: { marginTop: '12px', justifyContent: 'space-between' } }, [
                h('button', { class: 'fx-btn fx-btn-ghost', type: 'button', text: 'Back', onClick: () => { step = 0; render(); } }),
                h('button', { class: 'fx-btn fx-btn-primary', type: 'button', text: 'Continue', onClick: () => { step = 2; render(); } }),
              ]),
            ])
          );
          return;
        }
        body.appendChild(
          h('div', { class: 'fx-welcome-step' }, [
            h('h3', { text: 'How do you shop?' }),
            h('p', { text: 'Optional preferences — change them any time from Account → Delivery preferences.' }),
            h('label', { class: 'fx-check' }, [
              h('input', {
                type: 'checkbox',
                checked: chosen.vegOnly,
                onChange: (event) => {
                  chosen.vegOnly = event.target.checked;
                },
              }),
              h('span', { text: 'Show vegetarian items only' }),
            ]),
            h('div', { class: 'fx-pref-grid' },
              store.catalog
                .categories()
                .filter((c) => c.id !== 'food')
                .map((category) =>
                  h('button', {
                    class: 'fx-pref' + (chosen.categories.indexOf(category.id) !== -1 ? '' : ''),
                    type: 'button',
                    'aria-pressed': chosen.categories.indexOf(category.id) !== -1 ? 'true' : 'false',
                    onClick: (event) => {
                      const index = chosen.categories.indexOf(category.id);
                      if (index === -1) chosen.categories.push(category.id);
                      else chosen.categories.splice(index, 1);
                      event.currentTarget.setAttribute('aria-pressed', index === -1 ? 'true' : 'false');
                    },
                  }, [h('span', { 'aria-hidden': 'true', text: category.emoji }), h('span', { text: category.name })])
                )
            ),
            h('div', { class: 'fx-row fx-gap-2', style: { marginTop: '12px', justifyContent: 'space-between' } }, [
              h('button', { class: 'fx-btn fx-btn-ghost', type: 'button', text: 'Back', onClick: () => { step = 1; render(); } }),
              h('button', { class: 'fx-btn fx-btn-primary', type: 'button', text: 'Start shopping', onClick: () => finish(true) }),
            ]),
          ])
        );
      }
      render();
    });
  }

  function K_onboardingSeen() {
    return C.STORAGE_KEYS.onboarding;
  }

  /* ------------------------------------------------------------------ */
  /* Route guards                                                         */
  /* ------------------------------------------------------------------ */

  async function enforceGuards() {
    const body = document.body;
    const requires = body.dataset.protected; // 'user' | 'admin'
    if (!requires) return true;
    const user = store.auth.user();
    if (requires === 'admin' && (!user || user.role !== C.ROLES.ADMIN)) {
      renderBlocked(
        user
          ? 'Your account does not have administrator rights. Sign in with an admin account to open the dashboard.'
          : 'The admin dashboard requires an administrator sign-in.'
      );
      return false;
    }
    if (requires === 'user' && !user) {
      const next = global.location.pathname.split('/').pop() + global.location.search;
      storage.set('fx_redirect_after_login', next);
      global.location.href = FX.url('login', { next });
      return false;
    }
    return true;
  }

  function renderBlocked(message) {
    const main = $('#fx-main') || $('main') || document.body;
    clear(main);
    main.appendChild(
      h('div', { class: 'fx-container', style: { paddingTop: '48px' } }, [
        ui.emptyState({
          icon: '🔒',
          title: 'Access restricted',
          message: message + ' Authorisation is enforced server-side; hiding a button in the UI would not be security.',
          actions: [
            { label: 'Go to login', href: 'login.html', variant: 'primary' },
            { label: 'Back to home', href: 'index.html', variant: 'outline' },
          ],
        }),
      ])
    );
  }

  /* ------------------------------------------------------------------ */
  /* Global behaviour                                                     */
  /* ------------------------------------------------------------------ */

  function syncCartControls() {
    // Keep every "ADD" button / stepper on the page consistent with the cart
    // without re-rendering whole sections.
    $$('.fx-product-card').forEach((card) => {
      const id = card.dataset.id;
      if (!id) return;
      const product = store.catalog.product(id);
      if (!product) return;
      const actions = $('.fx-product-actions', card);
      if (!actions) return;
      const line = store.cart.lineFor(id);
      const current = actions.firstElementChild;
      if (!current) return;
      const isStepper = current.classList.contains('fx-qty');
      if (isStepper && !line) {
        clear(actions);
        actions.appendChild(ui.addButton(product, { block: true }));
        return;
      }
      if (!isStepper && line) {
        clear(actions);
        actions.appendChild(ui.addButton(product, { block: true, line }));
        return;
      }
      if (isStepper && line) {
        // The quantity can change elsewhere (cart drawer, reorder, a second ADD
        // on another card) — refresh the stepper so the page never shows a
        // stale quantity.
        const shown = $('.fx-qty-value', actions);
        if (shown && shown.textContent !== String(line.qty)) {
          clear(actions);
          actions.appendChild(ui.addButton(product, { block: true, line }));
        }
      }
    });
  }

  function bindGlobalEvents() {
    bus.on('cart:changed', syncCartControls);
    bus.on('cart:line-updated', syncCartControls);

    // Scroll-to-top control
    const button = h('button', { class: 'fx-scroll-top fx-no-print', type: 'button', 'aria-label': 'Back to top', text: '↑' });
    document.body.appendChild(button);
    button.addEventListener('click', () => global.scrollTo({ top: 0, behavior: 'smooth' }));
    global.addEventListener(
      'scroll',
      FX.u.throttle(() => button.classList.toggle('is-visible', global.scrollY > 600), 120)
    );

    // "/" focuses the search box, Escape closes layers
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (event.key === '/' && !typing) {
        const input = $('#fx-search-input');
        if (input) {
          event.preventDefault();
          input.focus();
          input.select();
        }
      }
    });

    // Session expiry (backend 401) → sign out locally and tell the user.
    bus.on('auth:expired', () => {
      if (!store.auth.user()) return;
      store.auth.logout();
      ui.notify.warning('Your session expired. Please sign in again.', { duration: 7000 });
    });

    // ?city= deep links (used by the footer city list)
    const cityParam = FX.u.qs('city');
    if (cityParam && FX.locations.getCity(cityParam)) {
      const city = FX.locations.getCity(cityParam);
      store.location.set(city.id, city.localities && city.localities.length ? city.localities[0].id : null);
    }
  }

  /* --------------------------- Error boundary -------------------------- */

  let errorReported = false;
  function installErrorBoundary() {
    global.addEventListener('error', (event) => {
      reportError(event.error || new Error(event.message));
    });
    global.addEventListener('unhandledrejection', (event) => {
      reportError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    });
  }

  function reportError(error) {
    // Never log credentials or tokens.
    if (errorReported) return;
    errorReported = true;
    /* eslint-disable-next-line no-console */
    console.error('[Food Express] unhandled error:', error && error.message ? error.message : error);
    ui.notify.error('Something went wrong on this page. Your cart is safe — try reloading if the page looks incomplete.', {
      duration: 9000,
      action: { label: 'Reload', onClick: () => global.location.reload() },
    });
  }

  /** Wrap a page controller so a thrown error renders a real error state. */
  function guard(fn) {
    return function guarded() {
      try {
        const result = fn.apply(this, arguments);
        if (result && typeof result.catch === 'function') {
          result.catch((error) => pageError(error));
        }
      } catch (error) {
        pageError(error);
      }
    };
  }

  function pageError(error) {
    /* eslint-disable-next-line no-console */
    console.error('[Food Express] page error', error);
    const main = $('#fx-main') || $('main');
    if (!main) return;
    const existing = $('.fx-page-error', main);
    if (existing) return;
    main.appendChild(
      h('div', { class: 'fx-container fx-page-error', style: { paddingTop: '24px' } }, [
        ui.errorState((error && error.message) || 'Unexpected error while rendering this page.', () => global.location.reload()),
      ])
    );
  }

  /* ------------------------------------------------------------------ */
  /* Boot sequence                                                        */
  /* ------------------------------------------------------------------ */

  function boot() {
    if (readyPromise) return readyPromise;
    installErrorBoundary();

    const showSplash = shouldShowSplash();
    const splash = showSplash ? createSplash() : null;
    if (!showSplash) markSplashShown();

    readyPromise = (async () => {
      try {
        if (splash) splash.setProgress('backend', 22);
        await store.boot();
        booted = true;

        if (splash) {
          splash.setProgress('catalog', 62);
          splash.setProgress('session', 84);
        }

        bindGlobalEvents();
        if (hasChrome()) {
          FX.components.header.render();
          FX.components.footer.render();
          FX.components.bottomNav.render();
        }

        const allowed = await enforceGuards();
        if (splash) splash.setProgress('ready', 100);

        const needsOnboarding = !storage.get(K_onboardingSeen(), false);
        if (splash) {
          if (needsOnboarding) {
            splash.dismiss();
          } else {
            // Small settle delay so the progress bar is perceived, never a fake wait.
            await FX.u.sleep(180);
            splash.dismiss();
          }
        }

        markSplashShown();
        document.dispatchEvent(new global.CustomEvent('fx:ready', { detail: { mode: store.mode(), allowed } }));

        // Page controllers paint first: the onboarding welcome flow is an
        // overlay on top of a fully rendered page, never a gate that blocks
        // content (and never an artificial delay).
        while (queue.length) {
          const callback = queue.shift();
          runCallback(callback);
        }

        if (needsOnboarding) await maybeWelcome();
        return { mode: store.mode(), allowed };
      } catch (error) {
        if (splash) {
          splash.fail((error && error.message) || 'The application could not start. Check your connection and retry.');
        } else {
          pageError(error);
        }
        throw error;
      }
    })();

    return readyPromise;
  }

  function runCallback(callback) {
    try {
      const result = callback({ store, ui, bus, mode: store.mode() });
      if (result && typeof result.catch === 'function') result.catch(pageError);
    } catch (error) {
      pageError(error);
    }
  }

  function onReady(callback) {
    if (booted && document.readyState !== 'loading') {
      runCallback(callback);
      return;
    }
    queue.push(callback);
    boot();
  }

  function ready() {
    return boot();
  }

  /* ----------------------- Chrome-less page helper --------------------- */

  /**
   * Auth pages render their own full-bleed shell, so the shared header/footer/
   * bottom-nav are skipped there — but the store still boots normally.
   */
  function hasChrome() {
    return document.body.dataset.chrome !== 'none';
  }

  FX.app = {
    boot,
    ready,
    onReady,
    guard,
    pageError,
    hasChrome,
    syncCartControls,
    get booted() {
      return booted;
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

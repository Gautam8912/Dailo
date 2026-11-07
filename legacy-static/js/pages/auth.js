/**
 * Food Express — js/pages/auth.js
 * Login, register and forgot-password screens (one controller, three pages).
 *
 * Honesty rules enforced here:
 *  - no success message unless the store/backend actually created a session;
 *  - field-level errors come from the real failure reason;
 *  - demo credentials and the demo password-reset code are clearly labelled.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear } = FX.u;
  const store = FX.store;
  const ui = FX.ui;

  const page = document.body.dataset.page || 'login';

  /** Only allow same-site relative targets so `?next=` cannot open a redirect. */
  function safeNext(value) {
    const next = String(value || '').trim();
    if (!next) return 'account.html';
    if (/^(https?:)?\/\//i.test(next)) return 'account.html';
    if (next.indexOf('\\') !== -1 || next.indexOf('\n') !== -1) return 'account.html';
    if (!/^[\w./?=&#%-]+\.html/.test(next)) return 'account.html';
    return next;
  }

  function demoAccountsCard(fillFn) {
    const demo = FX.config.demoCredentials || {};
    const rows = [
      { label: 'Admin', email: demo.admin && demo.admin.email, password: demo.admin && demo.admin.password },
      { label: 'Customer', email: demo.user && demo.user.email, password: demo.user && demo.user.password },
    ].filter((row) => row.email);

    return h('div', { class: 'fx-card fx-card-pad fx-auth-demo' }, [
      h('div', { class: 'fx-row-between fx-wrap fx-gap-2' }, [
        h('h2', { class: 'fx-section-title', style: { margin: 0 }, text: 'Demo accounts' }),
        h('span', { class: 'fx-badge fx-badge-warning', text: 'Local demo only' }),
      ]),
      h('p', { class: 'fx-xs fx-muted', style: { margin: '6px 0 10px' }, text: 'These accounts exist in this build so you can test sign-in, the admin dashboard and cart merging. They are not real customer accounts, and no email is sent anywhere.' }),
      h('div', { class: 'fx-stack fx-gap-2' }, rows.map((row) =>
        h('div', { class: 'fx-line fx-line-row' }, [
          h('div', {}, [
            h('strong', { class: 'fx-small', text: row.label }),
            h('div', { class: 'fx-xs fx-muted', text: row.email + ' · ' + row.password }),
          ]),
          h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Fill', onClick: () => fillFn(row.email, row.password) }),
        ])
      )),
    ]);
  }

  /* ---------------------------------------------------------------- login */

  function renderLogin(mount) {
    document.title = 'Sign in · Food Express';
    const next = safeNext(FX.u.qs('next'));

    const form = h('form', { class: 'fx-stack', novalidate: 'true' });
    form.appendChild(h('h1', { class: 'fx-auth-title', text: 'Sign in' }));
    form.appendChild(h('p', { class: 'fx-auth-sub', text: 'Track orders, save addresses and keep your wishlist across devices.' }));

    const identifierField = ui.field({
      label: 'Email or mobile number',
      name: 'identifier',
      value: FX.u.qs('email') || '',
      required: true,
      autocomplete: 'username',
      placeholder: 'you@example.com or 98765 43210',
    });
    const passwordField = ui.field({ label: 'Password', name: 'password', type: 'password', required: true, autocomplete: 'current-password', placeholder: 'Your password' });

    form.appendChild(identifierField);
    form.appendChild(passwordField);

    const remember = h('label', { class: 'fx-check' }, [
      h('input', { type: 'checkbox', name: 'remember', checked: true }),
      h('span', { text: 'Keep me signed in on this device' }),
    ]);
    form.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-2' }, [remember, h('a', { class: 'fx-link fx-small', href: 'forgot-password.html' + (next !== 'account.html' ? '?next=' + encodeURIComponent(next) : ''), text: 'Forgot password?' })])
    );

    const submit = h('button', { class: 'fx-btn fx-btn-primary fx-btn-block fx-btn-lg', type: 'submit', text: 'Sign in' });
    form.appendChild(submit);
    form.appendChild(
      h('p', { class: 'fx-auth-alt' }, [document.createTextNode('New to Food Express? '), h('a', { href: 'register.html' + (next !== 'account.html' ? '?next=' + encodeURIComponent(next) : ''), text: 'Create an account' })])
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      ui.clearFormErrors(form);
      const values = ui.formValues(form);
      const errors = {
        identifier: FX.u.validators.required(values.identifier, 'Email or mobile number'),
        password: FX.u.validators.required(values.password, 'Password'),
      };
      let hasError = false;
      Object.keys(errors).forEach((key) => {
        if (!errors[key]) return;
        hasError = true;
        ui.setFieldError(form.querySelector('.fx-field[data-field="' + key + '"]'), errors[key]);
      });
      if (hasError) return;

      ui.setBusy(submit, true, 'Signing in…');
      try {
        const user = await store.auth.login(values.identifier, values.password, { remember: Boolean(values.remember) });
        ui.notify.success('Welcome back, ' + (user.name || user.email) + '.');
        const cartCount = store.cart.count();
        if (cartCount) {
          ui.notify.info('Your cart has ' + cartCount + ' ' + FX.u.pluralize(cartCount, 'item') + ' — guest items were merged, not duplicated.', { action: { label: 'View cart', onClick: () => FX.components.cartDrawer.open() } });
        }
        FX.navigate(next);
      } catch (err) {
        ui.setBusy(submit, false);
        const field = err.field === 'identifier' ? identifierField : err.field === 'password' ? passwordField : null;
        if (field) ui.setFieldError(field, err.message);
        ui.notify.error(err.message || 'Sign-in failed. Please try again.');
      }
    });

    mount.appendChild(form);
    if (store.isDemo()) {
      mount.appendChild(
        demoAccountsCard((email, password) => {
          $('input[name="identifier"]', form).value = email;
          $('input[name="password"]', form).value = password;
          ui.clearFormErrors(form);
          $('input[name="password"]', form).focus();
        })
      );
    }
    mount.appendChild(h('a', { class: 'fx-link fx-small fx-auth-back', href: 'index.html', text: '← Back to shopping' }));
  }

  /* ------------------------------------------------------------- register */

  function renderRegister(mount) {
    document.title = 'Create your account · Food Express';
    const next = safeNext(FX.u.qs('next'));

    const form = h('form', { class: 'fx-stack', novalidate: 'true' });
    form.appendChild(h('h1', { class: 'fx-auth-title', text: 'Create your account' }));
    form.appendChild(h('p', { class: 'fx-auth-sub', text: 'One account for groceries, essentials and restaurant orders.' }));

    const nameField = ui.field({ label: 'Full name', name: 'name', required: true, autocomplete: 'name', placeholder: 'e.g. Anitha Reddy' });
    const emailField = ui.field({ label: 'Email address', name: 'email', type: 'email', required: true, autocomplete: 'email', placeholder: 'you@example.com' });
    const phoneField = ui.field({ label: 'Mobile number', name: 'phone', required: true, inputmode: 'numeric', autocomplete: 'tel', placeholder: '10-digit mobile number' });
    const passwordField = ui.field({ label: 'Password', name: 'password', type: 'password', required: true, autocomplete: 'new-password', hint: 'At least 8 characters, with a letter and a number.' });
    const confirmField = ui.field({ label: 'Confirm password', name: 'confirmPassword', type: 'password', required: true, autocomplete: 'new-password' });

    const meter = h('div', { class: 'fx-strength' }, [
      h('div', { class: 'fx-progress' }, [h('div', { class: 'fx-progress-fill', style: { width: '0%' } })]),
      h('span', { class: 'fx-xs fx-muted', text: 'Strength: —' }),
    ]);
    $('input', passwordField).addEventListener('input', (event) => {
      const strength = FX.u.passwordStrength(event.target.value);
      $('.fx-progress-fill', meter).style.width = strength.percent + '%';
      $('.fx-progress-fill', meter).classList.toggle('is-weak', strength.score <= 2);
      $('span', meter).textContent = 'Strength: ' + strength.label;
    });

    form.appendChild(nameField);
    form.appendChild(h('div', { class: 'fx-form-grid' }, [emailField, phoneField]));
    form.appendChild(passwordField);
    form.appendChild(meter);
    form.appendChild(confirmField);

    const terms = h('label', { class: 'fx-check' }, [
      h('input', { type: 'checkbox', name: 'terms' }),
      h('span', {}, [document.createTextNode('I agree to the '), h('a', { href: 'terms.html', target: '_blank', rel: 'noopener', text: 'Terms of use' }), document.createTextNode(' and '), h('a', { href: 'privacy.html', target: '_blank', rel: 'noopener', text: 'Privacy policy' }), document.createTextNode(' (draft business content in this build).')]),
    ]);
    form.appendChild(terms);
    const termsError = h('div', { class: 'fx-error-text', hidden: true });
    form.appendChild(termsError);

    const submit = h('button', { class: 'fx-btn fx-btn-primary fx-btn-block fx-btn-lg', type: 'submit', text: 'Create account' });
    form.appendChild(submit);
    form.appendChild(h('p', { class: 'fx-auth-alt' }, [document.createTextNode('Already have an account? '), h('a', { href: 'login.html' + (next !== 'account.html' ? '?next=' + encodeURIComponent(next) : ''), text: 'Sign in' })]));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      ui.clearFormErrors(form);
      termsError.hidden = true;
      const values = ui.formValues(form);
      const errors = {
        name: FX.u.validators.minLength(2)(values.name, 'Name'),
        email: FX.u.validators.email(values.email),
        phone: FX.u.validators.mobile(values.phone),
        password: FX.u.validators.password(values.password),
        confirmPassword: values.password === values.confirmPassword ? null : 'Both passwords must match.',
      };
      let hasError = false;
      Object.keys(errors).forEach((key) => {
        if (!errors[key]) return;
        hasError = true;
        ui.setFieldError(form.querySelector('.fx-field[data-field="' + key + '"]'), errors[key]);
      });
      if (!values.terms) {
        hasError = true;
        termsError.hidden = false;
        termsError.textContent = 'Please accept the terms to continue.';
      }
      if (hasError) {
        ui.notify.error('Please fix the highlighted fields.');
        return;
      }

      ui.setBusy(submit, true, 'Creating account…');
      try {
        const user = await store.auth.register({
          name: values.name,
          email: values.email,
          phone: values.phone.replace(/\D/g, ''),
          password: values.password,
        });
        ui.notify.success('Account created — welcome, ' + (user.name || 'friend') + '!');
        const cartCount = store.cart.count();
        if (cartCount) ui.notify.info(cartCount + ' ' + FX.u.pluralize(cartCount, 'item') + ' from your guest cart were merged into your account cart.');
        FX.navigate(next);
      } catch (err) {
        ui.setBusy(submit, false);
        if (err.field) ui.setFieldError(form.querySelector('.fx-field[data-field="' + err.field + '"]'), err.message);
        ui.notify.error(err.message || 'Could not create the account.');
      }
    });

    mount.appendChild(form);
    if (store.isDemo()) {
      mount.appendChild(
        h('div', { class: 'fx-alert fx-alert-info' }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: 'ℹ️' }),
          h('div', { text: 'Demo mode: your account is stored in this browser with a salted SHA-256 password hash. Connect the backend (USE_BACKEND) for bcrypt hashing, JWT sessions and cross-device sync.' }),
        ])
      );
    }
    mount.appendChild(h('a', { class: 'fx-link fx-small fx-auth-back', href: 'index.html', text: '← Back to shopping' }));
  }

  /* ------------------------------------------------------ forgot password */

  function renderForgot(mount) {
    document.title = 'Reset your password · Food Express';
    const next = safeNext(FX.u.qs('next'));
    let step = 1;
    let identifier = FX.u.qs('email') || '';
    let demoCode = null;

    function draw() {
      clear(mount);
      if (step === 1) drawRequest();
      else drawReset();
    }

    function drawRequest() {
      const form = h('form', { class: 'fx-stack', novalidate: 'true' });
      form.appendChild(h('h1', { class: 'fx-auth-title', text: 'Reset your password' }));
      form.appendChild(h('p', { class: 'fx-auth-sub', text: 'Enter the email address on your account and we will start a reset.' }));

      const emailField = ui.field({ label: 'Email address', name: 'email', type: 'email', value: identifier, required: true, autocomplete: 'email', placeholder: 'you@example.com' });
      form.appendChild(emailField);

      const submit = h('button', { class: 'fx-btn fx-btn-primary fx-btn-block fx-btn-lg', type: 'submit', text: 'Send reset code' });
      form.appendChild(submit);
      form.appendChild(h('p', { class: 'fx-auth-alt' }, [document.createTextNode('Remembered it? '), h('a', { href: 'login.html', text: 'Sign in instead' })]));

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        ui.clearFormErrors(form);
        const values = ui.formValues(form);
        const error = FX.u.validators.email(values.email);
        if (error) {
          ui.setFieldError(emailField, error);
          return;
        }
        ui.setBusy(submit, true, 'Checking…');
        try {
          const result = await store.auth.forgotPassword(values.email);
          identifier = values.email;
          demoCode = result && result.demoCode ? result.demoCode : null;
          step = 2;
          draw();
        } catch (err) {
          ui.setBusy(submit, false);
          if (err.field) ui.setFieldError(emailField, err.message);
          ui.notify.error(err.message || 'Could not start the reset.');
        }
      });

      mount.appendChild(form);
      mount.appendChild(h('a', { class: 'fx-link fx-small fx-auth-back', href: 'index.html', text: '← Back to shopping' }));
    }

    function drawReset() {
      const form = h('form', { class: 'fx-stack', novalidate: 'true' });
      form.appendChild(h('h1', { class: 'fx-auth-title', text: 'Enter your reset code' }));
      form.appendChild(h('p', { class: 'fx-auth-sub', text: 'Resetting the account for ' + identifier + '.' }));

      if (demoCode) {
        form.appendChild(
          h('div', { class: 'fx-alert fx-alert-warning' }, [
            h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '🧪' }),
            h('div', {}, [
              h('strong', { text: 'Demo reset — no email was sent. ' }),
              document.createTextNode('No email provider is configured in this build, so your code is shown here: '),
              h('code', { class: 'fx-code', text: demoCode }),
              h('span', { class: 'fx-block fx-xs fx-muted', style: { marginTop: '4px' }, text: 'With the backend connected, the code is emailed and never rendered in the page.' }),
            ]),
          ])
        );
      } else {
        form.appendChild(
          h('div', { class: 'fx-alert fx-alert-info' }, [
            h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: 'ℹ️' }),
            h('div', { text: 'We sent a reset code to ' + identifier + '. It expires in 15 minutes.' }),
          ])
        );
      }

      const codeField = ui.field({ label: 'Reset code', name: 'code', required: true, inputmode: 'numeric', placeholder: '6-digit code', autocomplete: 'one-time-code' });
      const passwordField = ui.field({ label: 'New password', name: 'password', type: 'password', required: true, autocomplete: 'new-password' });
      const confirmField = ui.field({ label: 'Confirm new password', name: 'confirmPassword', type: 'password', required: true, autocomplete: 'new-password' });

      const meter = h('div', { class: 'fx-strength' }, [
        h('div', { class: 'fx-progress' }, [h('div', { class: 'fx-progress-fill', style: { width: '0%' } })]),
        h('span', { class: 'fx-xs fx-muted', text: 'Strength: —' }),
      ]);
      $('input', passwordField).addEventListener('input', (event) => {
        const strength = FX.u.passwordStrength(event.target.value);
        $('.fx-progress-fill', meter).style.width = strength.percent + '%';
        $('span', meter).textContent = 'Strength: ' + strength.label;
      });

      form.appendChild(codeField);
      form.appendChild(passwordField);
      form.appendChild(meter);
      form.appendChild(confirmField);

      const submit = h('button', { class: 'fx-btn fx-btn-primary fx-btn-block fx-btn-lg', type: 'submit', text: 'Set new password' });
      form.appendChild(submit);
      form.appendChild(
        h('div', { class: 'fx-btn-group' }, [
          h('button', { class: 'fx-btn fx-btn-ghost fx-btn-sm', type: 'button', text: 'Use a different email', onClick: () => { step = 1; demoCode = null; draw(); } }),
          h('a', { class: 'fx-btn fx-btn-ghost fx-btn-sm', href: 'login.html', text: 'Back to sign in' }),
        ])
      );

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        ui.clearFormErrors(form);
        const values = ui.formValues(form);
        const errors = {
          code: FX.u.validators.required(values.code, 'Reset code'),
          password: FX.u.validators.password(values.password),
          confirmPassword: values.password === values.confirmPassword ? null : 'Both passwords must match.',
        };
        let hasError = false;
        Object.keys(errors).forEach((key) => {
          if (!errors[key]) return;
          hasError = true;
          ui.setFieldError(form.querySelector('.fx-field[data-field="' + key + '"]'), errors[key]);
        });
        if (hasError) return;

        ui.setBusy(submit, true, 'Updating…');
        try {
          await store.auth.resetPassword(identifier, values.code, values.password);
          ui.notify.success('Password updated. You can sign in now.');
          FX.navigate('login.html' + (next !== 'account.html' ? '?next=' + encodeURIComponent(next) : '') + '&email=' + encodeURIComponent(identifier));
        } catch (err) {
          ui.setBusy(submit, false);
          ui.setFieldError(codeField, err.message || 'That code is not valid.');
          ui.notify.error(err.message || 'Could not reset the password.');
        }
      });

      mount.appendChild(form);
    }

    draw();
  }

  /* --------------------------------------------------------------- render */

  function render() {
    const mount = $('#auth-mount');
    if (!mount) return;
    clear(mount);

    if (store.auth.isSignedIn() && page !== 'forgot-password') {
      mount.appendChild(
        ui.emptyState({
          icon: '✅',
          title: 'You are already signed in',
          message: 'Signed in as ' + (store.auth.user().email || store.auth.user().name) + '.',
          actions: [
            { label: 'Go to my account', href: safeNext(FX.u.qs('next')), variant: 'primary' },
            { label: 'Continue shopping', href: 'index.html', variant: 'outline' },
          ],
        })
      );
      return;
    }

    if (page === 'register') renderRegister(mount);
    else if (page === 'forgot-password') renderForgot(mount);
    else renderLogin(mount);
  }

  FX.pages = FX.pages || {};
  FX.pages.auth = { render };
  FX.app.onReady(render);
})(typeof globalThis !== 'undefined' ? globalThis : this);

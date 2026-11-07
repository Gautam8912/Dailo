/**
 * Food Express — js/pages/notifications.js
 * Notification centre: filters, read/unread, deep links, clear.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const C = FX.constants;

  const KIND_EMOJI = { order: '📦', promo: '🎉', coupon: '🎟️', account: '👤', support: '🛟' };

  let kindFilter = FX.u.qs('kind') || 'all';
  let unreadOnly = FX.u.qs('unread') === '1';

  function matches(item) {
    if (unreadOnly && item.read) return false;
    if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
    return true;
  }

  function render() {
    const mount = $('#page-mount');
    if (!mount) return;
    clear(mount);

    const all = store.notifications.list();
    const visible = all.filter(matches);
    const unread = store.notifications.unreadCount();
    document.title = unread ? 'Notifications (' + unread + ' new) · Food Express' : 'Notifications · Food Express';

    mount.appendChild(
      h('div', { class: 'fx-row-between fx-wrap fx-gap-3', style: { padding: '20px 0 12px' } }, [
        h('div', {}, [
          h('h1', { class: 'fx-page-title', text: 'Notifications' }),
          h('p', { class: 'fx-page-sub', style: { margin: 0 }, text: all.length ? all.length + ' total · ' + unread + ' unread · stored on this device' : 'Order updates, offers and account alerts land here' }),
        ]),
        h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
          all.length ? h('button', { class: 'fx-btn fx-btn-outline fx-btn-sm', type: 'button', text: 'Mark all read', onClick: () => { store.notifications.markAllRead(); ui.notify.info('All notifications marked as read.'); } }) : null,
          all.length
            ? h('button', {
                class: 'fx-btn fx-btn-ghost fx-btn-sm',
                type: 'button',
                text: 'Clear all',
                onClick: async () => {
                  const ok = await ui.confirmDialog({ title: 'Clear all notifications?', message: 'This removes ' + all.length + ' notifications from this device. Orders themselves are kept.', confirmLabel: 'Clear', danger: true });
                  if (!ok) return;
                  store.notifications.clear();
                  ui.notify.info('Notifications cleared.');
                },
              })
            : null,
          h('a', { class: 'fx-btn fx-btn-soft fx-btn-sm', href: 'account.html?tab=preferences', text: 'Notification settings' }),
        ].filter(Boolean)),
      ])
    );

    mount.appendChild(
      h('div', { class: 'fx-toolbar' }, [
        h('div', { class: 'fx-pill-row fx-scroll-x' }, [
          h('button', {
            class: 'fx-pill' + (kindFilter === 'all' ? ' is-active' : ''),
            type: 'button',
            'aria-pressed': kindFilter === 'all' ? 'true' : 'false',
            text: 'All (' + all.length + ')',
            onClick: () => setKind('all'),
          }),
          h('button', {
            class: 'fx-pill' + (unreadOnly ? ' is-active' : ''),
            type: 'button',
            'aria-pressed': unreadOnly ? 'true' : 'false',
            text: 'Unread (' + unread + ')',
            onClick: () => {
              unreadOnly = !unreadOnly;
              FX.u.setQs({ unread: unreadOnly ? '1' : null }, { replace: true });
              render();
            },
          }),
        ].concat(
          C.NOTIFICATION_KIND_LIST.map((kind) =>
            h('button', {
              class: 'fx-pill' + (kindFilter === kind ? ' is-active' : ''),
              type: 'button',
              'aria-pressed': kindFilter === kind ? 'true' : 'false',
              text: (KIND_EMOJI[kind] || '•') + ' ' + (C.NOTIFICATION_KIND_LABELS[kind] || kind) + ' (' + all.filter((item) => item.kind === kind).length + ')',
              onClick: () => setKind(kind),
            })
          )
        )),
      ])
    );

    if (!all.length) {
      mount.appendChild(
        ui.emptyState({
          icon: '🔔',
          title: 'No notifications yet',
          message: 'You will see order status changes, coupon drops and account alerts here. Notifications are stored on this device — no SMS or push provider is connected in this build.',
          actions: [
            { label: 'Start an order', href: 'index.html', variant: 'primary' },
            { label: 'See available coupons', href: 'account.html?tab=coupons', variant: 'outline' },
          ],
        })
      );
      return;
    }

    if (!visible.length) {
      mount.appendChild(
        ui.emptyState({
          icon: '✅',
          title: unreadOnly ? 'Nothing unread' : 'No notifications in this filter',
          message: unreadOnly ? 'You are all caught up.' : 'Try a different filter to see more.',
          actions: [{ label: 'Show everything', variant: 'primary', onClick: () => { kindFilter = 'all'; unreadOnly = false; FX.u.setQs({ kind: null, unread: null }, { replace: true }); render(); } }],
        })
      );
      return;
    }

    const list = h('div', { class: 'fx-notif-list' });
    visible.forEach((item) => {
      const row = h('article', { class: 'fx-notif' + (item.read ? ' is-read' : '') });
      const body = h('div', { class: 'fx-notif-body' }, [
        h('div', { class: 'fx-row fx-gap-2 fx-wrap' }, [
          h('strong', { class: 'fx-notif-title', text: item.title }),
          item.read ? null : h('span', { class: 'fx-badge fx-badge-brand', text: 'New' }),
          item.simulated ? h('span', { class: 'fx-badge fx-badge-info', text: 'Simulated' }) : null,
        ].filter(Boolean)),
        h('p', { class: 'fx-notif-message', text: item.message }),
        h('div', { class: 'fx-notif-meta' }, [
          h('span', { text: (KIND_EMOJI[item.kind] || '•') + ' ' + (C.NOTIFICATION_KIND_LABELS[item.kind] || item.kind || 'Update') }),
          h('span', { text: FX.u.timeAgo(item.createdAt) }),
        ]),
      ]);

      if (item.href) {
        row.appendChild(
          h('a', {
            class: 'fx-notif-link',
            href: item.href,
            onClick: () => {
              if (!item.read) store.notifications.markRead(item.id);
            },
          }, [body, h('span', { class: 'fx-notif-chevron', 'aria-hidden': 'true', text: '›' })])
        );
      } else {
        row.appendChild(body);
      }

      row.appendChild(
        h('div', { class: 'fx-notif-actions' }, [
          item.read
            ? null
            : h('button', { class: 'fx-btn fx-btn-ghost fx-btn-sm', type: 'button', 'aria-label': 'Mark as read', text: 'Mark read', onClick: () => store.notifications.markRead(item.id) }),
          h('button', {
            class: 'fx-btn fx-btn-ghost fx-btn-sm fx-icon-btn',
            type: 'button',
            'aria-label': 'Remove notification',
            onClick: () => {
              store.notifications.remove(item.id);
              ui.notify.info('Notification removed.', { action: { label: 'Undo', onClick: () => store.notifications.push({ kind: item.kind, title: item.title, message: item.message, href: item.href, read: item.read }) } });
            },
          }, [ui.icon('trash')]),
        ].filter(Boolean))
      );
      list.appendChild(row);
    });
    mount.appendChild(list);

    mount.appendChild(
      h('p', { class: 'fx-xs fx-muted', style: { marginTop: '16px' }, text: 'Notifications in this build are generated locally by order, coupon and account events. They are not sent by an external messaging service.' })
    );
  }

  function setKind(kind) {
    kindFilter = kind;
    FX.u.setQs({ kind: kind === 'all' ? null : kind }, { replace: true });
    render();
  }

  FX.pages = FX.pages || {};
  FX.pages.notifications = { render };

  FX.app.onReady(() => {
    render();
    FX.bus.on('notifications:changed', render);
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

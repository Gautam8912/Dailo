/**
 * Food Express — js/pages/home.js
 * Homepage controller: promo carousel, quick categories and every merchandising
 * section. Each section is backed by real catalogue queries and real links —
 * no decorative buttons.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, $, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const bus = FX.bus;

  function carousel(banners) {
    const wrap = h('section', { class: 'fx-carousel', 'aria-roledescription': 'carousel', 'aria-label': 'Current offers' });
    const track = h('div', { class: 'fx-carousel-track fx-scroll-x', tabindex: '0' });
    let index = 0;
    let timer = null;

    banners.forEach((banner, i) => {
      const slide = h('a', {
        class: 'fx-slide',
        href: banner.href,
        'data-tone': banner.tone || 'brand',
        role: 'group',
        'aria-roledescription': 'slide',
        'aria-label': (i + 1) + ' of ' + banners.length + ': ' + banner.title,
      }, [
        h('div', { class: 'fx-slide-copy' }, [
          h('span', { class: 'fx-slide-eyebrow', text: banner.eyebrow || 'Food Express offer' }),
          h('h2', { text: banner.title }),
          h('p', { text: banner.subtitle }),
          h('span', { class: 'fx-btn fx-btn-accent', text: banner.cta || 'Shop now' }),
        ]),
        h('span', { class: 'fx-slide-art', 'aria-hidden': 'true', text: banner.emoji || '🛒' }),
      ]);
      track.appendChild(slide);
    });

    const dots = h('div', { class: 'fx-carousel-dots', role: 'tablist', 'aria-label': 'Choose offer' });
    banners.forEach((banner, i) => {
      dots.appendChild(
        h('button', {
          class: 'fx-carousel-dot',
          type: 'button',
          role: 'tab',
          'aria-label': banner.title,
          'aria-current': i === 0 ? 'true' : 'false',
          onClick: () => {
            go(i);
            restart();
          },
        })
      );
    });

    function go(next) {
      index = (next + banners.length) % banners.length;
      const slide = track.children[index];
      if (slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
      Array.from(dots.children).forEach((dot, i) => dot.setAttribute('aria-current', i === index ? 'true' : 'false'));
    }

    function restart() {
      if (timer) global.clearInterval(timer);
      if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      timer = global.setInterval(() => go(index + 1), 5200);
    }

    track.addEventListener('scroll', FX.u.throttle(() => {
      const slideWidth = track.children[0] ? track.children[0].offsetWidth + 16 : 1;
      const next = Math.round(track.scrollLeft / slideWidth);
      if (next !== index) {
        index = next;
        Array.from(dots.children).forEach((dot, i) => dot.setAttribute('aria-current', i === index ? 'true' : 'false'));
      }
    }, 120));
    track.addEventListener('mouseenter', () => timer && global.clearInterval(timer));
    track.addEventListener('mouseleave', restart);
    track.addEventListener('focusin', () => timer && global.clearInterval(timer));

    wrap.appendChild(track);
    wrap.appendChild(
      h('button', { class: 'fx-carousel-btn prev', type: 'button', 'aria-label': 'Previous offer', onClick: () => { go(index - 1); restart(); } }, [ui.icon('chevronLeft')])
    );
    wrap.appendChild(
      h('button', { class: 'fx-carousel-btn next', type: 'button', 'aria-label': 'Next offer', onClick: () => { go(index + 1); restart(); } }, [ui.icon('chevronRight')])
    );
    wrap.appendChild(dots);
    restart();
    return wrap;
  }

  function offerStrip() {
    const threshold = store.settings.get().freeDeliveryThreshold;
    const items = [
      { icon: '🛵', title: 'Free delivery above ' + money(threshold), sub: 'On eligible merchandise', href: 'shipping.html' },
      { icon: '🎟️', title: 'Demo coupons live', sub: 'FIRSTORDER · SAVE10 · FREESHIP', href: 'account.html?tab=coupons' },
      { icon: '⚡', title: store.location.etaLabel(0) + ' delivery window', sub: store.location.label() + ' · tap to change', href: '#', action: () => FX.components.locationModal.open() },
      { icon: '🪙', title: 'Everything under ₹99', sub: 'Snacks, dairy and daily picks', href: 'search.html?max=99' },
    ];
    return h(
      'div',
      { class: 'fx-offer-strip' },
      items.map((item) =>
        h(item.action ? 'button' : 'a', Object.assign({ class: 'fx-offer-chip', type: item.action ? 'button' : undefined }, item.href && !item.action ? { href: item.href } : {}, item.action ? { onClick: item.action } : {}), [
          h('span', { class: 'fx-offer-chip-icon', 'aria-hidden': 'true', text: item.icon }),
          h('span', { class: 'fx-offer-chip-text' }, [
            h('span', { class: 'fx-offer-chip-title', text: item.title }),
            h('span', { class: 'fx-offer-chip-sub', text: item.sub }),
          ]),
        ])
      )
    );
  }

  function categoriesGrid() {
    const grid = $('#home-category-grid');
    if (!grid) return;
    clear(grid);
    store.catalog.categories().forEach((category) => grid.appendChild(ui.categoryTile(category)));
  }

  function fbtSection() {
    const groups = FX.catalog.FBT_GROUPS.map((group) => group.map((id) => store.catalog.product(id)).filter(Boolean)).filter((g) => g.length >= 2);
    if (!groups.length) return null;
    const section = h('section', { class: 'fx-section-tight', 'aria-labelledby': 'fbt-title' });
    section.appendChild(
      ui.sectionHead('Frequently bought together', {
        id: 'fbt-title',
        emoji: '🧺',
        subtitle: 'Baskets shoppers build in one go — add the whole combo with one click.',
        href: 'search.html?sort=popular',
        linkLabel: 'Browse bestsellers',
      })
    );
    const rail = h('div', { class: 'fx-rail fx-rail-wide fx-scroll-x' });
    groups.forEach((group) => {
      const total = group.reduce((sum, item) => sum + item.price, 0);
      const card = h('div', { class: 'fx-card fx-card-pad', style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
      card.appendChild(h('div', { class: 'fx-row fx-gap-2', style: { flexWrap: 'wrap' } },
        group.map((item) =>
          h('a', { href: FX.url('product', { id: item.id }), style: { width: '64px', flex: 'none' }, title: item.name }, [
            h('img', { src: FX.media.imageFor(item), alt: item.name, loading: 'lazy', style: { width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--fx-border)' } }),
          ])
        )
      ));
      card.appendChild(
        h('div', {}, group.map((item) => h('div', { class: 'fx-xs fx-muted fx-truncate', text: item.name + ' · ' + money(item.price) })))
      );
      card.appendChild(
        h('div', { class: 'fx-row-between', style: { marginTop: 'auto' } }, [
          h('span', { class: 'fx-price', text: money(total) }),
          h('button', {
            class: 'fx-btn fx-btn-soft fx-btn-sm',
            type: 'button',
            text: 'Add all ' + group.length,
            onClick: async () => {
              let added = 0;
              for (const item of group) {
                // eslint-disable-next-line no-await-in-loop
                const result = store.cart.add(item, { qty: 1, forceSwitch: added === 0 });
                if (result.needsSwitch) {
                  const ok = await ui.confirmDialog({
                    title: 'Start a new cart?',
                    message: result.conflict.message,
                    confirmLabel: 'Replace cart',
                    danger: true,
                  });
                  if (!ok) break;
                  const forced = store.cart.add(item, { qty: 1, forceSwitch: true });
                  if (forced.ok) added += 1;
                  continue;
                }
                if (result.ok) added += 1;
              }
              if (added) ui.notify.success(added + ' items added to your cart', { action: { label: 'View cart', onClick: () => FX.components.cartDrawer.open() } });
              else ui.notify.info('Nothing was added.');
            },
          }),
        ])
      );
      rail.appendChild(card);
    });
    section.appendChild(rail);
    return section;
  }

  function brandsSection() {
    const brands = store.home.featuredBrands(12);
    if (!brands.length) return null;
    const section = h('section', { class: 'fx-section-tight', 'aria-labelledby': 'brands-title' });
    section.appendChild(
      ui.sectionHead('Featured brands', {
        id: 'brands-title',
        emoji: '🏷️',
        subtitle: 'Fictional demo brands created for this catalogue.',
        href: 'search.html?sort=popular',
        linkLabel: 'All products',
      })
    );
    const rail = h('div', { class: 'fx-rail fx-rail-narrow fx-scroll-x' });
    brands.forEach((brand) => {
      rail.appendChild(
        h('a', { class: 'fx-cat-tile', href: FX.url('search', { brand: brand.id }) }, [
          h('span', { class: 'fx-cat-icon', 'aria-hidden': 'true', text: brand.logoEmoji }),
          h('span', { text: brand.name }),
          h('span', { class: 'fx-cat-meta', text: brand.productCount + ' products' }),
        ])
      );
    });
    section.appendChild(rail);
    return section;
  }

  function restaurantsSection() {
    const list = store.home.topRestaurants(8);
    if (!list.length) return null;
    const section = h('section', { class: 'fx-section-tight', 'aria-labelledby': 'restaurants-title' });
    section.appendChild(
      ui.sectionHead('Top restaurants near you', {
        id: 'restaurants-title',
        emoji: '🍽️',
        subtitle: store.location.label() + ' · kitchens serving this location in the demo build',
        href: 'restaurants.html',
        linkLabel: 'All restaurants',
      })
    );
    section.appendChild(
      h('div', { class: 'fx-rail fx-rail-wide fx-scroll-x' }, list.map((restaurant) => ui.restaurantCard(restaurant)))
    );
    return section;
  }

  function reorderSection() {
    const items = store.home.reorderFavourites(10);
    const section = h('section', { class: 'fx-section-tight', 'aria-labelledby': 'reorder-title' });
    section.appendChild(
      ui.sectionHead('Reorder your favourites', {
        id: 'reorder-title',
        emoji: '🔁',
        subtitle: items.length ? 'From your order history — one tap to add again.' : 'Once you place an order, your repeat picks show up here.',
      })
    );
    if (items.length) {
      section.appendChild(ui.rail(items, {}));
    } else {
      section.appendChild(
        ui.emptyState({
          icon: '📦',
          title: 'No past orders yet',
          message: 'Place your first order and we will surface the items you buy most for one-tap reordering.',
          actions: [
            { label: 'Browse daily essentials', href: 'search.html?tag=essential', variant: 'primary' },
            { label: 'Order from a restaurant', href: 'restaurants.html', variant: 'outline' },
          ],
        })
      );
    }
    return section;
  }

  function recentlyViewedSection() {
    const items = store.home.recentlyViewed(10);
    if (!items.length) return null;
    const section = h('section', { class: 'fx-section-tight', 'aria-labelledby': 'recent-title' });
    section.appendChild(
      ui.sectionHead('Recently viewed', {
        id: 'recent-title',
        emoji: '🕘',
        subtitle: 'Stored on this device only.',
        action: {
          label: 'Clear',
          onClick: () => {
            store.recent.clear();
            section.remove();
            ui.notify.info('Recently viewed list cleared');
          },
        },
      })
    );
    section.appendChild(ui.rail(items, {}));
    return section;
  }

  function dealHeader() {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const wrap = h('div', { class: 'fx-deal-banner' });
    const timer = h('div', { class: 'fx-deal-timer' });
    wrap.appendChild(
      h('div', {}, [
        h('h3', { text: "Today's deals" }),
        h('p', { text: 'Hand-picked discounts across groceries, snacks, essentials and electronics.' }),
      ])
    );
    wrap.appendChild(timer);
    function tick() {
      const diff = Math.max(0, end.getTime() - Date.now());
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      clear(timer);
      [
        { v: String(hrs).padStart(2, '0'), l: 'hrs' },
        { v: String(mins).padStart(2, '0'), l: 'min' },
        { v: String(secs).padStart(2, '0'), l: 'sec' },
      ].forEach((unit, i) => {
        if (i) timer.appendChild(h('span', { text: ':' }));
        timer.appendChild(h('b', { text: unit.v }));
        timer.appendChild(h('span', { text: unit.l }));
      });
    }
    tick();
    const interval = global.setInterval(() => {
      if (!document.body.contains(wrap)) {
        global.clearInterval(interval);
        return;
      }
      tick();
    }, 1000);
    return wrap;
  }

  function render() {
    const mount = $('#home-sections');
    const banners = $('#home-banners');
    if (!mount) return;

    if (banners) {
      clear(banners);
      banners.appendChild(carousel(store.catalog.banners()));
      banners.appendChild(offerStrip());
    }
    categoriesGrid();

    clear(mount);

    const serviceable = store.location.isServiceable();
    if (!serviceable) {
      const city = store.location.city();
      mount.appendChild(
        h('div', { class: 'fx-alert fx-alert-warning', style: { margin: '16px 0' } }, [
          h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
          h('div', {}, [
            h('strong', { text: (city ? city.name : 'This city') + ' is not serviceable yet. ' }),
            document.createTextNode('You can browse the full demo catalogue, but checkout is disabled here. '),
            h('button', { class: 'fx-link-btn', type: 'button', text: 'Choose another location', onClick: () => FX.components.locationModal.open() }),
          ]),
        ])
      );
    }

    const sections = [
      ui.section('Best sellers', store.home.bestSellers(14), {
        id: 'bestsellers-title',
        emoji: '⭐',
        subtitle: 'Most-ordered products in the demo catalogue, ranked by merchandising popularity.',
        href: 'search.html?sort=popular',
        linkLabel: 'See all bestsellers',
      }),
      (() => {
        const wrap = h('section', { class: 'fx-section-tight', 'aria-labelledby': 'deals-title' });
        wrap.appendChild(
          ui.sectionHead("Today's deals", {
            id: 'deals-title',
            emoji: '🔥',
            subtitle: 'Discounted lines while stock lasts.',
            href: 'search.html?sort=discount',
            linkLabel: 'All deals',
          })
        );
        wrap.appendChild(dealHeader());
        wrap.appendChild(ui.rail(store.home.deals(14), {}));
        return wrap;
      })(),
      ui.section('Popular near you', store.home.popularNearYou(14), {
        id: 'popular-title',
        emoji: '📍',
        subtitle: 'Personalised for ' + store.location.label() + ' using demo merchandising data.',
        href: 'search.html?sort=popular',
        linkLabel: 'Explore more',
      }),
      fbtSection(),
      ui.section('Trending products', store.home.trending(14), {
        id: 'trending-title',
        emoji: '📈',
        subtitle: 'Rising fastest in the catalogue this week.',
        href: 'search.html?tag=trending',
        linkLabel: 'See trending',
      }),
      ui.section('Under ₹99', store.home.under(99, 14), {
        id: 'under99-title',
        emoji: '🪙',
        subtitle: 'Small-budget picks that still count towards free delivery.',
        href: 'search.html?max=99',
        linkLabel: 'All under ₹99',
      }),
      ui.section('Fresh arrivals', store.home.freshArrivals(14), {
        id: 'fresh-title',
        emoji: '🌱',
        subtitle: 'New lines and farm-fresh produce.',
        href: 'search.html?tag=new',
        linkLabel: 'See new arrivals',
      }),
      ui.section('Fresh fruits & vegetables', store.home.freshProduce(14), {
        id: 'produce-title',
        emoji: '🥬',
        subtitle: 'Graded, chilled and delivered in the shortest window.',
        href: 'category.html?cat=fruits-vegetables',
        linkLabel: 'Shop all produce',
      }),
      ui.section('Recommended for you', store.home.recommended(14), {
        id: 'recommended-title',
        emoji: '✨',
        subtitle: store.wishlist.count() || store.recent.items().length
          ? 'Based on your wishlist, recently viewed items and cart.'
          : 'Start adding items or saving favourites and this rail becomes personal.',
        href: 'search.html',
        linkLabel: 'Search everything',
      }),
      restaurantsSection(),
      ui.section('Daily essentials', store.home.essentials(14), {
        id: 'essentials-title',
        emoji: '🧺',
        subtitle: 'Milk, bread, atta, oil, salt — the weekly repeat list.',
        href: 'search.html?tag=essential',
        linkLabel: 'All essentials',
      }),
      reorderSection(),
      brandsSection(),
      ui.section('Seasonal offers', store.home.seasonal(12), {
        id: 'seasonal-title',
        emoji: '🎉',
        subtitle: 'Festival and season-linked lines, marked as demo promotions.',
        href: 'search.html?tag=seasonal',
        linkLabel: 'See seasonal picks',
      }),
      recentlyViewedSection(),
    ].filter(Boolean);

    sections.forEach((section) => mount.appendChild(section));

    mount.appendChild(
      h('section', { class: 'fx-section-tight' }, [
        ui.demoBanner(
          'Everything on this page is sample catalogue data: ' +
            store.catalog.products().length +
            ' products, ' +
            store.catalog.menuItems().length +
            ' restaurant dishes and ' +
            store.catalog.restaurants().length +
            ' kitchens. Ratings marked “demo” are merchandising values, not verified customer reviews.'
        ),
      ])
    );
  }

  FX.pages = FX.pages || {};
  FX.pages.home = { render };

  FX.app.onReady(() => {
    render();
    bus.on('location:changed', render);
    bus.on('cart:changed', () => {
      // Only rails that depend on cart state need a refresh.
      const recommended = $('#recommended-title');
      if (recommended && !store.recent.items().length && !store.wishlist.count()) return;
    });
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);

# Reusable components

Everything visual is built from `js/ui.js` (`FX.ui`) and `js/components/*`, so a new
page is composed rather than hand-written. All components are dependency-free,
create real DOM nodes via `FX.u.h`, and follow the `fx-` / `--fx-*` design tokens.

## Layout & chrome — `js/components/`

| Component | API | Notes |
| --- | --- | --- |
| `header` | `render()` | logo, city/address selector, live search with suggestions and recent terms, wishlist + notification + cart badges, account menu, mode pill |
| `footer` | `render()` | link columns, policy links, payment/coverage honesty note, app badges |
| `bottomNav` | `render()`, `ITEMS` | mobile tab bar with live cart badge |
| `locationModal` | `open()`, `coverageBadge(city)` | city/locality search, PIN lookup, saved addresses, coverage labels, browser geolocation (permission-aware, never required) |
| `cartDrawer` | `open()`, `renderLine(line)` | slide-over cart: lines, stepper, threshold widget, coupon, bill summary, checkout CTA |
| `listing` | `listing({ items, filters, facets, lockCategory, renderer, empty, showFilters, onFiltersChange, onRender })` → `{ element, render, state, setItems }`, plus `SORTS` | shared filter/sort/pagination shell used by category, search, wishlist and restaurant pages |

## UI kit — `FX.ui`

**Feedback & overlay** — `toast(message, opts)`, `notify.success|error|warning|info(message, opts)`
(with optional action button), `modal({ title, content, size, actions, dismissible, onClose })`,
`confirmDialog({...}) → Promise<boolean>`, `promptDialog({...}) → Promise<string|null>`,
`drawer({ side, title, content })`, `spinner(label)`.

**States** — `emptyState({ icon, title, message, actions })`, `errorState(message, onRetry)`,
`productSkeleton()`, `gridSkeleton(n)`, `railSkeleton()`, `bannerSkeleton()`,
`demoBanner(message)`, `undoRemove(line)`.

**Commerce** — `productCard(item, opts)`, `addButton(product, opts)`,
`quantityStepper(line, opts)`, `handleAdd(product, opts)`, `priceBreakdown(totals, opts)`,
`thresholdWidget(totals, opts)`, `discountBadge(percent)`, `stockBadge(stock)`,
`ratingChip(rating, { demo })`, `restaurantCard(restaurant)`, `categoryTile(category)`.

**Structure** — `section(title, items, opts)`, `sectionHead(title, opts)`,
`rail(items, opts)`, `productGrid(items, opts)`, `crumbs(entries)`,
`accordion(title, content, { meta, open })`, `tabs(container, items, { active, onChange })`,
`avatar(user, size)`, `statusBadge(status)`, `field(opts)` (+ `setFieldError`,
`clearFormErrors`, `formValues`, `setBusy`), `icon(name, className)` with `ICONS`.

**Media** — `FX.media`: `imageFor(item)`, `galleryFor(item)`, `img(item, opts)`,
`itemCard`, `restaurantCard`, `specCard`, `brandCard`, `fallback`, `toneFor(item)`,
`TONES`. Imagery is generated locally as SVG data-URIs, so there are no external
requests and no broken images; `loading="lazy"` is applied everywhere.

## Design tokens — `css/theme.css`

Brand: emerald `#1f7a4c`, amber `#f2a03d`, ink `#14201a`; container 1240px; header
68px; bottom nav 62px; breakpoints 1080 / 980 / 860 / 620px; spacing, radii,
shadows, motion (`--fx-ease`, `--fx-med`) and text scale all defined as custom
properties. `css/components.css` holds the kit, `css/layout.css` the page shells and
grids, `css/pages.css` page-specific blocks, `css/onboarding.css` the splash and
welcome flow. Reduced-motion is honoured (`prefers-reduced-motion`).

## Accessibility conventions

* semantic landmarks (`header`, `nav`, `main#fx-main`, `footer`) and a skip link;
* every control has an accessible name (`aria-label` where the label is an icon);
* modals/drawers trap focus, close on `Esc`, and restore focus to the opener;
* live regions for cart badges, quantity steppers and toasts (`aria-live="polite"`);
* form errors are announced per field with `aria-invalid` + `.fx-error-text`;
* tabs use `role="tablist"`/`tab`/`tabpanel` with `aria-selected`;
* accordions use `aria-expanded`/`aria-controls`; progress bars use
  `role="progressbar"` with `aria-valuenow`;
* all interactive elements are keyboard reachable with a visible focus ring.

## Adding a component

1. Build it in `js/ui.js` (stateless kit) or `js/components/` (stateful chrome) and
   export it from the module's public object.
2. Style it in `css/components.css` with tokens — no page-local colours.
3. Use `FX.u.h` for creation; never `innerHTML` with unescaped data (`FX.u.escapeHtml`).
4. Add it to a page and extend `tests/dom-smoke.test.js` if it introduces a new
   mount point or route.
5. Run `npm run audit` — it fails if a page references an `FX.*` member that does
   not exist.

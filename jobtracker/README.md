# Hiretrail — Job Application Tracker

A stylish, fully interactive **job application tracker** built with **React 19 + Vite**.
Two complete modules — a **user workspace** for the job hunt and an **admin console** for
running the platform — sharing one seeded demo dataset in the browser.

```bash
cd jobtracker
npm install
npm run dev          # dev server  → http://localhost:5173
```

**Already built?** The `dist/` folder in this zip is a production build. To try it with
**no install at all** (Node 18+ only):

```bash
cd jobtracker
npm run serve:dist   # → http://localhost:4173  (zero dependencies)
```

No backend, no API keys, no setup. Everything is seeded in memory and persisted to
`localStorage`, so you can click through every flow immediately.

---

## Demo accounts

| Role  | Email                   | Password    |
|-------|-------------------------|-------------|
| User  | `aarav@hiretrail.app`   | `demo1234`  |
| Admin | `admin@hiretrail.app`   | `admin1234` |

Also seeded: `priya@hiretrail.app` (designer, 8 applications) and
`rohan@hiretrail.app` (backend, 6 applications) — both use `demo1234`.
The login screen has one-tap buttons for the user and admin demos.

---

## Modules

### User workspace (`/app`)
- **Dashboard** — greeting, KPI cards, pipeline donut, 10-week volume chart, funnel,
  upcoming interview countdowns, today's tasks, high-priority roles, notification inbox.
- **Applications** — Kanban board across all six stages *and* a sortable table view,
  search, stage/source/priority filters, bulk selection, one-tap stage advance,
  quick-add form with auto follow-up task, detail drawer with editable stages,
  interview rounds, linked tasks, notes and a per-application timeline.
- **Calendar** — month grid of every interview round, upcoming list with countdowns,
  day detail popover, prep checklist.
- **Tasks** — quick add, overdue/today/upcoming/completed grouping, tick-off with
  completion metric, link tasks to applications.
- **Insights** — response and interview rates, funnel conversion, source effectiveness,
  salary bands, 6-month trend, 12-week consistency heatmap, auto-written takeaways.
- **Resumes** — resume versions with primary flag, reusable outreach templates.
- **Notifications** — interview reminders, queued tasks, admin broadcasts, read state.
- **Profile / Settings** — editable profile, weekly goal, notification preferences,
  density, full demo reset.

### Admin console (`/admin`)
- **Overview** — platform KPIs, user leaderboard, stage distribution, live activity feed,
  stale-application hygiene list, offers on the table, recent broadcasts.
- **Users** — search/filter/paginate, add user, inspect a user's whole pipeline,
  suspend/reactivate, delete (cascades applications, tasks, notifications),
  **preview as user** (real impersonation with an exit banner).
- **Applications** — read-only moderation table across all users with filters and an
  inspect dialog (owner, notes, interviews, timeline, flag for review).
- **Activity log** — grouped by day, filterable by kind, with actor avatars.
- **Broadcasts** — compose to an audience (everyone / Pro / active only), preview and
  send; recipients get real notifications in their inbox.
- **Platform settings** — brand, digest day, default goal, sign-ups toggle, maintenance
  mode, data summary, full platform reset.

---

## Tech

- **React 19** function components, hooks, context + `useReducer` store.
- **Vite 7** dev server and build; `@vitejs/plugin-react`.
- **React Router 7** with guarded user and admin route groups.
- **lucide-react** icons; **Fontsource** self-hosted fonts (Instrument Serif, Inter,
  Space Grotesk) — no runtime font CDN.
- Hand-written CSS design system (`src/styles/global.css`): warm paper palette, inky
  chrome, serif display type, chips, kanban cards, tables, modals, drawer, toasts,
  responsive down to 390px.

Charts (donut, weekly bars, funnel, heatmap, sparkline) are hand-rolled SVG/CSS —
no chart library, no extra weight.

```
src/
  main.jsx            fonts + design system + router + store
  App.jsx             routes and guards
  layouts/
    AppLayout.jsx     sidebar, topbar, quick add, admin-preview banner
    AdminLayout.jsx   dark admin chrome
  pages/
    Landing.jsx  Login.jsx  Register.jsx
    app/     Dashboard, Applications, Calendar, Tasks, Insights,
             Resumes, Notifications, Profile, Settings
    admin/   Overview, Users, Applications, Activity, Broadcast, Settings
  components/
    ui.jsx              buttons, inputs, modal, drawer, toasts, tags…
    charts.jsx          donut, volume, funnel, heatmap
    ApplicationForm.jsx create/edit modal
    ApplicationDrawer.jsx  full detail drawer
  lib/
    store.jsx    reducer, provider, selectors, persistence
    seed.js      demo dataset (relative dates, so it is always "fresh")
    constants.js statuses, sources, priorities, task kinds
    format.js    dates, currency, relative time, percentages
  styles/global.css  the whole design system
```

---

## Scripts

| Command         | What it does                              |
|-----------------|-------------------------------------------|
| `npm run dev`   | Vite dev server on `0.0.0.0:5173`         |
| `npm run build` | Production build into `dist/`             |
| `npm run preview` | Serve the build with Vite on `:4173`    |
| `npm run serve:dist` | Zero-dependency static server for `dist/` (SPA fallback) |
| `npm run test:e2e` | Playwright end-to-end suite            |
| `npm run qa:render` | Headless route smoke test (jsdom)      |

## Testing

Two layers, both runnable offline after install:

- **`npm run test:e2e`** — Playwright: public pages, auth errors, user dashboard,
  board search/drawer, create-and-persist an application, task ticking, notification
  read state, admin user suspension, admin broadcast reaching a user, preview-as-user,
  mobile sidebar. Run `npx playwright install chromium` once first.
- **`npm run qa:render`** — bundles the app with esbuild and mounts all 18 routes in
  jsdom for user, admin and empty-workspace sessions; fails on any React console error.

## What is in this zip

```
jobtracker/
  src/           all React source (pages, layouts, components, lib)
  tests/         Playwright e2e suite
  qa/            jsdom route smoke test (build-free)
  tools/         serve.mjs — zero-dependency static server
  dist/          pre-built production bundle (ready to serve)
  package.json / package-lock.json / vite.config.js / playwright.config.js
  README.md
```

`node_modules` is intentionally **not** included — run `npm install` once (or skip it
entirely and use the pre-built `dist/` via `npm run serve:dist`).

## Honest notes

This is a front-end demo, deliberately:

- Auth is a local password comparison against seeded demo credentials — **not**
  security. Sessions live in `localStorage`; new registrations are stored the same way.
- Resume upload and CSV export are stubs that say so when clicked.
- "Emails" in the admin templates screen are illustrative; broadcasts write in-app
  notifications only.
- Postman/Zepto/Razorpay etc. are seeded sample data, not real listings.

To go to production you would swap `src/lib/store.jsx` for API calls and the seed for a
real database — the components only talk to the store, so the surface area is small.

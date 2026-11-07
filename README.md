# 🍔 Food Express — React + Vite

A food ordering website with **two modules in one project**:

| Module | Pages | Who can open it |
| --- | --- | --- |
| **User** | Home, Cart, Orders, Profile, Login, Signup, Forgot Password | everyone |
| **Admin** | Admin Login, Admin Dashboard (products / orders / users) | only `role === "admin"` |

Built with **React + Vite**, the same **CSS, colours and layout** as the original
HTML/CSS/JS version, and **localStorage** for all data — so it runs with no
database and is easy to explain in a viva.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

---

## 1. Demo login details

| Role | Email | Password |
| --- | --- | --- |
| **Admin** | `admin@foodexpress.com` | `admin123` |
| **Customer** | create one on the Signup page | your choice (min 6 chars) |

* Customer login → `/login`
* Admin login → `/admin/login` (or use `/login` with the admin email — it redirects to the dashboard)

---

## 2. What changed from the old version

The design idea, colours, fonts, product list and all screens were **kept**.
Only the *plumbing* changed: hand-written DOM code became React components.

| Old (HTML + CSS + JS) | New (React + Vite) |
| --- | --- |
| 8 separate `.html` files | 1 `index.html` + React pages (`src/pages`) |
| `getElementById(...).innerHTML = "..."` | JSX + state (`useState`) |
| global `let currentCategory`, `currentSearch` | `useState` inside `Home.jsx` |
| `onclick="addToCart(1)"` in HTML strings | `onClick={() => addToCart(food)}` |
| `<a href="cart.html">` | `<Link to="/cart">` (no page reload) |
| copy-pasted header/footer on every page | `<Header />` and `<Footer />` written once (`Layout.jsx`) |
| `js/script.js` with 66 products | `src/data/foods.js` (unchanged data) |
| admin.html inline `<script>` + API calls | `src/pages/admin/AdminDashboard.jsx` + localStorage |
| `style.css` | `src/styles/style.css` — **byte-for-byte identical** |

The old static site is **not deleted** — it is archived in
[`legacy-static/`](legacy-static) so you can compare before/after and reuse its
CSS. Your optional Express backend is still in `backend/`.

---

## 3. Project structure (what to show in the viva)

```
Dailo/
├── index.html                  ← Vite entry, contains <div id="root">
├── public/                     ← static files copied as-is into dist/
│   ├── favicon.svg
│   ├── robots.txt
│   └── images/
│       └── food-placeholder.jpg   ← local fallback image for food cards
├── vite.config.js              ← Vite + React plugin
├── vercel.json                 ← SPA rewrite so /cart works on Vercel
├── package.json
│
├── src/
│   ├── main.jsx                ← ReactDOM.createRoot(...).render(<App />)
│   ├── App.jsx                 ← ALL routes in one place
│   │
│   ├── context/
│   │   └── AppContext.jsx      ← global state: user, cart, products, orders, toasts
│   │
│   ├── services/               ← "business logic", no UI here
│   │   ├── storage.js          ← small localStorage read/write helpers
│   │   ├── authService.js      ← signup / login / logout / forgot password / users
│   │   ├── productService.js   ← product add / edit / delete
│   │   ├── cartService.js      ← cart add / remove / qty / totals
│   │   └── orderService.js     ← place order / status / stats
│   │
│   ├── data/
│   │   └── foods.js            ← the 66 dishes + 9 categories (from old script.js)
│   │
│   ├── components/
│   │   ├── Header.jsx          ← logo, nav, cart badge, Login/Logout
│   │   ├── Footer.jsx
│   │   ├── Layout.jsx          ← header + <Outlet /> + footer
│   │   ├── AuthLayout.jsx      ← header only (login/signup pages)
│   │   ├── FoodCard.jsx        ← one product tile
│   │   ├── ToastContainer.jsx  ← popup messages
│   │   ├── RouteGuards.jsx     ← ProtectedRoute (user) + AdminRoute (admin)
│   │   └── ScrollToTop.jsx
│   │
│   ├── pages/
│   │   ├── Home.jsx            ← hero, categories, search, product grid
│   │   ├── Cart.jsx            ← cart + checkout + success modal
│   │   ├── Orders.jsx          ← my orders
│   │   ├── Profile.jsx         ← my profile
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── NotFound.jsx        ← 404
│   │   └── admin/
│   │       ├── AdminLogin.jsx      ← separate admin entry
│   │       └── AdminDashboard.jsx  ← stats · orders · foods · users
│   │
│   └── styles/
│       ├── style.css           ← the ORIGINAL stylesheet, untouched
│       └── extra.css           ← only the new bits (admin layout, status colours)
│
├── backend/                    ← optional Express + MongoDB API (not needed for the demo)
├── shared/                     ← seed catalogue used by that optional backend
├── docs/                       ← API.md, DEPLOYMENT.md, VIVA_GUIDE.md
└── legacy-static/              ← the old HTML/CSS/JS site, archived
```

---

## 4. All routes

| URL | Page | Access |
| --- | --- | --- |
| `/` | Home (hero + 66 products + search) | public |
| `/cart` | Cart + checkout | public (login needed to place the order) |
| `/login` | User login | public |
| `/register` | Signup | public |
| `/forgot-password` | Reset password | public |
| `/orders` | My orders | **logged-in user** |
| `/profile` | My profile | **logged-in user** |
| `/admin/login` | Admin login | public |
| `/admin` | Admin dashboard | **admin only** |
| `*` | 404 page | public |

If a guest opens `/orders`, `ProtectedRoute` sends them to `/login`.
If a customer (or a guest) opens `/admin`, `AdminRoute` sends them to `/admin/login`.

---

## 5. How login / signup works (localStorage)

```
Signup  →  authService.signup()  →  saves to  localStorage["fx_users"]   (array)
Login   →  authService.login()   →  finds the matching email + password
                                 →  saves to  localStorage["fx_session"] (object)
Logout  →  localStorage.removeItem("fx_session")
```

localStorage keys used by the app:

| Key | What it stores |
| --- | --- |
| `fx_foods` | product catalogue (admin can add / edit / delete) |
| `fx_users` | all accounts (`role: "user"` or `"admin"`) |
| `fx_session` | who is logged in right now |
| `fx_cart` | the current cart |
| `fx_orders` | every placed order |

> ⚠️ This is a **college demo**: passwords are stored as plain text in the
> browser, which is fine offline but never acceptable on a real site. A real
> backend hashes them (`backend/` already does this with bcrypt).

To reset the demo, open DevTools → Application → Local Storage → delete the `fx_*` keys.

### About the food images

The 66 dishes point at the same **Unsplash** photo URLs the original project used
(45 unique photos), so the pictures need an internet connection the first time.
If a photo ever fails to load, `FoodCard` swaps in the **bundled**
`public/images/food-placeholder.jpg` instead of showing a broken image — that file
is part of this project, so no page is ever blank. To use your own photos, drop
them in `public/images/` and change the `image` field in `src/data/foods.js` or use
the admin panel's **Image URL** field.

---

## 6. Admin features

* **Dashboard** — total users, foods, orders, revenue + the 5 latest orders.
* **Orders** — filter by status, change status (`Placed → Confirmed → Preparing →
  Out for Delivery → Delivered` or `Cancelled`), delete an order.
* **Foods** — **Add**, **Edit** and **Delete** products; changes appear on the
  customer Home page instantly (same localStorage list).
* **Users** — see every customer with their order count, remove an account.

---

## 7. Deploy to Vercel

1. Push the project to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo.
3. Vercel detects Vite automatically:
   * Framework preset: **Vite**
   * Build command: `npm run build`
   * Output directory: `dist`
4. Click **Deploy**.

`vercel.json` already adds the rewrite `/(.*) → /index.html`, which is what makes
a direct visit to `/cart` or `/admin` work (React Router handles the path in the
browser). No environment variables are needed.

**Netlify / GitHub Pages?** Same idea — build with `npm run build`, publish
`dist/`, and add the SPA redirect to `index.html`.

---

## 8. Optional backend

`backend/` still contains the Express + MongoDB API from the previous version.
Nothing in the React app calls it — the app is localStorage-only on purpose so
that it always runs, even on Vercel without a database.

```bash
cd backend
npm install
cp .env.example .env     # set MONGO_URI + JWT_SECRET
npm run seed
npm start                # http://localhost:5000/api/health
```

---

## 9. Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | start Vite dev server with hot reload |
| `npm run build` | production build into `dist/` |
| `npm run preview` | preview the production build locally |
| `cd backend && npm start` | run the optional API |

---

## 10. More docs

* [`docs/VIVA_GUIDE.md`](docs/VIVA_GUIDE.md) — every question your examiner may
  ask, with short answers and file names to point at.
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel / Netlify / backend setup.
* [`docs/API.md`](docs/API.md) — endpoints of the optional backend.

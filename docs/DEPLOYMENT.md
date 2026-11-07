# Deployment — Food Express (React + Vite)

The React app is a **static single-page app**: after `npm run build` everything is
plain HTML + CSS + JS in `dist/`. No server or database is required (all demo data
lives in the browser's localStorage).

---

## 1. Local development

```bash
npm install
npm run dev          # http://localhost:5173
```

Useful reset: DevTools → Application → Local Storage → delete keys starting with
`fx_` (or run `localStorage.clear()` in the console).

---

## 2. Production build

```bash
npm run build        # → dist/
npm run preview      # serve dist/ locally at http://localhost:4173
```

---

## 3. Vercel (recommended)

1. Push the repo to GitHub.
2. Vercel → **Add New… → Project** → **Import** the repository.
3. Settings (Vercel normally fills these in by itself):
   * Framework preset: **Vite**
   * Build command: `npm run build`
   * Output directory: `dist`
   * Install command: `npm install`
4. **Deploy**.

`vercel.json` already contains the SPA rewrite:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Why it matters: on Vercel, `/cart` is a *real file path* the server tries to
find. The rewrite makes the server always return `index.html`, and React Router
then shows the right page in the browser. Without it, refreshing `/cart` gives a
404.

**Command line alternative**

```bash
npm i -g vercel
vercel            # preview deployment
vercel --prod     # production deployment
```

---

## 4. Netlify

* Build command: `npm run build`
* Publish directory: `dist`
* Add a file `public/_redirects` containing:
  ```
  /*  /index.html  200
  ```

---

## 5. GitHub Pages

`/cart` style routes need a fallback. Simplest path: build with Vite, then copy
`dist/index.html` to `dist/404.html` so GitHub Pages serves the app for any
unknown path. If you publish under `https://user.github.io/repo/`, also set
`base: '/repo/'` in `vite.config.js`.

---

## 6. Optional Express API (not needed for the demo)

The `backend/` folder still works if you want a real server in your report.

```bash
cd backend
npm install
cp .env.example .env       # set MONGO_URI and JWT_SECRET
npm run seed               # creates demo data + accounts
npm start                  # http://localhost:5000/api/health
```

Required variables (only for the backend):

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | secret used to sign tokens (32+ random chars) |
| `PORT` | API port (default 5000) |
| `CORS_ORIGINS` | comma-separated frontend origins |

To host it, deploy `backend/` to Render / Railway / Fly.io and use MongoDB Atlas
for the database. The React app itself does not call the API, so the frontend
deployment stays a simple static build.

---

## 7. Checklist before submitting

- [ ] `npm install && npm run build` succeeds with no errors.
- [ ] `npm run dev` → home page shows 66 products.
- [ ] Signup → login → add to cart → place order → order appears in My Orders.
- [ ] `/admin/login` with `admin@foodexpress.com / admin123` → add / edit / delete a product.
- [ ] Logout → visiting `/orders` redirects to login; visiting `/admin` redirects to admin login.
- [ ] `dist/` is **not** committed (it is in `.gitignore`).
- [ ] `node_modules/` is not committed.

# Running and deploying Food Express

## 1. Storefront only (zero dependencies)

```bash
npm start                 # → http://localhost:4173  (PORT=8080 to change)
```

`tools/serve.js` is a dependency-free static server: it binds `0.0.0.0`, serves the
generated HTML/CSS/JS, returns real 404s from `404.html`, and proxies `/api/*` to
the backend (default `http://127.0.0.1:5000`). Everything works in **demo mode**
with no database, no build step and no network access.

Any static host works too (Netlify, Vercel, S3, nginx) — upload the repository root
and point `/api` at the API host.

## 2. API + MongoDB

```bash
npm install                                  # express, mongoose, bcryptjs, jwt, helmet, cors, rate-limit, dotenv
cp backend/.env.example backend/.env         # then edit the values
npm run seed                                 # seeds categories, products, menu items,
                                             # restaurants, coupons, settings, demo accounts
npm run backend                              # → http://localhost:5000/api/health
```

Then enable backend mode in the storefront: set `USE_BACKEND = true` in
`js/config.js` (or serve the app with that flag overridden) and reload — the header
shows **Backend connected** instead of **Demo data**.

### Required environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | **yes** | MongoDB connection string |
| `JWT_SECRET` | **yes** | JWT signing secret (≥32 chars in production) |
| `PORT` | no | API port (default 5000) |
| `NODE_ENV` | no | `development` \| `production` \| `test` |
| `CORS_ORIGINS` | recommended | comma-separated storefront origins |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` | no | rate limiting |
| `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` / `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` | no | seeded demo accounts |
| `SEED_DEMO_ACCOUNTS` | no | must be `false` in production |
| `ALLOW_WITHOUT_DATABASE` | no | CI/demo only: run without MongoDB |
| `PAYMENT_MODE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | no | gateway integration (not implemented — see below) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | no | real password-reset emails |

The server **refuses to start** with a missing `MONGO_URI` or `JWT_SECRET`, with a
short `JWT_SECRET` in production, or with `SEED_DEMO_ACCOUNTS=true` in production.

## 3. Payments

No gateway is integrated. `demo` and `cod` are the only accepted methods; `upi`
and `card` are refused with `422 PAYMENT_METHOD_UNAVAILABLE`. To accept real money:

1. add the provider SDK and keys to `backend/.env`;
2. implement `verifyGatewayPayment()` in `backend/src/services/payment.service.js`
   — verify the signature, re-fetch the payment from the provider, compare the
   amount with `order.totals.grandTotal`, and only then return `{ verified, ref }`;
3. add a webhook route that repeats the same verification and marks the order paid;
4. set `PAYMENT_MODE` away from `demo` so `capabilities.gatewayPayments` becomes
   true and the storefront offers the method.

The frontend never declares a payment successful on its own.

## 4. Production checklist

- [ ] `MONGO_URI` points at a replica set / Atlas cluster with backups
- [ ] `JWT_SECRET` is a long random string, unique per environment, rotated on leak
- [ ] `NODE_ENV=production`, `SEED_DEMO_ACCOUNTS=false`, demo accounts removed or
      their passwords changed
- [ ] `CORS_ORIGINS` lists only your storefront origins
- [ ] HTTPS termination in front of both the API and the static site
- [ ] Rate limits tuned to real traffic; logs shipped to your platform
- [ ] `PAYMENT_MODE` and gateway verification implemented **or** the demo/COD
      labelling left in place
- [ ] Policy pages (privacy, terms, shipping, refunds) reviewed by counsel — they
      ship as draft business content
- [ ] Product imagery/licence review: the build generates placeholder SVGs locally,
      so no third-party image hotlinking is required
- [ ] `npm run verify` passes (build → syntax → API audit → 81 tests)

## 5. Operations

```bash
npm run build:pages    # regenerate root HTML after editing src/pages/*.body.html
npm run audit          # static check: every FX.* member used exists
npm run check          # node --check over all JS
npm test               # 81 tests (frontend DOM + flows, backend services + HTTP)
npm run verify         # all of the above
npm run api:nodb       # API without MongoDB (seeded fallback + honest 503s)
```

Health check for uptime monitoring: `GET /api/health` → `200` with
`data.database === "connected"`.

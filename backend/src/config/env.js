/**
 * Food Express API — environment configuration.
 *
 * Every secret comes from the environment; nothing sensitive is hard-coded or
 * committed. `backend/.env.example` documents the full list.
 */
'use strict';

const path = require('path');

// dotenv is optional so the pure-logic tests can run without dependencies.
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
} catch (err) {
  /* dotenv not installed — rely on the real process environment. */
}

function int(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function bool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isTest: process.env.NODE_ENV === 'test',
  isProduction: process.env.NODE_ENV === 'production',
  port: int(process.env.PORT, 5000),

  mongoUri: process.env.MONGO_URI || '',

  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  corsOrigins: String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),

  rateLimit: {
    windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: int(process.env.RATE_LIMIT_MAX, 600),
    authMax: int(process.env.AUTH_RATE_LIMIT_MAX, 20),
  },

  demo: {
    adminEmail: (process.env.DEMO_ADMIN_EMAIL || 'admin@foodexpress.com').toLowerCase(),
    adminPassword: process.env.DEMO_ADMIN_PASSWORD || 'admin123',
    userEmail: (process.env.DEMO_USER_EMAIL || 'user@test.com').toLowerCase(),
    userPassword: process.env.DEMO_USER_PASSWORD || 'user123',
    seedAccounts: bool(process.env.SEED_DEMO_ACCOUNTS, true),
  },

  /**
   * Explicit opt-in to run without MongoDB (CI, demos, and the seeded-fallback
   * catalogue routes). Off by default: a real deployment must have a database.
   */
  allowWithoutDatabase: bool(process.env.ALLOW_WITHOUT_DATABASE, false),

  payments: {
    // 'demo' is the only implemented mode. A gateway integration must verify
    // its signature server-side before an order is marked paid.
    mode: (process.env.PAYMENT_MODE || 'demo').toLowerCase(),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || null,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || null,
  },

  smtp: {
    host: process.env.SMTP_HOST || null,
    port: int(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.MAIL_FROM || null,
  },
};

env.smtp.enabled = Boolean(env.smtp.host && env.smtp.user);
env.payments.gatewayConfigured = Boolean(
  env.payments.mode !== 'demo' && env.payments.razorpayKeyId && env.payments.razorpayKeySecret
);

/**
 * Fail fast with an actionable message instead of starting a server that
 * silently accepts unsigned tokens or cannot reach the database.
 */
function assertRuntimeConfig(options) {
  const opts = options || {};
  const problems = [];
  if (!env.mongoUri && !opts.skipDatabase && !env.allowWithoutDatabase) {
    problems.push('MONGO_URI is not set — the API cannot reach a database (set ALLOW_WITHOUT_DATABASE=true to run the read-only seeded fallback).');
  }
  if (!env.jwtSecret) problems.push('JWT_SECRET is not set — sessions cannot be signed.');
  else if (env.isProduction && env.jwtSecret.length < 32) {
    problems.push('JWT_SECRET is too short for production (use at least 32 characters).');
  }
  if (env.isProduction && env.demo.seedAccounts) {
    problems.push('SEED_DEMO_ACCOUNTS must be disabled in production.');
  }
  return problems;
}

module.exports = { env, assertRuntimeConfig };

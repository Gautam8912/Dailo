#!/usr/bin/env node
/**
 * Food Express API — entry point.
 *
 *   node backend/src/server.js        (or: npm run backend)
 *
 * Refuses to start with a missing MONGO_URI/JWT_SECRET so a misconfigured
 * deployment fails loudly instead of silently serving unsigned sessions.
 */
'use strict';

const { env, assertRuntimeConfig } = require('./config/env');
const { connect, disconnect } = require('./config/db');
const { createApp } = require('./app');

async function main() {
  const problems = assertRuntimeConfig();
  if (problems.length) {
    problems.forEach((problem) => process.stderr.write('✗ ' + problem + '\n'));
    process.stderr.write('\nCopy backend/.env.example to backend/.env and fill in the values, then retry.\n');
    process.exit(1);
  }

  if (env.allowWithoutDatabase && !env.mongoUri) {
    // eslint-disable-next-line no-console
    console.log('[api] ALLOW_WITHOUT_DATABASE=true — starting without MongoDB.');
    // eslint-disable-next-line no-console
    console.log('[api] Health checks and the seeded catalogue fallback are served; every write route answers 503 DATABASE_UNAVAILABLE.');
  } else {
    await connect();
    // eslint-disable-next-line no-console
    console.log('[api] MongoDB connected:', env.mongoUri.replace(/\/\/[^@]+@/, '//***@'));

    if (env.demo.seedAccounts) {
      const seed = require('../seed/seed');
      const result = await seed.run({ quiet: true });
      // eslint-disable-next-line no-console
      console.log('[api] seed:', JSON.stringify(result.counts));
    }
  }

  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log('[api] Food Express API → http://localhost:' + env.port + '/api/health');
    // eslint-disable-next-line no-console
    console.log('[api] payments:', env.payments.gatewayConfigured ? 'gateway configured' : 'demo/COD only (no gateway configured)');
  });

  async function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log('\n[api] ' + signal + ' — shutting down.');
    server.close(async () => {
      await disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('[api] unhandled rejection:', reason);
  });
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write('✗ The API could not start: ' + (err && err.message ? err.message : err) + '\n');
    process.exit(1);
  });
}

module.exports = { main };

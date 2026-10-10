/**
 * Food Express API — application assembly.
 *
 * Exported separately from server.js so tests can build the app (and make real
 * HTTP requests against it) without connecting to MongoDB or binding a port.
 */
'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { env } = require('./config/env');
const { router: apiRouter } = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp(options) {
  const opts = options || {};
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // API returns JSON; the storefront sets its own headers
      crossOriginResourcePolicy: { policy: 'same-site' },
    })
  );

  if (env.corsOrigins.length) {
    app.use(
      cors({
        origin(origin, callback) {
          if (!origin || env.corsOrigins.includes(origin) || env.corsOrigins.includes('*')) return callback(null, true);
          callback(new Error('Origin ' + origin + ' is not allowed by CORS_ORIGINS.'));
        },
        credentials: true,
      })
    );
  }

  app.use(express.json({ limit: opts.bodyLimit || '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: opts.bodyLimit || '256kb' }));

  // Lightweight request log (skip in tests to keep output readable).
  if (!opts.quiet && !env.isTest) {
    app.use((req, res, next) => {
      const started = Date.now();
      res.on('finish', () => {
        // eslint-disable-next-line no-console
        console.log('[api]', req.method, req.originalUrl, res.statusCode, Date.now() - started + 'ms');
      });
      next();
    });
  }

  app.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'Food Express API',
        version: '3.0.0',
        health: '/api/health',
        notice: 'This API persists the Food Express storefront. Payments, GPS tracking and reviews are not implemented — see /api/health capabilities.',
      },
    });
  });

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

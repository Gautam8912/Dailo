/**
 * Rate limiting — protects auth and write endpoints from abuse.
 */
'use strict';

const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

const message = (text) => ({ success: false, error: 'RATE_LIMITED', message: text });

const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many requests from this device. Please slow down and try again shortly.'),
});

const authLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: message('Too many sign-in attempts. Wait a few minutes and try again.'),
});

const writeLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many write requests. Please try again shortly.'),
});

module.exports = { apiLimiter, authLimiter, writeLimiter };

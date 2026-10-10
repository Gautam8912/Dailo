/**
 * Auth middleware — the trusted layer.
 *
 * Hiding an admin button in the UI is not security: every privileged route
 * goes through `protect` (valid JWT → req.user) and `requireRole` (role check).
 */
'use strict';

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/User');
const { ApiError } = require('../utils/ApiError');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (/^Bearer\s+/i.test(header)) return header.replace(/^Bearer\s+/i, '').trim();
  if (req.headers['x-access-token']) return String(req.headers['x-access-token']);
  return null;
}

async function protect(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new ApiError(401, 'Sign in to continue.', { code: 'NO_TOKEN' });
    if (!env.jwtSecret) throw new ApiError(500, 'The server is missing JWT_SECRET.', { code: 'SERVER_MISCONFIGURED' });

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Your session has expired. Please sign in again.' : 'That session token is not valid.';
      throw new ApiError(401, message, { code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID' });
    }

    const user = await User.findById(payload.sub);
    if (!user) throw new ApiError(401, 'That account no longer exists.', { code: 'USER_NOT_FOUND' });
    if (user.isLocked && user.isLocked()) {
      throw new ApiError(423, 'This account is temporarily locked after repeated failed sign-ins. Try again later.', { code: 'ACCOUNT_LOCKED' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

/** Role gate: `requireRole('admin')` or `requireRole('admin', 'staff')`. */
function requireRole(...roles) {
  const allowed = roles.flat().map(String);
  return function roleGate(req, res, next) {
    if (!req.user) return next(new ApiError(401, 'Sign in to continue.', { code: 'NO_SESSION' }));
    if (!allowed.includes(String(req.user.role))) {
      return next(new ApiError(403, 'Your account does not have permission to do that.', { code: 'FORBIDDEN', requiredRoles: allowed }));
    }
    next();
  };
}

/** Optional session: attaches req.user when a valid token is present. */
async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token || !env.jwtSecret) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (user) {
      req.user = user;
      req.token = token;
    }
  } catch (err) {
    // An invalid token simply means "guest" for optional routes.
  }
  next();
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

module.exports = { protect, requireRole, optionalAuth, signToken, extractToken };

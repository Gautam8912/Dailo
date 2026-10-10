/**
 * dbGuard — refuses database-backed routes with an honest 503 when MongoDB is
 * not connected, instead of letting a query hang until it times out.
 */
'use strict';

const { isConnected } = require('../config/db');
const { ApiError } = require('./ApiError');

function requireDatabase(req, res, next) {
  if (isConnected()) return next();
  next(
    new ApiError(503, 'The Food Express API cannot reach its database right now, so this request was not served. Set MONGO_URI and start MongoDB, or keep the storefront in local demo mode.', {
      code: 'DATABASE_UNAVAILABLE',
    })
  );
}

module.exports = { requireDatabase };

/**
 * Error handling — one consistent JSON envelope, no stack traces leaked.
 */
'use strict';

const mongoose = require('mongoose');
const { ApiError } = require('../utils/ApiError');
const { env } = require('../config/env');

function notFound(req, res, next) {
  next(new ApiError(404, 'No API route matches ' + req.method + ' ' + req.originalUrl, { code: 'ROUTE_NOT_FOUND' }));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    const fields = {};
    Object.keys(err.errors).forEach((key) => {
      fields[key] = err.errors[key].message;
    });
    error = new ApiError(422, 'Some values need attention.', { code: 'VALIDATION', fields });
  } else if (err instanceof mongoose.Error.CastError) {
    error = new ApiError(400, 'That identifier is not valid.', { code: 'CAST_ERROR', field: err.path });
  } else if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || { value: 1 })[0];
    error = new ApiError(409, 'That ' + field + ' is already registered.', { code: 'DUPLICATE_KEY', field });
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(err.status || err.statusCode || 500, err.message || 'Something went wrong.', { code: 'INTERNAL' });
  }

  const status = error.status || 500;
  if (status >= 500) {
    // Log server faults with their stack; never send the stack to the client.
    // eslint-disable-next-line no-console
    console.error('[api]', req.method, req.originalUrl, err && err.stack ? err.stack : err);
  }

  res.status(status).json({
    success: false,
    error: error.details && error.details.code ? error.details.code : 'ERROR',
    message: status >= 500 && env.isProduction ? 'Something went wrong on our side.' : error.message,
    details: error.details || undefined,
  });
}

module.exports = { notFound, errorHandler };

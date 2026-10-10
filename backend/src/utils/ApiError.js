/**
 * ApiError — an operational error with an HTTP status and a machine code.
 */
'use strict';

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = Number(status) || 500;
    this.details = details || null;
    this.expose = true;
  }

  static badRequest(message, details) {
    return new ApiError(400, message || 'That request is not valid.', details);
  }

  static unauthorized(message, details) {
    return new ApiError(401, message || 'Sign in to continue.', details);
  }

  static forbidden(message, details) {
    return new ApiError(403, message || 'You do not have permission to do that.', details);
  }

  static notFound(message, details) {
    return new ApiError(404, message || 'Not found.', details);
  }

  static conflict(message, details) {
    return new ApiError(409, message || 'That already exists.', details);
  }

  static unprocessable(message, details) {
    return new ApiError(422, message || 'Those values could not be saved.', details);
  }
}

module.exports = { ApiError };

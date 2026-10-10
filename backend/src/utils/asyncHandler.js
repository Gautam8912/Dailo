/**
 * asyncHandler — forwards rejected promises to the error middleware so route
 * handlers stay readable (no try/catch boilerplate).
 */
'use strict';

module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

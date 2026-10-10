/**
 * /api/auth — registration, sign-in, profile, passwords.
 */
'use strict';

const express = require('express');
const authService = require('../services/auth.service');
const notifications = require('../services/notification.service');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { ApiError } = require('../utils/ApiError');
const { constants } = require('../services/shared');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body || {});
    await notifications.push({
      user: result.user.id,
      kind: constants.NOTIFICATION_KINDS.ACCOUNT,
      title: 'Welcome to Food Express',
      message: 'Your account is ready. Add a delivery address to speed up checkout.',
      href: 'account.html?tab=addresses',
    }).catch(() => null);
    return res.status(201).json({ success: true, data: result });
  })
);

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, phone, password, remember } = req.body || {};
    const result = await authService.login(email || phone, password, { remember });
    return ok(res, result);
  })
);

router.get('/profile', protect, asyncHandler(async (req, res) => ok(res, { user: authService.publicUser(req.user) })));

router.put(
  '/profile',
  protect,
  asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user, req.body || {});
    return ok(res, { user });
  })
);

router.post(
  '/change-password',
  protect,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) throw ApiError.badRequest('Enter your current password and the new one.', { code: 'MISSING_PASSWORDS' });
    await authService.changePassword(req.user, currentPassword, newPassword);
    await notifications.push({
      user: req.user,
      kind: constants.NOTIFICATION_KINDS.ACCOUNT,
      title: 'Password updated',
      message: 'Your Food Express password was changed. If this was not you, contact support.',
      href: 'support.html',
    }).catch(() => null);
    return ok(res, { ok: true });
  })
);

router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword((req.body || {}).email || (req.body || {}).identifier);
    return ok(res, result);
  })
);

router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, token, code, password } = req.body || {};
    const result = await authService.resetPassword(email, token || code, password);
    return ok(res, result);
  })
);

/**
 * Logout: the token is a stateless JWT, so the client discards it. The endpoint
 * exists so the UI has an explicit acknowledgement (and so a token blocklist
 * can be added later without changing the contract).
 */
router.post('/logout', protect, asyncHandler(async (req, res) => ok(res, { ok: true, note: 'Stateless JWT sessions are discarded by the client; no server session is stored.' })));

module.exports = router;

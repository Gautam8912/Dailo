/**
 * /api/notifications — in-app notification centre.
 */
'use strict';

const express = require('express');
const notifications = require('../services/notification.service');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { ApiError } = require('../utils/ApiError');

const router = express.Router();
router.use(protect);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([notifications.listFor(req.user, req.query), notifications.unreadCount(req.user)]);
    return ok(res, items, { unread });
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => ok(res, await notifications.markAllRead(req.user)))
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const updated = await notifications.markRead(req.user, req.params.id);
    if (!updated) throw ApiError.notFound('That notification does not exist.', { code: 'NOTIFICATION_NOT_FOUND' });
    return ok(res, updated);
  })
);

router.delete('/', asyncHandler(async (req, res) => ok(res, await notifications.clearAll(req.user))));

module.exports = router;

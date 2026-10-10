/**
 * Notification service — in-app notification records.
 * No SMS/push/email provider is connected; nothing is claimed that is not sent.
 */
'use strict';

const Notification = require('../models/Notification');
const { constants } = require('./shared');

async function push(payload) {
  const record = await Notification.create({
    user: payload.user ? payload.user._id || payload.user : null,
    kind: payload.kind || constants.NOTIFICATION_KINDS.ORDER,
    title: payload.title || 'Update',
    message: payload.message || '',
    href: payload.href || null,
    orderNumber: payload.orderNumber || null,
  });
  return record.toObject();
}

async function listFor(user, options) {
  const opts = options || {};
  const filter = { user: user._id };
  if (opts.unreadOnly) filter.read = false;
  if (opts.kind) filter.kind = opts.kind;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(opts.limit) || 60, 200)).lean();
}

async function unreadCount(user) {
  return Notification.countDocuments({ user: user._id, read: false });
}

async function markRead(user, id) {
  return Notification.findOneAndUpdate({ _id: id, user: user._id }, { $set: { read: true, readAt: new Date() } }, { new: true }).lean();
}

async function markAllRead(user) {
  const result = await Notification.updateMany({ user: user._id, read: false }, { $set: { read: true, readAt: new Date() } });
  return { updated: result.modifiedCount || 0 };
}

async function clearAll(user) {
  const result = await Notification.deleteMany({ user: user._id });
  return { deleted: result.deletedCount || 0 };
}

module.exports = { push, listFor, unreadCount, markRead, markAllRead, clearAll };

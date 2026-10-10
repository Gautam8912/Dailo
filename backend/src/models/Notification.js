/**
 * Notification — in-app notification centre records.
 * No SMS/push provider is wired up; the API only stores what the UI shows.
 */
'use strict';

const mongoose = require('mongoose');
const { constants } = require('../services/shared');

const KINDS = constants.NOTIFICATION_KIND_LIST;

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    kind: { type: String, enum: KINDS, default: constants.NOTIFICATION_KINDS.ORDER },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, default: '', maxlength: 500 },
    href: { type: String, default: null },
    orderNumber: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

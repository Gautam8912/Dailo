/**
 * SupportTicket — help requests raised from the support or contact pages.
 * No external inbox/CRM is connected: the ticket lives in this database.
 */
'use strict';

const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    userName: { type: String, default: '' },
    contact: { type: String, required: true },
    topic: { type: String, required: true },
    topicLabel: { type: String, default: '' },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 4000 },
    orderNumber: { type: String, default: null },
    source: { type: String, default: 'support-page' },
    status: { type: String, enum: ['open', 'pending', 'resolved', 'closed'], default: 'open', index: true },
    replies: {
      type: [{ _id: false, by: { type: String, enum: ['customer', 'team'] }, message: String, at: { type: Date, default: Date.now } }],
      default: [],
    },
  },
  { timestamps: true }
);

ticketSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', ticketSchema);

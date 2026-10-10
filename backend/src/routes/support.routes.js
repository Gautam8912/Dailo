/**
 * /api/support — help tickets. No external inbox is connected; the ticket is
 * stored here and listed back to the person who raised it.
 */
'use strict';

const express = require('express');
const SupportTicket = require('../models/SupportTicket');
const { optionalAuth } = require('../middleware/auth');
const { requireDatabase } = require('../utils/dbGuard');
const { writeLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { ApiError } = require('../utils/ApiError');
const { content } = require('../services/shared');

const router = express.Router();

function ticketNumber() {
  return 'FXS-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
}

router.get(
  '/tickets',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) return ok(res, []);
    const docs = await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    return ok(res, docs.map(toClient));
  })
);

router.post(
  '/tickets',
  requireDatabase,
  optionalAuth,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const topic = (content.SUPPORT_TOPICS || []).find((entry) => entry.id === body.topic);
    const message = String(body.message || '').trim();
    const subject = String(body.subject || '').trim();
    if (subject.length < 4) throw ApiError.unprocessable('Add a subject of at least 4 characters.', { code: 'VALIDATION', fields: { subject: 'Add a subject.' } });
    if (message.length < 10) throw ApiError.unprocessable('Describe the issue in at least 10 characters.', { code: 'VALIDATION', fields: { message: 'Add more detail.' } });
    const contact = String(body.contact || (req.user ? req.user.email : '')).trim();
    if (!contact) throw ApiError.unprocessable('Add an email or phone number we can reply to.', { code: 'VALIDATION', fields: { contact: 'Required.' } });

    const ticket = await SupportTicket.create({
      ticketNumber: ticketNumber(),
      user: req.user ? req.user._id : null,
      userName: req.user ? req.user.name : String(body.name || 'Guest'),
      contact,
      topic: body.topic || 'other',
      topicLabel: topic ? topic.label : 'Other',
      subject: subject.slice(0, 120),
      message: message.slice(0, 4000),
      orderNumber: body.orderNumber || body.orderId || null,
      source: body.source || 'support-page',
      replies: [],
    });
    return created(
      res,
      Object.assign(toClient(ticket.toObject()), {
        note: 'This ticket is stored by the Food Express API. No external support inbox or CRM is connected in this build, so no response-time promise is made.',
      })
    );
  })
);

function toClient(doc) {
  const copy = Object.assign({}, doc);
  copy.id = copy.ticketNumber;
  delete copy._id;
  delete copy.__v;
  delete copy.ticketNumber;
  if (copy.user) copy.user = String(copy.user);
  return copy;
}

module.exports = router;

/**
 * Category — the storefront taxonomy (seeded from shared/catalog.js).
 */
'use strict';

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    categoryId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true },
    emoji: { type: String, default: '' },
    color: { type: String, default: '#1f7a4c' },
    gstRate: { type: Number, default: 0, min: 0, max: 0.5 },
    handlingMinutes: { type: Number, default: 10, min: 0 },
    blurb: { type: String, default: '' },
    order: { type: Number, default: 100 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);

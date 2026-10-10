/**
 * Restaurant — partner records (seeded demo partners in this build).
 * Menu items live in the Product collection with type 'menu-item'.
 */
'use strict';

const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    cuisines: { type: [String], default: [] },
    pureVeg: { type: Boolean, default: false },
    cityIds: { type: [String], default: [], index: true },
    area: { type: String, default: '' },
    /** Demo merchandising rating — not a verified customer rating. */
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    etaMinutes: { type: Number, default: 30, min: 5 },
    minOrder: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    packingFee: { type: Number, default: 0, min: 0 },
    emoji: { type: String, default: '🍽️' },
    tone: { type: String, default: 'brand' },
    promoted: { type: Boolean, default: false },
    offers: { type: [String], default: [] },
    hours: { type: mongoose.Schema.Types.Mixed, default: {} },
    blurb: { type: String, default: '' },
    sections: {
      type: [{ _id: false, id: String, label: String, name: String, order: Number }],
      default: [],
    },
    priceForTwo: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

restaurantSchema.index({ name: 'text', cuisines: 'text', area: 'text' });

restaurantSchema.methods.toClient = function toClient(options) {
  const opts = options || {};
  const doc = this.toObject({ virtuals: true });
  doc.id = this.restaurantId;
  delete doc._id;
  delete doc.__v;
  if (opts.menu) doc.menu = opts.menu;
  return doc;
};

module.exports = mongoose.model('Restaurant', restaurantSchema);

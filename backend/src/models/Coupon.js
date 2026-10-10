/**
 * Coupon — discount codes. Eligibility is always re-checked server-side with
 * the same rules the storefront shows (shared/pricing.js), never trusted from
 * the client.
 */
'use strict';

const mongoose = require('mongoose');
const { constants } = require('../services/shared');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{3,20}$/, 'Coupon codes use 3–20 letters or numbers.'],
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: [constants.COUPON_TYPES.PERCENT, constants.COUPON_TYPES.FLAT, constants.COUPON_TYPES.FREE_DELIVERY],
      required: true,
    },
    value: { type: Number, default: 0, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    maxUsesPerUser: { type: Number, default: 3, min: 0 },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    cartType: { type: String, enum: [null, constants.CART_TYPES.STORE, constants.CART_TYPES.RESTAURANT], default: null },
    categories: { type: [String], default: [] },
    restaurants: { type: [String], default: [] },
    firstOrderOnly: { type: Boolean, default: false },
    newUserOnly: { type: Boolean, default: false },
    stacksWithCoupon: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    /** Seeded sample offers are flagged so the UI can label them as demos. */
    demo: { type: Boolean, default: true },
    totalRedemptions: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

couponSchema.methods.toClient = function toClient() {
  const doc = this.toObject({ virtuals: true });
  delete doc._id;
  delete doc.__v;
  delete doc.totalRedemptions;
  return doc;
};

module.exports = mongoose.model('Coupon', couponSchema);

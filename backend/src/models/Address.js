/**
 * Address — saved delivery addresses per user (one default at a time).
 */
'use strict';

const mongoose = require('mongoose');
const { constants } = require('../services/shared');

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 40 },
    type: { type: String, enum: constants.ADDRESS_TYPES, default: 'home' },
    receiver: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'] },
    line1: { type: String, required: true, trim: true, maxlength: 160 },
    line2: { type: String, default: '', trim: true, maxlength: 160 },
    landmark: { type: String, default: '', trim: true, maxlength: 120 },
    cityId: { type: String, required: true, index: true },
    localityId: { type: String, default: null },
    pincode: { type: String, required: true, match: [/^\d{6}$/, 'PIN code must be 6 digits.'] },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

addressSchema.index({ user: 1, isDefault: 1 });

/** Exactly one default address per user. */
addressSchema.pre('save', async function ensureSingleDefault(next) {
  if (!this.isDefault || !this.isModified('isDefault')) return next();
  await this.constructor.updateMany(
    { user: this.user, _id: { $ne: this._id }, isDefault: true },
    { $set: { isDefault: false } }
  );
  next();
});

addressSchema.methods.toClient = function toClient() {
  return {
    id: String(this._id),
    label: this.label,
    type: this.type,
    receiver: this.receiver,
    phone: this.phone,
    line1: this.line1,
    line2: this.line2,
    landmark: this.landmark,
    cityId: this.cityId,
    localityId: this.localityId,
    pincode: this.pincode,
    isDefault: this.isDefault,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Address', addressSchema);

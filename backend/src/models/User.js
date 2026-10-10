/**
 * User — accounts, roles and rewards.
 *
 * Passwords are stored as bcrypt hashes only. The schema has no field for a
 * plain-text password, so one can never be persisted by accident.
 */
'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { constants } = require('../services/shared');

const ROLES = [constants.ROLES.USER, constants.ROLES.ADMIN, constants.ROLES.STAFF];
const ADDRESS_TYPES = constants.ADDRESS_TYPES;

const rewardEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['credit', 'debit'], required: true },
    points: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
    ref: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required.'], trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i, 'Enter a valid email address.'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [/^$|^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: constants.ROLES.USER, index: true },
    avatar: { type: String, default: null },
    gender: { type: String, enum: ['', 'female', 'male', 'other'], default: '' },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    rewards: {
      points: { type: Number, default: 0, min: 0 },
      history: { type: [rewardEntrySchema], default: [] },
    },
    preferences: {
      vegOnly: { type: Boolean, default: false },
      notifyOrder: { type: Boolean, default: true },
      notifyPromo: { type: Boolean, default: true },
      deliveryPreference: { type: String, default: 'standard' },
      favouriteCategories: { type: [String], default: [] },
    },
    // Password reset: the code is stored hashed and expires.
    resetTokenHash: { type: String, default: null, select: false },
    resetExpires: { type: Date, default: null, select: false },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string', $ne: '' } } });

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  if (!plainPassword || String(plainPassword).length < 8) {
    throw new Error('Use at least 8 characters.');
  }
  if (!/[a-zA-Z]/.test(plainPassword) || !/\d/.test(plainPassword)) {
    throw new Error('Include at least one letter and one number.');
  }
  this.passwordHash = await bcrypt.hash(String(plainPassword), 12);
  return this;
};

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(String(plainPassword || ''), this.passwordHash);
};

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockedUntil && this.lockedUntil.getTime() > Date.now());
};

userSchema.methods.registerFailedAttempt = function registerFailedAttempt() {
  this.failedAttempts = (this.failedAttempts || 0) + 1;
  // Lock after 8 consecutive failures for 15 minutes (brute-force mitigation).
  if (this.failedAttempts >= 8) this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  return this;
};

userSchema.methods.resetFailedAttempts = function resetFailedAttempts() {
  this.failedAttempts = 0;
  this.lockedUntil = null;
  return this;
};

/** The only shape that ever leaves the API. */
userSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    phone: this.phone || '',
    role: this.role,
    avatar: this.avatar,
    gender: this.gender || '',
    emailVerified: this.emailVerified,
    phoneVerified: this.phoneVerified,
    rewards: { points: this.rewards ? this.rewards.points : 0 },
    preferences: this.preferences ? this.preferences.toObject() : {},
    createdAt: this.createdAt,
  };
};

userSchema.statics.ADDRESS_TYPES = ADDRESS_TYPES;

module.exports = mongoose.model('User', userSchema);

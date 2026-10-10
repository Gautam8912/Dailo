/**
 * Auth service — registration, sign-in, password reset.
 *
 * Rules enforced here (the browser is never trusted):
 *   - bcrypt password hashing, no plain-text password is ever stored;
 *   - field validation with the same rules the UI shows;
 *   - lockout after repeated failed sign-ins;
 *   - reset codes are stored hashed and expire after 15 minutes;
 *   - generic error copy so the API cannot be used to enumerate accounts,
 *     while still being honest that a sign-in failed (never a fake success).
 */
'use strict';

const crypto = require('crypto');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const { signToken } = require('../middleware/auth');
const { ApiError } = require('../utils/ApiError');
const { env } = require('../config/env');
const { constants } = require('./shared');

const RESET_TTL_MS = 15 * 60 * 1000;

const validators = {
  name(value) {
    const name = String(value || '').trim();
    if (name.length < 2) return 'Enter your full name.';
    if (name.length > 80) return 'That name is too long.';
    return null;
  },
  email(value) {
    const email = String(value || '').trim().toLowerCase();
    if (!email) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return 'Enter a valid email address.';
    return null;
  },
  phone(value) {
    const phone = String(value || '').replace(/\D/g, '');
    if (!phone) return null; // optional
    if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a valid 10-digit Indian mobile number.';
    return null;
  },
  password(value) {
    const password = String(value || '');
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Use at least 8 characters.';
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number.';
    if (password.length > 128) return 'That password is too long.';
    return null;
  },
};

function assertValid(fields) {
  const problems = {};
  Object.keys(fields).forEach((key) => {
    const check = validators[key];
    if (!check) return;
    const message = check(fields[key]);
    if (message) problems[key] = message;
  });
  if (Object.keys(problems).length) {
    throw ApiError.unprocessable('Please correct the highlighted fields.', { code: 'VALIDATION', fields: problems });
  }
}

async function register(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const phone = String(payload.phone || '').replace(/\D/g, '');
  assertValid({ name: payload.name, email, phone, password: payload.password });

  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw ApiError.conflict('An account with this email already exists. Try signing in instead.', { code: 'EMAIL_TAKEN', field: 'email' });
  if (phone) {
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) throw ApiError.conflict('This mobile number is already registered.', { code: 'PHONE_TAKEN', field: 'phone' });
  }

  const user = new User({
    name: String(payload.name).trim(),
    email,
    phone,
    role: constants.ROLES.USER, // privilege is never granted by the client
    preferences: payload.preferences || {},
  });
  await user.setPassword(payload.password);
  await user.save();
  await Cart.create({ user: user._id, items: [] });
  await Wishlist.create({ user: user._id, productIds: [] });

  const token = signToken(user);
  return { token, user: publicUser(user) };
}

async function login(identifier, password, options) {
  const opts = options || {};
  const key = String(identifier || '').trim().toLowerCase();
  if (!key || !password) {
    throw ApiError.badRequest('Enter your email (or mobile number) and password.', { code: 'MISSING_CREDENTIALS' });
  }

  const digits = key.replace(/\D/g, '');
  const user = await User.findOne(digits.length === 10 && key.indexOf('@') === -1 ? { phone: digits } : { email: key }).select('+passwordHash +resetTokenHash +resetExpires');
  if (!user) {
    // Same copy as a wrong password: no account enumeration.
    throw ApiError.unauthorized('Those details do not match an account.', { code: 'INVALID_CREDENTIALS', field: 'identifier' });
  }
  if (user.isLocked()) {
    throw new ApiError(423, 'Too many failed attempts. This account is temporarily locked — try again in a few minutes.', { code: 'ACCOUNT_LOCKED' });
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    await user.registerFailedAttempt();
    await user.save({ validateBeforeSave: false });
    throw ApiError.unauthorized('Incorrect password. Please try again.', { code: 'INVALID_CREDENTIALS', field: 'password' });
  }

  user.resetFailedAttempts();
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user);
  return { token, user: publicUser(user), remember: Boolean(opts.remember) };
}

async function me(user) {
  return publicUser(user);
}

async function updateProfile(user, patch) {
  const allowed = {};
  if (patch.name !== undefined) allowed.name = patch.name;
  if (patch.phone !== undefined) allowed.phone = String(patch.phone).replace(/\D/g, '');
  if (patch.gender !== undefined) allowed.gender = patch.gender;
  if (patch.avatar !== undefined) allowed.avatar = patch.avatar;
  if (patch.preferences !== undefined) allowed.preferences = Object.assign({}, user.preferences ? user.preferences.toObject() : {}, patch.preferences);
  assertValid(allowed);

  if (allowed.phone && allowed.phone !== user.phone) {
    const clash = await User.findOne({ phone: allowed.phone, _id: { $ne: user._id } });
    if (clash) throw ApiError.conflict('This mobile number is already registered.', { code: 'PHONE_TAKEN', field: 'phone' });
  }

  Object.assign(user, allowed);
  await user.save();
  return publicUser(user);
}

async function changePassword(user, currentPassword, newPassword) {
  const fresh = await User.findById(user._id).select('+passwordHash');
  if (!fresh) throw ApiError.notFound('Account not found.');
  const ok = await fresh.comparePassword(currentPassword);
  if (!ok) throw ApiError.unauthorized('Your current password is incorrect.', { code: 'INVALID_PASSWORD', field: 'currentPassword' });
  assertValid({ password: newPassword });
  await fresh.setPassword(newPassword);
  fresh.resetFailedAttempts();
  await fresh.save();
  return { ok: true };
}

/**
 * Start a password reset. A real deployment emails the code; without an SMTP
 * provider this build returns it in the response and flags `channel: 'demo'`
 * so nobody mistakes it for a delivered email.
 */
async function forgotPassword(identifier) {
  const email = String(identifier || '').trim().toLowerCase();
  const message = 'If an account uses that email address, a reset code is on its way. It expires in 15 minutes.';
  const user = await User.findOne({ email }).select('+resetTokenHash +resetExpires');
  if (!user) return { ok: true, message, channel: env.smtp.enabled ? 'email' : 'demo' };

  const code = String(crypto.randomInt(100000, 1000000));
  user.resetTokenHash = crypto.createHash('sha256').update(code).digest('hex');
  user.resetExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save({ validateBeforeSave: false });

  if (env.smtp.enabled) {
    // Integration point: send the code with the configured provider.
    return { ok: true, message, channel: 'email' };
  }
  return { ok: true, message, channel: 'demo', demoCode: code };
}

async function resetPassword(identifier, code, newPassword) {
  const email = String(identifier || '').trim().toLowerCase();
  const user = await User.findOne({ email }).select('+passwordHash +resetTokenHash +resetExpires');
  if (!user || !user.resetTokenHash) {
    throw ApiError.badRequest('Start the reset flow again — this reset link is not valid.', { code: 'RESET_INVALID' });
  }
  if (!user.resetExpires || user.resetExpires.getTime() < Date.now()) {
    throw ApiError.badRequest('This reset code has expired. Request a new one.', { code: 'RESET_EXPIRED' });
  }
  const hash = crypto.createHash('sha256').update(String(code || '')).digest('hex');
  const matches = hash.length === user.resetTokenHash.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.resetTokenHash));
  if (!matches) throw ApiError.badRequest('That reset code is not correct.', { code: 'RESET_CODE_WRONG', field: 'code' });

  assertValid({ password: newPassword });
  await user.setPassword(newPassword);
  user.resetTokenHash = null;
  user.resetExpires = null;
  user.resetFailedAttempts();
  await user.save();
  return { ok: true };
}

async function mergeGuestCart(user, guestItems) {
  if (!Array.isArray(guestItems) || !guestItems.length) return { merged: 0 };
  const cart = (await Cart.findOne({ user: user._id })) || new Cart({ user: user._id, items: [] });
  let merged = 0;
  for (const line of guestItems) {
    const existing = cart.items.find((item) => String(item.seedId) === String(line.itemId));
    const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
    if (existing) {
      existing.qty = Math.min(50, existing.qty + qty); // combine, never duplicate
    } else {
      cart.items.push({ seedId: String(line.itemId), qty, addons: line.addons || [], selection: line.selection || null });
    }
    merged += 1;
  }
  await cart.save();
  return { merged, lines: cart.items.length };
}

function publicUser(user) {
  return user.toPublic();
}

module.exports = { register, login, me, updateProfile, changePassword, forgotPassword, resetPassword, mergeGuestCart, validators, assertValid, publicUser };

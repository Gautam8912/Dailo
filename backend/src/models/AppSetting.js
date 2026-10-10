/**
 * AppSetting — runtime business settings (one document per key).
 *
 * This is where the free-delivery threshold and delivery fee live on the
 * server, so an admin change applies to the storefront, the cart, checkout and
 * order pricing alike. Defaults come from shared/settings.js.
 */
'use strict';

const mongoose = require('mongoose');
const { settings } = require('../services/shared');

const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

appSettingSchema.statics.SETTINGS_KEY = 'business';
appSettingSchema.statics.DEFAULTS = settings.DEFAULT_SETTINGS;

/** Merge stored overrides onto the shared defaults (never a partial object). */
appSettingSchema.statics.resolve = function resolve(storedValue) {
  return settings.withSettings(Object.assign({}, settings.DEFAULT_SETTINGS, storedValue || {}));
};

module.exports = mongoose.model('AppSetting', appSettingSchema);

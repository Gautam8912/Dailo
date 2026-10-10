/**
 * Settings service — the server-side business rules.
 *
 * Defaults come from shared/settings.js (the same file the storefront reads).
 * Admin edits are stored in the AppSetting collection and layered on top, so
 * the free-delivery threshold and delivery fee are configurable in one place
 * and identical on both sides.
 */
'use strict';

const AppSetting = require('../models/AppSetting');
const { settings: sharedSettings, locations, constants } = require('./shared');

const KEY = AppSetting.SETTINGS_KEY;
let cache = null;
let cacheAt = 0;
const CACHE_MS = 5000;

/** Effective settings (shared defaults + stored overrides). */
async function get(options) {
  const opts = options || {};
  if (!opts.force && cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const doc = await AppSetting.findOne({ key: KEY }).lean();
  cache = sharedSettings.withSettings(Object.assign({}, sharedSettings.DEFAULT_SETTINGS, (doc && doc.value) || {}));
  cacheAt = Date.now();
  return cache;
}

function peek() {
  return cache || sharedSettings.withSettings(sharedSettings.DEFAULT_SETTINGS);
}

async function save(patch, updatedBy) {
  const current = await get({ force: true });
  const next = sharedSettings.withSettings(Object.assign({}, current, patch || {}));
  await AppSetting.findOneAndUpdate(
    { key: KEY },
    { $set: { value: next, updatedBy: updatedBy || null } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  cache = next;
  cacheAt = Date.now();
  return next;
}

async function reset(updatedBy) {
  await AppSetting.findOneAndUpdate({ key: KEY }, { $set: { value: sharedSettings.DEFAULT_SETTINGS, updatedBy: updatedBy || null } }, { upsert: true });
  cache = sharedSettings.withSettings(sharedSettings.DEFAULT_SETTINGS);
  cacheAt = Date.now();
  return cache;
}

/** Delivery fee for a city: admin per-city override → seeded city fee → default. */
function deliveryFeeFor(cfg, cityId) {
  const override = (cfg.cityDeliveryFee || {})[cityId];
  if (typeof override === 'number') return override;
  const city = locations.getCity(cityId);
  if (city && typeof city.deliveryFee === 'number') return city.deliveryFee;
  return cfg.deliveryFee;
}

/** Coverage for a city, honouring admin overrides. */
function coverageFor(cfg, cityId) {
  const override = (cfg.cityCoverage || {})[cityId];
  if (override) return override;
  const city = locations.getCity(cityId);
  return city ? city.coverage : constants.COVERAGE.COMING_SOON;
}

function isServiceable(cfg, cityId) {
  return coverageFor(cfg, cityId) !== constants.COVERAGE.COMING_SOON;
}

function etaMinutesFor(cfg, cityId, handlingMinutes) {
  return locations.estimateEtaMinutes(cityId, handlingMinutes || 0, { coverage: coverageFor(cfg, cityId) });
}

function invalidate() {
  cache = null;
  cacheAt = 0;
}

module.exports = { get, peek, save, reset, deliveryFeeFor, coverageFor, isServiceable, etaMinutesFor, invalidate, DEFAULTS: sharedSettings.DEFAULT_SETTINGS };

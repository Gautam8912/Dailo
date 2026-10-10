/**
 * Food Express API — bridge to the `shared/` modules.
 *
 * The storefront and the API must never disagree about money. Both read the
 * same pricing engine, settings defaults, seed catalogue, locations and coupon
 * rules from `/shared`, which is the single source of truth. The backend adds
 * persistence and enforcement on top — it does not re-implement the rules.
 */
'use strict';

const path = require('path');

const SHARED_DIR = path.resolve(__dirname, '..', '..', '..', 'shared');

function load() {
  // Order matters: later modules read earlier ones at load time.
  require(path.join(SHARED_DIR, 'constants.js'));
  require(path.join(SHARED_DIR, 'settings.js'));
  require(path.join(SHARED_DIR, 'locations.js'));
  require(path.join(SHARED_DIR, 'catalog.js'));
  require(path.join(SHARED_DIR, 'restaurants.js'));
  require(path.join(SHARED_DIR, 'coupons.js'));
  require(path.join(SHARED_DIR, 'pricing.js'));
  require(path.join(SHARED_DIR, 'content.js'));
  return globalThis.FX;
}

const FX = load();

module.exports = {
  FX,
  constants: FX.constants,
  settings: FX.settings,
  locations: FX.locations,
  catalog: FX.catalog,
  restaurants: FX.restaurants,
  coupons: FX.coupons,
  pricing: FX.pricing,
  content: FX.content,
};

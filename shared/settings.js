/**
 * Food Express — application settings.
 *
 * The free-delivery threshold and delivery fee live HERE and nowhere else.
 * Every price calculation (frontend + backend) reads them from this object so
 * the business rule can be changed in one place — or overridden at runtime by
 * the admin dashboard / AppSetting collection.
 */
(function (global) {
  'use strict';

  const DEFAULT_SETTINGS = Object.freeze({
    currency: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',

    /** ₹ of *eligible merchandise subtotal* needed for free delivery. */
    freeDeliveryThreshold: 150,
    /** Delivery charge applied when the threshold is not met. */
    deliveryFee: 29,
    /** Small order handling fee for restaurant orders (per order). */
    packingFee: 20,
    /** Optional platform fee below a subtotal floor. */
    smallOrderFee: 0,
    smallOrderFeeBelow: 0,
    /** Tip presets offered at checkout. */
    tipOptions: [0, 10, 20, 30],

    /** Item prices already include GST (Indian MRP convention). */
    taxInclusive: true,
    /** Fallback GST rate when a category does not specify one. */
    defaultGstRate: 0.18,

    /** Minimum merchandise subtotal to place any order. */
    minOrderValue: 0,
    /** Restaurant carts have their own minimum, per restaurant. */
    enforceRestaurantMinOrder: true,

    lowStockThreshold: 10,
    maxQuantityPerItem: 10,

    /** Loyalty programme. */
    loyalty: {
      earnRate: 0.05,
      pointValue: 0.25,
      minRedeemPoints: 100,
      maxRedeemPercent: 30,
    },

    /**
     * Authorised automatic promotions (applied by the pricing engine without a
     * coupon code). These may supplement or override the free-delivery rule.
     * `stacksWithCoupon` defines the explicit combination rule.
     */
    autoOffers: [
      {
        id: 'offer-free-delivery-499',
        name: 'Free delivery above ₹499',
        kind: 'free_delivery',
        minSubtotal: 499,
        active: true,
        stacksWithCoupon: true,
        label: 'Auto-applied',
      },
      {
        id: 'offer-flat-40-799',
        name: '₹40 off on orders above ₹799',
        kind: 'flat',
        value: 40,
        minSubtotal: 799,
        active: true,
        stacksWithCoupon: true,
        label: 'Auto-applied',
      },
    ],

    /** Surge / rain fee — configurable, defaults to off. */
    surgeFee: 0,
    surgeMessage: '',

    /** Feature flags. */
    /**
     * Admin-editable per-city overrides. Empty by default: the seeded coverage
     * and fees in `shared/locations.js` apply until an admin changes a city.
     * `cityCoverage` maps cityId -> COVERAGE value, `cityDeliveryFee` maps
     * cityId -> whole-rupee fee.
     */
    cityCoverage: {},
    cityDeliveryFee: {},

    features: {
      guestCheckout: true,
      walletPayments: false, // requires a real PSP integration
      upiPayments: false, // requires a real PSP integration
      cardPayments: false, // requires a real PSP integration
      codPayments: true, // simulated in demo mode
      demoPayments: true, // clearly labelled simulated payment mode
      liveGpsTracking: false, // no real tracking partner is integrated
      referralProgramme: false, // no referral tracking backend yet
      reviewsEnabled: false, // no verified review data in the catalogue
    },

    /** Honest disclosure shown across the UI. */
    disclaimer:
      'Food Express demo build: catalogue, prices, ratings and delivery ETAs are sample data for local development. No live delivery network or real payment gateway is connected.',
  });

  /** Deep-ish merge that never mutates the frozen defaults. */
  function withSettings(overrides) {
    if (!overrides || typeof overrides !== 'object') return Object.assign({}, DEFAULT_SETTINGS);
    const merged = Object.assign({}, DEFAULT_SETTINGS, overrides);
    merged.loyalty = Object.assign({}, DEFAULT_SETTINGS.loyalty, overrides.loyalty || {});
    merged.features = Object.assign({}, DEFAULT_SETTINGS.features, overrides.features || {});
    merged.cityCoverage = Object.assign({}, overrides.cityCoverage || {});
    merged.cityDeliveryFee = Object.assign({}, overrides.cityDeliveryFee || {});
    if (Array.isArray(overrides.autoOffers)) merged.autoOffers = overrides.autoOffers.slice();
    if (Array.isArray(overrides.tipOptions)) merged.tipOptions = overrides.tipOptions.slice();
    // Guard against nonsense values coming from an admin form.
    merged.freeDeliveryThreshold = Math.max(0, Number(merged.freeDeliveryThreshold) || 0);
    merged.deliveryFee = Math.max(0, Number(merged.deliveryFee) || 0);
    merged.packingFee = Math.max(0, Number(merged.packingFee) || 0);
    return merged;
  }

  const api = { DEFAULT_SETTINGS, withSettings };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FX = global.FX || {};
  global.FX.settings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

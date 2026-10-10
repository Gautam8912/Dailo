/**
 * Food Express — pricing engine.
 *
 * ONE implementation of cart math, used by the browser demo store and by the
 * Express backend. The backend is authoritative: it re-computes every number
 * from its own copy of the catalogue/settings before accepting an order.
 *
 * Business rules encoded here
 *  - freeDeliveryThreshold (default ₹150) applies to ELIGIBLE MERCHANDISE
 *    SUBTOTAL only — never to delivery fees, tips, packing fees or taxes.
 *  - remainingAmount = max(0, threshold - eligibleSubtotal)
 *  - automatic offers may supplement or override the threshold.
 *  - one coupon per order; stacking is only allowed when both the coupon and
 *    the auto offer explicitly opt in (`stacksWithCoupon`).
 *  - discounts can never exceed the merchandise subtotal.
 *  - item prices are GST inclusive, so GST is reported as "included".
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    freeDeliveryThreshold: 150,
    deliveryFee: 29,
    packingFee: 0,
    smallOrderFee: 0,
    smallOrderFeeBelow: 0,
    taxInclusive: true,
    defaultGstRate: 0.18,
    surgeFee: 0,
    loyalty: { earnRate: 0.05, pointValue: 0.25, minRedeemPoints: 100, maxRedeemPercent: 30 },
    autoOffers: [],
  };

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function settings(defaults, overrides) {
    const base = Object.assign({}, DEFAULTS, defaults || {});
    const merged = Object.assign(base, overrides || {});
    merged.loyalty = Object.assign({}, base.loyalty, (overrides && overrides.loyalty) || {});
    if (!Array.isArray(merged.autoOffers)) merged.autoOffers = base.autoOffers;
    return merged;
  }

  /** Line total for a cart item, including customisation add-ons. */
  function lineTotals(item) {
    const qty = Math.max(0, Math.floor(Number(item.qty) || 0));
    const unitPrice = round2(Number(item.unitPrice != null ? item.unitPrice : item.price) || 0);
    const mrp = round2(Number(item.mrp != null ? item.mrp : unitPrice) || unitPrice);
    const addonPrice = round2(
      (item.addons || []).reduce((sum, a) => sum + (Number(a.price) || 0), 0)
    );
    const subtotal = round2((unitPrice + addonPrice) * qty);
    const mrpTotal = round2(Math.max(mrp, unitPrice) * qty);
    const gstRate = Number(item.gstRate != null ? item.gstRate : 0) || 0;
    // Prices are MRP/GST inclusive → GST component is embedded, not added.
    const gstIncluded = round2(subtotal - subtotal / (1 + gstRate));
    return { qty, unitPrice, addonPrice, subtotal, mrpTotal, savings: round2(mrpTotal - subtotal), gstRate, gstIncluded };
  }

  /**
   * Validate a coupon against the cart. Returns { ok, reason, coupon, ... }.
   * Never mutates the cart.
   */
  function validateCoupon(coupon, ctx) {
    const now = ctx && ctx.now ? new Date(ctx.now) : new Date();
    if (!coupon || typeof coupon !== 'object') {
      return { ok: false, reason: 'Enter a coupon code to apply an offer.' };
    }
    if (coupon.active === false) return { ok: false, reason: `${coupon.code} is not active right now.` };
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return { ok: false, reason: `${coupon.code} becomes active on ${new Date(coupon.validFrom).toLocaleDateString('en-IN')}.` };
    }
    if (coupon.validTo && new Date(coupon.validTo) < now) {
      return { ok: false, reason: `${coupon.code} expired on ${new Date(coupon.validTo).toLocaleDateString('en-IN')}.` };
    }
    const eligibleSubtotal = ctx.eligibleSubtotal || 0;
    if (coupon.minSubtotal && eligibleSubtotal < coupon.minSubtotal) {
      return {
        ok: false,
        reason: `Add items worth ₹${round2(coupon.minSubtotal - eligibleSubtotal).toFixed(0)} more — ${coupon.code} needs a ₹${coupon.minSubtotal} minimum.`,
      };
    }
    if (coupon.cartType && ctx.cartType && coupon.cartType !== ctx.cartType) {
      return {
        ok: false,
        reason:
          coupon.cartType === 'restaurant'
            ? `${coupon.code} works only on restaurant orders.`
            : `${coupon.code} works only on store (grocery & essentials) orders.`,
      };
    }
    if (Array.isArray(coupon.categories) && coupon.categories.length) {
      const hasCategory = (ctx.items || []).some(
        (i) => i.categoryId && coupon.categories.indexOf(i.categoryId) !== -1
      );
      if (!hasCategory) return { ok: false, reason: `${coupon.code} applies only to selected categories.` };
    }
    if (Array.isArray(coupon.restaurants) && coupon.restaurants.length) {
      if (coupon.restaurants.indexOf(ctx.restaurantId) === -1) {
        return { ok: false, reason: `${coupon.code} is valid only at selected restaurants.` };
      }
    }
    if (coupon.firstOrderOnly && ctx.orderCount > 0) {
      return { ok: false, reason: `${coupon.code} is for first orders only.` };
    }
    if (coupon.maxUsesPerUser && (ctx.couponUses && ctx.couponUses[coupon.code] || 0) >= coupon.maxUsesPerUser) {
      return { ok: false, reason: `You have already used ${coupon.code} the maximum number of times.` };
    }
    if (coupon.newUserOnly && !ctx.isNewUser) {
      return { ok: false, reason: `${coupon.code} is reserved for new accounts.` };
    }
    return { ok: true, coupon };
  }

  /** Amount discounted by a coupon, before clamping. */
  function couponDiscountValue(coupon, base) {
    if (!coupon) return 0;
    if (coupon.type === 'percent') {
      const pct = clamp(Number(coupon.value) || 0, 0, 100) / 100;
      const raw = base * pct;
      return coupon.maxDiscount ? Math.min(raw, Number(coupon.maxDiscount)) : raw;
    }
    if (coupon.type === 'flat') return Math.min(Number(coupon.value) || 0, base);
    return 0; // free_delivery coupons discount the fee, not the merchandise
  }

  /** Choose the single best auto offer that matches the cart. */
  function pickAutoOffer(list, eligibleSubtotal, cartType) {
    const candidates = (list || []).filter((offer) => {
      if (!offer || offer.active === false) return false;
      if (offer.minSubtotal && eligibleSubtotal < offer.minSubtotal) return false;
      if (offer.cartType && cartType && offer.cartType !== cartType) return false;
      return true;
    });
    if (!candidates.length) return null;
    // Prefer the offer with the largest monetary value; free-delivery ranks
    // below a flat discount of equal or greater value.
    let best = null;
    candidates.forEach((offer) => {
      const value =
        offer.kind === 'flat' ? Number(offer.value) || 0 : offer.kind === 'free_delivery' ? 1 : 0;
      if (!best || value > (best.kind === 'flat' ? Number(best.value) || 0 : 1)) best = offer;
    });
    return best;
  }

  /**
   * Compute the full bill for a cart.
   *
   * @param {object} input
   * @param {Array}  input.items        cart items ({qty, price, mrp, gstRate, categoryId, eligible})
   * @param {object} input.coupon       applied coupon (or null)
   * @param {object} input.settings     runtime settings (threshold, fees, auto offers…)
   * @param {string} input.cartType     'store' | 'restaurant'
   * @param {number} input.tip          delivery partner tip
   * @param {number} input.redeemPoints loyalty points the customer wants to burn
   * @param {number} input.orderCount   previous orders (for first-order coupons)
   * @param {number} input.deliveryFeeOverride restaurant-specific fee
   */
  function computeCart(input) {
    const cfg = settings(input.settings, input.settingsOverrides);
    const items = (input.items || []).map((item) => Object.assign({}, item, lineTotals(item)));
    const cartType = input.cartType || 'store';

    const merchandiseSubtotal = round2(items.reduce((s, i) => s + i.subtotal, 0));
    const mrpTotal = round2(items.reduce((s, i) => s + i.mrpTotal, 0));
    const itemSavings = round2(items.reduce((s, i) => s + i.savings, 0));
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const gstIncluded = round2(items.reduce((s, i) => s + i.gstIncluded, 0));

    // "Eligible" merchandise = items that count towards the threshold.
    // Gift/prepaid-denomination lines can opt out via `eligible: false`.
    const eligibleSubtotal = round2(
      items.filter((i) => i.eligible !== false).reduce((s, i) => s + i.subtotal, 0)
    );

    /* ---- Automatic (authorised) offers ---- */
    const autoOffer = pickAutoOffer(cfg.autoOffers, eligibleSubtotal, cartType);
    const autoOfferDiscount = round2(
      autoOffer && autoOffer.kind === 'flat'
        ? Math.min(Number(autoOffer.value) || 0, eligibleSubtotal)
        : 0
    );
    const autoOfferFreeDelivery = Boolean(autoOffer && autoOffer.kind === 'free_delivery');

    /* ---- Coupon ---- */
    const couponContext = {
      items,
      eligibleSubtotal,
      cartType,
      restaurantId: input.restaurantId,
      orderCount: input.orderCount || 0,
      couponUses: input.couponUses || {},
      isNewUser: Boolean(input.isNewUser),
      now: input.now,
    };
    const couponCheck = input.coupon ? validateCoupon(input.coupon, couponContext) : { ok: false, coupon: null };
    const coupon = couponCheck.ok ? couponCheck.coupon : null;
    const couponDiscount = round2(couponDiscountValue(coupon, eligibleSubtotal));

    // Explicit stacking rule: a coupon only combines with an auto offer when the
    // offer opts in. Otherwise the engine keeps whichever is better for the user.
    let appliedAutoOffer = autoOffer;
    let appliedCoupon = coupon;
    let appliedAutoDiscount = autoOfferDiscount;
    let appliedCouponDiscount = couponDiscount;
    if (coupon && autoOffer && !autoOffer.stacksWithCoupon && autoOfferDiscount > 0) {
      if (autoOfferDiscount > couponDiscount) {
        appliedCoupon = null;
        appliedCouponDiscount = 0;
      } else {
        appliedAutoOffer = null;
        appliedAutoDiscount = 0;
      }
    }

    const totalDiscount = round2(
      Math.min(eligibleSubtotal, appliedAutoDiscount + appliedCouponDiscount)
    );

    /* ---- Free delivery threshold ---- */
    const threshold = Math.max(0, Number(cfg.freeDeliveryThreshold) || 0);
    const remainingForFreeDelivery = round2(Math.max(0, threshold - eligibleSubtotal));
    const couponFreeDelivery = Boolean(coupon && coupon.type === 'free_delivery');
    const meetsThreshold = threshold > 0 ? eligibleSubtotal >= threshold : true;
    const freeDeliveryUnlocked =
      totalQty === 0 ? false : meetsThreshold || autoOfferFreeDelivery || couponFreeDelivery;

    const configuredFee = round2(
      input.deliveryFeeOverride != null ? input.deliveryFeeOverride : cfg.deliveryFee
    );
    const surgeFee = freeDeliveryUnlocked ? 0 : round2(cfg.surgeFee || 0);
    const deliveryFee = freeDeliveryUnlocked ? 0 : round2(configuredFee + surgeFee);

    /* ---- Other charges ---- */
    const packingFee =
      cartType === 'restaurant' && cfg.packingFee ? round2(cfg.packingFee) : 0;
    const smallOrderFee =
      cfg.smallOrderFee && cfg.smallOrderFeeBelow && eligibleSubtotal < cfg.smallOrderFeeBelow
        ? round2(cfg.smallOrderFee)
        : 0;
    const tip = round2(clamp(Number(input.tip) || 0, 0, 500));

    /* ---- Loyalty redemption ---- */
    const loyalty = cfg.loyalty;
    const redeemCapPoints = Math.floor(
      Math.min(
        Number(input.availablePoints) || 0,
        ((eligibleSubtotal - totalDiscount) * loyalty.maxRedeemPercent) / 100 / loyalty.pointValue || 0
      )
    );
    const requestedPoints = Math.floor(Number(input.redeemPoints) || 0);
    const redeemPoints =
      requestedPoints >= loyalty.minRedeemPoints ? Math.min(requestedPoints, redeemCapPoints) : 0;
    const loyaltyDiscount = round2(redeemPoints * loyalty.pointValue);

    const discountsTotal = round2(totalDiscount + loyaltyDiscount);
    const payableMerchandise = round2(Math.max(0, eligibleSubtotal - discountsTotal));
    const grandTotal = round2(payableMerchandise + deliveryFee + packingFee + smallOrderFee + surgeFee + tip);

    const earnedPoints = Math.floor(payableMerchandise * loyalty.earnRate);

    /* ---- Customer-facing copy ---- */
    let freeDeliveryMessage;
    if (totalQty === 0) {
      freeDeliveryMessage = 'Add items worth ₹' + threshold + ' to unlock free delivery.';
    } else if (freeDeliveryUnlocked) {
      freeDeliveryMessage =
        couponFreeDelivery || (autoOfferFreeDelivery && !meetsThreshold)
          ? 'Congratulations! An offer unlocked free delivery for this order.'
          : 'Congratulations! You unlocked free delivery.';
    } else if (remainingForFreeDelivery <= 1) {
      freeDeliveryMessage = 'Just ₹' + round2(remainingForFreeDelivery).toFixed(0) + ' more to unlock free delivery!';
    } else {
      freeDeliveryMessage =
        'Add products worth ₹' +
        round2(remainingForFreeDelivery).toFixed(0) +
        ' more to unlock free delivery.';
    }

    const progressPercent =
      threshold <= 0 ? (totalQty > 0 ? 100 : 0) : clamp((eligibleSubtotal / threshold) * 100, 0, 100);

    const belowMinOrder =
      Boolean(cfg.minOrderValue) && eligibleSubtotal < cfg.minOrderValue
        ? 'A minimum order of ₹' + cfg.minOrderValue + ' is required to check out.'
        : null;
    const restaurantMinOrder =
      cartType === 'restaurant' && input.restaurantMinOrder && eligibleSubtotal < input.restaurantMinOrder
        ? `${input.restaurantName || 'This restaurant'} needs a ₹${input.restaurantMinOrder} minimum order.`
        : null;

    return {
      items,
      cartType,
      totalQty,
      merchandiseSubtotal,
      eligibleSubtotal,
      mrpTotal,
      itemSavings,
      gstIncluded,
      autoOffer: appliedAutoOffer,
      autoOfferDiscount: appliedAutoDiscount,
      coupon: appliedCoupon,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponInvalid: coupon && appliedCoupon === null ? couponCheck.reason : null,
      couponRejection: couponCheck.ok ? null : couponCheck.reason,
      couponDiscount: appliedCouponDiscount,
      totalDiscount,
      loyaltyDiscount,
      redeemPoints,
      earnedPoints,
      freeDeliveryThreshold: threshold,
      configuredDeliveryFee: configuredFee,
      freeDeliveryUnlocked,
      remainingForFreeDelivery,
      freeDeliveryMessage,
      progressPercent: round2(progressPercent),
      deliveryFee,
      surgeFee,
      packingFee,
      smallOrderFee,
      tip,
      discountsTotal,
      grandTotal,
      totalSavings: round2(itemSavings + discountsTotal),
      belowMinOrder,
      restaurantMinOrder,
      canCheckout: totalQty > 0 && !belowMinOrder && !restaurantMinOrder,
    };
  }

  const api = { computeCart, validateCoupon, couponDiscountValue, lineTotals, pickAutoOffer, round2, clamp, settings: settings };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FX = global.FX || {};
  global.FX.pricing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

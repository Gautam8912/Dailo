/**
 * Food Express — coupons (demo promotions).
 *
 * Every coupon here is seeded sample data and is surfaced in the UI with the
 * label "Demo promotion" until a real business configures promotions in the
 * admin dashboard / `Coupon` collection. Validation and discount maths live in
 * `shared/pricing.js` so the browser and the backend can never disagree.
 */
(function (global) {
  'use strict';

  const RAW_COUPONS = [
    {
      code: 'FIRSTORDER',
      title: '20% off your first order',
      description: 'Flat 20% off up to ₹120 on your very first Food Express order.',
      type: 'percent',
      value: 20,
      maxDiscount: 120,
      minSubtotal: 149,
      firstOrderOnly: true,
      stacksWithCoupon: false,
      active: true,
      badge: 'For new users',
    },
    {
      code: 'SAVE10',
      title: '₹10 off above ₹199',
      description: 'Small flat discount on everyday baskets. Works store-wide.',
      type: 'flat',
      value: 10,
      minSubtotal: 199,
      active: true,
      badge: 'Everyday',
    },
    {
      code: 'FREESHIP',
      title: 'Free delivery, no minimum',
      description: 'Waives the delivery fee even below the ₹150 threshold.',
      type: 'free_delivery',
      minSubtotal: 0,
      active: true,
      badge: 'Delivery',
    },
    {
      code: 'FRESH50',
      title: '₹50 off fruits & vegetables',
      description: 'Valid only when the cart contains at least one fresh produce item.',
      type: 'flat',
      value: 50,
      minSubtotal: 299,
      categories: ['fruits-vegetables'],
      active: true,
      badge: 'Category',
    },
    {
      code: 'SNACK25',
      title: '25% off snacks & beverages',
      description: 'Up to ₹80 off on a cart that contains snacks or drinks.',
      type: 'percent',
      value: 25,
      maxDiscount: 80,
      minSubtotal: 249,
      categories: ['snacks', 'beverages', 'instant'],
      active: true,
      badge: 'Category',
    },
    {
      code: 'BIRYANI75',
      title: '₹75 off restaurant orders',
      description: 'Restaurant-only coupon on orders above ₹399.',
      type: 'flat',
      value: 75,
      minSubtotal: 399,
      cartType: 'restaurant',
      active: true,
      badge: 'Restaurants',
    },
    {
      code: 'WEEKEND100',
      title: '₹100 off above ₹699',
      description: 'Big-basket coupon for weekend stocking up.',
      type: 'flat',
      value: 100,
      minSubtotal: 699,
      active: true,
      badge: 'Weekend',
    },
    {
      code: 'TECH15',
      title: '15% off electronics',
      description: 'Up to ₹300 off when the cart contains an electronics item.',
      type: 'percent',
      value: 15,
      maxDiscount: 300,
      minSubtotal: 499,
      categories: ['electronics'],
      active: true,
      badge: 'Category',
    },
    {
      code: 'CARE20',
      title: '₹60 off personal care & beauty',
      description: 'Applies to carts containing personal care or beauty products.',
      type: 'flat',
      value: 60,
      minSubtotal: 349,
      categories: ['personal-care', 'beauty'],
      active: true,
      badge: 'Category',
    },
    {
      code: 'EXPIRED25',
      title: '25% off (expired demo coupon)',
      description: 'Kept in the seed to prove expiry handling works. Should be rejected.',
      type: 'percent',
      value: 25,
      maxDiscount: 150,
      minSubtotal: 199,
      validFrom: '2024-01-01',
      validTo: '2024-12-31',
      active: true,
      badge: 'Expired',
    },
  ];

  const COUPONS = RAW_COUPONS.map((coupon) =>
    Object.freeze(
      Object.assign({ demo: true, maxUsesPerUser: 3, stacksWithCoupon: false }, coupon)
    )
  );

  function getCoupon(code) {
    if (!code) return null;
    const key = String(code).trim().toUpperCase();
    return COUPONS.find((c) => c.code === key) || null;
  }

  function activeCoupons() {
    const now = Date.now();
    return COUPONS.filter(
      (c) =>
        c.active &&
        (!c.validFrom || new Date(c.validFrom).getTime() <= now) &&
        (!c.validTo || new Date(c.validTo).getTime() >= now)
    );
  }

  const api = { COUPONS, getCoupon, activeCoupons };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FX = global.FX || {};
  global.FX.coupons = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

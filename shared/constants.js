/**
 * Food Express — shared constants.
 * Single source of truth used by BOTH the browser frontend (demo mode)
 * and the Node/Express backend. Never duplicate these values elsewhere.
 */
(function (global) {
  'use strict';

  const ROLES = Object.freeze({ USER: 'user', ADMIN: 'admin', STAFF: 'staff' });

  /** Cart fulfilment contexts. A cart can only hold one context at a time. */
  const CART_TYPES = Object.freeze({
    STORE: 'store', // grocery / general merchandise catalogue
    RESTAURANT: 'restaurant', // one restaurant's menu only
  });

  /** Order status workflow for store (non-food) orders. */
  const STORE_ORDER_FLOW = Object.freeze([
    'PLACED',
    'CONFIRMED',
    'PACKING',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ]);

  /** Order status workflow for restaurant orders (kitchen driven). */
  const RESTAURANT_ORDER_FLOW = Object.freeze([
    'PLACED',
    'CONFIRMED',
    'PREPARING',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ]);

  const CANCELLED = 'CANCELLED';

  const ORDER_STATUS_LABELS = Object.freeze({
    PLACED: 'Order placed',
    CONFIRMED: 'Confirmed',
    PACKING: 'Packing your order',
    PREPARING: 'Restaurant is preparing',
    OUT_FOR_DELIVERY: 'Out for delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  });

  const ORDER_STATUS_COPY = Object.freeze({
    PLACED: 'We have received your order.',
    CONFIRMED: 'Confirmed and assigned to a fulfilment partner.',
    PACKING: 'Items are being picked and packed at the store.',
    PREPARING: 'The kitchen has started preparing your food.',
    OUT_FOR_DELIVERY: 'Your order is on the way with a delivery partner.',
    DELIVERED: 'Delivered. We hope you enjoy it!',
    CANCELLED: 'This order was cancelled.',
  });

  const PAYMENT_METHODS = Object.freeze({
    DEMO: 'demo', // clearly labelled simulated payment — NOT a real gateway
    COD: 'cod', // cash on delivery (simulated in demo mode)
    UPI: 'upi', // integration-ready stub, requires a real gateway/PSP
    CARD: 'card', // integration-ready stub, requires a real gateway/PSP
  });

  const PAYMENT_STATUS = Object.freeze({
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  });

  const ADDRESS_TYPES = Object.freeze(['home', 'work', 'other']);

  const COUPON_TYPES = Object.freeze({
    PERCENT: 'percent',
    FLAT: 'flat',
    FREE_DELIVERY: 'free_delivery',
  });

  const NOTIFICATION_KINDS = Object.freeze({
    ORDER: 'order',
    PROMO: 'promo',
    COUPON: 'coupon',
    ACCOUNT: 'account',
    SUPPORT: 'support',
  });

  /** Iteration order for the notification centre filters. */
  const NOTIFICATION_KIND_LIST = Object.freeze([
    NOTIFICATION_KINDS.ORDER,
    NOTIFICATION_KINDS.PROMO,
    NOTIFICATION_KINDS.COUPON,
    NOTIFICATION_KINDS.ACCOUNT,
    NOTIFICATION_KINDS.SUPPORT,
  ]);

  /** Demo coverage states — no city in this build has a live delivery network. */
  const COVERAGE = Object.freeze({
    DEMO_FULL: 'demo-full', // full demo catalogue, simulated ETAs
    DEMO_LIMITED: 'demo-limited', // reduced demo assortment
    COMING_SOON: 'coming-soon', // not serviceable, even in demo
  });

  const LOW_STOCK_THRESHOLD = 10;

  /** Loyalty programme defaults (mirrored by AppSetting in the backend). */
  const LOYALTY = Object.freeze({
    earnRate: 0.05, // points per ₹1 of eligible merchandise subtotal
    pointValue: 0.25, // ₹ value of one point
    minRedeemPoints: 100,
    maxRedeemPercent: 30, // cap redemption at 30% of the eligible subtotal
  });

  const STORAGE_KEYS = Object.freeze({
    token: 'fx_token',
    user: 'fx_user',
    cart: 'fx_cart_v1',
    wishlist: 'fx_wishlist_v1',
    recent: 'fx_recent_v1',
    location: 'fx_location_v1',
    addresses: 'fx_addresses_v1',
    orders: 'fx_orders_v1',
    notifications: 'fx_notifications_v1',
    couponsWallet: 'fx_coupon_wallet_v1',
    rewards: 'fx_rewards_v1',
    searches: 'fx_search_history_v1',
    settings: 'fx_settings_v1',
    onboarding: 'fx_onboarding_seen_v1',
    preferences: 'fx_preferences_v1',
    tickets: 'fx_tickets_v1',
    demoAccounts: 'fx_demo_accounts_v1',
    adminCatalog: 'fx_admin_catalog_v1',
  });

  /**
   * Delivery windows offered at checkout. `standard` is the only one with a
   * live ETA; the scheduled windows are simulated in this build and say so.
   */
  const DELIVERY_SLOTS = Object.freeze([
    Object.freeze({ id: 'standard', label: 'Standard delivery', desc: 'Delivered as soon as your order is ready', price: 0 }),
    Object.freeze({ id: 'slot-evening', label: 'Evening slot (6–8 PM)', desc: 'Scheduled delivery window · simulated in this build', price: 0 }),
    Object.freeze({ id: 'slot-tomorrow', label: 'Tomorrow morning (8–10 AM)', desc: 'Scheduled delivery window · simulated in this build', price: 0 }),
  ]);

  const DELIVERY_SLOT_LABELS = Object.freeze(
    DELIVERY_SLOTS.reduce((acc, slot) => {
      acc[slot.id] = slot.label;
      return acc;
    }, {})
  );

  /* Human-readable labels. Kept next to the enums so pages never hard-code
     display strings for statuses, payment methods or address types. */
  const PAYMENT_METHOD_LABELS = Object.freeze({
    DEMO: 'Demo payment (simulated)',
    COD: 'Cash on delivery',
    UPI: 'UPI',
    CARD: 'Credit / debit card',
  });

  const PAYMENT_STATUS_LABELS = Object.freeze({
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
  });

  const ADDRESS_TYPE_LABELS = Object.freeze({
    home: 'Home',
    work: 'Work',
    other: 'Other',
  });

  const NOTIFICATION_KIND_LABELS = Object.freeze({
    order: 'Orders',
    promo: 'Offers & promos',
    coupon: 'Coupons',
    account: 'Account',
    support: 'Support',
  });

  const COVERAGE_LABELS = Object.freeze({
    DEMO_FULL: 'Demo coverage — full catalogue',
    DEMO_LIMITED: 'Demo coverage — limited catalogue',
    COMING_SOON: 'Launching soon — not serviceable',
  });

  const api = {
    ROLES,
    CART_TYPES,
    STORE_ORDER_FLOW,
    RESTAURANT_ORDER_FLOW,
    CANCELLED,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_COPY,
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    ADDRESS_TYPES,
    DELIVERY_SLOTS,
    DELIVERY_SLOT_LABELS,
    COUPON_TYPES,
    NOTIFICATION_KINDS,
    NOTIFICATION_KIND_LIST,
    COVERAGE,
    LOW_STOCK_THRESHOLD,
    LOYALTY,
    STORAGE_KEYS,
    COVERAGE_LABELS,
    NOTIFICATION_KIND_LABELS,
    ADDRESS_TYPE_LABELS,
    PAYMENT_STATUS_LABELS,
    PAYMENT_METHOD_LABELS,
    orderFlowFor(type) {
      return type === CART_TYPES.RESTAURANT ? RESTAURANT_ORDER_FLOW : STORE_ORDER_FLOW;
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FX = global.FX || {};
  global.FX.constants = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

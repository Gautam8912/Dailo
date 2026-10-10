/**
 * Order — priced, persisted fulfilment records.
 *
 * Money is never taken from the client: `items[].unitPrice` and `totals` are
 * written by the order service after re-reading the catalogue and running the
 * shared pricing engine. `idempotencyKey` makes a double-submitted checkout a
 * no-op instead of a duplicate order.
 */
'use strict';

const mongoose = require('mongoose');
const { constants } = require('../services/shared');

const ALL_STATUSES = Array.from(
  new Set(
    []
      .concat(constants.STORE_ORDER_FLOW)
      .concat(constants.RESTAURANT_ORDER_FLOW)
      .concat([constants.CANCELLED])
  )
);

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, default: '' },
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, default: 0 },
    addons: { type: [{ _id: false, groupId: String, optionId: String, label: String, price: Number }], default: [] },
    selection: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    userName: { type: String, default: '' },
    guest: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    cartType: { type: String, enum: [constants.CART_TYPES.STORE, constants.CART_TYPES.RESTAURANT], required: true },
    restaurantId: { type: String, default: null, index: true },
    restaurantName: { type: String, default: '' },

    items: { type: [orderItemSchema], required: true, validate: [(v) => v.length > 0, 'An order needs at least one item.'] },

    // Snapshots: the order keeps what was true when it was placed.
    address: { type: mongoose.Schema.Types.Mixed, required: true },
    location: {
      cityId: String,
      localityId: { type: String, default: null },
      label: { type: String, default: '' },
      coverage: { type: String, default: constants.COVERAGE.DEMO_FULL },
    },

    paymentMethod: {
      type: String,
      enum: [constants.PAYMENT_METHODS.DEMO, constants.PAYMENT_METHODS.COD, constants.PAYMENT_METHODS.UPI, constants.PAYMENT_METHODS.CARD],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: [constants.PAYMENT_STATUS.PENDING, constants.PAYMENT_STATUS.PAID, constants.PAYMENT_STATUS.FAILED, constants.PAYMENT_STATUS.REFUNDED],
      default: constants.PAYMENT_STATUS.PENDING,
      index: true,
    },
    paymentNote: { type: String, default: '' },
    paymentRef: { type: String, default: null },
    /** Set only when a gateway signature was verified server-side. */
    paymentVerified: { type: Boolean, default: false },

    couponCode: { type: String, default: null },
    totals: { type: mongoose.Schema.Types.Mixed, required: true },

    status: { type: String, enum: ALL_STATUSES, required: true, index: true },
    statusHistory: {
      type: [
        {
          _id: false,
          status: { type: String, enum: ALL_STATUSES },
          at: { type: Date, default: Date.now },
          note: { type: String, default: '' },
          by: { type: String, default: 'system' },
        },
      ],
      default: [],
    },
    flow: { type: [String], default: [] },

    etaMinutes: { type: Number, default: 30 },
    deliverySlot: { type: String, default: 'standard' },
    notes: { type: String, default: '', maxlength: 300 },

    /** Every order in this build is a simulation — the flag travels with it. */
    simulated: { type: Boolean, default: true },
    loyaltyEarned: { type: Number, default: 0 },
    loyaltyRedeemed: { type: Number, default: 0 },

    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    refundNote: { type: String, default: '' },

    // Indexed uniquely (partial) below — a retried checkout reuses its order.
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
orderSchema.index({ status: 1, createdAt: -1 });

/** Only forward transitions along the order's own flow (or cancellation). */
orderSchema.methods.canTransitionTo = function canTransitionTo(next) {
  if (next === this.status) return false;
  if (this.status === constants.CANCELLED) return false;
  if (next === constants.CANCELLED) return !['OUT_FOR_DELIVERY', 'DELIVERED'].includes(this.status);
  const flow = this.flow && this.flow.length ? this.flow : constants.orderFlowFor(this.cartType);
  const from = flow.indexOf(this.status);
  const to = flow.indexOf(next);
  return from !== -1 && to !== -1 && to === from + 1;
};

orderSchema.methods.canCancel = function canCancel() {
  if (this.status === constants.CANCELLED || this.status === 'DELIVERED') return false;
  return !['OUT_FOR_DELIVERY'].includes(this.status);
};

orderSchema.methods.toClient = function toClient() {
  const doc = this.toObject({ virtuals: true });
  doc.id = this.orderNumber;
  delete doc._id;
  delete doc.__v;
  delete doc.idempotencyKey;
  return doc;
};

orderSchema.statics.ALL_STATUSES = ALL_STATUSES;

module.exports = mongoose.model('Order', orderSchema);

/**
 * Cart — the server-side cart for signed-in shoppers.
 *
 * Only references and quantities are stored here. Prices are always re-read
 * from the catalogue when the cart is priced, so a stale client can never
 * order at an old price.
 */
'use strict';

const mongoose = require('mongoose');
const { constants } = require('../services/shared');

const cartLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    seedId: { type: String, required: true },
    qty: { type: Number, required: true, min: 1, max: 50 },
    addons: {
      type: [
        {
          _id: false,
          groupId: String,
          optionId: String,
          label: String,
          price: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    selection: { type: mongoose.Schema.Types.Mixed, default: null },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    cartType: { type: String, enum: [constants.CART_TYPES.STORE, constants.CART_TYPES.RESTAURANT], default: constants.CART_TYPES.STORE },
    restaurantId: { type: String, default: null },
    items: { type: [cartLineSchema], default: [] },
    saved: { type: [cartLineSchema], default: [] },
    couponCode: { type: String, default: null, uppercase: true },
    tip: { type: Number, default: 0, min: 0 },
    redeemPoints: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);

/**
 * Wishlist — saved product ids per user.
 */
'use strict';

const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    productIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);

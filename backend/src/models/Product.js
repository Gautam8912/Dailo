/**
 * Product — store items AND restaurant menu items in one collection.
 *
 * `seedId` is the stable id from shared/ (e.g. `p-toor-dal-1-kg` or
 * `m-spice-junction-chicken65`) so the storefront URLs keep working after the
 * catalogue is seeded into MongoDB. `type` separates the two kinds.
 */
'use strict';

const mongoose = require('mongoose');
const { constants } = require('../services/shared');

const customisationSchema = new mongoose.Schema(
  {
    id: String,
    label: String,
    required: { type: Boolean, default: false },
    max: { type: Number, default: 1 },
    options: [
      {
        _id: false,
        id: String,
        label: String,
        price: { type: Number, default: 0 },
        veg: { type: Boolean, default: true },
        mode: { type: String, enum: ['additive', 'multiplier'], default: 'additive' },
      },
    ],
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    seedId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, index: true },
    type: { type: String, enum: ['product', 'menu-item'], default: 'product', index: true },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    brand: { type: String, default: '', trim: true, index: true },
    brandId: { type: String, default: '' },
    categoryId: { type: String, required: true, index: true },
    categoryName: { type: String, default: '' },
    subcategory: { type: String, default: '' },

    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    unit: { type: String, default: '' },

    stock: { type: Number, default: 0, min: 0, index: true },
    inStock: { type: Boolean, default: true },

    gstRate: { type: Number, default: 0.18, min: 0, max: 0.5 },
    handlingMinutes: { type: Number, default: 15, min: 0 },
    prepMinutes: { type: Number, default: 0, min: 0 },

    emoji: { type: String, default: '🛒' },
    tone: { type: String, default: 'brand' },
    description: { type: String, default: '' },
    tags: { type: [String], default: [], index: true },
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },

    popularity: { type: Number, default: 50, min: 0, max: 100 },
    /** Demo merchandising rating — never presented as a verified review score. */
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },

    // Menu-item fields
    restaurantId: { type: String, default: null, index: true },
    restaurantName: { type: String, default: '' },
    sectionId: { type: String, default: null },
    veg: { type: Boolean, default: true },
    customisations: { type: [customisationSchema], default: [] },

    active: { type: Boolean, default: true, index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', brand: 'text', tags: 'text', description: 'text' });
productSchema.index({ categoryId: 1, active: 1, popularity: -1 });
productSchema.index({ restaurantId: 1, sectionId: 1, active: 1 });

/**
 * Keep mrp / discountPercent / inStock consistent with price and stock.
 * Called on save (via the pre-validate hook) and again in toClient() so the
 * API never returns a stale discount even for unsaved or hydrated documents.
 */
productSchema.methods.normalise = function normalise() {
  const price = Number(this.price) || 0;
  let mrp = Number(this.mrp) || 0;
  if (!mrp || mrp < price) mrp = price;
  this.mrp = mrp;
  this.discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  this.inStock = (Number(this.stock) || 0) > 0;
  return this;
};

productSchema.pre('validate', function normaliseBeforeValidate(next) {
  this.normalise();
  next();
});

productSchema.methods.toClient = function toClient() {
  this.normalise();
  const doc = this.toObject({ virtuals: true });
  doc.id = this.seedId;
  delete doc._id;
  delete doc.__v;
  delete doc.updatedBy;
  return doc;
};

productSchema.statics.LOW_STOCK_DEFAULT = constants.LOW_STOCK_THRESHOLD;

module.exports = mongoose.model('Product', productSchema);

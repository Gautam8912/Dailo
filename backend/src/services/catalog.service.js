/**
 * Catalogue service — reads and admin writes against MongoDB.
 */
'use strict';

const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Restaurant = require('../models/Restaurant');
const Coupon = require('../models/Coupon');
const { ApiError } = require('../utils/ApiError');
const { constants } = require('./shared');

const SORTS = {
  popularity: { popularity: -1, name: 1 },
  'price-asc': { price: 1, name: 1 },
  'price-desc': { price: -1, name: 1 },
  newest: { createdAt: -1, name: 1 },
  rating: { rating: -1, popularity: -1 },
  discount: { discountPercent: -1, popularity: -1 },
  name: { name: 1 },
};

function buildFilter(query) {
  const filter = { active: { $ne: false } };
  if (query.category) filter.categoryId = String(query.category);
  if (query.type) filter.type = String(query.type);
  if (query.restaurantId) {
    filter.restaurantId = String(query.restaurantId).replace(/^r-/, '') === String(query.restaurantId)
      ? String(query.restaurantId)
      : { $in: [String(query.restaurantId), String(query.restaurantId).replace(/^r-/, '')] };
  }
  if (query.brand) filter.brand = { $in: String(query.brand).split(',').map((b) => b.trim()) };
  if (query.tags) filter.tags = { $in: String(query.tags).split(',').map((t) => t.trim()) };
  if (query.veg === 'true') filter.veg = true;
  if (query.pureVeg === 'true') filter.veg = true;
  if (query.inStock === 'true') filter.stock = { $gt: 0 };
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }
  if (query.minDiscount) filter.discountPercent = { $gte: Number(query.minDiscount) };
  if (query.q) {
    const term = String(query.q).trim();
    if (term) {
      filter.$or = [
        { name: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { brand: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { tags: { $in: [term.toLowerCase()] } },
        { subcategory: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ];
    }
  }
  return filter;
}

async function listProducts(query) {
  const q = query || {};
  const limit = Math.min(Number(q.limit) || 60, 500);
  const page = Math.max(1, Number(q.page) || 1);
  const filter = buildFilter(q);
  const sort = SORTS[q.sort] || SORTS.popularity;
  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  return { data: items.map(toClient), total, page, pages: Math.max(1, Math.ceil(total / limit)), limit };
}

async function getProduct(seedId) {
  const doc = await Product.findOne({ seedId: String(seedId) }).lean();
  if (!doc) throw ApiError.notFound('We could not find that product.', { code: 'PRODUCT_NOT_FOUND', seedId });
  return toClient(doc);
}

async function findProductsBySeedIds(seedIds) {
  const ids = Array.from(new Set((seedIds || []).map(String)));
  if (!ids.length) return [];
  return Product.find({ seedId: { $in: ids } }).lean();
}

async function listCategories() {
  const docs = await Category.find({ active: { $ne: false } }).sort({ order: 1, name: 1 }).lean();
  return docs.map((doc) => Object.assign({}, doc, { id: doc.categoryId, _id: undefined }));
}

async function listRestaurants(query) {
  const q = query || {};
  const filter = { active: { $ne: false } };
  if (q.cityId) filter.cityIds = String(q.cityId);
  if (q.cuisine) filter.cuisines = String(q.cuisine);
  if (q.pureVeg === 'true') filter.pureVeg = true;
  if (q.q) {
    const term = String(q.q).trim();
    if (term) filter.$or = [{ name: { $regex: term, $options: 'i' } }, { cuisines: { $in: [term] } }, { area: { $regex: term, $options: 'i' } }];
  }
  const docs = await Restaurant.find(filter).sort({ promoted: -1, rating: -1, name: 1 }).limit(Math.min(Number(q.limit) || 100, 200)).lean();
  return docs.map((doc) => Object.assign({}, doc, { id: doc.restaurantId, _id: undefined }));
}

async function getRestaurant(idOrSlug) {
  const key = String(idOrSlug || '').replace(/^r-/, '').toLowerCase();
  const doc = await Restaurant.findOne({ $or: [{ slug: key }, { restaurantId: 'r-' + key }, { restaurantId: key }] }).lean();
  if (!doc) throw ApiError.notFound('We could not find that restaurant.', { code: 'RESTAURANT_NOT_FOUND' });
  const menu = await Product.find({ restaurantId: { $in: [doc.restaurantId, doc.slug] }, type: 'menu-item', active: { $ne: false } })
    .sort({ sectionId: 1, popularity: -1 })
    .lean();
  return Object.assign({}, doc, { id: doc.restaurantId, _id: undefined, menu: menu.map(toClient) });
}

async function listCoupons() {
  const docs = await Coupon.find({}).sort({ code: 1 }).lean();
  return docs.map((doc) => {
    const copy = Object.assign({}, doc);
    delete copy._id;
    delete copy.__v;
    delete copy.totalRedemptions;
    return copy;
  });
}

async function getCoupon(code) {
  return Coupon.findOne({ code: String(code || '').trim().toUpperCase() }).lean();
}

/** Admin: create or update a product / menu item. */
async function saveProduct(payload, updatedBy) {
  const body = Object.assign({}, payload);
  const seedId = body.seedId || body.id;
  delete body.id;
  delete body._id;
  body.updatedBy = updatedBy ? updatedBy._id : null;
  if (seedId) {
    const existing = await Product.findOne({ seedId });
    if (existing) {
      Object.assign(existing, body, { seedId });
      await existing.save();
      return toClient(existing.toObject());
    }
    body.seedId = seedId;
  }
  const created = await Product.create(body);
  return toClient(created.toObject());
}

async function deleteProduct(seedId) {
  const result = await Product.findOneAndUpdate({ seedId: String(seedId) }, { $set: { active: false } }, { new: true });
  if (!result) throw ApiError.notFound('That product does not exist.');
  return { ok: true, id: result.seedId, active: false };
}

/** Stock movements used by order placement/cancellation. */
async function decrementStock(lines) {
  const session = lines.session;
  for (const line of lines.items) {
    const result = await Product.findOneAndUpdate(
      { seedId: line.itemId, stock: { $gte: line.qty } },
      { $inc: { stock: -line.qty } },
      { new: true, session: session || null }
    );
    if (!result) {
      const current = await Product.findOne({ seedId: line.itemId }).lean();
      throw ApiError.conflict(
        (current ? current.name : line.itemId) + ' only has ' + (current ? current.stock : 0) + ' left, so your cart could not be confirmed.',
        { code: 'INSUFFICIENT_STOCK', itemId: line.itemId, available: current ? current.stock : 0, requested: line.qty }
      );
    }
  }
  return true;
}

async function restoreStock(items) {
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    await Product.findOneAndUpdate({ seedId: item.itemId }, { $inc: { stock: item.qty } });
  }
  return true;
}

async function lowStock(threshold) {
  const limit = Number(threshold) || constants.LOW_STOCK_THRESHOLD;
  const docs = await Product.find({ stock: { $lte: limit }, active: { $ne: false } }).sort({ stock: 1, name: 1 }).limit(200).lean();
  return docs.map(toClient);
}

function toClient(doc) {
  const copy = Object.assign({}, doc);
  // `.lean()` documents have no methods, so recompute the derived money fields.
  const price = Number(copy.price) || 0;
  const mrp = Number(copy.mrp) || 0;
  copy.mrp = mrp && mrp >= price ? mrp : price;
  copy.discountPercent = copy.mrp > price ? Math.round(((copy.mrp - price) / copy.mrp) * 100) : 0;
  copy.inStock = (Number(copy.stock) || 0) > 0;
  copy.id = copy.seedId;
  delete copy.seedId;
  delete copy._id;
  delete copy.__v;
  delete copy.updatedBy;
  return copy;
}

module.exports = {
  listProducts,
  getProduct,
  findProductsBySeedIds,
  listCategories,
  listRestaurants,
  getRestaurant,
  listCoupons,
  getCoupon,
  saveProduct,
  deleteProduct,
  decrementStock,
  restoreStock,
  lowStock,
  buildFilter,
  SORTS,
  toClient,
  ObjectId: mongoose.Types.ObjectId,
};

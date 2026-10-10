/**
 * /api/wishlist — saved products for the signed-in shopper.
 */
'use strict';

const express = require('express');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');

const router = express.Router();
router.use(protect);

async function load(user) {
  return (await Wishlist.findOne({ user: user._id })) || Wishlist.create({ user: user._id, productIds: [] });
}

async function serialise(wishlist) {
  const ids = wishlist.productIds || [];
  const docs = ids.length ? await Product.find({ seedId: { $in: ids } }).lean() : [];
  const byId = new Map(docs.map((doc) => [doc.seedId, doc]));
  return {
    ids,
    count: ids.length,
    items: ids.map((id) => byId.get(id)).filter(Boolean).map((doc) => Object.assign({}, doc, { id: doc.seedId, seedId: undefined, _id: undefined })),
  };
}

router.get('/', asyncHandler(async (req, res) => ok(res, await serialise(await load(req.user)))));

router.post(
  '/toggle',
  asyncHandler(async (req, res) => {
    const itemId = String((req.body || {}).itemId || (req.body || {}).id || '');
    if (!itemId) return ok(res, { ok: false, reason: 'Which product should be saved?' });
    const wishlist = await load(req.user);
    const index = wishlist.productIds.indexOf(itemId);
    if (index >= 0) wishlist.productIds.splice(index, 1);
    else wishlist.productIds.unshift(itemId);
    wishlist.productIds = wishlist.productIds.slice(0, 200);
    await wishlist.save();
    return ok(res, Object.assign(await serialise(wishlist), { saved: index < 0, itemId }));
  })
);

module.exports = router;

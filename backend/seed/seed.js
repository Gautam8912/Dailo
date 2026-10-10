#!/usr/bin/env node
/**
 * Food Express — database seeder.
 *
 * Loads the SAME shared modules the storefront uses (single source of truth)
 * and upserts them into MongoDB, so backend mode and demo mode show identical
 * catalogues, prices, coupons and coverage.
 *
 *   node backend/seed/seed.js          (or: npm run seed)
 */
'use strict';

const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} catch (err) {
  /* optional */
}

const { connect, disconnect, mongoose } = require('../src/config/db');
const { env } = require('../src/config/env');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Restaurant = require('../src/models/Restaurant');
const Coupon = require('../src/models/Coupon');
const User = require('../src/models/User');
const AppSetting = require('../src/models/AppSetting');
const { catalog, restaurants, coupons, settings, constants } = require('../src/services/shared');

function log(message, quiet) {
  if (!quiet) process.stdout.write(message + '\n');
}

async function seedCategories(quiet) {
  const docs = catalog.CATEGORIES.map((category, index) => ({
    categoryId: category.id,
    name: category.name,
    slug: category.slug || category.id,
    emoji: category.emoji,
    color: category.color,
    gstRate: category.gstRate,
    handlingMinutes: category.handlingMinutes,
    blurb: category.blurb,
    order: index,
    active: true,
  }));
  let count = 0;
  for (const doc of docs) {
    // eslint-disable-next-line no-await-in-loop
    await Category.updateOne({ categoryId: doc.categoryId }, { $set: doc }, { upsert: true });
    count += 1;
  }
  log('  categories: ' + count, quiet);
  return count;
}

function productDoc(item) {
  return {
    seedId: item.id,
    slug: item.slug,
    type: item.type || 'product',
    name: item.name,
    brand: item.brand || '',
    brandId: item.brandId || '',
    categoryId: item.categoryId,
    categoryName: item.categoryName || '',
    subcategory: item.subcategory || '',
    price: item.price,
    mrp: item.mrp || item.price,
    discountPercent: item.discountPercent || 0,
    unit: item.unit || '',
    stock: typeof item.stock === 'number' ? item.stock : 40,
    gstRate: typeof item.gstRate === 'number' ? item.gstRate : 0.18,
    handlingMinutes: item.handlingMinutes || 15,
    prepMinutes: item.prepMinutes || 0,
    emoji: item.emoji || '🛒',
    tone: item.tone || 'brand',
    description: item.description || '',
    tags: item.tags || [],
    attributes: item.attributes || {},
    popularity: item.popularity || 50,
    rating: item.rating || 0,
    reviewCount: 0,
    restaurantId: item.restaurantId || null,
    restaurantName: item.restaurantName || '',
    sectionId: item.sectionId || null,
    veg: item.veg !== false,
    customisations: item.customisations || [],
    active: item.active !== false,
  };
}

async function seedProducts(quiet) {
  let count = 0;
  for (const item of catalog.PRODUCTS) {
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ seedId: item.id }, { $set: productDoc(item) }, { upsert: true });
    count += 1;
  }
  for (const item of restaurants.MENU_ITEMS) {
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ seedId: item.id }, { $set: productDoc(item) }, { upsert: true });
    count += 1;
  }
  log('  products + menu items: ' + count, quiet);
  return count;
}

async function seedRestaurants(quiet) {
  let count = 0;
  for (const item of restaurants.RESTAURANTS) {
    // eslint-disable-next-line no-await-in-loop
    await Restaurant.updateOne(
      { restaurantId: item.id },
      {
        $set: {
          restaurantId: item.id,
          slug: item.slug,
          name: item.name,
          cuisines: item.cuisines,
          pureVeg: item.pureVeg,
          cityIds: item.cityIds,
          area: item.area,
          rating: item.rating,
          reviewCount: 0,
          etaMinutes: item.etaMinutes,
          minOrder: item.minOrder,
          deliveryFee: item.deliveryFee,
          packingFee: item.packingFee,
          emoji: item.emoji,
          tone: item.tone,
          promoted: item.promoted,
          offers: item.offers,
          hours: item.hours,
          blurb: item.blurb,
          sections: item.sections,
          priceForTwo: item.priceForTwo,
          active: true,
        },
      },
      { upsert: true }
    );
    count += 1;
  }
  log('  restaurants: ' + count, quiet);
  return count;
}

async function seedCoupons(quiet) {
  let count = 0;
  for (const coupon of coupons.COUPONS) {
    // eslint-disable-next-line no-await-in-loop
    await Coupon.updateOne(
      { code: coupon.code },
      {
        $set: {
          code: coupon.code,
          title: coupon.title,
          description: coupon.description || '',
          type: coupon.type,
          value: coupon.value,
          minSubtotal: coupon.minSubtotal || 0,
          maxDiscount: coupon.maxDiscount || 0,
          maxUsesPerUser: coupon.maxUsesPerUser || 3,
          validFrom: coupon.validFrom || null,
          validTo: coupon.validTo || null,
          cartType: coupon.cartType || null,
          categories: coupon.categories || [],
          restaurants: coupon.restaurants || [],
          firstOrderOnly: Boolean(coupon.firstOrderOnly),
          newUserOnly: Boolean(coupon.newUserOnly),
          stacksWithCoupon: Boolean(coupon.stacksWithCoupon),
          active: coupon.active !== false,
          demo: coupon.demo !== false,
        },
      },
      { upsert: true }
    );
    count += 1;
  }
  log('  coupons: ' + count, quiet);
  return count;
}

async function seedSettings(quiet) {
  await AppSetting.updateOne({ key: AppSetting.SETTINGS_KEY }, { $setOnInsert: { value: settings.DEFAULT_SETTINGS } }, { upsert: true });
  log('  settings: defaults stored (threshold ₹' + settings.DEFAULT_SETTINGS.freeDeliveryThreshold + ', fee ₹' + settings.DEFAULT_SETTINGS.deliveryFee + ')', quiet);
  return 1;
}

async function seedUsers(quiet) {
  if (!env.demo.seedAccounts) {
    log('  demo accounts: skipped (SEED_DEMO_ACCOUNTS=false)', quiet);
    return 0;
  }
  const wanted = [
    { name: 'Food Express Admin', email: env.demo.adminEmail, phone: '9000000001', password: env.demo.adminPassword, role: constants.ROLES.ADMIN },
    { name: 'Test User', email: env.demo.userEmail, phone: '9000000002', password: env.demo.userPassword, role: constants.ROLES.USER },
  ];
  let count = 0;
  for (const entry of wanted) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await User.findOne({ email: entry.email });
    if (existing) {
      count += 1;
      continue;
    }
    const user = new User({ name: entry.name, email: entry.email, phone: entry.phone, role: entry.role });
    // eslint-disable-next-line no-await-in-loop
    await user.setPassword(entry.password);
    // eslint-disable-next-line no-await-in-loop
    await user.save();
    count += 1;
    log('  created ' + entry.role + ' account: ' + entry.email, quiet);
  }
  log('  accounts: ' + count, quiet);
  return count;
}

async function run(options) {
  const opts = options || {};
  const shouldDisconnect = !opts.keepConnection;
  if (mongoose.connection.readyState !== 1) await connect();
  log('Seeding Food Express from shared/ …', opts.quiet);
  const counts = {
    categories: await seedCategories(opts.quiet),
    products: await seedProducts(opts.quiet),
    restaurants: await seedRestaurants(opts.quiet),
    coupons: await seedCoupons(opts.quiet),
    settings: await seedSettings(opts.quiet),
    users: await seedUsers(opts.quiet),
  };
  log('Seed complete: ' + JSON.stringify(counts), opts.quiet);
  if (shouldDisconnect) await disconnect();
  return { counts };
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      process.stderr.write('✗ Seeding failed: ' + (err && err.message ? err.message : err) + '\n');
      process.exit(1);
    });
}

module.exports = { run };

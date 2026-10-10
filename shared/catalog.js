/**
 * Food Express — central catalogue (categories, brands, products, banners).
 *
 * ONE source of truth. The browser demo store, the Express seed script and the
 * admin panel all read from this file, so product IDs stay consistent across
 * search, category pages, product details, cart, checkout, orders and admin.
 *
 * Data honesty:
 *  - Every product/brand is fictional sample data for local development.
 *  - `rating` is a demo merchandising value, NOT a verified customer rating.
 *  - `reviewCount` is 0 everywhere because no real review data exists.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Categories                                                          */
  /* ------------------------------------------------------------------ */

  const RAW_CATEGORIES = [
    { id: 'groceries', name: 'Groceries & Staples', emoji: '🌾', color: '#c2703d', gstRate: 0, handlingMinutes: 4, blurb: 'Rice, atta, dals, oils and spices.' },
    { id: 'fruits-vegetables', name: 'Fruits & Vegetables', emoji: '🥬', color: '#3f8f4f', gstRate: 0, handlingMinutes: 6, blurb: 'Farm-fresh produce, picked daily.' },
    { id: 'dairy-bakery', name: 'Dairy, Bread & Eggs', emoji: '🥛', color: '#2f7fa8', gstRate: 0, handlingMinutes: 5, blurb: 'Milk, curd, paneer, bakes and eggs.' },
    { id: 'snacks', name: 'Snacks & Munchies', emoji: '🍿', color: '#c9542f', gstRate: 0.18, handlingMinutes: 4, blurb: 'Chips, biscuits, namkeen and chocolate.' },
    { id: 'beverages', name: 'Cold Drinks & Juices', emoji: '🥤', color: '#a8325e', gstRate: 0.18, handlingMinutes: 4, blurb: 'Sodas, juices and chilled drinks.' },
    { id: 'tea-coffee', name: 'Tea, Coffee & Health Drinks', emoji: '☕', color: '#7a4b23', gstRate: 0.05, handlingMinutes: 4, blurb: 'Leaf teas, beans and malts.' },
    { id: 'instant', name: 'Instant & Frozen Food', emoji: '🍜', color: '#b4552a', gstRate: 0.12, handlingMinutes: 8, blurb: 'Noodles, momos and ready meals.' },
    { id: 'personal-care', name: 'Personal Care', emoji: '🧼', color: '#3f7f9a', gstRate: 0.18, handlingMinutes: 5, blurb: 'Bath, hair and oral care.' },
    { id: 'beauty', name: 'Beauty & Grooming', emoji: '💄', color: '#a4437a', gstRate: 0.18, handlingMinutes: 5, blurb: 'Skincare, makeup and grooming.' },
    { id: 'household', name: 'Household Essentials', emoji: '🧽', color: '#4a7a3f', gstRate: 0.18, handlingMinutes: 5, blurb: 'Cleaning, laundry and disposables.' },
    { id: 'electronics', name: 'Electronics & Accessories', emoji: '🔌', color: '#3b5ba5', gstRate: 0.18, handlingMinutes: 12, blurb: 'Chargers, audio and desk gear.' },
    { id: 'stationery', name: 'Stationery & Office', emoji: '✏️', color: '#8a6d3b', gstRate: 0.12, handlingMinutes: 8, blurb: 'Notebooks, pens and art supplies.' },
    { id: 'pet-supplies', name: 'Pet Supplies', emoji: '🐾', color: '#a3713a', gstRate: 0.18, handlingMinutes: 10, blurb: 'Food, treats and grooming for pets.' },
    { id: 'baby-care', name: 'Baby Care', emoji: '🍼', color: '#4d8fb0', gstRate: 0.12, handlingMinutes: 8, blurb: 'Diapers, wipes and baby essentials.' },
    { id: 'food', name: 'Food & Restaurants', emoji: '🍔', color: '#d0552f', gstRate: 0.05, handlingMinutes: 20, blurb: 'Order from restaurants near you.' },
  ];

  /* ------------------------------------------------------------------ */
  /* Brands (fictional — created for this demo catalogue)                 */
  /* ------------------------------------------------------------------ */

  const BRAND_NAMES = [
    'Harvest Gold', 'Millstone Farms', 'Golden Press', 'Daily Harvest', 'Sweet Crystal',
    'Pure Crystal', 'Spice Route', 'Morning Field', 'Fresh Farm', 'Orchard Hills',
    'Amrut Dairy', 'Crumb & Co', 'CrunchCo', 'SnackLab', 'Chatak House', 'Cocoa Bloom',
    'Nimbus Foods', 'Fizz Pop', 'Aqua Pure', 'Voltix', 'Leaf & Bloom', 'Bean Theory',
    'Yummi Bowl', 'Frost Kitchen', 'Veda Care', 'Pure & Simple', 'Bright Smiles',
    'Nimbus Grooming', 'HomeSoft', 'Glow Theory', 'Nimbus Home', 'Sparkle Works',
    'SoundPeak', 'DeskNest', 'PaperNest', 'Inkwell', 'ArtNest', 'Pawsome', 'TinyToes',
  ];

  /* ------------------------------------------------------------------ */
  /* Products                                                            */
  /* ------------------------------------------------------------------ */
  /*  n name · b brand · c category · s subcategory · p price · m mrp     */
  /*  u unit · e emoji · st stock · r demo rating · pop popularity        */
  /*  d description · t tags · a attributes · h extra handling minutes    */

  const RAW = [
    /* ---- Groceries & staples ---- */
    { n: 'Basmati Rice', b: 'Harvest Gold', c: 'groceries', s: 'Rice & Grains', p: 549, m: 640, u: '5 kg', e: '🍚', st: 42, r: 4.5, pop: 96, d: 'Long-grain aged basmati with a light aroma; cooks fluffy and separate.', t: ['bestseller', 'essential'], a: { Type: 'Aged basmati', 'Grain length': 'Extra long', Origin: 'North India', Storage: 'Cool, dry place' } },
    { n: 'Sona Masoori Rice', b: 'Harvest Gold', c: 'groceries', s: 'Rice & Grains', p: 720, m: 820, u: '10 kg', e: '🌾', st: 28, r: 4.4, pop: 88, d: 'Lightweight medium-grain rice, a daily staple for South Indian meals.', t: ['essential', 'deal'], a: { Type: 'Sona masoori', Polishing: 'Single polished', Storage: 'Airtight container' } },
    { n: 'Whole Wheat Atta', b: 'Millstone Farms', c: 'groceries', s: 'Atta & Flour', p: 265, m: 310, u: '5 kg', e: '🫓', st: 55, r: 4.6, pop: 97, d: 'Chakki-fresh whole wheat flour with no added maida or bleaching agents.', t: ['bestseller', 'essential'], a: { Ingredient: '100% whole wheat', Fibre: 'High fibre', Shelf: '6 months' } },
    { n: 'Multigrain Atta', b: 'Millstone Farms', c: 'groceries', s: 'Atta & Flour', p: 145, m: 170, u: '2 kg', e: '🥯', st: 31, r: 4.2, pop: 61, d: 'Wheat blended with ragi, jowar, bajra and oat for softer, fibre-rich rotis.', t: ['new'], a: { Grains: '5 grains', Fibre: 'High fibre' } },
    { n: 'Besan (Gram Flour)', b: 'Millstone Farms', c: 'groceries', s: 'Atta & Flour', p: 92, m: 110, u: '1 kg', e: '🥣', st: 40, r: 4.3, pop: 72, d: 'Finely milled chickpea flour for pakoras, kadhi and sweets.', t: ['essential'], a: { Grind: 'Fine', Ingredient: 'Chana dal' } },
    { n: 'Rava / Sooji', b: 'Millstone Farms', c: 'groceries', s: 'Atta & Flour', p: 58, m: 70, u: '1 kg', e: '🍮', st: 44, r: 4.2, pop: 66, d: 'Coarse semolina that makes fluffy upma and smooth rava kesari.', t: ['essential'], a: { Grind: 'Coarse' } },
    { n: 'Refined Sunflower Oil', b: 'Golden Press', c: 'groceries', s: 'Oils & Ghee', p: 145, m: 175, u: '1 L', e: '🛢️', st: 60, r: 4.4, pop: 93, d: 'Light, low-absorption sunflower oil for everyday frying and tempering.', t: ['bestseller', 'essential', 'deal'], a: { Type: 'Refined', 'Fat profile': 'Low saturated fat' } },
    { n: 'Cold Pressed Groundnut Oil', b: 'Golden Press', c: 'groceries', s: 'Oils & Ghee', p: 190, m: 225, u: '1 L', e: '🥜', st: 26, r: 4.5, pop: 70, d: 'Wood-pressed peanut oil with a natural nutty flavour, unrefined.', t: ['new', 'trending'], a: { Type: 'Cold pressed', Processing: 'Unrefined' } },
    { n: 'Pure Cow Ghee', b: 'Amrut Dairy', c: 'groceries', s: 'Oils & Ghee', p: 325, m: 385, u: '500 ml', e: '🧈', st: 24, r: 4.6, pop: 79, d: 'Bilona-churned cow ghee with a rich grainy texture and caramel notes.', t: ['bestseller'], a: { Source: 'Cow milk', Method: 'Bilona' } },
    { n: 'Toor Dal (Arhar)', b: 'Daily Harvest', c: 'groceries', s: 'Dals & Pulses', p: 168, m: 190, u: '1 kg', e: '🫘', st: 48, r: 4.5, pop: 91, d: 'Unpolished pigeon pea that cooks soft — the everyday dal for most kitchens.', t: ['essential', 'bestseller'], a: { Polish: 'Unpolished', Protein: '22 g / 100 g' } },
    { n: 'Moong Dal (Split Yellow)', b: 'Daily Harvest', c: 'groceries', s: 'Dals & Pulses', p: 88, m: 100, u: '500 g', e: '🫛', st: 52, r: 4.4, pop: 84, d: 'Quick-cooking split green gram, easy to digest and light on the stomach.', t: ['essential'], a: { Polish: 'Unpolished' } },
    { n: 'Chana Dal', b: 'Daily Harvest', c: 'groceries', s: 'Dals & Pulses', p: 105, m: 125, u: '1 kg', e: '🥘', st: 38, r: 4.3, pop: 74, d: 'Split bengal gram for dals, batters and snack mixes.', t: ['essential'], a: { Polish: 'Unpolished' } },
    { n: 'Urad Dal (Whole White)', b: 'Daily Harvest', c: 'groceries', s: 'Dals & Pulses', p: 92, m: 110, u: '500 g', e: '🍲', st: 33, r: 4.3, pop: 68, d: 'Whole white urad for idli, dosa and vada batter with a good rise.', t: ['essential'], a: { Use: 'Batter' } },
    { n: 'Refined Sugar', b: 'Sweet Crystal', c: 'groceries', s: 'Sugar, Salt & Spices', p: 48, m: 55, u: '1 kg', e: '🍬', st: 65, r: 4.1, pop: 80, d: 'Free-flowing refined white sugar crystals with no added colour.', t: ['essential'], a: { Grade: 'Refined' } },
    { n: 'Iodised Salt', b: 'Pure Crystal', c: 'groceries', s: 'Sugar, Salt & Spices', p: 26, m: 30, u: '1 kg', e: '🧂', st: 80, r: 4.2, pop: 86, d: 'Vacuum-evaporated salt fortified with iodine, anti-caking free.', t: ['essential', 'under99'], a: { Fortified: 'Iodine' } },
    { n: 'Turmeric Powder', b: 'Spice Route', c: 'groceries', s: 'Sugar, Salt & Spices', p: 62, m: 75, u: '200 g', e: '🫙', st: 47, r: 4.4, pop: 82, d: 'Single-origin Erode turmeric, sun dried and ground with high curcumin.', t: ['essential'], a: { Origin: 'Erode', Additives: 'None' } },
    { n: 'Garam Masala', b: 'Spice Route', c: 'groceries', s: 'Sugar, Salt & Spices', p: 78, m: 95, u: '100 g', e: '🧂', st: 41, r: 4.5, pop: 77, d: 'Slow-roasted blend of twelve whole spices, ground in small batches.', t: ['bestseller'], a: { Spices: '12', Roasting: 'Slow roasted' } },
    { n: 'Red Chilli Powder', b: 'Spice Route', c: 'groceries', s: 'Sugar, Salt & Spices', p: 84, m: 100, u: '200 g', e: '🌶️', st: 39, r: 4.3, pop: 76, d: 'Guntur chilli blend that gives deep colour with balanced heat.', t: ['essential'], a: { Origin: 'Guntur', Heat: 'Medium-hot' } },
    { n: 'Poha (Flattened Rice)', b: 'Daily Harvest', c: 'groceries', s: 'Breakfast Staples', p: 42, m: 50, u: '500 g', e: '🍚', st: 58, r: 4.2, pop: 71, d: 'Thick-lam poha that stays soft and separate in kanda poha.', t: ['essential', 'under99'], a: { Thickness: 'Thick lam' } },
    { n: 'Rolled Oats', b: 'Morning Field', c: 'groceries', s: 'Breakfast Staples', p: 175, m: 210, u: '1 kg', e: '🥣', st: 36, r: 4.4, pop: 83, d: 'Wholegrain rolled oats, no added sugar — 4 g of fibre per serving.', t: ['trending', 'deal'], a: { Fibre: '4 g / serving', Additives: 'None' } },
    { n: 'Roasted Vermicelli', b: 'Morning Field', c: 'groceries', s: 'Breakfast Staples', p: 38, m: 45, u: '200 g', e: '🍝', st: 44, r: 4.0, pop: 58, d: 'Pre-roasted wheat vermicelli for quick upma, kheer and semiya pulao.', t: ['under99'], a: { Base: 'Wheat', Roasting: 'Pre-roasted' } },

    /* ---- Fruits & vegetables ---- */
    { n: 'Robusta Bananas', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Fruits', p: 55, m: 70, u: '1 kg (6-7 pcs)', e: '🍌', st: 70, r: 4.3, pop: 95, d: 'Naturally ripened robusta bananas, sourced within 48 hours of harvest.', t: ['bestseller', 'fresh', 'essential'], a: { Ripening: 'Natural', Shelf: '3-4 days' }, h: 2 },
    { n: 'Shimla Apples', b: 'Orchard Hills', c: 'fruits-vegetables', s: 'Fresh Fruits', p: 165, m: 199, u: '4 pcs (≈500 g)', e: '🍎', st: 45, r: 4.5, pop: 90, d: 'Crisp red apples from Himachal orchards, graded for sweetness.', t: ['bestseller', 'fresh'], a: { Origin: 'Shimla', Grade: 'A' }, h: 2 },
    { n: 'Green Apples', b: 'Orchard Hills', c: 'fruits-vegetables', s: 'Fresh Fruits', p: 130, m: 160, u: '2 pcs', e: '🍏', st: 32, r: 4.2, pop: 63, d: 'Tart, firm green apples — good for salads and snacking.', t: ['fresh'], a: { Taste: 'Tart' }, h: 2 },
    { n: 'Nagpur Oranges', b: 'Orchard Hills', c: 'fruits-vegetables', s: 'Fresh Fruits', p: 120, m: 150, u: '4 pcs', e: '🍊', st: 38, r: 4.3, pop: 75, d: 'Juicy seasonal oranges with a sweet-tangy balance, hand sorted.', t: ['fresh', 'seasonal'], a: { Season: 'Nov-Feb' }, h: 2 },
    { n: 'Alphonso Mangoes', b: 'Orchard Hills', c: 'fruits-vegetables', s: 'Fresh Fruits', p: 289, m: 349, u: '4 pcs (1 dozen box)', e: '🥭', st: 18, r: 4.7, pop: 89, d: 'Ratnagiri alphonso, carbide free and ripened in hay crates.', t: ['seasonal', 'trending', 'fresh'], a: { Origin: 'Ratnagiri', Ripening: 'Carbide free' }, h: 3 },
    { n: 'Seedless Green Grapes', b: 'Orchard Hills', c: 'fruits-vegetables', s: 'Fresh Fruits', p: 78, m: 99, u: '500 g', e: '🍇', st: 40, r: 4.2, pop: 72, d: 'Sweet seedless table grapes, washed and packed in vented punnets.', t: ['fresh', 'under99'], a: { Seeds: 'Seedless' }, h: 2 },
    { n: 'Pomegranate', b: 'Orchard Hills', c: 'fruits-vegetables', s: 'Fresh Fruits', p: 145, m: 180, u: '2 pcs', e: '🫐', st: 29, r: 4.1, pop: 57, d: 'Deep-red aril pomegranates from Solapur, heavy and juicy.', t: ['fresh'], a: { Origin: 'Solapur' }, h: 2 },
    { n: 'Papaya', b: 'Orchard Hills', c: 'fruits-vegetables', s: 'Fresh Fruits', p: 45, m: 60, u: '1 pc (≈700 g)', e: '🥭', st: 34, r: 4.0, pop: 52, d: 'Table-ripe red lady papaya, sweet with a soft buttery flesh.', t: ['fresh', 'under99'], a: { Ripeness: 'Table ripe' }, h: 2 },
    { n: 'Potatoes', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Vegetables', p: 38, m: 45, u: '1 kg', e: '🥔', st: 90, r: 4.1, pop: 94, d: 'Firm chipsona potatoes, brushed clean and stored away from light.', t: ['essential', 'bestseller', 'under99'], a: { Variety: 'Chipsona' }, h: 2 },
    { n: 'Onions', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Vegetables', p: 42, m: 52, u: '1 kg', e: '🧅', st: 88, r: 4.0, pop: 93, d: 'Nashik red onions with tight skins, graded for size.', t: ['essential', 'bestseller', 'under99'], a: { Origin: 'Nashik' }, h: 2 },
    { n: 'Tomatoes (Hybrid)', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Vegetables', p: 36, m: 48, u: '1 kg', e: '🍅', st: 72, r: 4.2, pop: 92, d: 'Firm hybrid tomatoes with balanced acidity for curries and salads.', t: ['essential', 'fresh', 'under99'], a: { Variety: 'Hybrid' }, h: 2 },
    { n: 'Spinach (Palak)', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Vegetables', p: 22, m: 30, u: '250 g', e: '🥬', st: 46, r: 4.3, pop: 69, d: 'Tender leaf spinach, hydro-cooled and delivered the same morning.', t: ['fresh', 'essential', 'under99'], a: { Shelf: '2 days refrigerated' }, h: 3 },
    { n: 'Carrots', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Vegetables', p: 34, m: 45, u: '500 g', e: '🥕', st: 54, r: 4.4, pop: 78, d: 'Sweet Ooty carrots, crunchy and good for juices and sabzi.', t: ['fresh', 'essential', 'under99'], a: { Origin: 'Ooty' }, h: 2 },
    { n: 'Cucumber', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Vegetables', p: 28, m: 38, u: '500 g', e: '🥒', st: 48, r: 4.1, pop: 64, d: 'Thin-skin cucumber with low seeds, ideal for salads and raita.', t: ['fresh', 'under99'], a: { Variety: 'Thin skin' }, h: 2 },
    { n: 'Green Capsicum', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Vegetables', p: 32, m: 40, u: '250 g', e: '🫑', st: 41, r: 4.2, pop: 60, d: 'Thick-walled capsicum with a mild pepper bite.', t: ['fresh', 'under99'], a: { Walls: 'Thick' }, h: 2 },
    { n: 'Cauliflower', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Vegetables', p: 38, m: 48, u: '1 pc', e: '🥦', st: 33, r: 4.0, pop: 56, d: 'Compact white curd cauliflower, leaves trimmed but intact.', t: ['fresh', 'under99'], a: { Grade: 'A' }, h: 2 },
    { n: 'Ladies Finger (Bhindi)', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Fresh Vegetables', p: 26, m: 34, u: '250 g', e: '🌿', st: 37, r: 4.1, pop: 58, d: 'Tender young okra pods that stay non-stringy when cooked.', t: ['fresh', 'under99'], a: { Size: 'Young pods' }, h: 2 },
    { n: 'Fresh Coriander', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Herbs & Seasonings', p: 12, m: 18, u: '100 g', e: '🌱', st: 60, r: 4.2, pop: 66, d: 'Root-on coriander bunches with strong aroma, washed and chilled.', t: ['fresh', 'essential', 'under99'], a: { Form: 'Root-on bunch' }, h: 3 },
    { n: 'Lemons', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Herbs & Seasonings', p: 30, m: 40, u: '4 pcs', e: '🍋', st: 57, r: 4.0, pop: 62, d: 'Thin-skinned juicy lemons for sharbat, pickles and tempering.', t: ['essential', 'under99'], a: { Skin: 'Thin' }, h: 2 },
    { n: 'Green Chillies', b: 'Fresh Farm', c: 'fruits-vegetables', s: 'Herbs & Seasonings', p: 14, m: 20, u: '100 g', e: '🌶️', st: 55, r: 4.1, pop: 59, d: 'Firm hot green chillies, sorted for even heat.', t: ['essential', 'under99'], a: { Heat: 'Hot' }, h: 2 },

    /* ---- Dairy, bread & eggs ---- */
    { n: 'Full Cream Milk', b: 'Amrut Dairy', c: 'dairy-bakery', s: 'Milk', p: 68, m: 72, u: '1 L pouch', e: '🥛', st: 120, r: 4.6, pop: 98, d: 'Homogenised full cream milk (6% fat), pasteurised and chill-chain delivered.', t: ['bestseller', 'essential'], a: { Fat: '6%', Process: 'Pasteurised' }, h: 1 },
    { n: 'Toned Milk', b: 'Amrut Dairy', c: 'dairy-bakery', s: 'Milk', p: 32, m: 35, u: '500 ml pouch', e: '🍼', st: 140, r: 4.4, pop: 87, d: 'Low-fat toned milk (3% fat) for daily tea and cereal.', t: ['essential', 'under99'], a: { Fat: '3%' }, h: 1 },
    { n: 'Fresh Curd Cup', b: 'Amrut Dairy', c: 'dairy-bakery', s: 'Curd & Yogurt', p: 42, m: 48, u: '400 g', e: '🥣', st: 66, r: 4.5, pop: 85, d: 'Thick set curd made from whole milk with live cultures.', t: ['bestseller', 'essential'], a: { Cultures: 'Live', Fat: 'Whole milk' }, h: 1 },
    { n: 'Greek Yogurt', b: 'Amrut Dairy', c: 'dairy-bakery', s: 'Curd & Yogurt', p: 55, m: 65, u: '100 g', e: '🍶', st: 42, r: 4.3, pop: 61, d: 'Strained hung yogurt with 9 g protein per cup, no added sugar.', t: ['trending', 'new'], a: { Protein: '9 g', Sugar: 'No added sugar' }, h: 1 },
    { n: 'Malai Paneer', b: 'Amrut Dairy', c: 'dairy-bakery', s: 'Paneer & Cheese', p: 98, m: 115, u: '200 g', e: '🧀', st: 39, r: 4.6, pop: 90, d: 'Soft malai paneer block made from full cream milk, vacuum packed.', t: ['bestseller'], a: { Texture: 'Soft malai', Shelf: '7 days chilled' }, h: 1 },
    { n: 'Salted Butter', b: 'Amrut Dairy', c: 'dairy-bakery', s: 'Paneer & Cheese', p: 62, m: 70, u: '100 g', e: '🧈', st: 51, r: 4.5, pop: 82, d: 'Table butter churned from fresh cream with light salt.', t: ['essential', 'under99'], a: { Salt: 'Lightly salted' }, h: 1 },
    { n: 'Cheese Slices', b: 'Amrut Dairy', c: 'dairy-bakery', s: 'Paneer & Cheese', p: 135, m: 155, u: '200 g (10 slices)', e: '🧀', st: 34, r: 4.2, pop: 74, d: 'Individually wrapped processed cheese slices that melt evenly.', t: ['deal'], a: { Slices: '10' }, h: 1 },
    { n: 'Pizza Mozzarella', b: 'Amrut Dairy', c: 'dairy-bakery', s: 'Paneer & Cheese', p: 145, m: 165, u: '200 g', e: '🍕', st: 27, r: 4.4, pop: 65, d: 'High-melt mozzarella block with a good stretch for home pizzas.', t: ['trending'], a: { Melt: 'High stretch' }, h: 1 },
    { n: 'Farm Fresh Eggs', b: 'Daily Harvest', c: 'dairy-bakery', s: 'Eggs', p: 58, m: 70, u: '6 pcs', e: '🥚', st: 75, r: 4.5, pop: 92, d: 'Cage-free brown eggs, candle tested and packed in moulded trays.', t: ['bestseller', 'essential', 'under99'], a: { Farming: 'Cage free', Size: 'Medium 55 g' }, h: 1 },
    { n: 'Brown Bread', b: 'Crumb & Co', c: 'dairy-bakery', s: 'Breads & Bakes', p: 48, m: 55, u: '400 g', e: '🍞', st: 43, r: 4.1, pop: 81, d: 'Whole wheat sandwich bread baked daily with no preservatives.', t: ['essential', 'under99'], a: { Base: 'Whole wheat', Preservatives: 'None', Shelf: '3 days' }, h: 1 },
    { n: 'Dinner Pav', b: 'Crumb & Co', c: 'dairy-bakery', s: 'Breads & Bakes', p: 35, m: 42, u: '8 pcs', e: '🥖', st: 40, r: 4.2, pop: 70, d: 'Soft pull-apart pav for bhaji, sliders and buns.', t: ['essential', 'under99'], a: { Count: '8' }, h: 1 },
    { n: 'Butter Cookies', b: 'Crumb & Co', c: 'dairy-bakery', s: 'Breads & Bakes', p: 78, m: 95, u: '250 g', e: '🍪', st: 30, r: 4.4, pop: 67, d: 'Eggless all-butter cookies baked in small trays, crisp and short.', t: ['deal'], a: { Egg: 'Eggless', Butter: 'All butter' }, h: 1 },
    { n: 'Chocolate Muffins', b: 'Crumb & Co', c: 'dairy-bakery', s: 'Cakes & Muffins', p: 85, m: 100, u: '2 pcs', e: '🧁', st: 22, r: 4.3, pop: 59, d: 'Moist double-chocolate muffins with a crumb top.', t: ['new', 'under99'], a: { Count: '2' }, h: 1 },
    { n: 'Plum Fruit Cake', b: 'Crumb & Co', c: 'dairy-bakery', s: 'Cakes & Muffins', p: 245, m: 290, u: '500 g', e: '🍰', st: 14, r: 4.5, pop: 54, d: 'Slow-baked dense plum cake with rum-soaked dry fruits.', t: ['seasonal', 'deal'], a: { 'Dry fruit': 'Rum soaked' }, h: 2 },
    { n: 'Milk Rusk', b: 'Crumb & Co', c: 'dairy-bakery', s: 'Breads & Bakes', p: 45, m: 55, u: '200 g', e: '🥖', st: 36, r: 4.0, pop: 63, d: 'Twice-baked crunchy rusk for tea, no artificial sweetener.', t: ['under99'], a: { Bake: 'Twice baked' }, h: 1 },
    { n: 'Cream Cheese Spread', b: 'Amrut Dairy', c: 'dairy-bakery', s: 'Paneer & Cheese', p: 125, m: 145, u: '100 g tub', e: '🥫', st: 19, r: 4.2, pop: 48, d: 'Whipped plain cream cheese spread for bagels and cheesecake.', t: ['new'], a: { Form: 'Whipped' }, h: 1 },

    /* ---- Snacks ---- */
    { n: 'Salted Potato Chips', b: 'CrunchCo', c: 'snacks', s: 'Chips & Crisps', p: 45, m: 55, u: '90 g', e: '🍟', st: 64, r: 4.3, pop: 88, d: 'Kettle-cooked chips with sea salt, no palm oil.', t: ['bestseller', 'under99'], a: { Cook: 'Kettle', Oil: 'Non palm' } },
    { n: 'Masala Potato Chips', b: 'CrunchCo', c: 'snacks', s: 'Chips & Crisps', p: 45, m: 55, u: '90 g', e: '🌶️', st: 58, r: 4.4, pop: 86, d: 'Chaat masala dusted chips with a tangy spicy finish.', t: ['under99', 'deal'], a: { Flavour: 'Chaat masala' } },
    { n: 'Cream Biscuits', b: 'SnackLab', c: 'snacks', s: 'Biscuits & Cookies', p: 30, m: 40, u: '120 g', e: '🍪', st: 82, r: 4.2, pop: 79, d: 'Vanilla cream sandwich biscuits with a crisp shell.', t: ['under99', 'essential'], a: { Flavour: 'Vanilla' } },
    { n: 'Glucose Biscuits', b: 'SnackLab', c: 'snacks', s: 'Biscuits & Cookies', p: 55, m: 65, u: '300 g', e: '🍘', st: 70, r: 4.1, pop: 76, d: 'Everyday milk-glucose biscuits, family pack of three rolls.', t: ['under99', 'deal'], a: { Pack: '3 rolls' } },
    { n: 'Oats Digestive Biscuits', b: 'SnackLab', c: 'snacks', s: 'Biscuits & Cookies', p: 78, m: 90, u: '250 g', e: '🥮', st: 44, r: 4.3, pop: 55, d: 'Baked with rolled oats and whole wheat, lightly sweetened with jaggery.', t: ['trending'], a: { Sweetener: 'Jaggery' } },
    { n: 'Namkeen Mixture', b: 'Chatak House', c: 'snacks', s: 'Namkeen & Savoury', p: 95, m: 115, u: '400 g', e: '🥜', st: 39, r: 4.4, pop: 73, d: 'Indori-style mixture with sev, peanuts and poha flakes.', t: ['bestseller', 'deal'], a: { Style: 'Indori' } },
    { n: 'Bikaneri Aloo Bhujia', b: 'Chatak House', c: 'snacks', s: 'Namkeen & Savoury', p: 52, m: 60, u: '200 g', e: '🍜', st: 51, r: 4.3, pop: 68, d: 'Thin crisp potato bhujia fried in small batches.', t: ['under99'], a: { Style: 'Bikaneri' } },
    { n: 'Roasted Salted Peanuts', b: 'Chatak House', c: 'snacks', s: 'Namkeen & Savoury', p: 48, m: 58, u: '200 g', e: '🥜', st: 56, r: 4.2, pop: 64, d: 'Dry-roasted peanuts with rock salt, no oil added.', t: ['under99', 'essential'], a: { Roast: 'Dry roasted' } },
    { n: 'Microwave Popcorn', b: 'CrunchCo', c: 'snacks', s: 'Namkeen & Savoury', p: 65, m: 80, u: '100 g', e: '🍿', st: 47, r: 4.1, pop: 62, d: 'Butter-flavoured popping kernels in a two-minute bag.', t: ['deal'], a: { Time: '2 min' } },
    { n: 'Milk Chocolate Bar', b: 'Cocoa Bloom', c: 'snacks', s: 'Chocolate & Sweets', p: 85, m: 100, u: '100 g', e: '🍫', st: 61, r: 4.5, pop: 84, d: 'Smooth 38% cocoa milk chocolate with real cocoa butter.', t: ['bestseller', 'under99'], a: { Cocoa: '38%' } },
    { n: '70% Dark Chocolate', b: 'Cocoa Bloom', c: 'snacks', s: 'Chocolate & Sweets', p: 165, m: 190, u: '80 g', e: '🍫', st: 28, r: 4.6, pop: 66, d: 'Single-origin Idukki cocoa, 70% with no vanilla filler.', t: ['trending', 'new'], a: { Cocoa: '70%', Origin: 'Idukki' } },
    { n: 'Choco Chip Cookies', b: 'Cocoa Bloom', c: 'snacks', s: 'Chocolate & Sweets', p: 105, m: 125, u: '200 g', e: '🍪', st: 33, r: 4.3, pop: 57, d: 'Soft-centre cookies loaded with 25% chocolate chips.', t: ['deal'], a: { Chips: '25%' } },
    { n: 'Cheese Puffs', b: 'CrunchCo', c: 'snacks', s: 'Chips & Crisps', p: 40, m: 50, u: '70 g', e: '🧀', st: 59, r: 4.0, pop: 60, d: 'Air-puffed corn snack with real cheese powder.', t: ['under99'], a: { Base: 'Corn' } },
    { n: 'Peanut Energy Bar', b: 'Nimbus Foods', c: 'snacks', s: 'Healthy Snacking', p: 45, m: 55, u: '40 g', e: '🍫', st: 43, r: 4.1, pop: 51, d: 'Date-sweetened peanut bar with 8 g protein, no added sugar.', t: ['under99', 'trending'], a: { Protein: '8 g', Sugar: 'No added sugar' } },
    { n: 'Nachos with Salsa', b: 'CrunchCo', c: 'snacks', s: 'Chips & Crisps', p: 99, m: 120, u: '120 g', e: '🌮', st: 25, r: 4.2, pop: 49, d: 'Corn tortilla chips with a mild tomato salsa dip pouch.', t: ['deal'], a: { Dip: 'Salsa included' } },
    { n: 'Khatta Meetha Mix', b: 'Chatak House', c: 'snacks', s: 'Namkeen & Savoury', p: 48, m: 58, u: '200 g', e: '🥨', st: 52, r: 4.1, pop: 58, d: 'Sweet-and-tangy snack mix that pairs with evening chai.', t: ['under99'], a: { Taste: 'Sweet & tangy' } },
    { n: 'Multigrain Rice Cakes', b: 'Nimbus Foods', c: 'snacks', s: 'Healthy Snacking', p: 72, m: 85, u: '100 g', e: '🍘', st: 31, r: 4.0, pop: 44, d: 'Thin baked cakes of brown rice and quinoa, 45 kcal each.', t: ['new', 'under99'], a: { Calories: '45 kcal / cake' } },

    /* ---- Beverages ---- */
    { n: 'Cola PET Bottle', b: 'Fizz Pop', c: 'beverages', s: 'Carbonated Drinks', p: 45, m: 50, u: '750 ml', e: '🥤', st: 78, r: 4.2, pop: 85, d: 'Classic cola, chilled-chain stocked for a crisp pour.', t: ['bestseller', 'under99'], a: { Caffeine: 'Yes' } },
    { n: 'Lemon Lime Soda', b: 'Fizz Pop', c: 'beverages', s: 'Carbonated Drinks', p: 42, m: 50, u: '750 ml', e: '🍋', st: 66, r: 4.1, pop: 72, d: 'Clear citrus soda, caffeine free.', t: ['under99'], a: { Caffeine: 'No' } },
    { n: 'Orange Fruit Juice', b: 'Orchard Hills', c: 'beverages', s: 'Juices', p: 115, m: 135, u: '1 L', e: '🧃', st: 44, r: 4.3, pop: 70, d: '100% orange juice from concentrate, no added sugar or colour.', t: ['deal'], a: { Juice: '100%', Sugar: 'No added sugar' } },
    { n: 'Mango Fruit Drink', b: 'Orchard Hills', c: 'beverages', s: 'Juices', p: 105, m: 125, u: '1 L', e: '🥭', st: 47, r: 4.4, pop: 74, d: 'Alphonso pulp based mango drink with 25% fruit content.', t: ['seasonal'], a: { 'Fruit content': '25%' } },
    { n: 'Tender Coconut Water', b: 'Fresh Farm', c: 'beverages', s: 'Healthy Drinks', p: 65, m: 80, u: '300 ml', e: '🥥', st: 35, r: 4.2, pop: 56, d: 'Cold-pressed coconut water, not from concentrate, naturally isotonic.', t: ['trending', 'under99'], a: { Process: 'Cold pressed' } },
    { n: 'Packaged Drinking Water', b: 'Aqua Pure', c: 'beverages', s: 'Water', p: 22, m: 25, u: '1 L', e: '💧', st: 150, r: 4.0, pop: 80, d: 'BIS-certified RO treated packaged drinking water.', t: ['essential', 'under99'], a: { Cert: 'BIS ISI' } },
    { n: 'Club Soda Can', b: 'Fizz Pop', c: 'beverages', s: 'Carbonated Drinks', p: 30, m: 35, u: '300 ml', e: '🥫', st: 88, r: 3.9, pop: 47, d: 'Fine-bubble soda can for mocktails and nimbu soda.', t: ['under99'], a: { Format: 'Can' } },
    { n: 'Ready Cold Coffee', b: 'Nimbus Foods', c: 'beverages', s: 'Dairy Drinks', p: 45, m: 55, u: '180 ml', e: '☕', st: 53, r: 4.2, pop: 61, d: 'Chilled brewed coffee with milk, ready to drink.', t: ['under99'], a: { Serve: 'Chilled' } },
    { n: 'Green Tea Bags', b: 'Leaf & Bloom', c: 'beverages', s: 'Healthy Drinks', p: 185, m: 220, u: '25 bags', e: '🍵', st: 30, r: 4.4, pop: 65, d: 'Unflavoured whole-leaf green tea in biodegradable bags.', t: ['trending', 'deal'], a: { Bags: '25', Leaf: 'Whole leaf' } },
    { n: 'Energy Drink Can', b: 'Voltix', c: 'beverages', s: 'Energy Drinks', p: 95, m: 110, u: '250 ml', e: '⚡', st: 41, r: 4.0, pop: 59, d: 'Taurine and caffeine energy drink — not recommended for children.', t: ['deal'], a: { Caffeine: '80 mg', Warning: 'Adults only' } },
    { n: 'Mixed Fruit Squash', b: 'Orchard Hills', c: 'beverages', s: 'Squash & Syrups', p: 85, m: 100, u: '500 ml', e: '🧃', st: 27, r: 3.9, pop: 43, d: 'Concentrated mixed fruit squash, dilute 1:4 with chilled water.', t: ['under99'], a: { Dilution: '1 part : 4' } },

    /* ---- Tea, coffee & health drinks ---- */
    { n: 'Assam CTC Tea Leaves', b: 'Leaf & Bloom', c: 'tea-coffee', s: 'Tea', p: 145, m: 175, u: '250 g', e: '🍵', st: 45, r: 4.5, pop: 86, d: 'Strong malty Assam CTC, single estate from Dibrugarh.', t: ['bestseller'], a: { Grade: 'CTC BOP', Origin: 'Assam' } },
    { n: 'Masala Chai Blend', b: 'Leaf & Bloom', c: 'tea-coffee', s: 'Tea', p: 128, m: 150, u: '200 g', e: '☕', st: 38, r: 4.4, pop: 71, d: 'CTC tea with cardamom, ginger, clove and cinnamon, no artificial flavour.', t: ['trending', 'deal'], a: { Spice: '4 spices' } },
    { n: 'Instant Coffee Granules', b: 'Bean Theory', c: 'tea-coffee', s: 'Coffee', p: 245, m: 280, u: '100 g', e: '☕', st: 33, r: 4.4, pop: 83, d: 'Freeze-dried 70:30 coffee-chicory granules, dissolves without clumps.', t: ['bestseller'], a: { Blend: '70:30', Process: 'Freeze dried' } },
    { n: 'South Indian Filter Coffee', b: 'Bean Theory', c: 'tea-coffee', s: 'Coffee', p: 195, m: 230, u: '250 g', e: '🫖', st: 26, r: 4.6, pop: 68, d: 'Dark roast decoction powder from Chikmagalur arabica with chicory.', t: ['trending'], a: { Roast: 'Dark', Origin: 'Chikmagalur' } },
    { n: 'Coffee Capsules', b: 'Bean Theory', c: 'tea-coffee', s: 'Coffee', p: 395, m: 450, u: '10 capsules', e: '🥫', st: 18, r: 4.2, pop: 45, d: 'Intensity 8 espresso capsules, aluminium sealed for aroma.', t: ['new', 'deal'], a: { Intensity: '8/10' } },
    { n: 'Malt Health Drink', b: 'Nimbus Foods', c: 'tea-coffee', s: 'Health Drinks', p: 285, m: 320, u: '500 g', e: '🥛', st: 29, r: 4.1, pop: 69, d: 'Barley malt drink fortified with 12 vitamins and 6 minerals.', t: ['deal'], a: { Fortified: '12 vitamins' } },
    { n: 'Tulsi Herbal Infusion', b: 'Leaf & Bloom', c: 'tea-coffee', s: 'Herbal', p: 155, m: 180, u: '25 bags', e: '🌿', st: 24, r: 4.3, pop: 48, d: 'Caffeine-free tulsi, lemongrass and ginger infusion.', t: ['new'], a: { Caffeine: 'No' } },
    { n: 'Lemon Iced Tea Mix', b: 'Leaf & Bloom', c: 'tea-coffee', s: 'Herbal', p: 115, m: 135, u: '20 bags', e: '🍋', st: 27, r: 4.0, pop: 46, d: 'Chill-brew lemon tea bags, unsweetened so you control the sugar.', t: ['under99'], a: { Sugar: 'Unsweetened' } },

    /* ---- Instant & frozen ---- */
    { n: 'Instant Noodles Multipack', b: 'Yummi Bowl', c: 'instant', s: 'Noodles & Pasta', p: 56, m: 68, u: '4 × 70 g', e: '🍜', st: 92, r: 4.3, pop: 94, d: 'Masala noodles with real spice sachets, ready in three minutes.', t: ['bestseller', 'deal', 'under99'], a: { Cook: '3 min', Pack: '4' } },
    { n: 'Cup Noodles', b: 'Yummi Bowl', c: 'instant', s: 'Noodles & Pasta', p: 40, m: 48, u: '70 g', e: '🍲', st: 74, r: 4.1, pop: 77, d: 'Just-add-hot-water cup with fork, no cooking needed.', t: ['under99'], a: { Format: 'Cup' } },
    { n: 'Tomato Instant Soup', b: 'Yummi Bowl', c: 'instant', s: 'Soups', p: 22, m: 28, u: '54 g', e: '🥣', st: 68, r: 3.9, pop: 50, d: 'Dehydrated tomato soup sachet, serves one.', t: ['under99'], a: { Serves: '1' } },
    { n: 'Frozen Veg Nuggets', b: 'Frost Kitchen', c: 'instant', s: 'Frozen Snacks', p: 115, m: 135, u: '250 g', e: '🥟', st: 31, r: 4.0, pop: 53, d: 'IQF vegetable nuggets, air-fryer friendly at 180 °C for 12 minutes.', t: ['deal'], a: { Cook: 'Air fry 12 min', Storage: '-18 °C' } },
    { n: 'Frozen Chicken Momos', b: 'Frost Kitchen', c: 'instant', s: 'Frozen Snacks', p: 225, m: 260, u: '500 g (20 pcs)', e: '🥟', st: 22, r: 4.4, pop: 76, d: 'Hand-pleated minced chicken momos with a schezwan chutney pack.', t: ['bestseller'], a: { Count: '20', Chutney: 'Included' } },
    { n: 'Frozen Veg Momos', b: 'Frost Kitchen', c: 'instant', s: 'Frozen Snacks', p: 185, m: 215, u: '500 g (20 pcs)', e: '🥟', st: 26, r: 4.3, pop: 70, d: 'Cabbage-carrot stuffed momos, steam for eight minutes.', t: ['deal'], a: { Count: '20', Cook: 'Steam 8 min' } },
    { n: 'Instant Upma Mix', b: 'Yummi Bowl', c: 'instant', s: 'Breakfast', p: 58, m: 70, u: '200 g', e: '🍚', st: 48, r: 4.0, pop: 52, d: 'Roasted rava upma mix with vegetables and curry leaf tempering.', t: ['under99'], a: { Veg: 'Yes' } },
    { n: 'Ready-to-Eat Dal Rice', b: 'Yummi Bowl', c: 'instant', s: 'Ready Meals', p: 95, m: 110, u: '300 g', e: '🍛', st: 29, r: 4.1, pop: 55, d: 'Retort-packed dal rice, heat the pouch for two minutes.', t: ['under99'], a: { Process: 'Retort', Shelf: '9 months' } },
    { n: 'Instant Pasta Kit', b: 'Yummi Bowl', c: 'instant', s: 'Noodles & Pasta', p: 68, m: 80, u: '200 g', e: '🍝', st: 37, r: 4.2, pop: 62, d: 'Penne with a tomato-basil sauce sachet, serves two.', t: ['deal'], a: { Serves: '2' } },
    { n: 'Frozen French Fries', b: 'Frost Kitchen', c: 'instant', s: 'Frozen Snacks', p: 145, m: 170, u: '420 g', e: '🍟', st: 34, r: 4.3, pop: 81, d: 'Straight-cut potato fries, pre-blanched for a crisp home fry.', t: ['bestseller', 'deal'], a: { Cut: 'Straight' } },
    { n: 'Instant Idli Rava', b: 'Yummi Bowl', c: 'instant', s: 'Breakfast', p: 72, m: 85, u: '500 g', e: '🍥', st: 28, r: 4.1, pop: 49, d: 'Coarse rice rava for soft instant idlis, no fermentation needed.', t: ['under99'], a: { Fermentation: 'Not needed' } },

    /* ---- Personal care ---- */
    { n: 'Anti-Dandruff Shampoo', b: 'Veda Care', c: 'personal-care', s: 'Hair Care', p: 165, m: 195, u: '180 ml', e: '🧴', st: 46, r: 4.2, pop: 82, d: 'Zinc pyrithione formula for flake control, sulphate-light.', t: ['bestseller'], a: { Active: 'Zinc pyrithione 1%', Sulphate: 'Low' } },
    { n: 'Herbal Repair Shampoo', b: 'Veda Care', c: 'personal-care', s: 'Hair Care', p: 235, m: 275, u: '340 ml', e: '🧴', st: 33, r: 4.3, pop: 66, d: 'Bhringraj and amla shampoo for chemically treated hair, no parabens.', t: ['deal'], a: { Herbal: 'Bhringraj, amla', Paraben: 'No' } },
    { n: 'Argan Conditioner', b: 'Veda Care', c: 'personal-care', s: 'Hair Care', p: 195, m: 225, u: '180 ml', e: '🧴', st: 29, r: 4.1, pop: 57, d: 'Lightweight detangling conditioner with cold-pressed argan oil.', t: ['new'], a: { Oil: 'Argan' } },
    { n: 'Bathing Soap (Pack of 4)', b: 'Pure & Simple', c: 'personal-care', s: 'Bath & Body', p: 132, m: 160, u: '4 × 100 g', e: '🧼', st: 68, r: 4.4, pop: 89, d: 'Vegetable-base soap with shea butter, TFM 76%.', t: ['essential', 'deal'], a: { TFM: '76%', Base: 'Vegetable' } },
    { n: 'Liquid Handwash Refill', b: 'Pure & Simple', c: 'personal-care', s: 'Bath & Body', p: 99, m: 120, u: '200 ml', e: '🧼', st: 55, r: 4.2, pop: 74, d: 'Moisturising handwash refill pouch with aloe and glycerine.', t: ['essential', 'under99'], a: { Format: 'Refill pouch' } },
    { n: 'Herbal Toothpaste', b: 'Bright Smiles', c: 'personal-care', s: 'Oral Care', p: 105, m: 125, u: '150 g', e: '🪥', st: 61, r: 4.3, pop: 85, d: 'Fluoride toothpaste with neem and clove, 1000 ppm fluoride.', t: ['essential', 'bestseller'], a: { Fluoride: '1000 ppm' } },
    { n: 'Toothbrush (Pack of 2)', b: 'Bright Smiles', c: 'personal-care', s: 'Oral Care', p: 85, m: 100, u: '2 pcs medium', e: '🪥', st: 49, r: 4.1, pop: 63, d: 'Medium-bristle brush with a tapered head and flex handle.', t: ['essential', 'under99'], a: { Bristle: 'Medium' } },
    { n: 'Antibacterial Mouthwash', b: 'Bright Smiles', c: 'personal-care', s: 'Oral Care', p: 175, m: 210, u: '250 ml', e: '🧪', st: 31, r: 4.0, pop: 51, d: 'Alcohol-free mouthwash with cetylpyridinium chloride.', t: ['deal'], a: { Alcohol: 'No' } },
    { n: 'Cocoa Body Lotion', b: 'Veda Care', c: 'personal-care', s: 'Bath & Body', p: 225, m: 265, u: '250 ml', e: '🧴', st: 36, r: 4.4, pop: 67, d: '48-hour moisture lotion with cocoa butter and vitamin E.', t: ['trending'], a: { Moisture: '48 h' } },
    { n: 'Coconut Hair Oil', b: 'Veda Care', c: 'personal-care', s: 'Hair Care', p: 165, m: 195, u: '200 ml', e: '🫙', st: 42, r: 4.5, pop: 78, d: 'Cold-pressed coconut oil with curry leaf infusion, no mineral oil.', t: ['bestseller'], a: { Press: 'Cold pressed' } },
    { n: 'Shaving Cream', b: 'Nimbus Grooming', c: 'personal-care', s: 'Grooming', p: 185, m: 215, u: '100 g', e: '🪒', st: 27, r: 4.1, pop: 46, d: 'Lather-rich cream with menthol for a smooth glide.', t: ['deal'], a: { Cool: 'Menthol' } },
    { n: 'Razor Cartridges (Pack of 4)', b: 'Nimbus Grooming', c: 'personal-care', s: 'Grooming', p: 265, m: 310, u: '4 cartridges', e: '🪒', st: 21, r: 4.2, pop: 44, d: 'Five-blade cartridges with a lubricating strip, fits standard handles.', t: ['new'], a: { Blades: '5' } },
    { n: 'Roll-On Deodorant', b: 'Nimbus Grooming', c: 'personal-care', s: 'Grooming', p: 199, m: 240, u: '50 ml', e: '🧴', st: 30, r: 4.0, pop: 48, d: '48-hour alcohol-free roll-on with a woody citrus note.', t: ['deal'], a: { Alcohol: 'No', Hours: '48 h' } },
    { n: 'Cotton Bath Towel', b: 'HomeSoft', c: 'personal-care', s: 'Bath & Body', p: 349, m: 450, u: '70 × 140 cm', e: '🛁', st: 17, r: 4.3, pop: 39, d: '550 GSM combed cotton towel, colour-fast after 20 washes.', t: ['deal'], a: { GSM: '550', Cotton: 'Combed' } },

    /* ---- Beauty ---- */
    { n: 'Sunscreen Gel SPF 50', b: 'Glow Theory', c: 'beauty', s: 'Skincare', p: 425, m: 499, u: '50 g', e: '🧴', st: 26, r: 4.6, pop: 91, d: 'PA++++ water-light gel sunscreen, no white cast on Indian skin tones.', t: ['bestseller', 'trending'], a: { SPF: '50', PA: '++++', Finish: 'Non greasy' } },
    { n: 'Neem Face Wash', b: 'Glow Theory', c: 'beauty', s: 'Skincare', p: 165, m: 195, u: '100 ml', e: '🧼', st: 41, r: 4.2, pop: 69, d: 'Gel cleanser with neem and tea tree for oily, spot-prone skin.', t: ['deal'], a: { Skin: 'Oily' } },
    { n: 'Ceramide Moisturiser', b: 'Glow Theory', c: 'beauty', s: 'Skincare', p: 295, m: 350, u: '50 g', e: '🫙', st: 24, r: 4.5, pop: 72, d: 'Fragrance-free ceramide cream that repairs the skin barrier.', t: ['trending'], a: { Fragrance: 'No', Ceramides: '3 types' } },
    { n: 'Vitamin C Serum', b: 'Glow Theory', c: 'beauty', s: 'Skincare', p: 545, m: 650, u: '30 ml', e: '💧', st: 19, r: 4.4, pop: 64, d: '10% stabilised ethyl ascorbic acid with ferulic acid.', t: ['new', 'deal'], a: { Vitamin: '10% EAC' } },
    { n: 'Smudge-Proof Kajal', b: 'Glow Theory', c: 'beauty', s: 'Makeup', p: 195, m: 230, u: '0.35 g', e: '🖌️', st: 35, r: 4.3, pop: 71, d: 'Twist-up kajal pencil, 12-hour wear and ophthalmologist tested.', t: ['under99'], a: { Wear: '12 h' } },
    { n: 'Matte Lipstick — Rust', b: 'Glow Theory', c: 'beauty', s: 'Makeup', p: 375, m: 450, u: '3.5 g', e: '💄', st: 22, r: 4.4, pop: 62, d: 'Comfort-matte bullet in a warm rust shade for medium-deep tones.', t: ['trending'], a: { Finish: 'Matte', Shade: 'Rust 04' } },
    { n: 'Compact Powder', b: 'Glow Theory', c: 'beauty', s: 'Makeup', p: 325, m: 390, u: '9 g', e: '💅', st: 18, r: 4.1, pop: 47, d: 'Oil-control pressed powder with SPF 20 and a mirror compact.', t: ['deal'], a: { SPF: '20' } },
    { n: 'Nail Enamel — Wine', b: 'Glow Theory', c: 'beauty', s: 'Makeup', p: 145, m: 180, u: '8 ml', e: '💅', st: 29, r: 4.0, pop: 43, d: 'Chip-resistant 5-free formula in a deep wine shade.', t: ['under99'], a: { Formula: '5-free' } },
    { n: 'Sheet Mask (Pack of 3)', b: 'Glow Theory', c: 'beauty', s: 'Skincare', p: 225, m: 270, u: '3 × 25 g', e: '🎭', st: 23, r: 4.2, pop: 53, d: 'Hydrating masks with hyaluronic acid, aloe and green tea variants.', t: ['deal'], a: { Variants: '3' } },
    { n: 'Rose Water Toner', b: 'Glow Theory', c: 'beauty', s: 'Skincare', p: 185, m: 220, u: '200 ml', e: '🌹', st: 31, r: 4.3, pop: 58, d: 'Steam-distilled Kannauj rose water, alcohol-free.', t: ['under99'], a: { Origin: 'Kannauj' } },
    { n: 'Cotton Pads', b: 'Pure & Simple', c: 'beauty', s: 'Tools', p: 95, m: 120, u: '50 pcs', e: '⚪', st: 38, r: 4.1, pop: 41, d: 'Lint-free pads for toner and makeup removal.', t: ['under99'], a: { Count: '50' } },

    /* ---- Household ---- */
    { n: 'Detergent Powder', b: 'HomeSoft', c: 'household', s: 'Laundry', p: 145, m: 175, u: '1 kg', e: '🧺', st: 57, r: 4.3, pop: 87, d: 'Enzyme detergent for machines and hand wash, colour-safe.', t: ['essential', 'deal'], a: { Enzymes: 'Yes', Use: 'Machine + hand' } },
    { n: 'Liquid Detergent', b: 'HomeSoft', c: 'household', s: 'Laundry', p: 265, m: 310, u: '1 L', e: '🧴', st: 34, r: 4.4, pop: 73, d: 'Concentrated liquid detergent, 33 washes per bottle.', t: ['trending'], a: { Washes: '33' } },
    { n: 'Dishwash Liquid Gel', b: 'Sparkle Works', c: 'household', s: 'Kitchen Cleaning', p: 115, m: 140, u: '500 ml', e: '🧽', st: 62, r: 4.2, pop: 84, d: 'Lemon gel that cuts grease, one drop per sink of dishes.', t: ['essential', 'deal'], a: { Scent: 'Lemon' } },
    { n: 'Floor Cleaner', b: 'Sparkle Works', c: 'household', s: 'Surface Cleaning', p: 185, m: 220, u: '1 L', e: '🧽', st: 43, r: 4.1, pop: 68, d: 'Disinfecting floor liquid with a pine note, no sticky residue.', t: ['essential'], a: { Action: 'Disinfectant' } },
    { n: 'Toilet Bowl Cleaner', b: 'Sparkle Works', c: 'household', s: 'Surface Cleaning', p: 105, m: 125, u: '500 ml', e: '🚽', st: 40, r: 4.0, pop: 59, d: 'Angled-neck thick gel that removes limescale under the rim.', t: ['under99'], a: { Neck: 'Angled' } },
    { n: 'Glass Cleaner', b: 'Sparkle Works', c: 'household', s: 'Surface Cleaning', p: 135, m: 160, u: '500 ml', e: '🪟', st: 32, r: 4.1, pop: 50, d: 'Streak-free spray for glass, mirrors and glossy surfaces.', t: ['deal'], a: { Finish: 'Streak free' } },
    { n: 'Facial Tissues (Pack of 4)', b: 'Pure & Simple', c: 'household', s: 'Disposables', p: 165, m: 199, u: '4 × 100 pulls', e: '🧻', st: 48, r: 4.3, pop: 75, d: 'Two-ply virgin pulp tissues in a pop-up box.', t: ['essential', 'deal'], a: { Ply: '2-ply' } },
    { n: 'Garbage Bags Medium', b: 'Pure & Simple', c: 'household', s: 'Disposables', p: 145, m: 175, u: '30 pcs', e: '🗑️', st: 44, r: 4.2, pop: 66, d: '19 × 21 inch leak-proof bags with a drawstring tie.', t: ['essential'], a: { Size: '19 × 21 in', Tie: 'Drawstring' } },
    { n: 'Kitchen Roll', b: 'Pure & Simple', c: 'household', s: 'Disposables', p: 125, m: 150, u: '100 sheets', e: '📃', st: 37, r: 4.2, pop: 61, d: 'Absorbent perforated rolls for spills and food prep.', t: ['under99'], a: { Sheets: '100' } },
    { n: 'Mosquito Refill Liquid', b: 'Nimbus Home', c: 'household', s: 'Pest Control', p: 165, m: 195, u: '45 ml', e: '🦟', st: 39, r: 4.1, pop: 70, d: 'Vaporiser refill that lasts up to 45 nights on low mode.', t: ['seasonal', 'deal'], a: { Nights: '45' } },
    { n: 'Mosquito Coils (Pack of 10)', b: 'Nimbus Home', c: 'household', s: 'Pest Control', p: 95, m: 115, u: '10 coils', e: '🌀', st: 46, r: 3.9, pop: 52, d: 'Eight-hour coils with a citrosa base, holder included.', t: ['under99'], a: { Burn: '8 h' } },
    { n: 'Phenyl Disinfectant', b: 'Sparkle Works', c: 'household', s: 'Surface Cleaning', p: 155, m: 185, u: '1 L', e: '🧴', st: 35, r: 4.0, pop: 55, d: 'White phenyle concentrate for drains and outdoor floors.', t: ['essential'], a: { Form: 'Concentrate' } },
    { n: 'Aluminium Foil', b: 'HomeSoft', c: 'household', s: 'Kitchen Tools', p: 145, m: 175, u: '18 m', e: '🧻', st: 26, r: 4.2, pop: 49, d: '12-micron food-grade foil with a cutter box.', t: ['deal'], a: { Micron: '12' } },
    { n: 'Room Air Freshener', b: 'Nimbus Home', c: 'household', s: 'Home Fragrance', p: 235, m: 280, u: '250 ml', e: '🌸', st: 23, r: 4.1, pop: 45, d: 'Aerosol spray in a jasmine-and-citrus blend, no phthalates.', t: ['new'], a: { Scent: 'Jasmine citrus' } },

    /* ---- Electronics ---- */
    { n: 'USB-C Fast Charge Cable', b: 'Voltix', c: 'electronics', s: 'Cables & Chargers', p: 299, m: 499, u: '1 m', e: '🔌', st: 62, r: 4.3, pop: 88, d: 'Braided 60 W USB-C to C cable with a strain-relief joint.', t: ['bestseller', 'deal'], a: { Wattage: '60 W', Build: 'Braided nylon' } },
    { n: '20 W USB-C Charger', b: 'Voltix', c: 'electronics', s: 'Cables & Chargers', p: 799, m: 1299, u: '1 unit', e: '🔋', st: 41, r: 4.4, pop: 84, d: 'BIS-marked PD charger with over-current and heat protection.', t: ['bestseller', 'deal'], a: { Output: '20 W PD', Cert: 'BIS' } },
    { n: '10,000 mAh Power Bank', b: 'Voltix', c: 'electronics', s: 'Power', p: 1299, m: 1999, u: '1 unit', e: '🔋', st: 27, r: 4.3, pop: 79, d: 'Dual-output 22.5 W power bank with digital charge display.', t: ['trending', 'deal'], a: { Output: '22.5 W', Ports: '2' } },
    { n: 'Wired Earphones with Mic', b: 'SoundPeak', c: 'electronics', s: 'Audio', p: 499, m: 899, u: '1 unit', e: '🎧', st: 53, r: 4.1, pop: 81, d: '10 mm dynamic drivers with an inline mic and tangle-free cable.', t: ['deal'], a: { Driver: '10 mm', Mic: 'Inline' } },
    { n: 'True Wireless Earbuds', b: 'SoundPeak', c: 'electronics', s: 'Audio', p: 1499, m: 2499, u: '1 pair', e: '🎧', st: 24, r: 4.2, pop: 76, d: 'Bluetooth 5.3 earbuds, 32 h case playtime and low-latency game mode.', t: ['trending', 'deal'], a: { Bluetooth: '5.3', Playtime: '32 h' } },
    { n: 'Portable Bluetooth Speaker', b: 'SoundPeak', c: 'electronics', s: 'Audio', p: 1199, m: 1999, u: '1 unit', e: '🔊', st: 19, r: 4.2, pop: 64, d: '10 W IPX7 speaker with passive radiator bass and 12 h playback.', t: ['deal'], a: { Rating: 'IPX7', Watt: '10 W' } },
    { n: 'USB 3.0 Hub (4 Port)', b: 'DeskNest', c: 'electronics', s: 'Computer Accessories', p: 549, m: 899, u: '1 unit', e: '💻', st: 31, r: 4.0, pop: 54, d: 'Aluminium hub with 5 Gbps transfer and per-port power protection.', t: ['new'], a: { Speed: '5 Gbps', Ports: '4' } },
    { n: 'Silent Wireless Mouse', b: 'DeskNest', c: 'electronics', s: 'Computer Accessories', p: 649, m: 999, u: '1 unit', e: '🖱️', st: 36, r: 4.3, pop: 71, d: '2.4 GHz mouse with quiet clicks, 1600 DPI and a nano receiver.', t: ['deal'], a: { DPI: '1600', Click: 'Silent' } },
    { n: 'Aluminium Laptop Stand', b: 'DeskNest', c: 'electronics', s: 'Computer Accessories', p: 999, m: 1499, u: '1 unit', e: '💻', st: 15, r: 4.4, pop: 58, d: 'Ergonomic vented stand fitting 10 to 17 inch laptops.', t: ['trending'], a: { Fits: '10-17 in' } },
    { n: 'Car Mobile Holder', b: 'DeskNest', c: 'electronics', s: 'Mobile Accessories', p: 349, m: 599, u: '1 unit', e: '📱', st: 28, r: 4.0, pop: 49, d: 'Air-vent cradle with one-hand release and 360° rotation.', t: ['under99'], a: { Mount: 'Air vent', Rotate: '360°' } },
    { n: 'Tempered Glass Screen Guard', b: 'Voltix', c: 'electronics', s: 'Mobile Accessories', p: 199, m: 399, u: '1 pc + kit', e: '🛡️', st: 71, r: 4.1, pop: 73, d: '9H edge-to-edge glass with an oleophobic coat and install kit.', t: ['deal', 'bestseller'], a: { Hardness: '9H' } },
    { n: 'LED Desk Lamp', b: 'DeskNest', c: 'electronics', s: 'Home Electronics', p: 899, m: 1399, u: '1 unit', e: '💡', st: 16, r: 4.3, pop: 52, d: 'Three colour temperatures, stepless dimming and a USB charging port.', t: ['new'], a: { Modes: '3', Dimming: 'Stepless' } },

    /* ---- Stationery ---- */
    { n: 'Ruled Notebook A5', b: 'PaperNest', c: 'stationery', s: 'Notebooks', p: 145, m: 180, u: '200 pages', e: '📓', st: 58, r: 4.4, pop: 74, d: '70 GSM ivory paper with a hard-bound cover and ribbon marker.', t: ['bestseller'], a: { GSM: '70', Binding: 'Hard bound' } },
    { n: 'Spiral Notebook A4', b: 'PaperNest', c: 'stationery', s: 'Notebooks', p: 199, m: 240, u: '120 pages', e: '📒', st: 44, r: 4.3, pop: 63, d: 'Twin-wire spiral with micro-perforated pages and a PP backboard.', t: ['deal'], a: { Wire: 'Twin', Perf: 'Yes' } },
    { n: 'Gel Pens (Pack of 10)', b: 'Inkwell', c: 'stationery', s: 'Writing', p: 149, m: 199, u: '0.5 mm blue', e: '🖊️', st: 66, r: 4.2, pop: 78, d: 'Quick-dry needle-point gel ink that does not smudge on glossy paper.', t: ['essential'], a: { Tip: '0.5 mm', Ink: 'Quick dry' } },
    { n: 'Ball Pens (Pack of 5)', b: 'Inkwell', c: 'stationery', s: 'Writing', p: 55, m: 75, u: 'blue', e: '🖋️', st: 84, r: 4.0, pop: 69, d: 'Smooth 0.7 mm ball pens with a transparent barrel.', t: ['essential', 'under99'], a: { Tip: '0.7 mm' } },
    { n: 'Highlighters (Pack of 5)', b: 'Inkwell', c: 'stationery', s: 'Writing', p: 175, m: 220, u: '5 colours', e: '🖍️', st: 37, r: 4.2, pop: 57, d: 'Chisel-tip fluorescent highlighters, smudge-proof on inkjet print.', t: ['deal'], a: { Tip: 'Chisel' } },
    { n: 'HB Pencils (Pack of 10)', b: 'Inkwell', c: 'stationery', s: 'Writing', p: 45, m: 60, u: '10 pcs', e: '✏️', st: 79, r: 4.1, pop: 60, d: 'Pre-sharpened cedar pencils with a bonded lead that resists breaking.', t: ['under99', 'essential'], a: { Wood: 'Cedar' } },
    { n: 'File Folders (Pack of 4)', b: 'PaperNest', c: 'stationery', s: 'Office Supplies', p: 185, m: 230, u: 'A4', e: '📁', st: 33, r: 4.1, pop: 47, d: 'Ring file folders with laminated covers and index tabs.', t: ['deal'], a: { Size: 'A4' } },
    { n: 'Sticky Notes (Pack of 3)', b: 'PaperNest', c: 'stationery', s: 'Office Supplies', p: 115, m: 145, u: '3 × 100 sheets', e: '🗒️', st: 48, r: 4.2, pop: 55, d: 'Repositionable 76 × 76 mm notes in three neon colours.', t: ['under99'], a: { Size: '76 × 76 mm' } },
    { n: 'Sketch Pen Set', b: 'ArtNest', c: 'stationery', s: 'Art Supplies', p: 245, m: 300, u: '24 colours', e: '🎨', st: 26, r: 4.4, pop: 59, d: 'Washable dual-tip markers for school art and journaling.', t: ['new'], a: { Tip: 'Dual', Ink: 'Washable' } },
    { n: 'Stapler with Pins', b: 'DeskNest', c: 'stationery', s: 'Office Supplies', p: 265, m: 340, u: '1 unit', e: '📎', st: 21, r: 4.0, pop: 42, d: 'Half-strip metal stapler for up to 25 sheets, pins included.', t: ['deal'], a: { Capacity: '25 sheets' } },

    /* ---- Pet supplies ---- */
    { n: 'Adult Dog Food — Chicken', b: 'Pawsome', c: 'pet-supplies', s: 'Dog', p: 545, m: 650, u: '1.2 kg', e: '🐕', st: 24, r: 4.3, pop: 68, d: 'Kibble with 24% chicken protein and added glucosamine.', t: ['bestseller', 'deal'], a: { Protein: '24%', Life: 'Adult' } },
    { n: 'Cat Food — Ocean Fish', b: 'Pawsome', c: 'pet-supplies', s: 'Cat', p: 295, m: 350, u: '400 g', e: '🐈', st: 27, r: 4.2, pop: 59, d: 'Wet-and-dry fish recipe with taurine for eye and heart health.', t: ['deal'], a: { Taurine: 'Added' } },
    { n: 'Dog Training Treats', b: 'Pawsome', c: 'pet-supplies', s: 'Dog', p: 195, m: 240, u: '200 g', e: '🦴', st: 31, r: 4.1, pop: 51, d: 'Soft liver-flavour chews sized for training rewards.', t: ['under99'], a: { Texture: 'Soft' } },
    { n: 'Pet Grooming Shampoo', b: 'Pawsome', c: 'pet-supplies', s: 'Grooming', p: 325, m: 390, u: '250 ml', e: '🧴', st: 18, r: 4.2, pop: 44, d: 'pH-balanced oat and aloe shampoo for sensitive coats.', t: ['new'], a: { pH: 'Pet balanced' } },
    { n: 'Clumping Cat Litter', b: 'Pawsome', c: 'pet-supplies', s: 'Cat', p: 645, m: 780, u: '5 kg', e: '🐾', st: 14, r: 4.4, pop: 48, d: 'Bentonite litter with tight clumps and 99% dust-free granules.', t: ['deal'], a: { Dust: '99% dust free' } },
    { n: 'Stainless Pet Bowl', b: 'Pawsome', c: 'pet-supplies', s: 'Accessories', p: 245, m: 320, u: '700 ml', e: '🥣', st: 22, r: 4.0, pop: 37, d: 'Non-slip base steel bowl, dishwasher safe.', t: ['under99'], a: { Base: 'Non slip' } },

    /* ---- Baby care ---- */
    { n: 'Diapers — Medium', b: 'TinyToes', c: 'baby-care', s: 'Diapering', p: 499, m: 620, u: '30 pcs (7-12 kg)', e: '👶', st: 33, r: 4.4, pop: 77, d: 'Twelve-hour absorbency with a cotton-soft top sheet and wetness strip.', t: ['bestseller', 'deal'], a: { Weight: '7-12 kg', Absorb: '12 h' } },
    { n: 'Baby Wipes', b: 'TinyToes', c: 'baby-care', s: 'Diapering', p: 195, m: 240, u: '72 pcs', e: '🧻', st: 47, r: 4.3, pop: 72, d: 'Fragrance-free water-based wipes, dermatologically tested.', t: ['essential'], a: { Fragrance: 'No' } },
    { n: 'Baby Moisturising Lotion', b: 'TinyToes', c: 'baby-care', s: 'Baby Skincare', p: 245, m: 290, u: '200 ml', e: '🧴', st: 29, r: 4.4, pop: 63, d: 'Ceramide and shea lotion for newborn-safe daily use.', t: ['deal'], a: { Age: '0 m+' } },
    { n: 'No-Tears Baby Shampoo', b: 'TinyToes', c: 'baby-care', s: 'Baby Skincare', p: 215, m: 260, u: '200 ml', e: '🧴', st: 26, r: 4.2, pop: 58, d: 'Mild amphoteric surfactant shampoo, tear-free formula.', t: ['essential'], a: { Tear: 'No tears' } },
    { n: 'Infant Formula Stage 1', b: 'TinyToes', c: 'baby-care', s: 'Feeding', p: 645, m: 750, u: '400 g', e: '🍼', st: 17, r: 4.3, pop: 54, d: 'Follow-up formula with DHA and prebiotics — use on medical advice.', t: ['deal'], a: { Stage: '1', DHA: 'Added', Note: 'Use on medical advice' } },
    { n: 'Baby Talcum Powder', b: 'TinyToes', c: 'baby-care', s: 'Baby Skincare', p: 165, m: 200, u: '200 g', e: '🫙', st: 31, r: 4.0, pop: 49, d: 'Corn-starch based powder with chamomile, no talc dust.', t: ['under99'], a: { Base: 'Corn starch' } },
  ];

  /* ------------------------------------------------------------------ */
  /* Normalisation                                                       */
  /* ------------------------------------------------------------------ */

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const categoryById = new Map(RAW_CATEGORIES.map((c) => [c.id, c]));
  const brandNames = new Set(BRAND_NAMES);

  const PRODUCTS = RAW.map((raw, index) => {
    const category = categoryById.get(raw.c);
    if (!category) throw new Error(`Unknown category "${raw.c}" for product "${raw.n}"`);
    if (!brandNames.has(raw.b)) throw new Error(`Unknown brand "${raw.b}" for product "${raw.n}"`);
    const slug = slugify(raw.n) + '-' + slugify(raw.u.split(' ')[0]);
    const tags = raw.t || [];
    const discount = raw.m && raw.m > raw.p ? Math.round(((raw.m - raw.p) / raw.m) * 100) : 0;
    return Object.freeze({
      id: 'p-' + slug,
      slug,
      type: 'product',
      name: raw.n,
      brand: raw.b,
      brandId: slugify(raw.b),
      categoryId: raw.c,
      categoryName: category.name,
      subcategory: raw.s,
      price: raw.p,
      mrp: raw.m || raw.p,
      discountPercent: discount,
      unit: raw.u,
      emoji: raw.e,
      stock: raw.st,
      inStock: raw.st > 0,
      gstRate: category.gstRate,
      handlingMinutes: category.handlingMinutes + (raw.h || 0),
      description: raw.d,
      tags,
      attributes: raw.a || {},
      popularity: raw.pop || 50,
      /** Demo merchandising value — not a verified customer rating. */
      rating: raw.r || 0,
      /** No real review data exists in this catalogue. */
      reviewCount: 0,
      sortIndex: index,
      active: true,
      variants: [],
    });
  });

  const CATEGORIES = RAW_CATEGORIES.map((c) => {
    const items = PRODUCTS.filter((p) => p.categoryId === c.id);
    return Object.freeze(
      Object.assign({}, c, {
        slug: c.id,
        type: c.id === 'food' ? 'restaurant' : 'category',
        productCount: items.length,
        startingPrice: items.length ? Math.min.apply(null, items.map((i) => i.price)) : 0,
      })
    );
  });

  const BRANDS = BRAND_NAMES.map((name) => {
    const items = PRODUCTS.filter((p) => p.brand === name);
    return Object.freeze({
      id: slugify(name),
      name,
      productCount: items.length,
      categories: Array.from(new Set(items.map((i) => i.categoryId))),
      startingPrice: items.length ? Math.min.apply(null, items.map((i) => i.price)) : 0,
      logoEmoji: (items[0] && items[0].emoji) || '🏷️',
    });
  }).filter((b) => b.productCount > 0);

  const BANNERS = [
    {
      id: 'banner-free-delivery',
      title: 'Free delivery above ₹150',
      subtitle: 'Stock up on staples and we cover the delivery fee.',
      cta: 'Shop daily essentials',
      href: 'category.html?cat=groceries',
      emoji: '🛵',
      tone: 'brand',
    },
    {
      id: 'banner-fresh-farm',
      title: 'Farm fresh in 18 minutes',
      subtitle: 'Fruits and vegetables graded and chilled the same morning.',
      cta: 'Explore fresh produce',
      href: 'category.html?cat=fruits-vegetables',
      emoji: '🥬',
      tone: 'green',
    },
    {
      id: 'banner-restaurant',
      title: 'Craving something hot?',
      subtitle: 'Twelve kitchens near you, live menus and real prep times.',
      cta: 'Order from restaurants',
      href: 'restaurants.html',
      emoji: '🍛',
      tone: 'saffron',
    },
    {
      id: 'banner-under99',
      title: 'Everything under ₹99',
      subtitle: 'Snacks, dairy and daily picks that fit small budgets.',
      cta: 'Browse under ₹99',
      href: 'search.html?max=99',
      emoji: '🪙',
      tone: 'plum',
    },
    {
      id: 'banner-tech',
      title: 'Chargers, audio and desk gear',
      subtitle: 'BIS-marked accessories with a 6-month replacement promise.',
      cta: 'Shop electronics',
      href: 'category.html?cat=electronics',
      emoji: '🎧',
      tone: 'indigo',
    },
    {
      id: 'banner-coupon',
      title: 'Use FIRSTORDER for 20% off',
      subtitle: 'Demo coupon, up to ₹120 off on your first order.',
      cta: 'See all coupons',
      href: 'account.html?tab=coupons',
      emoji: '🎟️',
      tone: 'teal',
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Query helpers (used by search, category pages, home sections)        */
  /* ------------------------------------------------------------------ */

  function getProduct(idOrSlug) {
    if (!idOrSlug) return null;
    const key = String(idOrSlug).toLowerCase();
    return PRODUCTS.find((p) => p.id === key || p.slug === key) || null;
  }

  function byTag(tag) {
    return PRODUCTS.filter((p) => p.tags.indexOf(tag) !== -1);
  }

  function byCategory(categoryId) {
    return PRODUCTS.filter((p) => p.categoryId === categoryId);
  }

  function byBrand(brandId) {
    return PRODUCTS.filter((p) => p.brandId === brandId);
  }

  /** Deterministic pseudo-random picks so "for you" is stable per user seed. */
  function seededPick(seed, count) {
    const list = PRODUCTS.slice();
    let h = 0;
    for (let i = 0; i < String(seed).length; i += 1) h = (h * 31 + String(seed).charCodeAt(i)) % 100003;
    for (let i = list.length - 1; i > 0; i -= 1) {
      h = (h * 1103515245 + 12345) % 2147483648;
      const j = Math.abs(h) % (i + 1);
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list.slice(0, count);
  }

  /** Frequently bought together: same subcategory first, then complementary. */
  const FBT_GROUPS = [
    ['p-basmati-rice-5', 'p-toor-dal-arhar-1', 'p-refined-sunflower-oil-1'],
    ['p-whole-wheat-atta-5', 'p-pure-cow-ghee-500', 'p-refined-sugar-1'],
    ['p-full-cream-milk-1', 'p-fresh-curd-cup-400', 'p-brown-bread-400'],
    ['p-instant-noodles-multipack-4', 'p-cola-pet-bottle-750', 'p-salted-potato-chips-90'],
    ['p-herbal-toothpaste-150', 'p-toothbrush-pack-of-2-2', 'p-antibacterial-mouthwash-250'],
    ['p-sunscreen-gel-spf-50-50', 'p-neem-face-wash-100', 'p-ceramide-moisturiser-50'],
    ['p-detergent-powder-1', 'p-dishwash-liquid-gel-500', 'p-garbage-bags-medium-30'],
    ['p-usb-c-fast-charge-cable-1', 'p-20-w-usb-c-charger-1', 'p-tempered-glass-screen-guard-1'],
    ['p-robusta-bananas-1', 'p-rolled-oats-1', 'p-full-cream-milk-1'],
    ['p-frozen-chicken-momos-500', 'p-tomato-instant-soup-54', 'p-club-soda-can-300'],
  ];

  function frequentlyBoughtTogether(productId) {
    const group = FBT_GROUPS.find((g) => g.indexOf(productId) !== -1);
    const ids = group ? group.filter((id) => id !== productId) : [];
    const items = ids.map(getProduct).filter(Boolean);
    if (items.length >= 3) return items.slice(0, 3);
    // Pad short groups from the same category so the rail is never sparse.
    const product = getProduct(productId);
    const pool = product
      ? PRODUCTS.filter((p) => p.categoryId === product.categoryId && p.id !== productId)
      : PRODUCTS;
    pool.forEach((p) => {
      if (items.length >= 3) return;
      if (!items.some((i) => i.id === p.id)) items.push(p);
    });
    return items.slice(0, 3);
  }

  function relatedProducts(product, count) {
    if (!product) return PRODUCTS.slice(0, count || 8);
    const limit = count || 8;
    const same = PRODUCTS.filter(
      (p) => p.id !== product.id && p.categoryId === product.categoryId && p.subcategory === product.subcategory
    );
    const cat = PRODUCTS.filter((p) => p.id !== product.id && p.categoryId === product.categoryId);
    const brand = PRODUCTS.filter((p) => p.id !== product.id && p.brand === product.brand);
    const seen = new Set();
    const out = [];
    [same, brand, cat].forEach((pool) => {
      pool.forEach((p) => {
        if (out.length >= limit || seen.has(p.id)) return;
        seen.add(p.id);
        out.push(p);
      });
    });
    return out;
  }

  const api = {
    CATEGORIES,
    BRANDS,
    PRODUCTS,
    BANNERS,
    FBT_GROUPS,
    slugify,
    getProduct,
    byTag,
    byCategory,
    byBrand,
    seededPick,
    frequentlyBoughtTogether,
    relatedProducts,
    productCount: PRODUCTS.length,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FX = global.FX || {};
  global.FX.catalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

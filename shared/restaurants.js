/**
 * Food Express — restaurants, menus and customisations.
 *
 * Restaurant menu items are first-class catalogue entries (`type: 'menu-item'`)
 * so search, product details, cart, checkout and orders can treat them like
 * products — with one extra rule: a cart holds ONE restaurant at a time.
 *
 * All restaurants, menus and ratings are fictional demo data.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Reusable customisation groups                                        */
  /* ------------------------------------------------------------------ */

  const CUSTOMISATION_GROUPS = {
    spiceLevel: {
      id: 'spice-level',
      name: 'Spice level',
      type: 'single',
      required: true,
      options: [
        { id: 'mild', label: 'Mild', price: 0 },
        { id: 'medium', label: 'Medium', price: 0 },
        { id: 'hot', label: 'Andhra hot', price: 0 },
      ],
    },
    portion: {
      id: 'portion',
      name: 'Portion',
      type: 'single',
      required: true,
      options: [
        { id: 'half', label: 'Half plate', price: -0.35, mode: 'multiplier' },
        { id: 'full', label: 'Full plate', price: 0 },
      ],
    },
    pizzaSize: {
      id: 'pizza-size',
      name: 'Size',
      type: 'single',
      required: true,
      options: [
        { id: 'reg', label: 'Regular 7"', price: 0 },
        { id: 'med', label: 'Medium 10"', price: 130 },
        { id: 'large', label: 'Large 12"', price: 230 },
      ],
    },
    crust: {
      id: 'crust',
      name: 'Crust',
      type: 'single',
      required: false,
      options: [
        { id: 'classic', label: 'Classic hand tossed', price: 0 },
        { id: 'thin', label: 'Thin crust', price: 30 },
        { id: 'cheese', label: 'Cheese burst', price: 90, veg: true },
      ],
    },
    pizzaAddons: {
      id: 'pizza-addons',
      name: 'Add-ons',
      type: 'multi',
      required: false,
      options: [
        { id: 'cheese', label: 'Extra mozzarella', price: 60, veg: true },
        { id: 'olives', label: 'Olives', price: 30, veg: true },
        { id: 'jalapeno', label: 'Jalapeños', price: 35, veg: true },
        { id: 'chicken', label: 'Grilled chicken', price: 75, veg: false },
      ],
    },
    burgerPatty: {
      id: 'patty',
      name: 'Patty',
      type: 'single',
      required: true,
      options: [
        { id: 'veg', label: 'Crispy veg patty', price: 0, veg: true },
        { id: 'chicken', label: 'Grilled chicken patty', price: 60, veg: false },
      ],
    },
    burgerAddons: {
      id: 'burger-addons',
      name: 'Add-ons',
      type: 'multi',
      required: false,
      options: [
        { id: 'cheese', label: 'Cheese slice', price: 40, veg: true },
        { id: 'bacon', label: 'Chicken bacon', price: 70, veg: false },
        { id: 'egg', label: 'Fried egg', price: 25, veg: false },
      ],
    },
    biryaniAddons: {
      id: 'biryani-addons',
      name: 'Sides & add-ons',
      type: 'multi',
      required: false,
      options: [
        { id: 'egg', label: 'Boiled egg', price: 20, veg: false },
        { id: 'raita', label: 'Extra raita', price: 30, veg: true },
        { id: 'salan', label: 'Mirchi ka salan', price: 25, veg: true },
      ],
    },
    dosaExtras: {
      id: 'dosa-extras',
      name: 'Make it special',
      type: 'multi',
      required: false,
      options: [
        { id: 'ghee', label: 'Roast in ghee', price: 30, veg: true },
        { id: 'extra-butter', label: 'Extra butter', price: 20, veg: true },
        { id: 'podi', label: 'Gunpowder podi', price: 15, veg: true },
      ],
    },
    sweetAddons: {
      id: 'sweet-addons',
      name: 'Add-ons',
      type: 'multi',
      required: false,
      options: [
        { id: 'dry-fruit', label: 'Chopped dry fruits', price: 40, veg: true },
        { id: 'silver-leaf', label: 'Silver leaf finish', price: 20, veg: true },
      ],
    },
    drinkSize: {
      id: 'drink-size',
      name: 'Size',
      type: 'single',
      required: true,
      options: [
        { id: 'small', label: 'Small 200 ml', price: 0 },
        { id: 'large', label: 'Large 350 ml', price: 35 },
      ],
    },
  };

  /* ------------------------------------------------------------------ */
  /* Restaurants                                                          */
  /* ------------------------------------------------------------------ */

  const RAW_RESTAURANTS = [
    {
      id: 'spice-junction',
      name: 'Spice Junction',
      cuisines: ['Andhra', 'South Indian', 'Meals'],
      pureVeg: false,
      cities: ['vijayawada', 'guntur', 'hyderabad'],
      area: 'Benz Circle',
      rating: 4.5,
      etaMinutes: 28,
      minOrder: 149,
      deliveryFee: 25,
      packingFee: 20,
      emoji: '🍛',
      tone: 'saffron',
      promoted: true,
      offers: ['20% off up to ₹100 on orders above ₹299', 'Free delivery above ₹399'],
      hours: '11:00 AM – 11:00 PM',
      blurb: 'Guntur-style Andhra meals, gongura and fiery curries served on a banana leaf.',
      sections: [
        { id: 'starters', name: 'Starters' },
        { id: 'mains', name: 'Curries & Mains' },
        { id: 'meals', name: 'Meals Combos' },
        { id: 'breads', name: 'Breads & Rice' },
      ],
      menu: [
        { n: 'Chicken 65', sec: 'starters', p: 220, m: 260, e: '🍗', veg: false, d: 'Boneless chicken tossed with curry leaf, ginger and Guntur chilli.', pop: 95, r: 4.6, prep: 14, custom: ['spiceLevel'] },
        { n: 'Paneer Tikka', sec: 'starters', p: 210, m: 245, e: '🧀', veg: true, d: 'Char-grilled malai paneer with capsicum and mint chutney.', pop: 82, r: 4.4, prep: 15, custom: ['spiceLevel'] },
        { n: 'Gongura Mutton', sec: 'mains', p: 360, m: 420, e: '🥘', veg: false, d: 'Slow-cooked mutton in sorrel leaf gravy, sharp and tangy.', pop: 91, r: 4.7, prep: 22, custom: ['spiceLevel', 'portion'] },
        { n: 'Natukodi Pulusu', sec: 'mains', p: 330, m: 380, e: '🍲', veg: false, d: 'Country chicken curry with a roasted spice base.', pop: 74, r: 4.4, prep: 24, custom: ['spiceLevel'] },
        { n: 'Gutti Vankaya Kura', sec: 'mains', p: 190, m: 220, e: '🍆', veg: true, d: 'Stuffed brinjal with peanut-sesame masala, a Rayalaseema classic.', pop: 68, r: 4.3, prep: 18 },
        { n: 'Andhra Veg Meals', sec: 'meals', p: 199, m: 240, e: '🍽️', veg: true, d: 'Rice, two curries, pappu, rasam, curd and a sweet — unlimited-style plating.', pop: 88, r: 4.5, prep: 16 },
        { n: 'Andhra Chicken Meals', sec: 'meals', p: 279, m: 320, e: '🍛', veg: false, d: 'Full meals with chicken curry, egg, pappu and rasam.', pop: 93, r: 4.6, prep: 18 },
        { n: 'Steamed Rice', sec: 'breads', p: 60, m: 70, e: '🍚', veg: true, d: 'Sona masoori rice, one generous serving.', pop: 70, r: 4.2, prep: 6 },
        { n: 'Butter Naan', sec: 'breads', p: 55, m: 65, e: '🫓', veg: true, d: 'Tandoor naan brushed with butter, pack of two.', pop: 76, r: 4.3, prep: 9 },
      ],
    },
    {
      id: 'biryani-badshah',
      name: 'Biryani Badshah',
      cuisines: ['Hyderabadi', 'Biryani', 'Mughlai'],
      pureVeg: false,
      cities: ['hyderabad', 'vijayawada', 'guntur', 'visakhapatnam'],
      area: 'Madhapur',
      rating: 4.4,
      etaMinutes: 32,
      minOrder: 199,
      deliveryFee: 30,
      packingFee: 25,
      emoji: '🍚',
      tone: 'brand',
      promoted: true,
      offers: ['₹75 off on orders above ₹499'],
      hours: '12:00 PM – 11:30 PM',
      blurb: 'Dum-cooked Hyderabadi biryani on long-grain basmati with saffron and mint.',
      sections: [
        { id: 'biryani', name: 'Biryanis' },
        { id: 'starters', name: 'Starters' },
        { id: 'sides', name: 'Sides' },
      ],
      menu: [
        { n: 'Hyderabadi Chicken Dum Biryani', sec: 'biryani', p: 320, m: 380, e: '🍛', veg: false, d: 'Kacchi-style chicken dum biryani sealed and cooked on coal.', pop: 98, r: 4.7, prep: 26, custom: ['spiceLevel', 'portion', 'biryaniAddons'] },
        { n: 'Mutton Dum Biryani', sec: 'biryani', p: 420, m: 480, e: '🥘', veg: false, d: 'Tender mutton layered with aged basmati, rose water and fried onion.', pop: 90, r: 4.6, prep: 30, custom: ['spiceLevel', 'portion', 'biryaniAddons'] },
        { n: 'Veg Dum Biryani', sec: 'biryani', p: 240, m: 280, e: '🍚', veg: true, d: 'Seasonal vegetables and paneer dum-cooked with saffron rice.', pop: 80, r: 4.3, prep: 22, custom: ['spiceLevel', 'portion', 'biryaniAddons'] },
        { n: 'Chicken Fry Piece Biryani', sec: 'biryani', p: 350, m: 400, e: '🍗', veg: false, d: 'Two fried chicken pieces on top of a full-plate biryani.', pop: 85, r: 4.5, prep: 25, custom: ['spiceLevel'] },
        { n: 'Apollo Fish', sec: 'starters', p: 300, m: 350, e: '🐟', veg: false, d: 'Crisp basa fish in a tangy yoghurt-chilli coating.', pop: 72, r: 4.3, prep: 18, custom: ['spiceLevel'] },
        { n: 'Mirchi Ka Salan', sec: 'sides', p: 60, m: 75, e: '🌶️', veg: true, d: 'Peanut-sesame gravy with banana chillies, the biryani companion.', pop: 78, r: 4.4, prep: 8 },
        { n: 'Burani Raita', sec: 'sides', p: 70, m: 85, e: '🥣', veg: true, d: 'Thick garlic raita whisked with hung curd.', pop: 74, r: 4.3, prep: 6 },
        { n: 'Double Ka Meetha', sec: 'sides', p: 95, m: 115, e: '🍮', veg: true, d: 'Fried bread soaked in saffron milk, topped with nuts.', pop: 60, r: 4.2, prep: 10, custom: ['sweetAddons'] },
      ],
    },
    {
      id: 'tandoor-tales',
      name: 'Tandoor Tales',
      cuisines: ['North Indian', 'Tandoor', 'Mughlai'],
      pureVeg: false,
      cities: ['hyderabad', 'bengaluru', 'vijayawada', 'pune'],
      area: 'Banjara Hills',
      rating: 4.3,
      etaMinutes: 34,
      minOrder: 199,
      deliveryFee: 32,
      packingFee: 25,
      emoji: '🍢',
      tone: 'plum',
      promoted: false,
      offers: ['15% off on tandoori platters'],
      hours: '12:30 PM – 11:00 PM',
      blurb: 'Clay-oven kebabs, butter-rich gravies and hand-stretched breads.',
      sections: [
        { id: 'tandoor', name: 'From the Tandoor' },
        { id: 'curries', name: 'Curries' },
        { id: 'breads', name: 'Breads' },
        { id: 'rice', name: 'Rice' },
      ],
      menu: [
        { n: 'Murgh Malai Tikka', sec: 'tandoor', p: 310, m: 360, e: '🍢', veg: false, d: 'Cream and cheese marinated chicken, finished with charcoal smoke.', pop: 92, r: 4.6, prep: 20, custom: ['spiceLevel'] },
        { n: 'Tandoori Chicken (Half)', sec: 'tandoor', p: 290, m: 340, e: '🍗', veg: false, d: 'Overnight yoghurt marinade, roasted crisp in the clay oven.', pop: 94, r: 4.5, prep: 25, custom: ['spiceLevel'] },
        { n: 'Paneer Angara', sec: 'tandoor', p: 280, m: 320, e: '🧀', veg: true, d: 'Smoky paneer cubes with bell pepper and ajwain.', pop: 79, r: 4.4, prep: 18 },
        { n: 'Butter Chicken', sec: 'curries', p: 340, m: 390, e: '🍲', veg: false, d: 'Tomato-cashew gravy finished with white butter and kasuri methi.', pop: 97, r: 4.6, prep: 22, custom: ['spiceLevel', 'portion'] },
        { n: 'Dal Makhani', sec: 'curries', p: 230, m: 270, e: '🫘', veg: true, d: 'Black urad simmered overnight with tomato and cream.', pop: 88, r: 4.5, prep: 16, custom: ['portion'] },
        { n: 'Paneer Butter Masala', sec: 'curries', p: 260, m: 300, e: '🍛', veg: true, d: 'Cottage cheese in a mildly sweet onion-tomato makhani.', pop: 90, r: 4.4, prep: 18, custom: ['spiceLevel', 'portion'] },
        { n: 'Butter Naan', sec: 'breads', p: 55, m: 70, e: '🫓', veg: true, d: 'Leavened naan brushed with butter, pack of two.', pop: 86, r: 4.4, prep: 9 },
        { n: 'Lachha Paratha', sec: 'breads', p: 65, m: 80, e: '🥯', veg: true, d: 'Flaky multilayer paratha with carom seeds.', pop: 71, r: 4.3, prep: 10 },
        { n: 'Jeera Rice', sec: 'rice', p: 150, m: 180, e: '🍚', veg: true, d: 'Basmati tempered with cumin and whole spices.', pop: 75, r: 4.2, prep: 12 },
      ],
    },
    {
      id: 'green-bowl-kitchen',
      name: 'Green Bowl Kitchen',
      cuisines: ['Salads', 'Healthy', 'Continental'],
      pureVeg: true,
      cities: ['bengaluru', 'hyderabad', 'pune', 'chennai'],
      area: 'Indiranagar',
      rating: 4.4,
      etaMinutes: 26,
      minOrder: 179,
      deliveryFee: 28,
      packingFee: 15,
      emoji: '🥗',
      tone: 'green',
      promoted: true,
      offers: ['Free cold-pressed juice above ₹449'],
      hours: '08:00 AM – 10:00 PM',
      blurb: 'Macro-balanced bowls, cold-pressed juices and slow-carb plates.',
      sections: [
        { id: 'bowls', name: 'Buddha Bowls' },
        { id: 'salads', name: 'Salads' },
        { id: 'juices', name: 'Cold-Pressed Juices' },
        { id: 'snacks', name: 'Light Bites' },
      ],
      menu: [
        { n: 'Quinoa Power Bowl', sec: 'bowls', p: 289, m: 330, e: '🥗', veg: true, d: 'Tri-colour quinoa, roasted pumpkin, chickpeas, feta and tahini dressing.', pop: 90, r: 4.5, prep: 14 },
        { n: 'Falafel Hummus Bowl', sec: 'bowls', p: 259, m: 295, e: '🧆', veg: true, d: 'Baked falafel, beet hummus, pickled onion and herbed couscous.', pop: 84, r: 4.4, prep: 15 },
        { n: 'Brown Rice Buddha Bowl', sec: 'bowls', p: 239, m: 275, e: '🍚', veg: true, d: 'Brown rice, edamame, sweet potato, sprouts and miso-peanut sauce.', pop: 78, r: 4.3, prep: 14 },
        { n: 'Greek Salad', sec: 'salads', p: 219, m: 250, e: '🥙', veg: true, d: 'Cucumber, tomato, olives, feta and oregano with olive oil.', pop: 74, r: 4.3, prep: 10 },
        { n: 'Sprouts Chaat Salad', sec: 'salads', p: 169, m: 199, e: '🌱', veg: true, d: 'Steamed moong sprouts, pomegranate, mint and lime.', pop: 70, r: 4.2, prep: 8 },
        { n: 'ABC Cold-Pressed Juice', sec: 'juices', p: 149, m: 175, e: '🧃', veg: true, d: 'Apple, beetroot and carrot pressed to order, no water added.', pop: 82, r: 4.5, prep: 7, custom: ['drinkSize'] },
        { n: 'Green Detox Juice', sec: 'juices', p: 159, m: 185, e: '🥬', veg: true, d: 'Spinach, cucumber, celery, green apple and ginger.', pop: 68, r: 4.2, prep: 7, custom: ['drinkSize'] },
        { n: 'Baked Sweet Potato Fries', sec: 'snacks', p: 149, m: 175, e: '🍟', veg: true, d: 'Oven-baked with rosemary salt and a smoked paprika dip.', pop: 76, r: 4.3, prep: 16 },
        { n: 'Avocado Toast', sec: 'snacks', p: 199, m: 230, e: '🥑', veg: true, d: 'Sourdough, smashed avocado, chilli flakes and microgreens.', pop: 72, r: 4.2, prep: 9 },
      ],
    },
    {
      id: 'wok-and-roll',
      name: 'Wok & Roll',
      cuisines: ['Chinese', 'Pan-Asian', 'Momos'],
      pureVeg: false,
      cities: ['hyderabad', 'chennai', 'mumbai', 'delhi'],
      area: 'Kondapur',
      rating: 4.2,
      etaMinutes: 30,
      minOrder: 179,
      deliveryFee: 30,
      packingFee: 20,
      emoji: '🥡',
      tone: 'indigo',
      promoted: false,
      offers: ['Buy 1 get 1 on momos, 3–6 PM'],
      hours: '12:00 PM – 11:30 PM',
      blurb: 'High-flame wok classics, hand-pleated momos and Indo-Chinese noodles.',
      sections: [
        { id: 'momos', name: 'Momos' },
        { id: 'wok', name: 'Wok Mains' },
        { id: 'noodles', name: 'Noodles & Rice' },
        { id: 'soups', name: 'Soups' },
      ],
      menu: [
        { n: 'Steamed Chicken Momos (8 pcs)', sec: 'momos', p: 160, m: 190, e: '🥟', veg: false, d: 'Thin-skin momos with minced chicken and a sesame-chilli dip.', pop: 96, r: 4.5, prep: 16, custom: ['spiceLevel'] },
        { n: 'Fried Veg Momos (8 pcs)', sec: 'momos', p: 150, m: 180, e: '🥟', veg: true, d: 'Crisp-fried cabbage and carrot momos with schezwan dip.', pop: 88, r: 4.4, prep: 17 },
        { n: 'Tandoori Momos (8 pcs)', sec: 'momos', p: 210, m: 245, e: '🍢', veg: false, d: 'Steamed momos finished in the tandoor with a smoky glaze.', pop: 83, r: 4.4, prep: 20 },
        { n: 'Chilli Chicken (Dry)', sec: 'wok', p: 260, m: 300, e: '🍗', veg: false, d: 'Crispy chicken tossed with capsicum, spring onion and soy chilli.', pop: 92, r: 4.5, prep: 18, custom: ['spiceLevel'] },
        { n: 'Paneer Chilli (Gravy)', sec: 'wok', p: 240, m: 275, e: '🧀', veg: true, d: 'Wok-tossed paneer in a glossy garlic-chilli gravy.', pop: 85, r: 4.3, prep: 17, custom: ['spiceLevel'] },
        { n: 'Hakka Noodles', sec: 'noodles', p: 190, m: 220, e: '🍜', veg: true, d: 'Hand-pulled noodles with julienned vegetables and white pepper.', pop: 87, r: 4.3, prep: 14 },
        { n: 'Schezwan Chicken Fried Rice', sec: 'noodles', p: 240, m: 275, e: '🍚', veg: false, d: 'Wok rice with schezwan paste, egg and chicken.', pop: 84, r: 4.4, prep: 15, custom: ['spiceLevel'] },
        { n: 'Hot & Sour Soup', sec: 'soups', p: 120, m: 145, e: '🍲', veg: true, d: 'Peppery broth with bamboo shoot, mushroom and vinegar kick.', pop: 70, r: 4.1, prep: 10 },
      ],
    },
    {
      id: 'coastal-curry-house',
      name: 'Coastal Curry House',
      cuisines: ['Seafood', 'Andhra', 'Coastal'],
      pureVeg: false,
      cities: ['vijayawada', 'visakhapatnam', 'guntur'],
      area: 'Governorpet',
      rating: 4.3,
      etaMinutes: 33,
      minOrder: 249,
      deliveryFee: 28,
      packingFee: 30,
      emoji: '🐟',
      tone: 'teal',
      promoted: false,
      offers: ['Free delivery above ₹599'],
      hours: '11:30 AM – 10:30 PM',
      blurb: 'Coastal Andhra seafood — tamarind pulusu, chilli fry and crab masala.',
      sections: [
        { id: 'seafood', name: 'Seafood Mains' },
        { id: 'fry', name: 'Fry & Roast' },
        { id: 'sides', name: 'Sides' },
      ],
      menu: [
        { n: 'Royyala Pulusu', sec: 'seafood', p: 340, m: 390, e: '🍤', veg: false, d: 'Prawn curry in a tamarind-onion base with curry leaf tempering.', pop: 90, r: 4.6, prep: 24, custom: ['spiceLevel', 'portion'] },
        { n: 'Chepala Pulusu', sec: 'seafood', p: 300, m: 350, e: '🐟', veg: false, d: 'River fish stew, sour and spicy, best with steamed rice.', pop: 82, r: 4.4, prep: 25, custom: ['spiceLevel'] },
        { n: 'Crab Masala', sec: 'seafood', p: 420, m: 480, e: '🦀', veg: false, d: 'Whole crab cooked in a roasted coconut and chilli masala.', pop: 74, r: 4.5, prep: 28, custom: ['spiceLevel'] },
        { n: 'Apollo Fish Fry', sec: 'fry', p: 280, m: 330, e: '🐠', veg: false, d: 'Crisp battered fish with lemon and green chilli.', pop: 80, r: 4.3, prep: 18 },
        { n: 'Prawn Vepudu', sec: 'fry', p: 320, m: 370, e: '🍤', veg: false, d: 'Dry-roasted prawns with coconut slivers and coriander seed.', pop: 77, r: 4.4, prep: 20, custom: ['spiceLevel'] },
        { n: 'Steamed Rice', sec: 'sides', p: 60, m: 70, e: '🍚', veg: true, d: 'Sona masoori rice, one serving.', pop: 66, r: 4.1, prep: 6 },
        { n: 'Ragi Sangati', sec: 'sides', p: 90, m: 105, e: '🍙', veg: true, d: 'Finger millet balls served with a side of natukodi pulusu.', pop: 63, r: 4.2, prep: 12 },
      ],
    },
    {
      id: 'pizza-piazza',
      name: 'Pizza Piazza',
      cuisines: ['Italian', 'Pizza', 'Pasta'],
      pureVeg: false,
      cities: ['hyderabad', 'bengaluru', 'vijayawada', 'pune', 'mumbai', 'delhi', 'chennai'],
      area: 'Jubilee Hills',
      rating: 4.2,
      etaMinutes: 35,
      minOrder: 249,
      deliveryFee: 35,
      packingFee: 25,
      emoji: '🍕',
      tone: 'brand',
      promoted: true,
      offers: ['Buy 1 medium get 1 regular free on weekdays'],
      hours: '11:00 AM – 12:00 AM',
      blurb: '48-hour cold-fermented dough, San Marzano-style sauce and a stone deck oven.',
      sections: [
        { id: 'pizza', name: 'Pizzas' },
        { id: 'pasta', name: 'Pasta' },
        { id: 'sides', name: 'Sides' },
        { id: 'desserts', name: 'Desserts' },
      ],
      menu: [
        { n: 'Margherita Pizza', sec: 'pizza', p: 249, m: 299, e: '🍕', veg: true, d: 'Tomato sauce, fior di latte mozzarella and fresh basil.', pop: 95, r: 4.5, prep: 18, custom: ['pizzaSize', 'crust', 'pizzaAddons'] },
        { n: 'Farmhouse Veggie Pizza', sec: 'pizza', p: 329, m: 385, e: '🍕', veg: true, d: 'Onion, capsicum, corn, mushroom and olive on a herbed base.', pop: 88, r: 4.3, prep: 20, custom: ['pizzaSize', 'crust', 'pizzaAddons'] },
        { n: 'Peri Peri Chicken Pizza', sec: 'pizza', p: 379, m: 435, e: '🍗', veg: false, d: 'Peri peri chicken, roasted pepper and mozzarella with a chilli drizzle.', pop: 90, r: 4.4, prep: 22, custom: ['pizzaSize', 'crust', 'pizzaAddons'] },
        { n: 'Alfredo Pasta', sec: 'pasta', p: 279, m: 320, e: '🍝', veg: true, d: 'Penne in a parmesan cream sauce with garlic and parsley.', pop: 84, r: 4.3, prep: 16 },
        { n: 'Arrabbiata Pasta', sec: 'pasta', p: 259, m: 300, e: '🍝', veg: true, d: 'Spicy tomato-basil sauce with chilli flakes and olive oil.', pop: 76, r: 4.2, prep: 15, custom: ['spiceLevel'] },
        { n: 'Cheesy Garlic Bread', sec: 'sides', p: 159, m: 189, e: '🥖', veg: true, d: 'Stone-baked bread with garlic butter and mozzarella.', pop: 89, r: 4.4, prep: 12, custom: ['pizzaAddons'] },
        { n: 'Herbed Potato Wedges', sec: 'sides', p: 139, m: 165, e: '🍟', veg: true, d: 'Oven wedges with oregano salt and a chipotle dip.', pop: 78, r: 4.2, prep: 14 },
        { n: 'Tiramisu Cup', sec: 'desserts', p: 189, m: 220, e: '🍰', veg: true, d: 'Mascarpone layers with espresso-soaked sponge.', pop: 70, r: 4.5, prep: 5 },
      ],
    },
    {
      id: 'dosa-corner',
      name: 'Dosa Corner',
      cuisines: ['South Indian', 'Breakfast', 'Pure Veg'],
      pureVeg: true,
      cities: ['chennai', 'bengaluru', 'vijayawada', 'hyderabad', 'guntur'],
      area: 'T. Nagar',
      rating: 4.6,
      etaMinutes: 24,
      minOrder: 99,
      deliveryFee: 20,
      packingFee: 10,
      emoji: '🥞',
      tone: 'saffron',
      promoted: true,
      offers: ['Breakfast combo below ₹149 until 11 AM'],
      hours: '06:30 AM – 10:30 PM',
      blurb: 'Crisp ghee roasts, filter coffee and tiffin served all day.',
      sections: [
        { id: 'tiffin', name: 'Tiffin' },
        { id: 'meals', name: 'Meals' },
        { id: 'drinks', name: 'Filter Coffee & Drinks' },
      ],
      menu: [
        { n: 'Ghee Podi Dosa', sec: 'tiffin', p: 129, m: 150, e: '🥞', veg: true, d: 'Crisp dosa spread with gunpowder podi and nattuennai ghee.', pop: 96, r: 4.7, prep: 12, custom: ['dosaExtras'] },
        { n: 'Masala Dosa', sec: 'tiffin', p: 119, m: 140, e: '🥔', veg: true, d: 'Golden dosa with a buttery potato masala, sambar and three chutneys.', pop: 98, r: 4.6, prep: 13, custom: ['dosaExtras'] },
        { n: 'Rava Onion Dosa', sec: 'tiffin', p: 139, m: 160, e: '🧅', veg: true, d: 'Lacy semolina dosa loaded with onion and curry leaf.', pop: 85, r: 4.5, prep: 14 },
        { n: 'Idli Vada Combo', sec: 'tiffin', p: 99, m: 120, e: '🍥', veg: true, d: 'Two steamed idlis, one crisp medu vada, sambar and chutney.', pop: 90, r: 4.5, prep: 10 },
        { n: 'Upma & Kesari Plate', sec: 'tiffin', p: 89, m: 105, e: '🍚', veg: true, d: 'Rava upma with cashews served alongside a small kesari.', pop: 66, r: 4.2, prep: 11 },
        { n: 'South Indian Meals', sec: 'meals', p: 159, m: 185, e: '🍽️', veg: true, d: 'Sambar, three vegetable curries, rasam, curd rice and appalam.', pop: 88, r: 4.4, prep: 16 },
        { n: 'Curd Rice', sec: 'meals', p: 109, m: 125, e: '🥛', veg: true, d: 'Tempered curd rice with pomegranate, ginger and curry leaf.', pop: 74, r: 4.3, prep: 8 },
        { n: 'Filter Coffee', sec: 'drinks', p: 49, m: 60, e: '☕', veg: true, d: 'Decoction coffee with hot frothed milk, served in a davara set.', pop: 94, r: 4.7, prep: 5, custom: ['drinkSize'] },
        { n: 'Sweet Panagam', sec: 'drinks', p: 39, m: 48, e: '🥤', veg: true, d: 'Jaggery water with cardamom, dry ginger and lime — festival special.', pop: 58, r: 4.1, prep: 4 },
      ],
    },
    {
      id: 'chaat-galli',
      name: 'Chaat Galli',
      cuisines: ['Street Food', 'Chaat', 'Pure Veg'],
      pureVeg: true,
      cities: ['delhi', 'mumbai', 'pune', 'patna'],
      area: 'Lajpat Nagar',
      rating: 4.3,
      etaMinutes: 22,
      minOrder: 129,
      deliveryFee: 22,
      packingFee: 12,
      emoji: '🥘',
      tone: 'plum',
      promoted: false,
      offers: ['₹50 off above ₹249'],
      hours: '10:00 AM – 11:00 PM',
      blurb: 'Pani puri, pav bhaji and dahi bhalla made the loud, tangy street way.',
      sections: [
        { id: 'chaat', name: 'Chaat' },
        { id: 'pav', name: 'Pav Specials' },
        { id: 'sweets', name: 'Sweets & Drinks' },
      ],
      menu: [
        { n: 'Pani Puri (8 pcs)', sec: 'chaat', p: 79, m: 95, e: '🥟', veg: true, d: 'Crisp puris with potato-chickpea filling and four flavoured waters.', pop: 97, r: 4.6, prep: 8, custom: ['spiceLevel'] },
        { n: 'Dahi Bhalla', sec: 'chaat', p: 109, m: 130, e: '🥣', veg: true, d: 'Soft lentil dumplings in sweetened curd with chutneys and masala.', pop: 86, r: 4.4, prep: 9 },
        { n: 'Bhel Puri', sec: 'chaat', p: 89, m: 105, e: '🍿', veg: true, d: 'Puffed rice, sev, onion, tomato and tamarind, mixed to order.', pop: 82, r: 4.3, prep: 7 },
        { n: 'Ragda Pattice', sec: 'chaat', p: 119, m: 140, e: '🥔', veg: true, d: 'Potato patties under a spiced white pea ragda and chutneys.', pop: 75, r: 4.3, prep: 11 },
        { n: 'Pav Bhaji', sec: 'pav', p: 159, m: 185, e: '🍲', veg: true, d: 'Mashed vegetable bhaji with buttered pav and raw onion.', pop: 95, r: 4.6, prep: 14, custom: ['dosaExtras'] },
        { n: 'Cheese Pav Bhaji', sec: 'pav', p: 209, m: 240, e: '🧀', veg: true, d: 'Pav bhaji finished with melted cheese and a butter crisp.', pop: 88, r: 4.4, prep: 15, custom: ['dosaExtras'] },
        { n: 'Vada Pav', sec: 'pav', p: 45, m: 55, e: '🍔', veg: true, d: 'Spiced potato vada in a pav with dry garlic chutney.', pop: 92, r: 4.5, prep: 9 },
        { n: 'Masala Lassi', sec: 'sweets', p: 89, m: 105, e: '🥛', veg: true, d: 'Thick churned lassi with roasted cumin and a malai top.', pop: 78, r: 4.4, prep: 5, custom: ['drinkSize'] },
        { n: 'Gulab Jamun (2 pcs)', sec: 'sweets', p: 69, m: 85, e: '🍩', veg: true, d: 'Warm khoya dumplings soaked in cardamom syrup.', pop: 72, r: 4.3, prep: 5 },
      ],
    },
    {
      id: 'burger-foundry',
      name: 'Burger Foundry',
      cuisines: ['American', 'Fast Food', 'Burgers'],
      pureVeg: false,
      cities: ['mumbai', 'pune', 'delhi', 'bengaluru', 'hyderabad'],
      area: 'Bandra West',
      rating: 4.1,
      etaMinutes: 27,
      minOrder: 199,
      deliveryFee: 34,
      packingFee: 20,
      emoji: '🍔',
      tone: 'brand',
      promoted: false,
      offers: ['Free fries with any double patty burger'],
      hours: '11:00 AM – 1:00 AM',
      blurb: 'Smashed patties, brioche buns and hand-cut fries, cooked to order.',
      sections: [
        { id: 'burgers', name: 'Burgers' },
        { id: 'sides', name: 'Sides' },
        { id: 'shakes', name: 'Shakes' },
      ],
      menu: [
        { n: 'Classic Smashed Burger', sec: 'burgers', p: 219, m: 259, e: '🍔', veg: true, d: 'Brioche bun, house sauce, lettuce, tomato and your choice of patty.', pop: 93, r: 4.3, prep: 14, custom: ['burgerPatty', 'burgerAddons'] },
        { n: 'Double Cheese Burger', sec: 'burgers', p: 329, m: 385, e: '🍔', veg: false, d: 'Two smashed chicken patties with double American cheese.', pop: 90, r: 4.4, prep: 16, custom: ['burgerAddons'] },
        { n: 'Peri Peri Veg Burger', sec: 'burgers', p: 189, m: 220, e: '🌶️', veg: true, d: 'Crisp corn-veg patty with peri peri mayo and pickles.', pop: 81, r: 4.2, prep: 13, custom: ['spiceLevel'] },
        { n: 'Hand-Cut Fries', sec: 'sides', p: 129, m: 150, e: '🍟', veg: true, d: 'Twice-fried potatoes with rosemary salt.', pop: 88, r: 4.3, prep: 11 },
        { n: 'Loaded Cheese Fries', sec: 'sides', p: 189, m: 215, e: '🧀', veg: true, d: 'Fries under cheese sauce, jalapeños and crisp onion.', pop: 84, r: 4.3, prep: 13 },
        { n: 'Onion Rings', sec: 'sides', p: 149, m: 175, e: '🧅', veg: true, d: 'Beer-batter onion rings with a smoky dip.', pop: 72, r: 4.1, prep: 12 },
        { n: 'Chocolate Thick Shake', sec: 'shakes', p: 179, m: 205, e: '🥤', veg: true, d: 'Belgian cocoa shake topped with cream and a brownie cube.', pop: 86, r: 4.5, prep: 8, custom: ['drinkSize'] },
        { n: 'Salted Caramel Shake', sec: 'shakes', p: 189, m: 215, e: '🍮', veg: true, d: 'Caramel ice cream blended with sea salt and malt.', pop: 74, r: 4.3, prep: 8, custom: ['drinkSize'] },
      ],
    },
    {
      id: 'filter-coffee-club',
      name: 'Filter Coffee Club',
      cuisines: ['Cafe', 'Beverages', 'Snacks'],
      pureVeg: true,
      cities: ['chennai', 'bengaluru', 'hyderabad', 'pune'],
      area: 'Koramangala',
      rating: 4.5,
      etaMinutes: 20,
      minOrder: 99,
      deliveryFee: 19,
      packingFee: 10,
      emoji: '☕',
      tone: 'teal',
      promoted: false,
      offers: ['Coffee + bun maska combo at ₹129'],
      hours: '07:00 AM – 10:00 PM',
      blurb: 'Single-estate filter coffee, bakes and all-day breakfast plates.',
      sections: [
        { id: 'coffee', name: 'Coffee' },
        { id: 'bakes', name: 'Bakes' },
        { id: 'plates', name: 'Breakfast Plates' },
      ],
      menu: [
        { n: 'Filter Coffee (Davara)', sec: 'coffee', p: 59, m: 70, e: '☕', veg: true, d: 'Chikmagalur decoction with frothed milk, served hot.', pop: 96, r: 4.7, prep: 5, custom: ['drinkSize'] },
        { n: 'Cold Brew', sec: 'coffee', p: 149, m: 175, e: '🧊', veg: true, d: '16-hour steeped arabica, smooth and low acidity.', pop: 82, r: 4.4, prep: 4, custom: ['drinkSize'] },
        { n: 'Cappuccino', sec: 'coffee', p: 129, m: 150, e: '☕', veg: true, d: 'Double ristretto with silky micro-foam and cocoa dust.', pop: 85, r: 4.4, prep: 6 },
        { n: 'Bun Maska', sec: 'bakes', p: 69, m: 85, e: '🥐', veg: true, d: 'Soft bun with whipped butter and a light sugar crust.', pop: 90, r: 4.5, prep: 6 },
        { n: 'Almond Croissant', sec: 'bakes', p: 159, m: 185, e: '🥐', veg: true, d: 'Twice-baked croissant filled with frangipane.', pop: 78, r: 4.5, prep: 7 },
        { n: 'Banana Walnut Cake Slice', sec: 'bakes', p: 119, m: 140, e: '🍰', veg: true, d: 'Eggless banana cake with toasted walnuts.', pop: 74, r: 4.3, prep: 5 },
        { n: 'Masala Omelette Plate', sec: 'plates', p: 149, m: 175, e: '🍳', veg: false, d: 'Three-egg omelette with onion, chilli, toast and hash brown.', pop: 86, r: 4.4, prep: 12 },
        { n: 'Poha Jhalmuri Bowl', sec: 'plates', p: 99, m: 115, e: '🥣', veg: true, d: 'Indori poha with sev, pomegranate and a lime wedge.', pop: 70, r: 4.2, prep: 9 },
      ],
    },
    {
      id: 'mishti-ghar',
      name: 'Mishti Ghar',
      cuisines: ['Bengali Sweets', 'Desserts'],
      pureVeg: true,
      cities: ['kolkata', 'patna'],
      area: 'Gariahat',
      rating: 4.4,
      etaMinutes: 25,
      minOrder: 149,
      deliveryFee: 26,
      packingFee: 15,
      emoji: '🍮',
      tone: 'saffron',
      promoted: false,
      offers: [],
      hours: '09:00 AM – 10:00 PM',
      blurb: 'Chhena-based Bengali mishti made in small copper batches.',
      sections: [
        { id: 'sweets', name: 'Sweets' },
        { id: 'snacks', name: 'Savoury' },
      ],
      menu: [
        { n: 'Rosogolla (6 pcs)', sec: 'sweets', p: 129, m: 150, e: '🍡', veg: true, d: 'Spongy chhena balls in light sugar syrup.', pop: 92, r: 4.6, prep: 5, custom: ['sweetAddons'] },
        { n: 'Mishti Doi', sec: 'sweets', p: 99, m: 115, e: '🥣', veg: true, d: 'Clay-pot sweetened curd set overnight with date palm jaggery.', pop: 88, r: 4.6, prep: 4 },
        { n: 'Sandesh (6 pcs)', sec: 'sweets', p: 159, m: 185, e: '🍬', veg: true, d: 'Kacha chhena sandesh flavoured with cardamom.', pop: 80, r: 4.4, prep: 6, custom: ['sweetAddons'] },
        { n: 'Pantua (4 pcs)', sec: 'sweets', p: 109, m: 130, e: '🍩', veg: true, d: 'Fried chhena dumplings soaked in warm syrup.', pop: 72, r: 4.3, prep: 8 },
        { n: 'Kochuri Aloo Tarkari', sec: 'snacks', p: 89, m: 105, e: '🥔', veg: true, d: 'Flaky kochuri with a cumin-potato tarkari, Sunday classic.', pop: 76, r: 4.3, prep: 12 },
        { n: 'Telebhaja Plate', sec: 'snacks', p: 79, m: 95, e: '🥟', veg: true, d: 'Assorted Bengali fritters — begun, alu and moong dal bora.', pop: 68, r: 4.2, prep: 14 },
      ],
    },
  ];

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '');
  }

  function buildMenuItem(restaurant, sectionId, raw) {
    const slug = slugify(raw.n);
    const id = 'm-' + (restaurant.slug || restaurant.id) + '-' + slug;
    const mrp = raw.m || raw.p;
    return Object.freeze({
      id,
      slug,
      type: 'menu-item',
      name: raw.n,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      brand: restaurant.name,
      brandId: restaurant.id,
      categoryId: 'food',
      categoryName: 'Food & Restaurants',
      subcategory: raw.sec,
      sectionId,
      price: raw.p,
      mrp,
      discountPercent: mrp > raw.p ? Math.round(((mrp - raw.p) / mrp) * 100) : 0,
      unit: '1 plate',
      emoji: raw.e,
      stock: raw.available === false ? 0 : 60,
      inStock: raw.available !== false,
      gstRate: 0.05,
      handlingMinutes: raw.prep || 12,
      prepMinutes: raw.prep || 12,
      description: raw.d,
      veg: Boolean(raw.veg),
      tags: raw.pop > 90 ? ['bestseller'] : [],
      attributes: { Cuisine: restaurant.cuisines.join(', '), Kitchen: restaurant.name },
      popularity: raw.pop || 50,
      rating: raw.r || 0,
      reviewCount: 0,
      customisations: (raw.custom || []).map((key) => CUSTOMISATION_GROUPS[key]).filter(Boolean),
      active: true,
      variants: [],
    });
  }

  const RESTAURANTS = RAW_RESTAURANTS.map((raw) => {
    const restaurant = Object.freeze({
      id: 'r-' + raw.id,
      slug: raw.id,
      type: 'restaurant',
      name: raw.name,
      cuisines: raw.cuisines,
      pureVeg: Boolean(raw.pureVeg),
      cityIds: raw.cities,
      area: raw.area,
      /** Demo merchandising rating — not a verified customer rating. */
      rating: raw.rating,
      reviewCount: 0,
      etaMinutes: raw.etaMinutes,
      minOrder: raw.minOrder,
      deliveryFee: raw.deliveryFee,
      packingFee: raw.packingFee,
      emoji: raw.emoji,
      tone: raw.tone || 'brand',
      promoted: Boolean(raw.promoted),
      offers: raw.offers || [],
      hours: raw.hours,
      blurb: raw.blurb,
      sections: raw.sections,
      menu: raw.menu.map((item) =>
        // `id` is the canonical restaurant id (`r-<slug>`); `slug` keeps menu
        // item ids short and stable (`m-<slug>-<dish>`).
        buildMenuItem({ id: 'r-' + raw.id, slug: raw.id, name: raw.name, cuisines: raw.cuisines }, item.sec, item)
      ),
      priceForTwo: Math.round(
        raw.menu.reduce((sum, i) => sum + i.p, 0) / Math.max(1, raw.menu.length) * 2
      ),
      active: true,
    });
    return restaurant;
  });

  const MENU_ITEMS = RESTAURANTS.reduce((acc, r) => acc.concat(r.menu), []);

  const CUISINES = Array.from(
    new Set(RESTAURANTS.reduce((acc, r) => acc.concat(r.cuisines), []))
  ).sort();

  function getRestaurant(idOrSlug) {
    if (!idOrSlug) return null;
    const key = String(idOrSlug).replace(/^r-/, '').toLowerCase();
    return (
      RESTAURANTS.find((r) => r.slug === key || r.id === 'r-' + key || r.id === key) || null
    );
  }

  function getMenuItem(id) {
    return MENU_ITEMS.find((m) => m.id === id || m.slug === id) || null;
  }

  function restaurantsForCity(cityId) {
    return RESTAURANTS.filter((r) => r.cityIds.indexOf(cityId) !== -1);
  }

  /**
   * Price a menu item with its selected customisations.
   * `selection` = { groupId: [optionId, ...] }
   */
  function priceMenuItem(item, selection) {
    const chosen = selection || {};
    let price = item.price;
    const addons = [];
    (item.customisations || []).forEach((group) => {
      const picked = chosen[group.id] || [];
      const pickedArray = Array.isArray(picked) ? picked : [picked];
      pickedArray.forEach((optionId) => {
        const option = group.options.find((o) => o.id === optionId);
        if (!option) return;
        if (group.type === 'single' && option.mode === 'multiplier') {
          price = Math.round(price * (1 + option.price));
        } else {
          price += option.price;
        }
        addons.push({ groupId: group.id, groupName: group.name, optionId: option.id, label: option.label, price: option.price, veg: option.veg });
      });
    });
    return { price: Math.max(0, price), addons };
  }

  const api = {
    RESTAURANTS,
    MENU_ITEMS,
    CUISINES,
    CUSTOMISATION_GROUPS,
    getRestaurant,
    getMenuItem,
    restaurantsForCity,
    priceMenuItem,
    slugify,
    restaurantCount: RESTAURANTS.length,
    menuItemCount: MENU_ITEMS.length,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FX = global.FX || {};
  global.FX.restaurants = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

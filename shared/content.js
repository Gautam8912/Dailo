/**
 * Food Express — static content (FAQs, policies, onboarding copy).
 * Legal text is DRAFT business content and must be reviewed before launch.
 */
(function (global) {
  'use strict';

  const ONBOARDING_MESSAGES = [
    'Fresh groceries, delivered to your door.',
    'Your favourites are just a tap away.',
    'Preparing your shopping experience…',
    'Restaurants near you are firing up their kitchens.',
    'Loading today’s deals and offers…',
  ];

  const FAQS = [
    {
      id: 'faq-min-order',
      topic: 'Orders & delivery',
      q: 'What is the minimum order for free delivery?',
      a: 'Free delivery unlocks as soon as your eligible merchandise subtotal reaches the configured threshold — ₹150 in this build. Below that a delivery fee applies, and the cart shows exactly how much more you need. Restaurant orders may carry their own minimum, shown on the restaurant card and enforced at checkout.',
    },
    {
      id: 'faq-eligible',
      topic: 'Orders & delivery',
      q: 'What counts towards the free-delivery threshold?',
      a: 'Only eligible merchandise — the products and menu items in your cart. Delivery fees, tips, packing charges and loyalty redemptions are never counted towards the threshold.',
    },
    {
      id: 'faq-delivery-time',
      topic: 'Orders & delivery',
      q: 'How fast is delivery?',
      a: 'Each product and restaurant carries a handling time, and each city has a base delivery window. The estimate shown on the product page is the sum of both for your selected locality. These are simulated estimates in this build — no live delivery network is connected.',
    },
    {
      id: 'faq-city',
      topic: 'Locations',
      q: 'Do you deliver to my city?',
      a: 'Open the location selector to see coverage. Cities marked “Demo coverage — full assortment” serve the whole catalogue, “limited assortment” serves a reduced catalogue, and “Not serviceable yet” blocks checkout. This is configured demo coverage, not live service.',
    },
    {
      id: 'faq-restaurant-cart',
      topic: 'Restaurants',
      q: 'Can I combine food from two restaurants in one cart?',
      a: 'No. A cart holds either store products or one restaurant’s menu at a time. If you add an item from a second kitchen we ask you to confirm before replacing the current cart, so nothing is lost by accident.',
    },
    {
      id: 'faq-coupons',
      topic: 'Offers & coupons',
      q: 'How do coupons work?',
      a: 'One coupon per order. Each coupon states its minimum spend, eligible categories and validity. Automatic offers (for example free delivery above ₹499) may stack with a coupon only when the offer explicitly allows it; otherwise the engine keeps whichever saves you more.',
    },
    {
      id: 'faq-guest',
      topic: 'Account',
      q: 'Can I browse without an account?',
      a: 'Yes. Guest browsing, search, product pages and the cart all work without signing in. When you do sign in, your guest cart is merged into your account — quantities for the same item are combined, never duplicated.',
    },
    {
      id: 'faq-payment',
      topic: 'Payments',
      q: 'Which payment methods are supported?',
      a: 'This build ships a clearly labelled Demo payment mode and a simulated Cash on Delivery option for development. UPI, card and wallet options are present as integration points but stay disabled until a real payment gateway is configured with server-side verification.',
    },
    {
      id: 'faq-cancel',
      topic: 'Cancellation & refunds',
      q: 'Can I cancel an order?',
      a: 'Yes, until it is marked Out for delivery. Cancel from Order details → Cancel order. Refunds for prepaid orders go back to the original method; in demo mode the refund is simulated and recorded in the order timeline.',
    },
    {
      id: 'faq-return',
      topic: 'Returns',
      q: 'What is the return policy?',
      a: 'Perishables (fruits, vegetables, dairy, bakery and prepared food) are quality-checked rather than returned. Non-perishable sealed products can be raised for a refund within the window stated on the product page. See the Cancellation & Refund Policy page for the full draft policy.',
    },
    {
      id: 'faq-ratings',
      topic: 'Catalogue honesty',
      q: 'Are the product ratings real?',
      a: 'No. Ratings in this build are demo merchandising values and are labelled as such. Review counts are zero because no verified review data is collected yet, and the review composer stays disabled until reviews are switched on.',
    },
  ];

  const SUPPORT_TOPICS = [
    { id: 'order', label: 'Order issue', hint: 'Wrong item, missing item, late delivery' },
    { id: 'delivery', label: 'Delivery & address', hint: 'Change address, delivery window, partner issue' },
    { id: 'refund', label: 'Refund or cancellation', hint: 'Refund status, cancel an order' },
    { id: 'payment', label: 'Payment', hint: 'Failed payment, charge query' },
    { id: 'account', label: 'Account & login', hint: 'Password, phone verification, profile' },
    { id: 'product', label: 'Product quality', hint: 'Damaged, expired or mislabelled item' },
    { id: 'other', label: 'Something else', hint: 'Any other feedback' },
  ];

  const POLICIES = {
    privacy: {
      title: 'Privacy Policy',
      updated: 'Draft — 10 October 2026',
      sections: [
        { h: 'Status of this document', p: 'This is draft business content included so the application has complete, honest pages. It has not been reviewed by legal counsel and must not be treated as a live privacy commitment.' },
        { h: 'What the demo build stores', p: 'In demo mode your session, cart, wishlist, addresses and orders are stored only in your own browser’s local storage. Nothing is transmitted to a server because no backend is required for demo mode.' },
        { h: 'What the connected backend stores', p: 'When the Express + MongoDB backend is configured with your credentials, it stores your name, contact details, hashed password, addresses, carts, wishlists, coupons, orders and notifications. Passwords are hashed with bcrypt and never stored or logged in plain text.' },
        { h: 'Payment data', p: 'No card numbers or UPI credentials are collected by this application. Real payments require a PCI-compliant gateway; until one is configured only the clearly labelled demo payment mode is available.' },
        { h: 'Your controls', p: 'The account area lets you edit or delete your profile, manage addresses, clear recently viewed items and clear search history. Deletion requests in a production deployment must be wired to a support workflow.' },
        { h: 'Contact', p: 'Questions about this draft should go to the support form in the Help Centre.' },
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      updated: 'Draft — 10 October 2026',
      sections: [
        { h: 'Status of this document', p: 'Draft content for a development build. Not reviewed by legal counsel and not an enforceable agreement.' },
        { h: 'Demo build notice', p: 'This deployment of Food Express is a demonstration application. Catalogue items, brands, prices, ratings and delivery estimates are sample data. No live delivery network, merchant agreement or payment gateway is connected.' },
        { h: 'Accounts', p: 'You are responsible for keeping your credentials confidential and for activity under your account. Automated abuse of coupons, ratings or the support form is not permitted.' },
        { h: 'Orders & pricing', p: 'Prices are re-validated server-side at checkout. If an item is unavailable or mispriced, the order may be corrected or cancelled with a notification, rather than fulfilled at an incorrect price.' },
        { h: 'Offers', p: 'Coupons and automatic offers carry stated minimum spends, category restrictions and validity windows. They cannot be combined unless explicitly allowed, and are limited per account.' },
        { h: 'Acceptable use', p: 'Do not scrape the catalogue, attack the API, or attempt to access another user’s data. Authorisation is enforced on the server, not by hiding admin buttons in the UI.' },
      ],
    },
    shipping: {
      title: 'Shipping & Delivery Policy',
      updated: 'Draft — 10 October 2026',
      sections: [
        { h: 'Coverage', p: 'Delivery availability is configured per city. The location selector labels each city as full demo coverage, limited demo coverage or not serviceable. No city in this build has a live delivery network.' },
        { h: 'Delivery estimates', p: 'The estimate on a product or restaurant page is the city base window plus the item handling time. Restaurant orders add kitchen prep time. Estimates are simulated.' },
        { h: 'Free delivery threshold', p: 'Delivery is free once eligible merchandise subtotal reaches the configured threshold (₹150 in this build). Below the threshold the configured delivery fee applies and the cart tells you exactly how much more is needed.' },
        { h: 'Fees', p: 'Delivery fee, packing fee for restaurant orders, surge fee and delivery partner tip are itemised in the bill breakdown. They never count towards the free-delivery threshold.' },
        { h: 'Multiple restaurants', p: 'Items from different restaurants cannot be combined into one delivery. Start a separate cart for each kitchen.' },
        { h: 'Failed delivery', p: 'If a delivery cannot be completed, the order is marked accordingly and a refund is initiated for prepaid orders.' },
      ],
    },
    refunds: {
      title: 'Cancellation & Refund Policy',
      updated: 'Draft — 10 October 2026',
      sections: [
        { h: 'Cancellation window', p: 'Store orders can be cancelled until they are marked Out for delivery. Restaurant orders can be cancelled until the kitchen starts preparing; after that the restaurant decides.' },
        { h: 'How to cancel', p: 'Open Orders, select the order and use Cancel order. The reason is recorded and the order timeline is updated.' },
        { h: 'Refund method', p: 'Prepaid orders are refunded to the original payment method. Cash-on-delivery orders that were not paid have nothing to refund. In demo mode refunds are simulated and logged in the order timeline.' },
        { h: 'Perishables', p: 'Fruits, vegetables, dairy, bakery and prepared food are handled as quality claims rather than returns. Raise a support ticket with details within 24 hours of delivery.' },
        { h: 'Non-perishables', p: 'Sealed, unused non-perishable items may be returned within 7 days of delivery with proof of purchase. Electronics carry the manufacturer warranty where applicable.' },
        { h: 'Coupon refunds', p: 'If an order using a coupon is cancelled, the coupon usage is released back to your account so it can be used again within its validity.' },
      ],
    },
    about: {
      title: 'About Food Express',
      sections: [
        { h: 'One app for everyday needs', p: 'Food Express brings quick-commerce essentials, fresh produce, daily household products and restaurant meals into a single shopping experience — one search box, one cart, one order history.' },
        { h: 'Built for Indian neighbourhoods', p: 'The catalogue is organised around how Indian households actually shop: staples in bulk, fresh produce in small quantities, snacks for the evening, and dinner from a kitchen nearby when cooking is off the table.' },
        { h: 'Honest by design', p: 'Where this build is a demonstration, it says so. Demo coupons are labelled, simulated order updates are labelled, ratings are marked as demo merchandising values, and payment options that need a real gateway stay disabled until one is connected.' },
        { h: 'Engineering', p: 'The frontend is framework-free HTML, CSS and vanilla JavaScript with a shared design system. The backend is Node.js, Express and MongoDB with JWT auth, bcrypt hashing, server-side price validation and role-based admin routes. A single shared data layer feeds both the demo store and the seed script.' },
      ],
    },
  };

  const CONTACT_CHANNELS = [
    { label: 'Support email', value: 'support@foodexpress.demo', note: 'Demo address — not a monitored mailbox.' },
    { label: 'Helpline', value: '+91 80000 00000', note: 'Demo number, 9 AM – 10 PM IST.' },
    { label: 'Partner line', value: 'partners@foodexpress.demo', note: 'For merchants and restaurant onboarding.' },
  ];

  const api = { ONBOARDING_MESSAGES, FAQS, SUPPORT_TOPICS, POLICIES, CONTACT_CHANNELS };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FX = global.FX || {};
  global.FX.content = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

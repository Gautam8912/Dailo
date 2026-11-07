// Food Express — orders (placed by users, managed by the admin).

import { read, write, STORAGE_KEYS } from './storage';

export const ORDER_STATUSES = [
  'Placed',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export function getOrders() {
  return read(STORAGE_KEYS.orders, []);
}

function saveOrders(orders) {
  write(STORAGE_KEYS.orders, orders);
  return orders;
}

/** Create an order for the logged-in user. Returns the saved order. */
export function placeOrder({ user, cart, address, phone, payment, totals }) {
  const order = {
    id: 'FE' + Math.floor(10000 + Math.random() * 90000),
    userEmail: user.email,
    userName: user.name,
    items: cart.map((item) => ({ ...item })),
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    address,
    phone,
    payment,
    status: 'Confirmed',
    date: new Date().toLocaleString(),
    estimatedDelivery: '30-45 minutes',
  };
  saveOrders([order, ...getOrders()]);
  return order;
}

/** All orders of one customer (newest first — they are stored newest first). */
export function getOrdersForUser(email) {
  return getOrders().filter((order) => order.userEmail === email);
}

export function updateOrderStatus(orderId, status) {
  saveOrders(
    getOrders().map((order) => (order.id === orderId ? { ...order, status } : order))
  );
}

export function deleteOrder(orderId) {
  saveOrders(getOrders().filter((order) => order.id !== orderId));
}

/** Numbers shown on the admin dashboard. */
export function orderStats() {
  const orders = getOrders();
  const revenue = orders
    .filter((order) => order.status !== 'Cancelled')
    .reduce((sum, order) => sum + order.total, 0);
  return { totalOrders: orders.length, totalRevenue: revenue, orders };
}

// Food Express — cart (kept in localStorage, exactly like the old site).
//
// A cart line looks like { id, name, price, image, qty }.

import { read, write, STORAGE_KEYS } from './storage';

export function getCart() {
  return read(STORAGE_KEYS.cart, []);
}

export function saveCart(cart) {
  write(STORAGE_KEYS.cart, cart);
  return cart;
}

export function addToCart(food) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === food.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: food.id, name: food.name, price: food.price, image: food.image, qty: 1 });
  }
  return saveCart(cart);
}

export function removeFromCart(foodId) {
  return saveCart(getCart().filter((item) => item.id !== foodId));
}

/** change is +1 or -1; dropping below 1 removes the line. */
export function changeQuantity(foodId, change) {
  let cart = getCart();
  const item = cart.find((entry) => entry.id === foodId);
  if (!item) return cart;
  item.qty += change;
  if (item.qty <= 0) cart = cart.filter((entry) => entry.id !== foodId);
  return saveCart(cart);
}

export function clearCart() {
  return saveCart([]);
}

/** Same maths the old site used: flat ₹40 delivery fee. */
export function cartTotals(cart) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = subtotal > 0 ? 40 : 0;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

export function cartCount(cart) {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

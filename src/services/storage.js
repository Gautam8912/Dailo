// Food Express — tiny localStorage wrapper.
//
// Everything the demo app saves lives in these four keys, so a viva answer to
// "where is the data?" is simply: browser localStorage.
//   fx_foods   → the product catalogue (admin can add / edit / delete)
//   fx_users   → registered users (name, email, phone, plain password)
//   fx_session → the user who is currently logged in
//   fx_cart    → the cart of the logged-in user
//   fx_orders  → every placed order

const KEYS = {
  foods: 'fx_foods',
  users: 'fx_users',
  session: 'fx_session',
  cart: 'fx_cart',
  orders: 'fx_orders',
};

export const STORAGE_KEYS = KEYS;

/** Read a key and fall back to `fallback` when it is missing or broken. */
export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not read ${key} from localStorage`, error);
    return fallback;
  }
}

/** Write a value as JSON. */
export function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function remove(key) {
  localStorage.removeItem(key);
}

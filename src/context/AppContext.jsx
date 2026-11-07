// Food Express — one React context that holds the whole app state.
//
// In the old code, script.js reached into the page with getElementById() and
// re-drew parts of the HTML by hand. In React the same data lives here, and any
// component that needs it simply calls useApp(). When the state changes React
// re-renders the affected components for us.

import { createContext, useContext, useEffect, useState } from 'react';
import * as authService from '../services/authService';
import { productService } from '../services/productService';
import * as cartService from '../services/cartService';
import * as orderService from '../services/orderService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ---- data that lives in localStorage -----------------------------------
  const [session, setSession] = useState(() => authService.getSession());
  const [foods, setFoods] = useState(() => productService.getAll());
  const [cart, setCart] = useState(() => cartService.getCart());
  const [orders, setOrders] = useState(() => orderService.getOrders());
  const [users, setUsers] = useState(() => authService.getAllUsers());

  // ---- toast notifications (the little popups in the corner) --------------
  const [toasts, setToasts] = useState([]);

  function showToast(message, type = 'info') {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }

  // Keep state fresh if another browser tab changes localStorage.
  useEffect(() => {
    function sync() {
      setFoods(productService.getAll());
      setCart(cartService.getCart());
      setOrders(orderService.getOrders());
      setUsers(authService.getAllUsers());
      setSession(authService.getSession());
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // ---- auth --------------------------------------------------------------
  function login(credentials) {
    const result = authService.login(credentials);
    if (result.ok) {
      setSession(result.session);
      setCart(cartService.getCart());
    }
    return result;
  }

  function signup(data) {
    const result = authService.signup(data);
    if (result.ok) setUsers(authService.getAllUsers());
    return result;
  }

  function logout() {
    authService.logout();
    setSession(null);
    showToast('Logged out successfully', 'success');
  }

  function refreshUsers() {
    setUsers(authService.getAllUsers());
  }

  function deleteUser(email) {
    authService.deleteUser(email);
    setUsers(authService.getAllUsers());
  }

  // ---- products ----------------------------------------------------------
  function refreshFoods() {
    setFoods(productService.getAll());
  }

  function createFood(data) {
    productService.create(data);
    refreshFoods();
  }

  function updateFood(id, changes) {
    productService.update(id, changes);
    refreshFoods();
  }

  function deleteFood(id) {
    productService.remove(id);
    refreshFoods();
  }

  // ---- cart --------------------------------------------------------------
  function addToCart(food) {
    setCart(cartService.addToCart(food));
    showToast(`${food.name} added to cart`, 'success');
  }

  function removeFromCart(foodId) {
    setCart(cartService.removeFromCart(foodId));
    showToast('Item removed from cart', 'info');
  }

  function updateQuantity(foodId, change) {
    setCart(cartService.changeQuantity(foodId, change));
  }

  function clearCart() {
    setCart(cartService.clearCart());
    showToast('Cart cleared', 'info');
  }

  // ---- orders ------------------------------------------------------------
  function refreshOrders() {
    setOrders(orderService.getOrders());
  }

  function placeOrder(details) {
    const order = orderService.placeOrder(details);
    setOrders(orderService.getOrders());
    setCart(cartService.clearCart());
    return order;
  }

  function changeOrderStatus(orderId, status) {
    orderService.updateOrderStatus(orderId, status);
    refreshOrders();
  }

  function removeOrder(orderId) {
    orderService.deleteOrder(orderId);
    refreshOrders();
  }

  const isAdmin = session?.role === 'admin';
  const totals = cartService.cartTotals(cart);

  const value = {
    // auth
    session,
    isLoggedIn: Boolean(session),
    isAdmin,
    login,
    signup,
    logout,
    users,
    refreshUsers,
    deleteUser,
    // products
    foods,
    createFood,
    updateFood,
    deleteFood,
    // cart
    cart,
    cartCount: cartService.cartCount(cart),
    totals,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    // orders
    orders,
    placeOrder,
    changeOrderStatus,
    removeOrder,
    // ui
    toasts,
    showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Small helper so components read `const { cart } = useApp()`. */
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}

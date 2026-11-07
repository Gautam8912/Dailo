// Cart page — list items, change quantity, checkout form, success modal.
// Same layout and classes as cart.html, driven by React state.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600';

const PAYMENT_METHODS = [
  { value: 'Cash on Delivery', label: '💵 Cash on Delivery' },
  { value: 'UPI', label: '📱 UPI Payment' },
  { value: 'Card', label: '💳 Demo Card Payment' },
];

export default function Cart() {
  const {
    cart,
    totals,
    isLoggedIn,
    session,
    updateQuantity,
    removeFromCart,
    clearCart,
    placeOrder,
    showToast,
  } = useApp();

  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(session?.phone || '');
  const [payment, setPayment] = useState('Cash on Delivery');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Same validation order as the old placeOrder().
  function handlePlaceOrder() {
    if (!isLoggedIn) {
      showToast('Please login first to place order', 'error');
      setTimeout(() => navigate('/login'), 1000);
      return;
    }
    if (cart.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }
    if (!address.trim()) {
      showToast('Please enter delivery address', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('Please enter phone number', 'error');
      return;
    }

    const order = placeOrder({
      user: session,
      cart,
      address: address.trim(),
      phone: phone.trim(),
      payment,
      totals,
    });
    setPlacedOrder(order);
    showToast('Order placed successfully! 🎉', 'success');
  }

  return (
    <>
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Your Cart 🛒</h2>
            <p>Review your items and checkout</p>
          </div>
          {cart.length > 0 && (
            <button className="btn btn-outline btn-small" onClick={clearCart}>
              Clear Cart
            </button>
          )}
        </div>

        <div className="cart-layout">
          {/* ---------- items ---------- */}
          <div className="cart-items" id="cartContainer">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p style={{ color: 'var(--gray)', marginBottom: '16px' }}>
                  Add some delicious food to get started
                </p>
                <Link to="/" className="btn btn-primary">
                  Browse Menu
                </Link>
              </div>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <img
                    src={item.image}
                    alt={item.name}
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <p>
                      ₹{item.price} × {item.qty} = ₹{item.price * item.qty}
                    </p>
                    <button className="remove-btn" onClick={() => removeFromCart(item.id)}>
                      Remove
                    </button>
                  </div>
                  <div className="qty-controls">
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>
                      −
                    </button>
                    <span className="qty">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ---------- summary + checkout ---------- */}
          {cart.length > 0 && (
            <div className="cart-summary">
              <h3>Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span id="subtotal">₹{totals.subtotal}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span id="deliveryFee">₹{totals.deliveryFee}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span id="total">₹{totals.total}</span>
              </div>

              <div className="checkout-box">
                <h4 style={{ marginBottom: '12px' }}>Delivery Details</h4>
                <div className="form-group">
                  <label>Delivery Address</label>
                  <textarea
                    placeholder="House No, Street, Area, City"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>

                <h4 style={{ margin: '16px 0 8px' }}>Payment Method</h4>
                <div className="payment-options">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method.value}
                      className={`payment-option ${payment === method.value ? 'active' : ''}`}
                      onClick={() => setPayment(method.value)}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.value}
                        checked={payment === method.value}
                        onChange={() => setPayment(method.value)}
                      />
                      <span>{method.label}</span>
                    </label>
                  ))}
                </div>

                <button
                  className="btn btn-primary btn-full"
                  style={{ height: '52px', marginTop: '20px', fontSize: '1.05rem' }}
                  onClick={handlePlaceOrder}
                >
                  Place Order 🎉
                </button>
                <p
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--gray)',
                    textAlign: 'center',
                    marginTop: '10px',
                  }}
                >
                  Demo checkout — order is saved in localStorage.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- success modal ---------- */}
      {placedOrder && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="big-icon">🎉</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>
              Order Placed Successfully!
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: '20px' }}>
              Your delicious food is being prepared
            </p>

            <div
              style={{
                background: 'var(--light)',
                padding: '16px',
                borderRadius: '12px',
                textAlign: 'left',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--gray)' }}>Order ID:</span>
                <b style={{ fontFamily: 'monospace' }}>{placedOrder.id}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--gray)' }}>Total Amount:</span>
                <b>₹{placedOrder.total}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray)' }}>Estimated Delivery:</span>
                <b>{placedOrder.estimatedDelivery}</b>
              </div>
            </div>

            <Link to="/orders" className="btn btn-primary btn-full" style={{ height: '48px' }}>
              View Orders
            </Link>
            <Link
              to="/"
              className="btn btn-outline btn-full"
              style={{ height: '48px', marginTop: '10px' }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

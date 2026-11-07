// My Orders — the logged-in customer's order history.

import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// Every status now gets its own colour instead of one green badge.
const STATUS_CLASS = {
  Placed: 'status-placed',
  Confirmed: 'status-confirmed',
  Preparing: 'status-preparing',
  'Out for Delivery': 'status-out',
  Delivered: 'status-delivered',
  Cancelled: 'status-cancelled',
};

export default function Orders() {
  const { session, orders } = useApp();

  const myOrders = orders.filter((order) => order.userEmail === session?.email);

  return (
    <section className="section" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="section-head">
        <div>
          <h2>My Orders 📦</h2>
          <p>Track your delicious orders</p>
        </div>
        <Link to="/" className="btn btn-primary btn-small">
          Order More
        </Link>
      </div>

      <div className="orders-list" id="ordersContainer">
        {myOrders.length === 0 ? (
          <div className="empty-cart">
            <div className="icon">📦</div>
            <h3>No orders yet</h3>
            <p style={{ color: 'var(--gray)', marginBottom: '16px' }}>
              Your delicious orders will appear here
            </p>
            <Link to="/" className="btn btn-primary">
              Order Now
            </Link>
          </div>
        ) : (
          myOrders.map((order) => (
            <div className="order-card" key={order.id}>
              <h4>
                <span>
                  Order <span className="order-id">#{order.id}</span>
                </span>
                <span className={`order-status ${STATUS_CLASS[order.status] || 'status-confirmed'}`}>
                  {order.status}
                </span>
              </h4>

              <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginBottom: '10px' }}>
                {order.date} • {order.payment} • {order.estimatedDelivery}
              </div>

              <div className="order-items">
                {order.items.map((item) => (
                  <div className="order-item" key={`${order.id}-${item.id}`}>
                    <span>
                      {item.name} × {item.qty}
                    </span>
                    <span>₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--gray)', marginTop: '10px' }}>
                📍 {order.address} • 📞 {order.phone}
              </div>

              <div className="order-total">Total: ₹{order.total}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

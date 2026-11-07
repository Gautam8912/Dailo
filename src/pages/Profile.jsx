// My Profile — account details of the logged-in customer.

import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Profile() {
  const { session, orders, logout } = useApp();
  const navigate = useNavigate();

  const myOrders = orders.filter((order) => order.userEmail === session?.email);
  const mySpend = myOrders.reduce((sum, order) => sum + order.total, 0);
  const initial = session?.name?.charAt(0).toUpperCase() || '?';

  function handleLogout() {
    logout();
    setTimeout(() => navigate('/'), 800);
  }

  return (
    <section className="section" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="section-head">
        <div>
          <h2>My Profile 👤</h2>
          <p>Manage your account information</p>
        </div>
      </div>

      <div id="profileContent">
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar">{initial}</div>
            <div>
              <h3 style={{ fontSize: '1.3rem' }}>{session?.name}</h3>
              <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>Food Express Member</p>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-row">
              <span>Full Name</span>
              <span>{session?.name}</span>
            </div>
            <div className="detail-row">
              <span>Email Address</span>
              <span>{session?.email}</span>
            </div>
            <div className="detail-row">
              <span>Phone Number</span>
              <span>{session?.phone || '-'}</span>
            </div>
            <div className="detail-row">
              <span>Total Orders</span>
              <span>{myOrders.length}</span>
            </div>
            <div className="detail-row">
              <span>Total Spent</span>
              <span>₹{mySpend}</span>
            </div>
            <div className="detail-row">
              <span>Account Status</span>
              <span style={{ color: '#16a34a' }}>● Active</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <Link to="/orders" className="btn btn-outline btn-full">
              My Orders
            </Link>
            <button className="btn btn-primary btn-full" onClick={handleLogout}>
              Logout
            </button>
          </div>

          <p
            style={{
              marginTop: '16px',
              fontSize: '0.8rem',
              color: 'var(--gray)',
              textAlign: 'center',
            }}
          >
            Demo auth using localStorage. Not secure for production.
          </p>
        </div>
      </div>
    </section>
  );
}

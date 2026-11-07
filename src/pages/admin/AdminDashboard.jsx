// Admin Dashboard — the whole Admin module in one page with four sections:
//   Dashboard | Orders | Foods (products) | Users
//
// Same sidebar + table styling as the original admin.html. The only change is
// that the data comes from React context (localStorage) instead of an API.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ORDER_STATUSES } from '../../services/orderService';
import { categories } from '../../data/foods';
import ToastContainer from '../../components/ToastContainer';

const MENU = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'orders', label: '📦 Orders' },
  { id: 'foods', label: '🍔 Foods' },
  { id: 'users', label: '👥 Users' },
];

const STATUS_CLASS = {
  Placed: 'status-placed',
  Confirmed: 'status-confirmed',
  Preparing: 'status-preparing',
  'Out for Delivery': 'status-out',
  Delivered: 'status-delivered',
  Cancelled: 'status-cancelled',
};

const EMPTY_FORM = {
  name: '',
  price: '',
  desc: '',
  category: 'Biryani',
  rating: '4.5',
  image: '',
};

export default function AdminDashboard() {
  const {
    session,
    foods,
    orders,
    users,
    logout,
    createFood,
    updateFood,
    deleteFood,
    changeOrderStatus,
    removeOrder,
    deleteUser,
    showToast,
  } = useApp();

  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');

  // Product form state — `editingId` is null when adding, an id when editing.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [orderFilter, setOrderFilter] = useState('All');

  // ---- dashboard numbers --------------------------------------------------
  const totalRevenue = orders
    .filter((order) => order.status !== 'Cancelled')
    .reduce((sum, order) => sum + order.total, 0);

  const visibleOrders =
    orderFilter === 'All' ? orders : orders.filter((order) => order.status === orderFilter);

  // ---- product form -------------------------------------------------------
  function openAddForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  }

  function openEditForm(food) {
    setForm({
      name: food.name,
      price: String(food.price),
      desc: food.desc,
      category: food.category,
      rating: String(food.rating),
      image: food.image,
    });
    setEditingId(food.id);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleSaveFood(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.price || !form.desc.trim()) {
      showToast('Name, price and description required', 'error');
      return;
    }

    if (editingId === null) {
      createFood(form);
      showToast('Food created successfully!', 'success');
    } else {
      updateFood(editingId, form);
      showToast('Food updated successfully!', 'success');
    }
    closeForm();
  }

  function handleDeleteFood(food) {
    if (!window.confirm(`Delete "${food.name}"?`)) return;
    deleteFood(food.id);
    showToast('Food deleted', 'success');
  }

  // ---- orders / users -----------------------------------------------------
  function handleDeleteOrder(order) {
    if (!window.confirm(`Delete order #${order.id}?`)) return;
    removeOrder(order.id);
    showToast('Order deleted', 'success');
  }

  function handleDeleteUser(user) {
    if (!window.confirm(`Remove user ${user.email}?`)) return;
    deleteUser(user.email);
    showToast('User removed', 'success');
  }

  function handleLogout() {
    logout();
    setTimeout(() => navigate('/'), 600);
  }

  return (
    <div>
      <ToastContainer />

      <header className="header">
        <Link to="/admin" className="logo">
          <div className="logo-icon">🍔</div>
          Food <span>Express</span>
          <span
            style={{
              background: 'var(--dark)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              marginLeft: '8px',
            }}
          >
            ADMIN
          </span>
        </Link>

        <nav className="nav" id="mainNav">
          <Link to="/admin" className="active">
            Dashboard
          </Link>
        </nav>

        <div className="header-actions">
          <Link to="/" className="btn btn-outline btn-small">
            View Site
          </Link>
          <button className="btn btn-primary btn-small" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="admin-layout">
        {/* ---------------- sidebar ---------------- */}
        <aside className="admin-sidebar">
          <h3>Admin Panel</h3>
          <div className="admin-menu">
            {MENU.map((item) => (
              <button
                key={item.id}
                className={section === item.id ? 'active' : ''}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: '30px',
              padding: '12px',
              background: '#2a2a2a',
              borderRadius: '10px',
              fontSize: '0.8rem',
            }}
          >
            <b style={{ color: 'white' }}>Admin:</b>
            <br />
            <span>{session?.email}</span>
            <br />
            <br />
            <span style={{ color: '#16a34a' }}>● localStorage mode</span>
          </div>
        </aside>

        {/* ---------------- content ---------------- */}
        <main className="admin-content">
          {/* ---------- Dashboard ---------- */}
          {section === 'dashboard' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Dashboard Overview 📊</h2>

              <div className="stats-grid">
                <div className="stat-card">
                  <span style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Total Users</span>
                  <b>{users.length}</b>
                </div>
                <div className="stat-card">
                  <span style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Total Foods</span>
                  <b>{foods.length}</b>
                </div>
                <div className="stat-card">
                  <span style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Total Orders</span>
                  <b>{orders.length}</b>
                </div>
                <div className="stat-card">
                  <span style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>Total Revenue</span>
                  <b>₹{totalRevenue}</b>
                </div>
              </div>

              <div className="admin-table">
                <div
                  style={{
                    padding: '16px',
                    fontWeight: 700,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Recent Orders</span>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => setSection('orders')}
                  >
                    View all
                  </button>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>User</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
                      <tr key={order.id}>
                        <td style={{ fontFamily: 'monospace' }}>{order.id}</td>
                        <td>{order.userName}</td>
                        <td>₹{order.total}</td>
                        <td>
                          <span
                            className={`order-status ${STATUS_CLASS[order.status] || 'status-confirmed'}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td>{order.date.split(',')[0]}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ color: 'var(--gray)' }}>
                          No orders placed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------- Orders ---------- */}
          {section === 'orders' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>All Orders 📦</h2>

              <div className="admin-table">
                <div style={{ padding: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['All', ...ORDER_STATUSES].map((status) => (
                    <button
                      key={status}
                      className={`btn btn-small ${
                        orderFilter === status ? 'btn-primary' : 'btn-outline'
                      }`}
                      onClick={() => setOrderFilter(status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>User</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              background: 'var(--light)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {order.id}
                          </span>
                        </td>
                        <td>
                          {order.userName}
                          <br />
                          <small style={{ color: 'var(--gray)' }}>{order.userEmail}</small>
                        </td>
                        <td>
                          {order.items.map((item) => (
                            <div key={`${order.id}-${item.id}`}>
                              {item.name} x{item.qty}
                            </div>
                          ))}
                        </td>
                        <td>₹{order.total}</td>
                        <td>
                          <span
                            className={`order-status ${STATUS_CLASS[order.status] || 'status-confirmed'}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <select
                            value={order.status}
                            onChange={(event) => {
                              changeOrderStatus(order.id, event.target.value);
                              showToast(`Order ${order.id} → ${event.target.value}`, 'success');
                            }}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              marginBottom: '6px',
                            }}
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <br />
                          <button
                            className="btn btn-outline btn-small"
                            style={{ color: 'red', borderColor: 'red' }}
                            onClick={() => handleDeleteOrder(order)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {visibleOrders.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ color: 'var(--gray)' }}>
                          No orders with this status.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------- Foods ---------- */}
          {section === 'foods' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <h2>Food Management 🍔</h2>
                <button className="btn btn-primary btn-small" onClick={openAddForm}>
                  + Add Food
                </button>
              </div>

              {formOpen && (
                <form
                  onSubmit={handleSaveFood}
                  style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    marginBottom: '20px',
                  }}
                >
                  <h3 style={{ marginBottom: '12px' }}>
                    {editingId === null ? 'Add New Food' : 'Edit Food'}
                  </h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        placeholder="Chicken Biryani"
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Price (₹)</label>
                      <input
                        type="number"
                        placeholder="249"
                        value={form.price}
                        onChange={(event) => setForm({ ...form, price: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      placeholder="Delicious..."
                      value={form.desc}
                      onChange={(event) => setForm({ ...form, desc: event.target.value })}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={form.category}
                        onChange={(event) => setForm({ ...form, category: event.target.value })}
                      >
                        {categories
                          .filter((category) => category.id !== 'All')
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.label}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Rating</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={form.rating}
                        onChange={(event) => setForm({ ...form, rating: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Image URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={form.image}
                      onChange={(event) => setForm({ ...form, image: event.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary">
                      {editingId === null ? 'Create Food' : 'Save Changes'}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={closeForm}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Rating</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foods.map((food) => (
                      <tr key={food.id}>
                        <td>
                          <img
                            src={food.image}
                            alt={food.name}
                            onError={(event) => {
                              event.currentTarget.src = '/images/food-placeholder.jpg';
                            }}
                            style={{
                              width: '50px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                            }}
                          />
                        </td>
                        <td>{food.name}</td>
                        <td>{food.category}</td>
                        <td>₹{food.price}</td>
                        <td>⭐ {food.rating}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-outline btn-small"
                              onClick={() => openEditForm(food)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-outline btn-small"
                              style={{ color: 'red', borderColor: 'red' }}
                              onClick={() => handleDeleteFood(food)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------- Users ---------- */}
          {section === 'users' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>User Management 👥</h2>

              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Orders</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const userOrders = orders.filter(
                        (order) => order.userEmail === user.email
                      );
                      return (
                        <tr key={user.email}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.phone || '-'}</td>
                          <td>{userOrders.length}</td>
                          <td>
                            <span
                              style={{
                                background: 'var(--light)',
                                color: 'var(--gray)',
                                padding: '2px 8px',
                                borderRadius: '100px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              USER
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline btn-small"
                              style={{ color: 'red', borderColor: 'red' }}
                              onClick={() => handleDeleteUser(user)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ color: 'var(--gray)' }}>
                          No customer accounts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

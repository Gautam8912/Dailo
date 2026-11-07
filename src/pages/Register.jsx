// User Signup — saves a new account to localStorage, then sends the user to login.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Register() {
  const { signup, showToast } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const result = signup(form);

    if (!result.ok) {
      setError(result.message);
      showToast(result.message, 'error');
      return;
    }

    setSuccess(result.message);
    showToast('Account created successfully!', 'success');
    setTimeout(() => navigate('/login'), 1200);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account 🎉</h1>
        <p className="sub">Join Food Express and order delicious food</p>

        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
        {success && <div className="success-msg" style={{ display: 'block' }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Gautam Kumar" value={form.name} onChange={update('name')} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="example@gmail.com" value={form.email} onChange={update('email')} required />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" placeholder="9876543210" value={form.phone} onChange={update('phone')} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Min 6 chars" value={form.password} onChange={update('password')} required />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ height: '50px', marginTop: '8px' }}
          >
            Create Account
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}

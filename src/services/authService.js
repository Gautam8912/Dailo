// Food Express — Login / Signup / Forgot password (localStorage only).
//
// NOTE FOR VIVA: this is a college-demo auth. Passwords are stored in plain text
// inside localStorage, which is fine for an offline demo but must never be used
// for a real website (a real backend hashes them — see backend/src/services).

import { read, write, remove, STORAGE_KEYS } from './storage';

// The admin account always exists, so the admin panel can be opened even on a
// brand new browser. It is never shown in the normal user list.
export const ADMIN_ACCOUNT = {
  name: 'Store Admin',
  email: 'admin@foodexpress.com',
  phone: '9876500000',
  password: 'admin123',
  role: 'admin',
};

function getUsers() {
  const users = read(STORAGE_KEYS.users, []);
  // Make sure the admin account is present in the stored list.
  const hasAdmin = users.some((user) => user.email === ADMIN_ACCOUNT.email);
  if (!hasAdmin) {
    const withAdmin = [ADMIN_ACCOUNT, ...users];
    write(STORAGE_KEYS.users, withAdmin);
    return withAdmin;
  }
  return users;
}

function saveUsers(users) {
  write(STORAGE_KEYS.users, users);
}

/** Register a new customer account. Returns { ok, message }. */
export function signup({ name, email, phone, password, confirmPassword }) {
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').trim();

  if (!cleanName || !cleanEmail || !cleanPhone || !password || !confirmPassword) {
    return { ok: false, message: 'All fields are required' };
  }
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return { ok: false, message: 'Please enter a valid email' };
  }
  if (password.length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters' };
  }
  if (password !== confirmPassword) {
    return { ok: false, message: 'Passwords do not match' };
  }

  const users = getUsers();
  if (users.some((user) => user.email === cleanEmail)) {
    return { ok: false, message: 'Email already registered. Please login.' };
  }

  users.push({
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    password,
    role: 'user',
    joined: new Date().toISOString(),
  });
  saveUsers(users);
  return { ok: true, message: 'Account created successfully! Please login.' };
}

/** Log in. Returns { ok, user | message, isAdmin }. */
export function login({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { ok: false, message: 'Email and password are required' };
  }

  const user = getUsers().find(
    (item) => item.email === cleanEmail && item.password === password
  );
  if (!user) {
    return { ok: false, message: 'Invalid email or password' };
  }

  // `role` is what separates the Admin module from the User module.
  const session = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role || 'user',
  };
  write(STORAGE_KEYS.session, session);
  return { ok: true, session, isAdmin: session.role === 'admin' };
}

export function logout() {
  remove(STORAGE_KEYS.session);
}

export function getSession() {
  return read(STORAGE_KEYS.session, null);
}

/** Step 1 of forgot-password: check the email exists. */
export function findUserByEmail(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { ok: false, message: 'Please enter your email' };
  const user = getUsers().find((item) => item.email === cleanEmail);
  if (!user) return { ok: false, message: 'Email not found. Please check your email.' };
  return { ok: true, email: cleanEmail };
}

/** Step 2 of forgot-password: store the new password. */
export function resetPassword(email, newPassword, confirmPassword) {
  if (!newPassword || !confirmPassword) {
    return { ok: false, message: 'Both fields required' };
  }
  if (newPassword.length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters' };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, message: 'Passwords do not match' };
  }

  const users = getUsers();
  const index = users.findIndex((item) => item.email === email);
  if (index === -1) {
    return { ok: false, message: 'Email not found. Please start again.' };
  }
  users[index].password = newPassword;
  saveUsers(users);
  return { ok: true, message: 'Password updated successfully! Redirecting to login...' };
}

/* ------------------------------------------------------------------ admin */

/** All customer accounts (the admin account is hidden from the table). */
export function getAllUsers() {
  return getUsers().filter((user) => user.role !== 'admin');
}

export function deleteUser(email) {
  const users = getUsers().filter((user) => user.email !== email);
  saveUsers(users);
}

# 🍔 Food Express - Complete Food Ordering Website

Full-stack food ordering platform with **real backend** (Node.js + Express + MongoDB) + **plain HTML/CSS/JS frontend** (no frameworks).

---

## 🌟 Features

### Frontend (HTML/CSS/Vanilla JS)
- 🏠 Modern homepage with hero, categories, search
- 🍕 66+ food items with images, ratings, prices
- 🔍 Live search + category filtering
- 🛒 Cart with quantity update, remove, clear
- 👤 Auth: Register, Login, Forgot Password, Profile
- 📦 Orders history + order success modal
- 👑 Admin panel (`admin.html`) for food/order/user management
- 📱 Fully responsive + toast notifications
- 🔄 Works with backend API OR localStorage demo mode

### Backend (Node.js + Express + MongoDB)
- 🔐 JWT Authentication + bcryptjs password hashing
- 👤 User model with roles (user/admin)
- 🍔 Food CRUD + search + category filter
- 🛒 Cart per user (DB prices, no frontend trust)
- 📦 Orders with status workflow
- 👑 Admin: users, foods, orders, stats
- 🛡️ Protected routes + error handling + CORS
- 🌱 Seed script with 20 foods + admin user

---

## 📁 Project Structure

```
food-express/
├── index.html
├── login.html
├── register.html
├── forgot-password.html
├── cart.html
├── profile.html
├── orders.html
├── admin.html          # NEW: Admin dashboard
├── css/
│   └── style.css
├── js/
│   ├── config.js       # NEW: API URL config
│   ├── api.js          # NEW: API helper (fetch)
│   ├── script.js       # Original frontend logic (66 foods)
│   └── backend-integration.js  # NEW: Backend <-> Frontend bridge
├── assets/
│   └── images/
├── backend/            # NEW: Complete backend
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Food.js
│   │   ├── Cart.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── foodRoutes.js
│   │   ├── cartRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── adminRoutes.js
│   │   └── userRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── foodController.js
│   │   ├── cartController.js
│   │   ├── orderController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── adminMiddleware.js
│   │   └── errorMiddleware.js
│   ├── utils/
│   │   └── generateToken.js
│   ├── seed/
│   │   └── seed.js
│   ├── API_DOCUMENTATION.md
│   └── README.md
└── README.md (this file)
```

---

## 🚀 Quick Start

### 1. Frontend Only (Demo Mode - No Backend Needed)

Just open `index.html` in browser or VS Code Live Server.

- Uses localStorage for auth, cart, orders
- Works without any backend
- Set `USE_BACKEND: false` in `js/config.js` to force demo mode

### 2. Full-Stack with Backend (Recommended)

#### Backend Setup (Windows PowerShell)

```powershell
# Go to project
cd C:\MyProjects\food-express

# Enter backend
cd backend

# Install dependencies
npm install

# Create .env file (copy from example)
# Windows:
copy .env.example .env
# Then edit .env with notepad
notepad .env

# .env content (edit MONGO_URI):
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/foodexpress?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this_123456
FRONTEND_URL=http://localhost:5500
NODE_ENV=development

# Seed database (20 foods + admin user)
npm run seed

# Start backend
npm run dev
```

Backend will run on: http://localhost:5000

Test: http://localhost:5000 → Should show `Food Express API is running!`

#### Frontend Setup

```powershell
# In project root (not backend)
cd C:\MyProjects\food-express

# Option A: VS Code Live Server (Recommended)
# Right-click index.html -> Open with Live Server
# Frontend runs on http://localhost:5500

# Option B: Python server
python -m http.server 8000
# Open http://localhost:8000
```

**Important:** Make sure `FRONTEND_URL` in backend `.env` matches frontend URL.

If frontend is `http://localhost:5500`, set `FRONTEND_URL=http://localhost:5500` in backend `.env` and restart backend.

#### Enable Backend Mode in Frontend

Edit `js/config.js`:

```javascript
const CONFIG = {
  API_URL: 'http://localhost:5000/api', // Backend URL
  USE_BACKEND: true, // Set true to use backend, false for localStorage demo
}
```

---

## 🔐 Default Credentials (After `npm run seed`)

**Admin:**
- Email: `admin@foodexpress.com`
- Password: `admin123`
- Access: http://localhost:5500/admin.html (after login as admin)

**Test User:**
- Email: `user@test.com`
- Password: `user123`

**⚠️ Change admin password after first login!**

---

## 📚 API Documentation

Full API docs: `backend/API_DOCUMENTATION.md`

**Base URL:** `http://localhost:5000/api`

**Key Endpoints:**
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile (protected)
- `GET /api/foods` - Get all foods (public)
- `GET /api/foods/search?q=burger` - Search
- `GET /api/cart` - Get cart (protected)
- `POST /api/cart` - Add to cart (protected)
- `POST /api/orders` - Place order (protected)
- `GET /api/orders` - My orders (protected)
- `GET /api/admin/stats` - Admin stats (admin only)
- `GET /api/admin/orders` - All orders (admin only)

**Test with Postman / Thunder Client:** See `backend/README.md` for full testing sequence.

---

## 🍔 MongoDB Atlas Setup (Beginner)

1. Go to https://www.mongodb.com/cloud/atlas → Try Free → Create account
2. Build Database → FREE M0 cluster → Choose region → Create
3. Database Access → Add New Database User → Username + Autogenerate Password → Save password → Atlas admin role → Add User
4. Network Access → Add IP Address → Allow Access From Anywhere (0.0.0.0/0) → Confirm
5. Database → Connect → Connect your application → Copy connection string
6. Replace `<password>` with your real password, add `/foodexpress` before `?`
7. Paste into backend `.env` as `MONGO_URI`

Detailed steps in `backend/README.md`.

---

## 👑 Admin Panel

File: `admin.html`

Features:
- 📊 Dashboard stats (users, foods, orders, revenue)
- 📦 View all orders + filter by status + change order status
- 🍔 Add / Delete foods
- 👥 View all users

**Access:**
1. Login as admin: `admin@foodexpress.com / admin123`
2. Go to `admin.html` or click Dashboard in header (if admin)
3. Manage everything

**Admin can change order status:**
`Placed → Confirmed → Preparing → Out for Delivery → Delivered`

---

## 🔧 How Frontend Connects to Backend

**New files:**
- `js/config.js` - API URL + backend toggle
- `js/api.js` - Fetch wrapper with JWT
- `js/backend-integration.js` - Overrides localStorage logic with backend API calls when `USE_BACKEND: true` and backend reachable

**Flow:**
1. On page load, tries to fetch foods from `GET /api/foods`
2. If backend reachable → `isBackendMode = true` → Uses backend foods, cart, orders, auth
3. If backend NOT reachable → Falls back to localStorage demo (66 foods in `script.js`)
4. Auth: `localStorage.setItem('token', ...)` + `localStorage.setItem('user', ...)`
5. All protected requests send `Authorization: Bearer <token>`

**No framework needed** - Pure `fetch()` API.

---

## 🧪 Testing Checklist

- [ ] `npm run seed` works
- [ ] Backend starts on http://localhost:5000
- [ ] http://localhost:5000/api/health returns healthy
- [ ] Register new user via frontend or Postman
- [ ] Login → Token saved in localStorage
- [ ] Foods load from backend (not local array)
- [ ] Add to cart requires login (if backend mode)
- [ ] Cart loads from backend
- [ ] Place order → Cart cleared → Order appears in orders.html
- [ ] Admin login → admin.html accessible
- [ ] Admin can change order status
- [ ] Admin can add/delete foods
- [ ] Frontend still works without backend if `USE_BACKEND: false`

---

## 📦 Deployment

**Backend deploy to Render/Railway:**
- Set env vars: `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`
- Build command: `npm install`
- Start command: `npm start`

**Frontend deploy to Netlify/Vercel:**
- Update `js/config.js` API_URL to production backend URL
- Deploy entire `food-express/` folder (excluding `backend/` if backend deployed separately)

---

## 🛡️ Security

- Passwords hashed with bcryptjs (10 salt rounds)
- JWT expires in 30 days
- Backend calculates prices from DB (never trusts frontend total)
- Protected routes require JWT
- Admin routes require admin role
- CORS configured
- .env and node_modules in .gitignore
- No passwords in frontend code

---

## 📝 License

MIT - Free to use for learning, projects, portfolio.

---

## 🙏 Credits

Built with ❤️ for food lovers.

**Stack:** HTML5, CSS3, Vanilla JS, Node.js, Express, MongoDB, Mongoose, JWT

**Author:** Food Express Team

**Version:** 2.0.0 (Full-Stack)

---

## 💡 Need Help?

- Backend setup: See `backend/README.md`
- API docs: See `backend/API_DOCUMENTATION.md`
- Check terminal logs where `npm run dev` is running
- Ensure MongoDB Atlas IP whitelist allows your IP (0.0.0.0/0 for dev)
- Ensure `js/config.js` API_URL matches backend URL

Happy coding! 🚀🍔
#   D a i l o  
 
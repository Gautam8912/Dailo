# 🎓 Viva Guide — Food Express (React + Vite)

Short answers you can give, plus the file to point at when asked
"where is that in your code?".

---

## 1. One-minute project explanation

> Food Express is a food ordering website built with React and Vite. It has two
> modules in the same app. The **User module** lets a visitor sign up, log in,
> browse 66 dishes, search and filter them, add items to a cart, place an order
> and see their order history and profile. The **Admin module** has its own login
> and a dashboard where the admin can add, edit and delete products, update or
> delete orders, and manage users. All demo data is saved in `localStorage`, so
> the site works without any database. The CSS is the same stylesheet from my
> earlier HTML version, so the design is unchanged.

---

## 2. Why React + Vite?

| Question | Answer |
| --- | --- |
| Why React? | The UI is made of reusable components (`Header`, `FoodCard`, `FoodCard` is reused 66 times). Instead of editing the DOM by hand, I change the *state* and React updates the page. |
| Why Vite? | It is the modern build tool for React: instant dev server with hot reload (`npm run dev`) and an optimised production build (`npm run build`). |
| Was anything lost in the conversion? | No. Same CSS file, same 66 products, same pages, same flows — plus the new admin product editing. |

---

## 3. Core React concepts used (with file names)

| Concept | Where | What it does here |
| --- | --- | --- |
| **Component** | `src/components/*.jsx` | A function that returns JSX (HTML-like) markup. |
| **JSX** | everywhere | `className` instead of `class`, `{value}` to insert JavaScript. |
| **Props** | `FoodCard.jsx` (`food` prop), `Header.jsx` (`activePage`) | Passing data from parent to child. |
| **useState** | `Home.jsx` (`currentCategory`, `search`), `Cart.jsx` (`address`, `phone`, `payment`) | Memory of the component; changing it re-renders the page. |
| **useMemo** | `Home.jsx` | Only recompute the filtered product list when `foods`, `currentCategory` or `search` change. |
| **useEffect** | `AppContext.jsx`, `ScrollToTop.jsx` | Run code after render (listen for storage events, scroll to top). |
| **useContext** | `useApp()` in every page | Share cart / session / products without passing props down 5 levels. |
| **Conditional rendering** | `{cart.length === 0 ? <Empty/> : <Items/>}` | Show the empty-cart state or the items. |
| **List rendering + keys** | `foods.map(food => <FoodCard key={food.id} .../>)` | `key` helps React know which item changed. |
| **Event handling** | `onClick`, `onChange`, `onSubmit` | Replace the old `onclick="..."` HTML attributes. |
| **Forms** | `Login.jsx`, `Register.jsx` | "Controlled inputs": the input value lives in state, `onChange` updates it. |
| **Routing** | `App.jsx` | `BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`, `useNavigate`. |
| **Nested routes / layout** | `Layout.jsx` + `<Outlet />` | Header and footer are written once and wrap every page. |

---

## 4. Questions about the two modules

**Q: How are the Admin and User modules separated?**
> By the `role` field. `authService.login()` returns `isAdmin` when
> `session.role === 'admin'`. `App.jsx` wraps the dashboard route in
> `<AdminRoute>`, which redirects anyone else to `/admin/login`. So there are two
> entry points — `/login` for users and `/admin/login` for the admin — inside one
> React app.

**Q: How does the app know I am logged in after a refresh?**
> The session is saved in `localStorage["fx_session"]`. On start
> `AppContext` calls `getSession()` and puts it in state, so the header and the
> route guards already know the user.

**Q: What happens if a customer tries to open `/admin` directly?**
> `AdminRoute` checks `isAdmin`; it is false, so `<Navigate to="/admin/login" replace />`
> runs and the dashboard never renders.

**Q: How does an admin's product change show up on the customer home page?**
> Both read and write the same key `localStorage["fx_foods"]` through
> `productService`. `AppContext` keeps `foods` in state, so after `createFood()`
> or `updateFood()` the home page re-renders with the new list.

**Q: Why is there no real security?**
> It is a demo. A real system must never trust the browser: the server must hash
> passwords and check the role on every request. My optional `backend/` folder
> already does that with bcrypt + JWT; I keep the frontend in localStorage mode so
> the demo always runs, including on Vercel without a database.

---

## 5. Questions about state and data flow

**Q: Why did you need Context?**
> The cart badge in the header, the cart page and the checkout all need the cart.
> Passing it as props through every level would be tedious ("prop drilling"), so I
> put it in one `AppContext` and read it with `useApp()`.

**Q: What is the difference between state and localStorage?**
> `useState` is memory for the current render (lost on refresh).
> `localStorage` is permanent browser storage (survives refresh).
> The app keeps them in sync: services write to localStorage, then the context
> updates the state so the UI redraws.

**Q: What did you change from `script.js`?**
> The logic is the same, moved into pieces:
> `addToCart` → `cartService.addToCart`;
> `renderFoods` → `Home.jsx` with `.map()`;
> `updateHeader` → `Header.jsx` using `isLoggedIn`;
> `showToast` → `showToast()` in context + `ToastContainer.jsx`;
> `placeOrder` → `Cart.jsx` + `orderService.placeOrder`.

---

## 6. Questions about the code you can open live

1. `src/App.jsx` — "all routes, including the guards".
2. `src/context/AppContext.jsx` — "one place for session, cart, products, orders, toasts".
3. `src/services/authService.js` — "signup, login, forgot password, role check".
4. `src/pages/admin/AdminDashboard.jsx` — "the four admin sections".
5. `src/components/RouteGuards.jsx` — "user vs admin access".
6. `src/styles/style.css` — "the original CSS, not rewritten".

---

## 7. Showing the demo in 4 minutes

1. **Home** — search "biryani", click a category chip, add 2 items (cart badge counts up).
2. **Cart** — change quantity, remove an item, fill address, choose UPI, place order → success modal.
3. **Orders / Profile** — the order is listed; profile shows totals.
4. **Guard** — logout, open `/orders` → redirected to login.
5. **Admin** — go to `/admin/login`, log in with `admin@foodexpress.com / admin123`.
6. **Foods** — Add a dish ("Paneer Wrap", ₹149), Edit its price, Delete it.
7. **Orders** — change the order status to "Out for Delivery".
8. **Users** — show the registered customer.
9. **View Site** — the customer home page reflects the product changes.
10. Explain the flow: *page → context → service → localStorage → state → re-render*.

---

## 8. Likely "how would you improve it?" answers

* Replace localStorage with the Express + MongoDB API (`backend/`), hash passwords with bcrypt, protect admin routes with JWT on the server.
* Add a real payment gateway instead of the demo radio buttons.
* Add search debouncing, product images uploaded to a CDN, pagination for the admin tables.
* Add tests with React Testing Library.

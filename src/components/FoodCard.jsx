// FoodCard — the product tile on the home page.
// Same classes as before (.food-card, .food-img, ...) so style.css is unchanged.

import { useApp } from '../context/AppContext';

// Bundled in public/images/ so the card still looks right when a remote
// photo fails to load (e.g. no internet during the demo).
const FALLBACK_IMAGE = '/images/food-placeholder.jpg';

export default function FoodCard({ food }) {
  const { addToCart } = useApp();

  return (
    <div className="food-card">
      <div className="food-img">
        <img
          src={food.image}
          alt={food.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
        <span className="food-badge">{food.category}</span>
        <span className="food-rating">⭐ {food.rating}</span>
      </div>
      <div className="food-info">
        <h3>{food.name}</h3>
        <p className="food-desc">{food.desc}</p>
        <div className="food-foot">
          <div className="price">₹{food.price}</div>
          <button className="add-btn" onClick={() => addToCart(food)}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

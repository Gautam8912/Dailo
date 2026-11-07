// Home page — hero + categories + search + product grid.
// The filtering logic is the same as the old renderFoods() function, only now it
// is a normal React expression instead of innerHTML string building.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { categories } from '../data/foods';
import FoodCard from '../components/FoodCard';

export default function Home() {
  const { foods } = useApp();
  const [currentCategory, setCurrentCategory] = useState('All');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // useMemo = "only recalculate when foods / category / search change".
  const filteredFoods = useMemo(() => {
    let list = foods;

    if (currentCategory !== 'All') {
      list = list.filter((food) => food.category === currentCategory);
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (food) =>
          food.name.toLowerCase().includes(query) ||
          food.category.toLowerCase().includes(query) ||
          food.desc.toLowerCase().includes(query)
      );
    }
    return list;
  }, [foods, currentCategory, search]);

  function scrollToMenu() {
    document.getElementById('menuSection')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <div className="hero-content">
          <h1>
            Delicious Food,
            <br />
            <span>Delivered Fast</span> 🍔
          </h1>
          <p>
            Order your favorite food from Food Express. Fresh, hot and delivered in
            30-45 minutes to your doorstep. 100% satisfaction guaranteed!
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={scrollToMenu}>
              Order Now →
            </button>
            <button className="btn btn-light" onClick={scrollToMenu}>
              Explore Menu
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <b>500+</b>
              <span>Happy Customers</span>
            </div>
            <div className="stat">
              <b>4.8⭐</b>
              <span>Average Rating</span>
            </div>
            <div className="stat">
              <b>30min</b>
              <span>Fast Delivery</span>
            </div>
          </div>
        </div>

        <div className="hero-image">
          <div className="hero-img-wrap">
            <img
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80"
              alt="Delicious Food"
            />
            <div className="floating-card card-1">
              🍕 Pizza Delivered <span style={{ color: '#16a34a' }}>●</span>
            </div>
            <div className="floating-card card-2">⚡ 30 min delivery</div>
          </div>
        </div>
      </section>

      {/* ---------------- Menu ---------------- */}
      <section className="section" id="menuSection">
        <div className="section-head">
          <div>
            <h2>What's on your mind?</h2>
            <p>Choose from our wide range of delicious categories</p>
          </div>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search Pizza, Burger, Biryani, Momos..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="categories" id="categories">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`cat-btn ${currentCategory === category.id ? 'active' : ''}`}
              onClick={() => setCurrentCategory(category.id)}
            >
              <span>{category.icon}</span> {category.label}
            </button>
          ))}
        </div>

        <div className="food-grid" id="foodContainer">
          {filteredFoods.length === 0 ? (
            <div className="no-result">
              <h3>😕 No food items found</h3>
              <p>Try searching for Pizza, Burger, Biryani, Momos etc.</p>
            </div>
          ) : (
            filteredFoods.map((food) => <FoodCard key={food.id} food={food} />)
          )}
        </div>
      </section>

      {/* Small CTA so students can show the cart flow quickly. */}
      <div style={{ textAlign: 'center', padding: '0 5% 40px' }}>
        <button className="btn btn-outline" onClick={() => navigate('/cart')}>
          Go to Cart 🛒
        </button>
      </div>
    </>
  );
}

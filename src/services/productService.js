// Food Express — products (add / edit / delete used by the Admin module).
//
// The first time the site runs, localStorage has no products, so we copy the
// 66 demo dishes from src/data/foods.js into it. From then on the admin panel
// reads and writes that saved list.

import { seedFoods } from '../data/foods';
import { read, write, STORAGE_KEYS } from './storage';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600';

function load() {
  const saved = read(STORAGE_KEYS.foods, null);
  if (Array.isArray(saved) && saved.length > 0) return saved;
  // First run — seed the catalogue.
  const seeded = seedFoods.map((food) => ({ ...food }));
  write(STORAGE_KEYS.foods, seeded);
  return seeded;
}

function save(foods) {
  write(STORAGE_KEYS.foods, foods);
}

export const productService = {
  getAll() {
    return load();
  },

  getById(id) {
    return load().find((food) => String(food.id) === String(id)) || null;
  },

  /** Add a new dish. Returns the created product. */
  create({ name, price, desc, category, rating, image }) {
    const foods = load();
    const nextId = foods.reduce((max, food) => Math.max(max, Number(food.id) || 0), 0) + 1;
    const product = {
      id: nextId,
      name: name.trim(),
      category,
      price: Number(price),
      rating: Number(rating) || 4.5,
      desc: desc.trim(),
      image: image.trim() || FALLBACK_IMAGE,
    };
    save([product, ...foods]);
    return product;
  },

  /** Update an existing dish (same id, replaced fields). */
  update(id, changes) {
    const foods = load().map((food) =>
      String(food.id) === String(id)
        ? {
            ...food,
            ...changes,
            price: Number(changes.price ?? food.price),
            rating: Number(changes.rating ?? food.rating),
          }
        : food
    );
    save(foods);
  },

  remove(id) {
    save(load().filter((food) => String(food.id) !== String(id)));
  },
};

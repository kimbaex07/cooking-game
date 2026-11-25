// Sizzle & Serve — ingredients and recipes. Data only: what each ingredient
// needs (chop it, grill it, boil it, or use it as-is) and what each dish on
// the menu is made of. The world and the renderer both read from here, so a
// recipe change is one edit.

// An item is { id, prep }: prep is 'ready' for things used as-is, 'raw' for
// things that need work, 'chopped' / 'cooked' once worked, 'burnt' when left
// too long on the heat (only good for the trash).
export const INGREDIENTS = {
  bun: { name: 'Bun', prep: 'ready', color: '#e8a94e' },
  patty: { name: 'Patty', prep: 'raw', cook: 'grill', color: '#d96a6a' },
  lettuce: { name: 'Lettuce', prep: 'raw', chop: true, color: '#7cc24a' },
  tomato: { name: 'Tomato', prep: 'raw', chop: true, color: '#e0483e' },
  cheese: { name: 'Cheese', prep: 'ready', color: '#f2c14e' },
  onion: { name: 'Onion', prep: 'raw', chop: true, color: '#e8d8f0' },
  pasta: { name: 'Pasta', prep: 'raw', cook: 'pot', color: '#f2d06b' },
};

// A recipe is a list of { id, prep } the finished plate must hold, in any
// order. 'minLevel' gates the fancier dishes until the shift heats up.
export const RECIPES = [
  {
    id: 'burger',
    name: 'Sunny Burger',
    minLevel: 1,
    items: [
      { id: 'bun', prep: 'ready' },
      { id: 'patty', prep: 'cooked' },
      { id: 'lettuce', prep: 'chopped' },
      { id: 'cheese', prep: 'ready' },
    ],
  },
  {
    id: 'salad',
    name: 'Garden Salad',
    minLevel: 1,
    items: [
      { id: 'lettuce', prep: 'chopped' },
      { id: 'tomato', prep: 'chopped' },
      { id: 'onion', prep: 'chopped' },
    ],
  },
  {
    id: 'pasta',
    name: 'Sunset Pasta',
    minLevel: 1,
    items: [
      { id: 'pasta', prep: 'cooked' },
      { id: 'tomato', prep: 'chopped' },
      { id: 'cheese', prep: 'ready' },
    ],
  },
  {
    id: 'deluxe',
    name: 'Deluxe Stack',
    minLevel: 2,
    items: [
      { id: 'bun', prep: 'ready' },
      { id: 'patty', prep: 'cooked' },
      { id: 'cheese', prep: 'ready' },
      { id: 'tomato', prep: 'chopped' },
      { id: 'onion', prep: 'chopped' },
    ],
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) ?? null;
}

// Recipes the kitchen may be asked for at this level.
export function availableRecipes(level) {
  return RECIPES.filter((r) => r.minLevel <= level);
}

// Do the plate's items match the recipe, item for item, in any order?
export function plateMatchesRecipe(items, recipe) {
  if (items.length !== recipe.items.length) return false;
  const left = items.map((it) => `${it.id}:${it.prep}`);
  for (const need of recipe.items) {
    const key = `${need.id}:${need.prep}`;
    const at = left.indexOf(key);
    if (at === -1) return false;
    left.splice(at, 1);
  }
  return true;
}

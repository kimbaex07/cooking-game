// Sizzle & Serve — the kitchen itself: orders, the chef, the stations and the
// scoring. The renderer only reads this state; the input layer and the
// screenshot autopilot both drive it through the same functions (clickAt,
// interactWith, liftPlate), so a staged screenshot plays the real rules.
import {
  BINS, BIN_H, BIN_W, BIN_Y, CHEF_BOUNDS, CHEF_RADIUS, CHEF_SPEED,
  CHOP_SECONDS, GRILL_BURN_SECONDS, GRILL_COOK_SECONDS, GRILL_SLOTS,
  INTERACT_RANGE, MAX_ORDERS, PATIENCE, PLATE_SPOTS, POT_BURN_SECONDS,
  POT_COOK_SECONDS, SCORE, SERVE_TARGET, SPAWN, START_HEARTS, STATIONS,
} from './config.js';
import { INGREDIENTS, availableRecipes, plateMatchesRecipe, recipeById } from './recipes.js';
import { createRandom, pick } from './random.js';

export const EVENT_PICKUP = 'pickup';
export const EVENT_PUTDOWN = 'putdown';
export const EVENT_CHOP = 'chop';
export const EVENT_CHOP_DONE = 'chopDone';
export const EVENT_SIZZLE = 'sizzle';
export const EVENT_COOKED = 'cooked';
export const EVENT_BURNT = 'burnt';
export const EVENT_PLATE = 'plate';
export const EVENT_LIFT = 'lift';
export const EVENT_TRASH = 'trash';
export const EVENT_SERVED = 'served';
export const EVENT_WRONG = 'wrong';
export const EVENT_EXPIRED = 'expired';
export const EVENT_LEVEL_UP = 'levelUp';
export const EVENT_WIN = 'win';
export const EVENT_GAME_OVER = 'gameOver';
export const EVENT_TICK = 'tick';
export const EVENT_HANDS_FULL = 'handsFull';
export const EVENT_BUSY = 'busy';
export const EVENT_EMPTY = 'empty';
export const EVENT_NO_PLATE = 'noPlate';

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export function patienceFor(level) {
  return Math.max(PATIENCE.min, PATIENCE.base + PATIENCE.perLevel * (level - 1));
}

export function spawnIntervalFor(level) {
  return Math.max(SPAWN.min, SPAWN.base + SPAWN.perLevel * (level - 1));
}

export function maxOrdersFor(level) {
  return level >= 3 ? MAX_ORDERS.level3 : MAX_ORDERS.base;
}

export function levelFor(served) {
  return 1 + Math.floor(served / 4);
}

export function createWorld(seed) {
  const rng = createRandom(seed);
  return {
    seed,
    rng,
    time: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hearts: START_HEARTS,
    level: 1,
    served: 0,
    serveTarget: SERVE_TARGET,
    orders: [],
    orderSeq: 0,
    spawnT: 1.5,
    chef: {
      x: 640, y: 640, tx: 640, ty: 640, hasTarget: false,
      pendingInteract: null, carrying: null, face: 1, walkT: 0, moving: false,
    },
    chop: { item: null, t: 0, done: false },
    grill: [
      { item: null, t: 0, cooked: false, burnt: false },
      { item: null, t: 0, cooked: false, burnt: false },
    ],
    pot: { item: null, t: 0, cooked: false, burnt: false },
    plates: [{ items: [] }, { items: [] }],
    popups: [],
    sizzleT: 0,
    tickT: 0,
    over: false,
    won: false,
    finalStats: null,
  };
}

// The station whose rect (or bin) holds this point, for mouse clicks.
export function stationAtPoint(x, y) {
  for (const bin of BINS) {
    if (x >= bin.x && x <= bin.x + BIN_W && y >= BIN_Y && y <= BIN_Y + BIN_H) {
      return `bin:${bin.id}`;
    }
  }
  for (const [id, s] of Object.entries(STATIONS)) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return id;
  }
  return null;
}

// The station the chef can reach from where they stand, for the E key.
export function nearestStation(state) {
  const { x, y } = state.chef;
  let bestId = null;
  let bestD = INTERACT_RANGE;
  const consider = (id, px, py) => {
    const d = Math.hypot(px - x, py - y);
    if (d < bestD) { bestD = d; bestId = id; }
  };
  for (const bin of BINS) consider(`bin:${bin.id}`, bin.x + BIN_W / 2, BIN_Y + BIN_H + 6);
  for (const [id, s] of Object.entries(STATIONS)) consider(id, s.stand.x, s.stand.y);
  return bestId;
}

export function stationStand(id) {
  if (id.startsWith('bin:')) {
    const bin = BINS.find((b) => b.id === id.slice(4));
    return { x: bin.x + BIN_W / 2, y: BIN_Y + BIN_H + 14 };
  }
  return { x: STATIONS[id].stand.x, y: STATIONS[id].stand.y };
}

// A click: on a station it walks the chef there and uses it on arrival; on
// the floor it just walks there.
export function clickAt(state, x, y) {
  const chef = state.chef;
  const id = stationAtPoint(x, y);
  if (id) {
    const stand = stationStand(id);
    chef.tx = stand.x;
    chef.ty = stand.y;
    chef.hasTarget = true;
    chef.pendingInteract = id;
  } else {
    chef.tx = clamp(x, CHEF_BOUNDS.x0, CHEF_BOUNDS.x1);
    chef.ty = clamp(y, CHEF_BOUNDS.y0, CHEF_BOUNDS.y1);
    chef.hasTarget = true;
    chef.pendingInteract = null;
  }
}

function spawnOrder(state) {
  const recipes = availableRecipes(state.level);
  let recipe = pick(state.rng, recipes);
  // Avoid serving the same dish twice in a row when there is a choice.
  if (recipes.length > 1 && state.orders.length > 0) {
    const lastId = state.orders[state.orders.length - 1].recipeId;
    let guard = 0;
    while (recipe.id === lastId && guard < 6) {
      recipe = pick(state.rng, recipes);
      guard += 1;
    }
  }
  const patience = patienceFor(state.level);
  state.orders.push({
    id: state.orderSeq + 1,
    recipeId: recipe.id,
    patience,
    max: patience,
  });
  state.orderSeq += 1;
}

function addPopup(state, x, y, text, color) {
  state.popups.push({ x, y, text, color: color ?? '#f2c14e', t: 0, ttl: 1.4 });
}

function loseHeart(state, events) {
  state.hearts -= 1;
  state.combo = 0;
  if (state.hearts <= 0) {
    state.over = true;
    state.finalStats = {
      score: state.score, served: state.served,
      time: state.time, bestCombo: state.bestCombo,
    };
    events.push(EVENT_GAME_OVER);
  }
}

// Use a station. Returns the list of events it caused (possibly empty) for
// sound/feedback; the caller appends them to the step's events.
export function interactWith(state, id) {
  const chef = state.chef;
  const carrying = chef.carrying;
  const events = [];

  if (id.startsWith('bin:')) {
    const ingId = id.slice(4);
    if (carrying) return [EVENT_HANDS_FULL];
    chef.carrying = { id: ingId, prep: INGREDIENTS[ingId].prep };
    return [EVENT_PICKUP];
  }

  if (id === 'chop') {
    const board = state.chop;
    if (!board.item) {
      if (!carrying || !INGREDIENTS[carrying.id].chop || carrying.prep !== 'raw') {
        return carrying ? [EVENT_BUSY] : [EVENT_EMPTY];
      }
      board.item = carrying;
      board.t = 0;
      board.done = false;
      chef.carrying = null;
      return [EVENT_CHOP];
    }
    if (board.done) {
      if (carrying) return [EVENT_HANDS_FULL];
      chef.carrying = { id: board.item.id, prep: 'chopped' };
      board.item = null;
      board.t = 0;
      board.done = false;
      return [EVENT_PICKUP];
    }
    return [EVENT_BUSY];
  }

  if (id === 'grill') {
    if (carrying && carrying.id === 'patty' && carrying.prep === 'raw') {
      const slot = state.grill.find((s) => !s.item);
      if (!slot) return [EVENT_BUSY];
      slot.item = carrying;
      slot.t = 0;
      slot.cooked = false;
      slot.burnt = false;
      chef.carrying = null;
      return [EVENT_SIZZLE];
    }
    if (!carrying) {
      const slot = state.grill.find((s) => s.item && (s.cooked || s.burnt));
      if (!slot) return [EVENT_EMPTY];
      chef.carrying = { id: 'patty', prep: slot.burnt ? 'burnt' : 'cooked' };
      slot.item = null;
      slot.t = 0;
      slot.cooked = false;
      slot.burnt = false;
      return [EVENT_PICKUP];
    }
    return [EVENT_BUSY];
  }

  if (id === 'pot') {
    if (carrying && carrying.id === 'pasta' && carrying.prep === 'raw') {
      if (state.pot.item) return [EVENT_BUSY];
      state.pot.item = carrying;
      state.pot.t = 0;
      state.pot.cooked = false;
      state.pot.burnt = false;
      chef.carrying = null;
      return [EVENT_SIZZLE];
    }
    if (!carrying) {
      if (!state.pot.item || (!state.pot.cooked && !state.pot.burnt)) return [EVENT_EMPTY];
      chef.carrying = { id: 'pasta', prep: state.pot.burnt ? 'burnt' : 'cooked' };
      state.pot.item = null;
      state.pot.t = 0;
      state.pot.cooked = false;
      state.pot.burnt = false;
      return [EVENT_PICKUP];
    }
    return [EVENT_BUSY];
  }

  if (id === 'plate0' || id === 'plate1') {
    const plate = state.plates[id === 'plate0' ? 0 : 1];
    if (carrying && carrying.id === 'plate') {
      if (plate.items.length > 0) return [EVENT_BUSY];
      plate.items = carrying.items;
      chef.carrying = null;
      return [EVENT_PUTDOWN];
    }
    if (carrying) {
      if (carrying.prep === 'burnt') return [EVENT_BUSY];
      if (plate.items.length >= 5) return [EVENT_BUSY];
      plate.items.push(carrying);
      chef.carrying = null;
      return [EVENT_PLATE];
    }
    if (plate.items.length > 0) {
      chef.carrying = plate.items.pop();
      return [EVENT_PICKUP];
    }
    return [EVENT_EMPTY];
  }

  if (id === 'trash') {
    if (!carrying) return [EVENT_EMPTY];
    chef.carrying = null;
    return [EVENT_TRASH];
  }

  if (id === 'serve') {
    if (!carrying || carrying.id !== 'plate') return [EVENT_NO_PLATE];
    const plate = carrying;
    const match = state.orders.find((o) => plateMatchesRecipe(plate.items, recipeById(o.recipeId)));
    if (!match) {
      chef.carrying = null;
      addPopup(state, STATIONS.serve.stand.x, STATIONS.serve.y - 40, 'WRONG DISH!', '#e0483e');
      loseHeart(state, events);
      events.push(EVENT_WRONG);
      return events;
    }
    const frac = Math.max(0, match.patience / match.max);
    const gained = SCORE.base + Math.round(SCORE.patienceBonus * frac) + state.combo * SCORE.comboStep;
    state.score += gained;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.served += 1;
    state.orders.splice(state.orders.indexOf(match), 1);
    chef.carrying = null;
    addPopup(state, STATIONS.serve.stand.x, STATIONS.serve.y - 40, `+${gained}`, '#58b368');
    const newLevel = levelFor(state.served);
    if (state.served >= SERVE_TARGET) {
      state.won = true;
      state.finalStats = {
        score: state.score, served: state.served,
        time: state.time, bestCombo: state.bestCombo,
      };
      events.push(EVENT_WIN);
      return events;
    }
    if (newLevel > state.level) {
      state.level = newLevel;
      events.push(EVENT_SERVED, EVENT_LEVEL_UP);
      return events;
    }
    events.push(EVENT_SERVED);
    return events;
  }

  return events;
}

// Lift a finished plate off the assembly counter to carry it to the window.
// (Q key; kept separate from E so taking one ingredient back off a plate
// stays possible with E.)
export function liftPlate(state, plateIdx) {
  const chef = state.chef;
  const plate = state.plates[plateIdx];
  if (chef.carrying) return [EVENT_HANDS_FULL];
  if (plate.items.length === 0) return [EVENT_EMPTY];
  chef.carrying = { id: 'plate', items: plate.items };
  plate.items = [];
  return [EVENT_LIFT];
}

function updateCooking(state, dt, events) {
  const board = state.chop;
  if (board.item && !board.done) {
    board.t += dt;
    if (board.t >= CHOP_SECONDS) {
      board.done = true;
      events.push(EVENT_CHOP_DONE);
    }
  }
  for (const slot of state.grill) {
    if (!slot.item) continue;
    slot.t += dt;
    if (!slot.cooked && slot.t >= GRILL_COOK_SECONDS) {
      slot.cooked = true;
      events.push(EVENT_COOKED);
    }
    if (!slot.burnt && slot.t >= GRILL_BURN_SECONDS) {
      slot.burnt = true;
      events.push(EVENT_BURNT);
    }
  }
  const pot = state.pot;
  if (pot.item) {
    pot.t += dt;
    if (!pot.cooked && pot.t >= POT_COOK_SECONDS) {
      pot.cooked = true;
      events.push(EVENT_COOKED);
    }
    if (!pot.burnt && pot.t >= POT_BURN_SECONDS) {
      pot.burnt = true;
      events.push(EVENT_BURNT);
    }
  }
  const somethingCooking =
    state.grill.some((s) => s.item && !s.burnt) || (pot.item && !pot.burnt);
  if (somethingCooking) {
    state.sizzleT -= dt;
    if (state.sizzleT <= 0) {
      state.sizzleT = 0.55;
      events.push(EVENT_SIZZLE);
    }
  }
}

function updateOrders(state, dt, events) {
  state.spawnT -= dt;
  if (state.spawnT <= 0 && state.orders.length < maxOrdersFor(state.level)) {
    spawnOrder(state);
    state.spawnT = spawnIntervalFor(state.level);
  }
  let urgent = false;
  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const order = state.orders[i];
    order.patience -= dt;
    if (order.patience < 10) urgent = true;
    if (order.patience <= 0) {
      const recipe = recipeById(order.recipeId);
      state.orders.splice(i, 1);
      addPopup(state, 640, 150, `${recipe.name} walked out!`, '#e0483e');
      events.push(EVENT_EXPIRED);
      loseHeart(state, events);
      if (state.over) return;
    }
  }
  if (urgent) {
    state.tickT -= dt;
    if (state.tickT <= 0) {
      state.tickT = 1;
      events.push(EVENT_TICK);
    }
  }
}

function moveChef(state, input, dt) {
  const chef = state.chef;
  let dx = 0;
  let dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (dx !== 0 || dy !== 0) {
    // Keyboard steering beats a click target.
    chef.hasTarget = false;
    chef.pendingInteract = null;
    const len = Math.hypot(dx, dy);
    chef.x += (dx / len) * CHEF_SPEED * dt;
    chef.y += (dy / len) * CHEF_SPEED * dt;
    chef.face = dx !== 0 ? Math.sign(dx) : chef.face;
    chef.moving = true;
    chef.walkT += dt * 10;
  } else if (chef.hasTarget) {
    const ddx = chef.tx - chef.x;
    const ddy = chef.ty - chef.y;
    const dist = Math.hypot(ddx, ddy);
    if (dist < 8) {
      chef.x = chef.tx;
      chef.y = chef.ty;
      chef.hasTarget = false;
      chef.moving = false;
      if (chef.pendingInteract) {
        const id = chef.pendingInteract;
        chef.pendingInteract = null;
        return id;
      }
    } else {
      chef.x += (ddx / dist) * CHEF_SPEED * dt;
      chef.y += (ddy / dist) * CHEF_SPEED * dt;
      chef.face = ddx !== 0 ? Math.sign(ddx) : chef.face;
      chef.moving = true;
      chef.walkT += dt * 10;
    }
  } else {
    chef.moving = false;
  }
  chef.x = clamp(chef.x, CHEF_BOUNDS.x0, CHEF_BOUNDS.x1);
  chef.y = clamp(chef.y, CHEF_BOUNDS.y0, CHEF_BOUNDS.y1);
  return null;
}

export function updateWorld(state, input, dt) {
  const events = [];
  if (state.over || state.won) return events;
  state.time += dt;

  // Mouse: a click walks the chef (and uses a station on arrival).
  if (input.click) clickAt(state, input.click.x, input.click.y);
  // E: use the nearest station in reach.
  if (input.interact) {
    const id = nearestStation(state);
    if (id) events.push(...interactWith(state, id));
  }
  // Q: lift the plate off the nearest assembly spot.
  if (input.lift) {
    let plateIdx = -1;
    let bestD = INTERACT_RANGE;
    for (let i = 0; i < PLATE_SPOTS.length; i += 1) {
      const d = Math.hypot(PLATE_SPOTS[i].x - state.chef.x, PLATE_SPOTS[i].y - state.chef.y);
      if (d < bestD) { bestD = d; plateIdx = i; }
    }
    if (plateIdx !== -1) events.push(...liftPlate(state, plateIdx));
  }

  const arrived = moveChef(state, input, dt);
  if (arrived) events.push(...interactWith(state, arrived));

  updateCooking(state, dt, events);
  updateOrders(state, dt, events);

  for (let i = state.popups.length - 1; i >= 0; i -= 1) {
    const p = state.popups[i];
    p.t += dt;
    if (p.t >= p.ttl) state.popups.splice(i, 1);
  }
  return events;
}

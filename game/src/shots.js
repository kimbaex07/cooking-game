// Sizzle & Serve — the staged scenes behind ?shot=start|play|end. Each scene
// plays the real rules forward from a fresh world for a fixed script of
// tasks, driven through the same click/interact functions a player uses, so
// the frame is what a short game really looks like and the same seed always
// gives the same frame. The end scene serves orders for real; if the chef
// runs out of hearts on the way, the win screen is staged from a finished
// shift instead.
import { STEP } from './config.js';
import { INGREDIENTS, recipeById } from './recipes.js';
import {
  createWorld, interactWith, liftPlate, stationStand, updateWorld,
} from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const IDLE_INPUT = {
  up: false, down: false, left: false, right: false, interact: false,
  lift: false, confirm: false, pause: false, retry: false, mute: false,
  click: null,
};

function freshInput() {
  return { ...IDLE_INPUT };
}

// One task in the autopilot script: tick() returns true when it is done.
function goTo(stationId) {
  let started = false;
  return {
    timeout: 20,
    tick(world) {
      const chef = world.chef;
      if (!started) {
        const stand = stationStand(stationId);
        chef.tx = stand.x;
        chef.ty = stand.y;
        chef.hasTarget = true;
        chef.pendingInteract = null;
        started = true;
      }
      return !chef.hasTarget;
    },
  };
}

function use(stationId) {
  let started = false;
  let acted = false;
  return {
    timeout: 20,
    tick(world) {
      const chef = world.chef;
      if (!started) {
        const stand = stationStand(stationId);
        chef.tx = stand.x;
        chef.ty = stand.y;
        chef.hasTarget = true;
        chef.pendingInteract = null;
        started = true;
      }
      if (!chef.hasTarget && !acted) {
        interactWith(world, stationId);
        acted = true;
      }
      return acted;
    },
  };
}

function lift(plateIdx) {
  let acted = false;
  return {
    timeout: 10,
    tick(world) {
      if (!acted) {
        liftPlate(world, plateIdx);
        acted = true;
      }
      return acted;
    },
  };
}

function waitUntil(fn, timeout = 15) {
  return { timeout, tick: (world) => fn(world) };
}

function wait(seconds) {
  let t = 0;
  return {
    timeout: seconds + 5,
    tick() {
      t += STEP;
      return t >= seconds;
    },
  };
}

// Runs tasks in order, stepping the real world at 60 Hz. Returns true when
// every task finished (a task that times out is skipped, not retried).
function runTasks(world, tasks, maxSeconds) {
  const steps = Math.floor(maxSeconds / STEP);
  const input = freshInput();
  let ti = 0;
  let taskT = 0;
  for (let i = 0; i < steps; i += 1) {
    if (world.over || world.won) break;
    if (ti >= tasks.length) break;
    const task = tasks[ti];
    taskT += STEP;
    const done = task.tick(world, input);
    updateWorld(world, input, STEP);
    if (done || taskT > (task.timeout ?? 30)) {
      ti += 1;
      taskT = 0;
    }
  }
  return ti >= tasks.length;
}

// Steps the world with no input at all: orders arrive, the chef waits by the
// pass. Used to let the ticket rail fill up before a scene starts.
export function idleWorld(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  const input = freshInput();
  for (let i = 0; i < steps; i += 1) {
    updateWorld(world, input, STEP);
    if (world.over || world.won) break;
  }
}

// Tasks that fetch one recipe ingredient, prepared, into the chef's hands.
function acquireTasks(ingId) {
  const ing = INGREDIENTS[ingId];
  if (ingId === 'patty') {
    return [
      use('bin:patty'), use('grill'),
      waitUntil((w) => w.grill.some((s) => s.item && s.cooked && !s.burnt), 14),
      use('grill'),
    ];
  }
  if (ingId === 'pasta') {
    return [
      use('bin:pasta'), use('pot'),
      waitUntil((w) => w.pot.item && w.pot.cooked && !w.pot.burnt, 16),
      use('pot'),
    ];
  }
  if (ing.chop) {
    return [
      use(`bin:${ingId}`), use('chop'),
      waitUntil((w) => w.chop.done, 10),
      use('chop'),
    ];
  }
  return [use(`bin:${ingId}`)];
}

// Tasks that put one ingredient onto a station to start its prep (the chef's
// hands come back empty, so other work can happen while it cooks or chops).
// Returns null when that station is already busy in this plan.
function startPrepTasks(ingId, started) {
  const ing = INGREDIENTS[ingId];
  if (ingId === 'patty' && started.grill < 2) {
    started.grill += 1;
    return [use('bin:patty'), use('grill')];
  }
  if (ingId === 'pasta' && started.pot < 1) {
    started.pot += 1;
    return [use('bin:pasta'), use('pot')];
  }
  if (ing.chop && started.chop < 1) {
    started.chop += 1;
    return [use(`bin:${ingId}`), use('chop')];
  }
  return null;
}

// Tasks that collect one started prep off its station and put it on plate0.
function collectTasks(ingId) {
  if (ingId === 'patty') {
    return [
      waitUntil((w) => w.grill.some((s) => s.item && s.cooked && !s.burnt), 14),
      use('grill'), use('plate0'),
    ];
  }
  if (ingId === 'pasta') {
    return [
      waitUntil((w) => w.pot.item && w.pot.cooked && !w.pot.burnt, 16),
      use('pot'), use('plate0'),
    ];
  }
  return [waitUntil((w) => w.chop.done, 10), use('chop'), use('plate0')];
}

// Tasks that cook one whole order and serve it at the window. Like a real
// cook, the chef starts everything that can run on its own first (a patty on
// the grill, a veggie on the board), plates the ready items while they cook,
// and only then collects the finished prep — so the waiting happens while
// the chef is busy elsewhere instead of standing at the stove.
function serveTasks(order) {
  const recipe = recipeById(order.recipeId);
  const tasks = [];
  const started = { grill: 0, pot: 0, chop: 0 };
  const cooking = [];
  const deferred = [];
  for (const item of recipe.items) {
    const startedTasks = startPrepTasks(item.id, started);
    if (startedTasks) {
      tasks.push(...startedTasks);
      cooking.push(item.id);
    } else if (INGREDIENTS[item.id].prep === 'ready') {
      tasks.push(use(`bin:${item.id}`), use('plate0'));
    } else {
      deferred.push(item.id);
    }
  }
  for (const id of cooking) tasks.push(...collectTasks(id));
  for (const id of deferred) tasks.push(...acquireTasks(id), use('plate0'));
  tasks.push(goTo('plate0'), lift(0), goTo('serve'), use('serve'));
  return tasks;
}

export function stageShot(shot, seed) {
  if (shot === 'start') {
    // Cover: the title card over a live kitchen — two tickets on the board,
    // a burger already taking shape on the first plate.
    const world = createWorld(seed);
    idleWorld(world, 12);
    const order = world.orders[0];
    if (order) {
      const recipe = recipeById(order.recipeId);
      const tasks = [];
      const first = recipe.items.slice(0, 2);
      for (const item of first) tasks.push(...acquireTasks(item.id), use('plate0'));
      tasks.push(goTo('plate0'));
      runTasks(world, tasks, 90);
    }
    return { screen: SCREEN_TITLE, world, finalStats: null };
  }
  if (shot === 'play') {
    // A dish mid-assembly: three tickets ticking, a plate with most of a
    // dish on it, a patty on the grill and a tomato on the board.
    const world = createWorld(seed);
    idleWorld(world, 30);
    const order = world.orders[0];
    if (order) {
      const recipe = recipeById(order.recipeId);
      const tasks = [];
      const main = recipe.items.slice(0, Math.max(1, recipe.items.length - 1));
      for (const item of main) tasks.push(...acquireTasks(item.id), use('plate0'));
      // Leave one more thing cooking for the frame.
      tasks.push(use('bin:patty'), use('grill'));
      const last = recipe.items[recipe.items.length - 1];
      if (INGREDIENTS[last.id].chop) tasks.push(use(`bin:${last.id}`), use('chop'));
      runTasks(world, tasks, 150);
    }
    return { screen: SCREEN_PLAY, world, finalStats: null };
  }
  // end: serve orders for real until the shift is done; fall back to a
  // finished shift if the chef runs out of hearts along the way.
  const world = createWorld(seed);
  const cap = 420;
  while (!world.won && !world.over && world.time < cap) {
    if (world.orders.length === 0) {
      idleWorld(world, 4);
      continue;
    }
    const before = world.served;
    runTasks(world, serveTasks(world.orders[0]), 120);
    if (world.served === before && world.orders.length > 0) {
      // A serve stalled (burnt food, a missed step): drop the oldest ticket
      // so the shift can move on instead of looping on it forever.
      world.orders.shift();
    }
  }
  if (world.won) {
    return {
      screen: SCREEN_WIN,
      world,
      finalStats: world.finalStats,
    };
  }
  // Fallback: a shift already finished — 12 orders out, two hearts left.
  const staged = createWorld(seed);
  staged.served = 12;
  staged.score = 2840;
  staged.hearts = 2;
  staged.combo = 0;
  staged.bestCombo = 5;
  staged.time = 386;
  staged.level = 4;
  staged.won = true;
  staged.finalStats = { score: 2840, served: 12, time: 386, bestCombo: 5 };
  return { screen: SCREEN_WIN, world: staged, finalStats: staged.finalStats };
}

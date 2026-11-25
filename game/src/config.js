// Sizzle & Serve — shared constants: canvas size, kitchen layout, tuning,
// palette and key bindings. Nothing here draws or updates; every other module
// reads its numbers from here so tuning lives in one place.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 56;
export const BOARD_TOP = 56;
export const BOARD_H = 104;
export const STEP = 1 / 60;
export const BEST_KEY = 'sizzle-and-serve-best';

// The shift: serve this many orders to finish the shift and win.
export const SERVE_TARGET = 12;
export const START_HEARTS = 3;
export const CHEF_SPEED = 265;
export const CHEF_RADIUS = 17;

// Patience (seconds) an order waits before the customer walks out.
export const PATIENCE = { base: 52, perLevel: -3, min: 32 };
// Seconds between new orders arriving.
export const SPAWN = { base: 14, perLevel: -0.8, min: 8.5 };
export const MAX_ORDERS = { base: 3, level3: 4 };

// Prep times (seconds).
export const CHOP_SECONDS = 2.5;
export const GRILL_COOK_SECONDS = 4;
export const GRILL_BURN_SECONDS = 9;
export const POT_COOK_SECONDS = 5;
export const POT_BURN_SECONDS = 11;

// Scoring: a served dish pays a base plus up to this much for patience left,
// plus 10 per combo step.
export const SCORE = { base: 100, patienceBonus: 100, comboStep: 10 };

// How close the chef must be to a station's standing spot to use it.
export const INTERACT_RANGE = 120;

// Ingredient bins along the top counter (left to right).
export const BINS = [
  { id: 'bun', x: 48 },
  { id: 'patty', x: 216 },
  { id: 'lettuce', x: 384 },
  { id: 'tomato', x: 552 },
  { id: 'cheese', x: 720 },
  { id: 'onion', x: 888 },
  { id: 'pasta', x: 1056 },
];
export const BIN_Y = 168;
export const BIN_W = 156;
export const BIN_H = 82;

// Stations: rect is what is drawn and clicked; stand is where the chef stops.
export const STATIONS = {
  chop: { x: 60, y: 288, w: 240, h: 108, stand: { x: 180, y: 428 } },
  grill: { x: 340, y: 288, w: 360, h: 108, stand: { x: 520, y: 428 } },
  pot: { x: 740, y: 288, w: 240, h: 108, stand: { x: 860, y: 428 } },
  trash: { x: 1020, y: 288, w: 180, h: 108, stand: { x: 1110, y: 428 } },
  plate0: { x: 60, y: 440, w: 260, h: 128, stand: { x: 190, y: 600 } },
  plate1: { x: 340, y: 440, w: 260, h: 128, stand: { x: 470, y: 600 } },
  serve: { x: 660, y: 440, w: 560, h: 128, stand: { x: 940, y: 600 } },
};
// Where the two plates sit (centres) on the assembly counter.
export const PLATE_SPOTS = [
  { x: 190, y: 504 },
  { x: 470, y: 504 },
];
// Grill slots (centres) and the pot's centre.
export const GRILL_SLOTS = [
  { x: 440, y: 342 },
  { x: 600, y: 342 },
];
export const POT_SPOT = { x: 860, y: 342 };
export const CHOP_SPOT = { x: 180, y: 342 };

export const CHEF_BOUNDS = { x0: 24, x1: 1256, y0: 252, y1: 700 };

export const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  interact: ['KeyE'],
  lift: ['KeyQ'],
  confirm: ['Enter', 'Space'],
  pause: ['KeyP', 'Escape'],
  retry: ['KeyR'],
  mute: ['KeyM'],
};

// Warm diner-kitchen palette: cream tile, terracotta floor, steel counters,
// wood boards, paper order tickets.
export const PAL = {
  wall: '#f3e3c2',
  wallDark: '#e8d3a8',
  floor: '#c96f4a',
  floorDark: '#b25a38',
  floorLine: '#a34e30',
  steel: '#b9c4cc',
  steelDark: '#8d9aa5',
  steelLight: '#d7dee3',
  wood: '#c89b6a',
  woodDark: '#a67c4e',
  board: '#7a5230',
  boardDark: '#5f3d22',
  ticket: '#fff8e6',
  ticketEdge: '#e0cfa8',
  ink: '#3a2a1a',
  inkSoft: '#6b543a',
  text: '#2e2113',
  textLight: '#fff6e0',
  danger: '#e0483e',
  warn: '#f2a541',
  safe: '#58b368',
  gold: '#f2c14e',
  cream: '#fff3d6',
  chefWhite: '#f7f4ec',
  chefHat: '#ffffff',
  apron: '#3e6fb0',
  skin: '#f2c09a',
  hair: '#4a3220',
  shadow: 'rgba(60, 30, 10, 0.25)',
};

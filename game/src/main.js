// Sizzle & Serve — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between five screens:
// title, play, paused, game over and shift complete. The best score is kept
// in localStorage.
//
// ?seed=N fixes the order timing. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_BURNT, EVENT_CHOP, EVENT_CHOP_DONE, EVENT_COOKED, EVENT_EXPIRED,
  EVENT_GAME_OVER, EVENT_HANDS_FULL, EVENT_LEVEL_UP, EVENT_LIFT,
  EVENT_PICKUP, EVENT_PLATE, EVENT_PUTDOWN, EVENT_SERVED, EVENT_SIZZLE,
  EVENT_TICK, EVENT_TRASH, EVENT_WIN, EVENT_WRONG, createWorld,
  nearestStation, updateWorld,
} from './world.js';
import { createInput } from './input.js';
import { isMuted, sfx, toggleMute, unlockAudio } from './audio.js';
import {
  SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);
void rng;
let world = createWorld(seed);
const renderer = createRenderer(canvas);
const input = createInput(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

let best = readBest();
let screen = SCREEN_TITLE;
let finalStats = null;
let muted = isMuted();

function setStatus(text) {
  if (status) status.textContent = text;
}

function startShift() {
  world = createWorld(seed);
  world.best = best;
  finalStats = null;
  screen = SCREEN_PLAY;
  setStatus('The lunch rush is on. Read the tickets, cook, serve!');
  sfx.click();
}

function finishShift(won) {
  finalStats = world.finalStats ?? {
    score: world.score, served: world.served,
    time: world.time, bestCombo: world.bestCombo,
  };
  if (world.score > best) {
    best = world.score;
    saveBest(best);
  }
  world.best = best;
  screen = won ? SCREEN_WIN : SCREEN_OVER;
  setStatus(won
    ? `Shift complete! Score ${world.score}, ${world.served} orders served.`
    : `Shift over. Score ${world.score}. Press R to try again.`);
  if (won) sfx.win();
  else sfx.gameOver();
}

function handleEvents(events) {
  for (const event of events) {
    if (event === EVENT_PICKUP) sfx.pickup();
    else if (event === EVENT_PUTDOWN) sfx.putDown();
    else if (event === EVENT_CHOP) sfx.chop();
    else if (event === EVENT_CHOP_DONE) sfx.chopDone();
    else if (event === EVENT_SIZZLE) sfx.sizzle();
    else if (event === EVENT_COOKED) sfx.flip();
    else if (event === EVENT_BURNT) sfx.wrong();
    else if (event === EVENT_PLATE) sfx.plate();
    else if (event === EVENT_LIFT) sfx.pickup();
    else if (event === EVENT_TRASH) sfx.putDown();
    else if (event === EVENT_SERVED) { sfx.serve(); sfx.bell(); }
    else if (event === EVENT_WRONG) sfx.wrong();
    else if (event === EVENT_EXPIRED) sfx.expire();
    else if (event === EVENT_LEVEL_UP) sfx.levelUp();
    else if (event === EVENT_TICK) sfx.tick();
    else if (event === EVENT_HANDS_FULL) sfx.tick();
    else if (event === EVENT_WIN) finishShift(true);
    else if (event === EVENT_GAME_OVER) finishShift(false);
  }
}

function step(inp, dt) {
  if (screen !== SCREEN_PLAY) return;
  const events = updateWorld(world, inp, dt);
  handleEvents(events);
  // Level-ups and the win arrive as world state, not only as events.
  if (world.won && screen === SCREEN_PLAY) finishShift(true);
  else if (world.over && screen === SCREEN_PLAY) finishShift(false);
}

let last = performance.now();
function frame(now) {
  const inputState = input.poll();
  if (inputState.confirm) unlockAudio();
  if (inputState.mute) {
    muted = toggleMute();
    setStatus(muted ? 'Sound off.' : 'Sound on.');
  }
  if (screen === SCREEN_TITLE && (inputState.confirm || inputState.click)) startShift();
  else if (screen === SCREEN_OVER && (inputState.retry || inputState.confirm)) startShift();
  else if (screen === SCREEN_WIN && inputState.confirm) startShift();
  else if (screen === SCREEN_PLAY && inputState.pause) screen = SCREEN_PAUSED;
  else if (screen === SCREEN_PAUSED && (inputState.pause || inputState.confirm)) screen = SCREEN_PLAY;

  let elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  while (elapsed > 0) {
    const dt = Math.min(STEP, elapsed);
    step(inputState, dt);
    elapsed -= dt;
    if (screen !== SCREEN_PLAY) break;
  }
  const hintStation = screen === SCREEN_PLAY ? nearestStation(world) : null;
  renderer.draw(screen, world, {
    time: now / 1000, best, finalStats, hintStation,
  });
  requestAnimationFrame(frame);
}

// Debug hook for automated play-testing: read-only view of the live state.
window.__sizzle = {
  get screen() { return screen; },
  get world() { return world; },
  get best() { return best; },
};

if (shot === 'start' || shot === 'play' || shot === 'end') {
  const staged = stageShot(shot, seed);
  screen = staged.screen;
  world = staged.world;
  world.best = best;
  finalStats = staged.finalStats;
  renderer.draw(screen, world, {
    time: 0, best, finalStats, hintStation: null,
  });
  renderer.draw(screen, world, {
    time: 0.5, best, finalStats, hintStation: null,
  });
  window.__shotReady = true;
} else {
  world.best = best;
  setStatus('Sizzle & Serve. Press Enter to start the shift.');
  requestAnimationFrame(frame);
}

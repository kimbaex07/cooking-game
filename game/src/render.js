// Sizzle & Serve — everything the player sees, drawn with Canvas 2D: the
// kitchen, the order board, the stations, the chef, the HUD and the screens.
// No images are loaded; every ingredient, dish and fixture is drawn in code.
import {
  BINS, BIN_H, BIN_W, BIN_Y, BOARD_H, BOARD_TOP, CHOP_SECONDS,
  CHOP_SPOT, GRILL_COOK_SECONDS, GRILL_SLOTS,
  HUD_H, PAL, PLATE_SPOTS, POT_COOK_SECONDS, POT_SPOT,
  STATIONS, VIEW_H, VIEW_W,
} from './config.js';
import { INGREDIENTS, recipeById } from './recipes.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function text(ctx, str, x, y, size, color, align = 'left', bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? '700' : '400'} ${size}px Trebuchet MS, Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---- food drawing (all in code) -------------------------------------------

export function drawIngredient(ctx, id, prep, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  if (id === 'bun') {
    ctx.fillStyle = '#d98e32';
    ctx.beginPath();
    ctx.ellipse(0, 2, s, s * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a94e';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.28, s * 0.95, s * 0.62, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    for (const [dx, dy] of [[-s * 0.45, -s * 0.5], [0, -s * 0.68], [s * 0.45, -s * 0.5]]) {
      circle(ctx, dx, dy, s * 0.09);
      ctx.fill();
    }
  } else if (id === 'patty') {
    const color = prep === 'burnt' ? '#2b2b2b' : prep === 'cooked' ? '#7a4a28' : '#d96a6a';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (prep === 'cooked') {
      ctx.strokeStyle = '#5a3418';
      ctx.lineWidth = Math.max(1.5, s * 0.12);
      for (const dx of [-s * 0.4, 0, s * 0.4]) {
        ctx.beginPath();
        ctx.moveTo(dx, -s * 0.4);
        ctx.lineTo(dx, s * 0.4);
        ctx.stroke();
      }
    }
    if (prep === 'burnt') {
      ctx.strokeStyle = 'rgba(200,200,200,0.5)';
      ctx.lineWidth = Math.max(1.5, s * 0.1);
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.8);
      ctx.quadraticCurveTo(-s * 0.2, -s * 1.3, -s * 0.4, -s * 1.7);
      ctx.moveTo(s * 0.3, -s * 0.8);
      ctx.quadraticCurveTo(s * 0.6, -s * 1.2, s * 0.4, -s * 1.6);
      ctx.stroke();
    }
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#5aa832';
    if (prep === 'chopped') {
      for (const [dx, dy] of [[-s * 0.5, 0], [s * 0.45, -s * 0.15], [0, s * 0.35]]) {
        ctx.beginPath();
        ctx.ellipse(dx, dy, s * 0.55, s * 0.4, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7cc24a';
      ctx.beginPath();
      ctx.ellipse(-s * 0.25, -s * 0.15, s * 0.6, s * 0.42, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a8c26';
      ctx.lineWidth = Math.max(1.5, s * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(0, s * 0.5);
      ctx.stroke();
    }
  } else if (id === 'tomato') {
    ctx.fillStyle = '#e0483e';
    if (prep === 'chopped') {
      for (const [dx, dy, r] of [[-s * 0.45, 0, 0.3], [s * 0.4, -s * 0.2, -0.4], [0, s * 0.35, 0.2]]) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(r);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.5, s * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      circle(ctx, 0, 0, s * 0.85);
      ctx.fill();
      ctx.fillStyle = '#f2705f';
      circle(ctx, -s * 0.25, -s * 0.25, s * 0.4);
      ctx.fill();
      ctx.fillStyle = '#5aa832';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(-s * 0.3, -s * 1.05);
      ctx.lineTo(0, -s * 0.9);
      ctx.lineTo(s * 0.3, -s * 1.05);
      ctx.closePath();
      ctx.fill();
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f2c14e';
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4);
    ctx.restore();
    ctx.fillStyle = '#d9a441';
    for (const [dx, dy] of [[-s * 0.3, s * 0.2], [s * 0.35, -s * 0.25]]) {
      circle(ctx, dx, dy, s * 0.14);
      ctx.fill();
    }
  } else if (id === 'onion') {
    ctx.fillStyle = '#efe4f4';
    if (prep === 'chopped') {
      ctx.strokeStyle = '#c9a8d8';
      ctx.lineWidth = Math.max(2, s * 0.16);
      for (const [dx, dy] of [[-s * 0.4, 0], [s * 0.4, -s * 0.1], [0, s * 0.35]]) {
        ctx.beginPath();
        ctx.arc(dx, dy, s * 0.42, 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
      }
    } else {
      circle(ctx, 0, 0, s * 0.85);
      ctx.fill();
      ctx.strokeStyle = '#c9a8d8';
      ctx.lineWidth = Math.max(1.5, s * 0.12);
      circle(ctx, 0, 0, s * 0.55);
      ctx.stroke();
      circle(ctx, 0, 0, s * 0.28);
      ctx.stroke();
      ctx.strokeStyle = '#7cc24a';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(0, -s * 1.15);
      ctx.stroke();
    }
  } else if (id === 'pasta') {
    ctx.strokeStyle = prep === 'burnt' ? '#3a2a1a' : '#f2d06b';
    ctx.lineWidth = Math.max(2, s * 0.18);
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, i * s * 0.4);
      ctx.bezierCurveTo(-s * 0.4, i * s * 0.4 - s * 0.35, -s * 0.1, i * s * 0.4 + s * 0.35, s * 0.25, i * s * 0.4);
      ctx.bezierCurveTo(s * 0.55, i * s * 0.4 - s * 0.3, s * 0.7, i * s * 0.4 + s * 0.2, s * 0.85, i * s * 0.4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDishIcon(ctx, recipeId, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  if (recipeId === 'burger' || recipeId === 'deluxe') {
    const tall = recipeId === 'deluxe';
    drawIngredient(ctx, 'bun', 'ready', 0, -s * 0.55, s * 0.62);
    drawIngredient(ctx, 'cheese', 'ready', 0, -s * 0.1, s * 0.5);
    drawIngredient(ctx, 'patty', 'cooked', 0, s * 0.18, s * 0.62);
    drawIngredient(ctx, 'lettuce', 'chopped', 0, s * 0.48, s * 0.5);
    if (tall) drawIngredient(ctx, 'tomato', 'chopped', 0, s * 0.72, s * 0.42);
    drawIngredient(ctx, 'bun', 'ready', 0, s * (tall ? 0.95 : 0.75), s * 0.55);
  } else if (recipeId === 'salad') {
    ctx.fillStyle = '#3e6fb0';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.3, s, s * 0.55, 0, 0, Math.PI);
    ctx.fill();
    drawIngredient(ctx, 'lettuce', 'chopped', -s * 0.4, -s * 0.3, s * 0.45);
    drawIngredient(ctx, 'tomato', 'chopped', s * 0.35, -s * 0.35, s * 0.45);
    drawIngredient(ctx, 'onion', 'chopped', 0, -s * 0.55, s * 0.4);
  } else if (recipeId === 'pasta') {
    ctx.fillStyle = '#f7f4ec';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.15, s * 1.05, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9c2b4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.15, s * 1.05, s * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawIngredient(ctx, 'pasta', 'cooked', 0, 0, s * 0.7);
    ctx.fillStyle = '#e0483e';
    for (const [dx, dy] of [[-s * 0.4, -s * 0.2], [s * 0.35, s * 0.1]]) {
      circle(ctx, dx, dy, s * 0.14);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---- the kitchen ------------------------------------------------------------

function drawHeart(ctx, x, y, s, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -5, -11, 0, -6);
  ctx.bezierCurveTo(5, -11, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? '#e0483e' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.strokeStyle = filled ? '#a83240' : 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawProgressRing(ctx, x, y, r, frac, color) {
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
}

function drawFlame(ctx, x, y, s, t) {
  const wob = Math.sin(t * 9 + x) * 0.12;
  ctx.fillStyle = '#f2701d';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.55, y);
  ctx.quadraticCurveTo(x - s * 0.6, y - s * 0.9, x + wob * s, y - s * 1.35);
  ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.9, x + s * 0.55, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.3, y);
  ctx.quadraticCurveTo(x - s * 0.32, y - s * 0.55, x, y - s * 0.8);
  ctx.quadraticCurveTo(x + s * 0.32, y - s * 0.55, x + s * 0.3, y);
  ctx.closePath();
  ctx.fill();
}

function drawStationGlow(ctx, id, color) {
  const s = STATIONS[id];
  if (!s) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  rr(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 12);
  ctx.stroke();
  ctx.restore();
}

export function createRenderer(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');

  function drawBackground() {
    ctx.fillStyle = PAL.wall;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Tile wainscot along the top of the kitchen.
    ctx.fillStyle = PAL.wallDark;
    ctx.fillRect(0, BOARD_TOP + BOARD_H, VIEW_W, 6);
    // Terracotta floor tiles.
    ctx.fillStyle = PAL.floor;
    ctx.fillRect(0, BOARD_TOP + BOARD_H + 6, VIEW_W, VIEW_H - BOARD_TOP - BOARD_H - 6);
    ctx.strokeStyle = PAL.floorLine;
    ctx.lineWidth = 2;
    const tile = 64;
    const top = BOARD_TOP + BOARD_H + 6;
    for (let x = 0; x <= VIEW_W; x += tile) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, VIEW_H);
      ctx.stroke();
    }
    for (let y = top; y <= VIEW_H; y += tile) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }
    // A warm rug under the chef's patch.
    ctx.fillStyle = 'rgba(255, 243, 214, 0.16)';
    rr(ctx, 480, 600, 320, 84, 14);
    ctx.fill();
  }

  function drawHUD(world, opts) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(0, HUD_H - 4, VIEW_W, 4);
    text(ctx, 'SIZZLE & SERVE', 20, 36, 26, PAL.gold);
    text(ctx, `SCORE ${world.score}`, 250, 36, 22, PAL.textLight);
    for (let i = 0; i < 3; i += 1) drawHeart(ctx, 470 + i * 34, 30, 26, i < world.hearts);
    text(ctx, `LEVEL ${world.level}`, 590, 36, 22, PAL.textLight);
    text(ctx, `SERVED ${world.served}/${world.serveTarget}`, 700, 36, 22, PAL.textLight);
    if (world.combo >= 2) {
      text(ctx, `COMBO x${world.combo}`, 880, 36, 22, '#7be382');
    }
    text(ctx, fmtTime(world.time), 1130, 36, 24, PAL.textLight, 'left');
    text(ctx, 'M mute', 1210, 36, 16, 'rgba(255,246,224,0.6)', 'left');
  }

  function drawOrderBoard(world, t) {
    // The wooden ticket rail.
    ctx.fillStyle = PAL.board;
    rr(ctx, 12, BOARD_TOP + 4, VIEW_W - 24, BOARD_H - 8, 10);
    ctx.fill();
    ctx.fillStyle = PAL.boardDark;
    ctx.fillRect(12, BOARD_TOP + 4, VIEW_W - 24, 8);
    text(ctx, 'ORDERS', 28, BOARD_TOP + 30, 15, 'rgba(255,246,224,0.75)');
    if (world.orders.length === 0) {
      text(ctx, world.won
        ? 'Shift complete — every ticket served!'
        : 'No orders yet — the lunch rush is coming…',
      120, BOARD_TOP + 68, 18, 'rgba(255,246,224,0.85)');
      return;
    }
    world.orders.forEach((order, i) => {
      const recipe = recipeById(order.recipeId);
      const x = 110 + i * 292;
      const y = BOARD_TOP + 10;
      const w = 280;
      const h = BOARD_H - 20;
      const urgent = order.patience < 10;
      const frac = Math.max(0, order.patience / order.max);
      ctx.save();
      if (urgent && Math.sin(t * 8) > 0) {
        ctx.shadowColor = '#e0483e';
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = PAL.ticket;
      rr(ctx, x, y, w, h, 8);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = urgent ? '#e0483e' : PAL.ticketEdge;
      ctx.lineWidth = urgent ? 3 : 1.5;
      rr(ctx, x, y, w, h, 8);
      ctx.stroke();
      drawDishIcon(ctx, recipe.id, x + 44, y + 40, 26);
      text(ctx, recipe.name.toUpperCase(), x + 84, y + 30, 17, PAL.ink);
      // The dish's ingredients as a mini row.
      recipe.items.forEach((need, j) => {
        drawIngredient(ctx, need.id, need.prep, x + 96 + j * 34, y + 56, 13);
      });
      // Patience bar.
      const barX = x + 14;
      const barY = y + h - 16;
      const barW = w - 28;
      ctx.fillStyle = '#e8dcc0';
      rr(ctx, barX, barY, barW, 9, 4);
      ctx.fill();
      ctx.fillStyle = frac > 0.5 ? '#58b368' : frac > 0.25 ? '#f2a541' : '#e0483e';
      if (frac > 0.01) {
        rr(ctx, barX, barY, Math.max(10, barW * frac), 9, 4);
        ctx.fill();
      }
      text(ctx, `${Math.ceil(order.patience)}s`, x + w - 16, y + 30, 16, urgent ? '#e0483e' : PAL.inkSoft, 'right');
    });
  }

  function drawBins() {
    // The top counter with the ingredient bins.
    ctx.fillStyle = PAL.steelDark;
    rr(ctx, 28, BIN_Y - 12, VIEW_W - 56, BIN_H + 30, 12);
    ctx.fill();
    ctx.fillStyle = PAL.steel;
    rr(ctx, 28, BIN_Y - 12, VIEW_W - 56, 10, 6);
    ctx.fill();
    for (const bin of BINS) {
      const ing = INGREDIENTS[bin.id];
      ctx.fillStyle = '#f7f4ec';
      rr(ctx, bin.x, BIN_Y, BIN_W, BIN_H, 10);
      ctx.fill();
      ctx.strokeStyle = '#c9c2b4';
      ctx.lineWidth = 2;
      rr(ctx, bin.x, BIN_Y, BIN_W, BIN_H, 10);
      ctx.stroke();
      drawIngredient(ctx, bin.id, ing.prep, bin.x + BIN_W / 2, BIN_Y + 34, 20);
      text(ctx, ing.name.toUpperCase(), bin.x + BIN_W / 2, BIN_Y + BIN_H - 10, 14, PAL.ink, 'center');
    }
  }

  function drawChopBoard(world, t) {
    const s = STATIONS.chop;
    ctx.fillStyle = PAL.steelDark;
    rr(ctx, s.x - 8, s.y - 8, s.w + 16, s.h + 16, 12);
    ctx.fill();
    ctx.fillStyle = PAL.wood;
    rr(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
    ctx.strokeStyle = PAL.woodDark;
    ctx.lineWidth = 2;
    rr(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.stroke();
    text(ctx, 'CHOP', s.x + 14, s.y + 24, 14, 'rgba(58,42,26,0.7)');
    const board = world.chop;
    if (board.item) {
      const prep = board.done ? 'chopped' : board.item.prep;
      drawIngredient(ctx, board.item.id, prep, CHOP_SPOT.x, CHOP_SPOT.y, 24);
      if (!board.done) {
        // The knife, chopping away.
        const bob = Math.abs(Math.sin(t * 10)) * 10;
        ctx.save();
        ctx.translate(CHOP_SPOT.x + 44, CHOP_SPOT.y - 18 - bob);
        ctx.rotate(0.5);
        ctx.fillStyle = '#d7dee3';
        ctx.fillRect(-4, -26, 8, 34);
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(-4, 8, 8, 14);
        ctx.restore();
        drawProgressRing(ctx, CHOP_SPOT.x, CHOP_SPOT.y, 34, board.t / CHOP_SECONDS, '#7cc24a');
      } else {
        ctx.fillStyle = '#58b368';
        text(ctx, 'READY', CHOP_SPOT.x, CHOP_SPOT.y + 52, 14, '#58b368', 'center');
      }
    } else {
      text(ctx, 'drop a veggie here', s.x + s.w / 2, s.y + s.h / 2 + 6, 15, 'rgba(58,42,26,0.55)', 'center');
    }
  }

  function drawGrill(world, t) {
    const s = STATIONS.grill;
    ctx.fillStyle = PAL.steelDark;
    rr(ctx, s.x - 8, s.y - 8, s.w + 16, s.h + 16, 12);
    ctx.fill();
    ctx.fillStyle = '#2e2113';
    rr(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
    // Grate lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 3;
    for (let x = s.x + 16; x < s.x + s.w; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, s.y + 8);
      ctx.lineTo(x, s.y + s.h - 8);
      ctx.stroke();
    }
    text(ctx, 'GRILL', s.x + 14, s.y + 24, 14, 'rgba(255,246,224,0.7)');
    world.grill.forEach((slot, i) => {
      const spot = GRILL_SLOTS[i];
      if (!slot.item) return;
      if (!slot.burnt) drawFlame(ctx, spot.x, spot.y + 26, 16, t + i * 2);
      drawIngredient(ctx, 'patty', slot.burnt ? 'burnt' : slot.cooked ? 'cooked' : 'raw', spot.x, spot.y, 24);
      const frac = Math.min(1, slot.t / GRILL_COOK_SECONDS);
      const color = slot.burnt ? '#e0483e' : slot.cooked ? '#f2a541' : '#7cc24a';
      drawProgressRing(ctx, spot.x, spot.y, 34, frac, color);
      if (slot.cooked && !slot.burnt) {
        text(ctx, 'READY', spot.x, spot.y + 50, 13, '#f2c14e', 'center');
      }
      if (slot.burnt) text(ctx, 'BURNT!', spot.x, spot.y + 50, 13, '#e0483e', 'center');
    });
  }

  function drawPot(world, t) {
    const s = STATIONS.pot;
    ctx.fillStyle = PAL.steelDark;
    rr(ctx, s.x - 8, s.y - 8, s.w + 16, s.h + 16, 12);
    ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    rr(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
    // The pot: steel body, boiling water.
    ctx.fillStyle = PAL.steel;
    ctx.beginPath();
    ctx.ellipse(POT_SPOT.x, POT_SPOT.y + 18, 62, 30, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = PAL.steelLight;
    ctx.beginPath();
    ctx.ellipse(POT_SPOT.x, POT_SPOT.y + 2, 62, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7fb8d8';
    ctx.beginPath();
    ctx.ellipse(POT_SPOT.x, POT_SPOT.y + 2, 52, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'POT', s.x + 14, s.y + 24, 14, 'rgba(255,246,224,0.7)');
    const pot = world.pot;
    if (pot.item) {
      drawIngredient(ctx, 'pasta', pot.burnt ? 'burnt' : 'cooked', POT_SPOT.x, POT_SPOT.y + 2, 22);
      // Bubbles while it boils.
      for (let i = 0; i < 3; i += 1) {
        const bx = POT_SPOT.x - 30 + ((t * 30 + i * 29) % 60);
        const by = POT_SPOT.y - 6 - ((t * 24 + i * 17) % 22);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        circle(ctx, bx, by, 3 + (i % 2));
        ctx.fill();
      }
      const frac = Math.min(1, pot.t / POT_COOK_SECONDS);
      drawProgressRing(ctx, POT_SPOT.x, POT_SPOT.y + 2, 40, frac, pot.burnt ? '#e0483e' : '#7fb8d8');
      if (pot.cooked && !pot.burnt) text(ctx, 'READY', POT_SPOT.x, POT_SPOT.y + 56, 13, '#f2c14e', 'center');
      if (pot.burnt) text(ctx, 'BURNT!', POT_SPOT.x, POT_SPOT.y + 56, 13, '#e0483e', 'center');
    }
  }

  function drawTrash() {
    const s = STATIONS.trash;
    ctx.fillStyle = PAL.steelDark;
    rr(ctx, s.x - 8, s.y - 8, s.w + 16, s.h + 16, 12);
    ctx.fill();
    ctx.fillStyle = '#6b7a86';
    rr(ctx, s.x + 40, s.y + 22, 100, 66, 8);
    ctx.fill();
    ctx.fillStyle = '#55636e';
    rr(ctx, s.x + 34, s.y + 14, 112, 14, 7);
    ctx.fill();
    text(ctx, 'TRASH', s.x + s.w / 2, s.y + s.h - 10, 14, 'rgba(255,246,224,0.7)', 'center');
  }

  function drawPlateSpot(plate, spot) {
    ctx.fillStyle = '#f7f4ec';
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, 72, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9c2b4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, 72, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e8e0cc';
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, 48, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stack the dish, one layer per ingredient.
    plate.items.forEach((item, i) => {
      drawIngredient(ctx, item.id, item.prep, spot.x, spot.y - 8 - i * 13, 22);
    });
  }

  function drawPlates(world) {
    const s0 = STATIONS.plate0;
    ctx.fillStyle = PAL.steelDark;
    rr(ctx, 52, 432, 556, 144, 12);
    ctx.fill();
    ctx.fillStyle = PAL.steel;
    rr(ctx, 52, 432, 556, 10, 6);
    ctx.fill();
    text(ctx, 'ASSEMBLY', s0.x + 14, s0.y + 24, 14, 'rgba(58,42,26,0.6)');
    text(ctx, 'Q lifts a plate  ·  E takes one item back', 340, 560, 13, 'rgba(58,42,26,0.55)', 'center');
    world.plates.forEach((plate, i) => drawPlateSpot(plate, PLATE_SPOTS[i]));
  }

  function drawServeWindow(world, t) {
    const s = STATIONS.serve;
    const carryingPlate = world.chef.carrying && world.chef.carrying.id === 'plate';
    ctx.fillStyle = PAL.steelDark;
    rr(ctx, s.x - 8, s.y - 8, s.w + 16, s.h + 16, 12);
    ctx.fill();
    ctx.fillStyle = '#5f3d22';
    rr(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
    ctx.fillStyle = '#fff8e6';
    rr(ctx, s.x + 16, s.y + 16, s.w - 32, s.h - 52, 8);
    ctx.fill();
    text(ctx, 'SERVE  •  ring the bell, dish out', s.x + 30, s.y + 44, 17, PAL.inkSoft);
    text(ctx, 'match the ticket, earn the tip', s.x + 30, s.y + 70, 15, 'rgba(107,84,58,0.8)');
    // The bell.
    const bx = s.x + s.w - 70;
    const by = s.y + 46;
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(bx, by, 18, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(bx - 18, by - 2, 36, 5);
    ctx.fillStyle = '#d9a441';
    circle(ctx, bx, by + 8, 4);
    ctx.fill();
    if (carryingPlate) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 6);
      ctx.strokeStyle = `rgba(88, 179, 104, ${pulse})`;
      ctx.lineWidth = 4;
      rr(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 12);
      ctx.stroke();
      text(ctx, 'SERVE IT!  (E)', s.x + s.w / 2, s.y + s.h - 12, 16, '#58b368', 'center');
    } else {
      text(ctx, 'carry a finished plate here', s.x + s.w / 2, s.y + s.h - 12, 14, 'rgba(255,246,224,0.6)', 'center');
    }
  }

  function drawChef(world, t) {
    const chef = world.chef;
    const bob = chef.moving ? Math.abs(Math.sin(chef.walkT)) * 3 : 0;
    const x = chef.x;
    const y = chef.y - bob;
    // Shadow.
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath();
    ctx.ellipse(chef.x, chef.y + 26, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: apron over a white shirt.
    ctx.fillStyle = PAL.chefWhite;
    rr(ctx, x - 18, y - 6, 36, 34, 12);
    ctx.fill();
    ctx.fillStyle = PAL.apron;
    rr(ctx, x - 13, y + 2, 26, 26, 8);
    ctx.fill();
    // Arms.
    ctx.strokeStyle = PAL.skin;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 6);
    ctx.lineTo(x - 22, y + 18);
    ctx.moveTo(x + 14, y + 6);
    ctx.lineTo(x + 22, y + 18);
    ctx.stroke();
    // Head.
    ctx.fillStyle = PAL.skin;
    circle(ctx, x, y - 20, 15);
    ctx.fill();
    // Eyes and smile.
    ctx.fillStyle = '#2e2113';
    circle(ctx, x - 5 + chef.face * 1.5, y - 22, 1.8);
    ctx.fill();
    circle(ctx, x + 5 + chef.face * 1.5, y - 22, 1.8);
    ctx.fill();
    ctx.strokeStyle = '#2e2113';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x + chef.face * 1.5, y - 16, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // Chef's hat.
    ctx.fillStyle = PAL.chefHat;
    circle(ctx, x - 10, y - 36, 9);
    ctx.fill();
    circle(ctx, x + 10, y - 36, 9);
    ctx.fill();
    circle(ctx, x, y - 40, 11);
    ctx.fill();
    ctx.fillRect(x - 14, y - 34, 28, 7);
    // What the chef carries, held up high.
    if (chef.carrying) {
      const item = chef.carrying;
      if (item.id === 'plate') {
        ctx.fillStyle = '#f7f4ec';
        ctx.beginPath();
        ctx.ellipse(x, y - 56, 34, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c9c2b4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y - 56, 34, 13, 0, 0, Math.PI * 2);
        ctx.stroke();
        item.items.forEach((it, i) => {
          drawIngredient(ctx, it.id, it.prep, x, y - 62 - i * 9, 13);
        });
      } else {
        drawIngredient(ctx, item.id, item.prep, x, y - 58, 17);
      }
    }
    void t;
  }

  function drawPopups(world) {
    for (const p of world.popups) {
      const frac = p.t / p.ttl;
      ctx.save();
      ctx.globalAlpha = 1 - frac;
      text(ctx, p.text, p.x, p.y - frac * 44, 24, p.color, 'center');
      ctx.restore();
    }
  }

  function drawHint(world, hintStation) {
    if (!hintStation) return;
    drawStationGlow(ctx, hintStation, 'rgba(242, 193, 78, 0.9)');
    const stand = hintStation.startsWith('bin:')
      ? { x: BINS.find((b) => b.id === hintStation.slice(4)).x + BIN_W / 2, y: BIN_Y + BIN_H + 14 }
      : STATIONS[hintStation].stand;
    ctx.fillStyle = '#3a2a1a';
    rr(ctx, stand.x - 14, stand.y + 30, 28, 26, 8);
    ctx.fill();
    text(ctx, 'E', stand.x, stand.y + 49, 17, '#f2c14e', 'center');
  }

  function drawTitle(world) {
    ctx.fillStyle = 'rgba(46, 33, 19, 0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff8e6';
    rr(ctx, 290, 170, 700, 380, 18);
    ctx.fill();
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 4;
    rr(ctx, 290, 170, 700, 380, 18);
    ctx.stroke();
    text(ctx, 'SIZZLE & SERVE', 640, 252, 52, PAL.ink, 'center');
    text(ctx, 'a tiny diner kitchen · one very big lunch rush', 640, 292, 20, PAL.inkSoft, 'center');
    text(ctx, 'Read the tickets. Chop, grill and boil.', 640, 340, 18, PAL.text, 'center');
    text(ctx, 'Stack each dish on a plate, lift it with Q,', 640, 368, 18, PAL.text, 'center');
    text(ctx, 'and serve it at the window before the customer walks out.', 640, 396, 18, PAL.text, 'center');
    text(ctx, 'WASD / arrows — move      Click — walk & use      E — use      Q — lift plate', 640, 440, 16, PAL.inkSoft, 'center');
    text(ctx, 'Serve 12 orders to finish the shift. 3 hearts — don\'t keep them waiting!', 640, 468, 16, PAL.inkSoft, 'center');
    text(ctx, 'PRESS ENTER OR CLICK TO START', 640, 516, 22, '#e0483e', 'center');
    if (world.best > 0) text(ctx, `Best score: ${world.best}`, 640, 544, 16, PAL.inkSoft, 'center');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(46, 33, 19, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'PAUSED', 640, 340, 56, PAL.textLight, 'center');
    text(ctx, 'Press P or Enter to get back to the pass', 640, 386, 20, 'rgba(255,246,224,0.85)', 'center');
  }

  function drawStats(world, finalStats) {
    const stats = finalStats ?? {
      score: world.score, served: world.served, time: world.time, bestCombo: world.bestCombo,
    };
    text(ctx, `Score  ${stats.score}`, 640, 356, 26, PAL.text, 'center');
    text(ctx, `Orders served  ${stats.served} / ${world.serveTarget}`, 640, 394, 22, PAL.text, 'center');
    text(ctx, `Shift time  ${fmtTime(stats.time)}      Best combo  x${stats.bestCombo}`, 640, 428, 22, PAL.text, 'center');
    if (world.best > 0) text(ctx, `Best score  ${world.best}`, 640, 462, 18, PAL.inkSoft, 'center');
  }

  function drawOver(world, finalStats) {
    ctx.fillStyle = 'rgba(46, 33, 19, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff8e6';
    rr(ctx, 340, 180, 600, 360, 18);
    ctx.fill();
    ctx.strokeStyle = '#e0483e';
    ctx.lineWidth = 4;
    rr(ctx, 340, 180, 600, 360, 18);
    ctx.stroke();
    text(ctx, 'SHIFT OVER', 640, 262, 48, '#e0483e', 'center');
    text(ctx, 'Too many customers walked out hungry.', 640, 300, 19, PAL.inkSoft, 'center');
    drawStats(world, finalStats);
    text(ctx, 'PRESS R TO TRY AGAIN', 640, 506, 22, '#e0483e', 'center');
  }

  function drawWin(world, finalStats) {
    ctx.fillStyle = 'rgba(46, 33, 19, 0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff8e6';
    rr(ctx, 340, 170, 600, 380, 18);
    ctx.fill();
    ctx.strokeStyle = '#58b368';
    ctx.lineWidth = 4;
    rr(ctx, 340, 170, 600, 380, 18);
    ctx.stroke();
    text(ctx, 'SHIFT COMPLETE!', 640, 252, 48, '#58b368', 'center');
    text(ctx, 'Every ticket served. The lunch rush is yours.', 640, 292, 19, PAL.inkSoft, 'center');
    drawStats(world, finalStats);
    text(ctx, 'PRESS ENTER TO COOK AGAIN', 640, 516, 22, '#58b368', 'center');
  }

  function draw(screen, world, opts) {
    const t = opts.time ?? 0;
    drawBackground();
    drawOrderBoard(world, t);
    drawBins();
    drawChopBoard(world, t);
    drawGrill(world, t);
    drawPot(world, t);
    drawTrash();
    drawPlates(world);
    drawServeWindow(world, t);
    drawChef(world, t);
    drawPopups(world);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHint(world, opts.hintStation);
    }
    drawHUD(world, opts);
    if (screen === SCREEN_TITLE) drawTitle(world);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(world, opts.finalStats);
    else if (screen === SCREEN_WIN) drawWin(world, opts.finalStats);
  }

  return { draw };
}

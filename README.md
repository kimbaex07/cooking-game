[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/kimbaex07/cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/kimbaex07/cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

# Sizzle & Serve

A tiny diner kitchen, one very big lunch rush. Read the order tickets, chop the veggies, grill the patties, boil the pasta, stack each dish on a plate, and serve it at the window before the customer walks out. Pure vanilla JS + Canvas 2D — every ingredient, dish and fixture is drawn in code, every sound is synthesized with WebAudio, and the game loads nothing over the network.

## How it plays

- **Orders arrive on the ticket rail** at the top, each with a patience timer. Serve the dish before the timer runs out — a walk-out costs a heart.
- **Four dishes on the menu:** Sunny Burger, Garden Salad, Sunset Pasta, and (from level 2) the Deluxe Stack. Every dish is a different combination of ingredients, so every ticket is a different route through the kitchen.
- **Prep matters:** lettuce, tomato and onion must be chopped on the board; patties grill and pasta boils, and both burn if you leave them on the heat too long. Burnt food goes in the trash.
- **Plates are built by hand:** stack ingredients on one of the two assembly plates, lift the finished plate with **Q**, carry it to the serve window and ring the bell. A wrong dish costs a heart.
- **Pressure grows:** every 4 served orders the level rises — tickets arrive faster and patience shrinks. Serve **12 orders** to finish the shift. Lose all 3 hearts and the shift is over.
- **Scoring:** each dish pays 100 plus up to 100 for patience left, plus 10 per combo step for serving dishes back-to-back without a walk-out or a wrong dish. The best score is kept between visits.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move the chef |
| Mouse click | Walk to a spot, or walk to a station and use it on arrival |
| E | Use the nearest station |
| Q | Lift a finished plate off the assembly counter |
| P / Esc | Pause |
| M | Mute |
| Enter / Space | Start, restart |
| R | Retry after game over |

## How to run locally

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files. Hand it in with:

```sh
MAKEFUN_OUTPUT_DIR=./out node main.ts
```

MIT licensed — see `LICENSE`.

## Screenshots

1. **1-start.jpg** — the title card over a live kitchen: two tickets on the board, a salad already taking shape on the first plate.
2. **2-play.jpg** — mid-rush: three tickets ticking, a dish mid-assembly on the plate, a patty ready on the grill, an onion on the chopping board.
3. **3-end.jpg** — shift complete: 12 orders served, final score and best combo on the results card.

## Files

- `game/index.html` + `game/src/` — the game: `config.js` (layout, tuning, palette), `recipes.js` (ingredients and dishes), `world.js` (orders, cooking, scoring), `render.js` (all canvas drawing), `input.js`, `audio.js` (synthesized sounds), `random.js` (seeded RNG), `shots.js` (staged screenshot scenes), `main.js` (boot and game loop).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — three real renders of the game's own code, staged with `?shot=start|play|end&seed=1` (see `shots.json`).
- `serve.ts` — a tiny static server for local play-testing.

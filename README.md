# Survival Arena

A top-down, round-based zombie survival game in the browser. Survive endless
rounds, earn points, buy guns off the walls, open doors to new areas, and try
your luck on the mystery crate. HTML5 canvas + vanilla ES modules, no
libraries, no build step.

## Run it

Any static file server works. From the project root:

```
npm start
```

That runs `python3 -m http.server 8000`; open http://localhost:8000/. Any
other static server (`npx serve .`, `npx http-server .`) works the same way.
The game must be served over HTTP because it uses ES modules.

## Controls

| Action              | Key / button              |
|---------------------|---------------------------|
| Move                | W A S D                   |
| Aim                 | Mouse                     |
| Fire                | Left click (hold for auto)|
| Reload              | R                         |
| Melee               | Right click or V          |
| Grenade             | G                         |
| Decoy               | Q                         |
| Interact (buy/open) | E                         |
| Switch weapon       | 1 / 2 or mouse wheel      |
| Restart after death | Enter or click            |

## Tools

```
npm run check-map          # validates src/data/map.js (exit 1 on problems)
node tools/balance-sim.js  # headless bot plays rounds with different loadouts
node tools/balance-sim.js 8 ar,smg 5 ABCD   # round 8, AR+SMG, 5 runs, doors A-D open
```

## Code layout

See `docs/PLAN.md` for the full plan, map drawing and area/door tables.

- `src/config.js` holds every tunable (speeds, health, points, prices, round
  scaling, timings, colours, key bindings).
- `src/data/` is pure data: `weapons.js` and the ASCII `map.js`.
- `src/world.js` parses the map into a tile grid with areas, doors, windows,
  wall buys and the crate.
- `src/game.js` owns the state and calls the systems in order each fixed step.
- `src/entities/` are the things in the world; `src/systems/` are the rules
  (combat, scoring, rounds, pathfinding, collision, economy, explosions).
- `src/render/` only draws; `src/input.js` only reads the keyboard and mouse.

## Balance notes

Round 1 is six 100 hp walkers; the pistol clears it comfortably. Health and
count rise every round, runners appear from round 4 and become up to half of
each round. By round 5 you need a wall gun, by round 10 (43 zombies, ~640 hp)
you need a proper loadout, open doors to kite through, and grenades. All of
this is in `ROUNDS` and `ZOMBIE` inside `src/config.js`.

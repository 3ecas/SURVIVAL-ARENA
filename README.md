# Survival Arena

A top-down survival shooter with rogue-lite structure, in the browser.
Expeditions into dark, generated caves that grow every level; a flashlight,
room lights you can switch or shoot out; zombies climbing in through windows;
resources on the floor; crafting in a hub between maps. Board up every window,
get back to the entrance, extract. Die and the run is over.

HTML5 canvas + vanilla ES modules, no libraries, no build step.

## Run it

```
npm start
```

That runs `python3 -m http.server 8000`; open http://localhost:8000/. Any
static server works (`npx serve .`, `npx http-server .`). The game must be
served over HTTP because it uses ES modules. It is also deployed with GitHub
Pages from `main`.

## How a run works

1. **Hub.** Your stats and gear, your resources, a crafting list, and a
   briefing for the next map: size, areas, windows to board, expected enemies
   and what resources are scattered out there. Press Space to deploy.
2. **Level.** You start at the entrance in the dark with a pistol, a knife and
   whatever you crafted. Explore with the flashlight, pick up planks, scrap,
   cloth, weapon parts, ammo boxes and medkits by walking over them. Board up
   every window (E with a plank in hand); zombies stop coming once the last one
   is boarded. Return to the entrance and press E to extract.
3. **Back in the hub** with what you carried out. Craft ammo, bandages,
   grenades, decoys, or a new gun from parts and scrap. The next map is bigger.
4. **Death** ends the run: back to level 1 with starting gear. Best level and
   score are kept. Progress is saved in the browser (localStorage).

## Controls

| Action              | Key / button               |
|---------------------|----------------------------|
| Move                | W A S D                    |
| Aim                 | Mouse                      |
| Fire                | Left click (hold for auto) |
| Reload              | R                          |
| Knife               | Right click or V           |
| Grenade             | G                          |
| Decoy               | Q                          |
| Interact            | E (doors, windows, lights, extract) |
| Bandage             | H                          |
| Flashlight          | F                          |
| Switch weapon       | 1 / 2 or mouse wheel       |
| Hub                 | W/S choose recipe, Enter craft, Q switch active weapon, Space deploy, N new run |

## Tools

```
npm run check-map              # generates and validates levels 1-10 for 5 run seeds
node tools/gen-map.js 4 7      # print level 4 for run seed 7
node tools/balance-sim.js      # headless bot survives generated levels with loadouts
node tools/balance-sim.js 6 ar,shotgun 3
```

## Code layout

See `docs/PLAN.md` for the design and generator pipeline.

- `src/config.js` holds every tunable: camera zoom and look-ahead, lighting,
  level scaling and the maximum map size, loot budgets, enemy scaling, colours,
  key bindings.
- `src/data/` is pure data: weapons, item types, crafting recipes.
- `src/mapgen/` generates and validates maps (noise, corridors, areas, doors,
  windows, entrance, lights). Runs in the browser and in Node.
- `src/level.js` turns (level, run seed) into a map, an enemy budget and loot.
- `src/run.js` is the run state and its persistence; `src/hub.js` the hub.
- `src/game.js` owns a level in play and calls the systems in order.
- `src/entities/`, `src/systems/`, `src/render/` as in v1: things, rules, drawing.

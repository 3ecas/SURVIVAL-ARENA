# Survival Arena

A top-down survival shooter with rogue-lite structure, in the browser.
Dark, generated buildings that grow every level; a flashlight and ceiling
lights you can switch or shoot out; zombies climbing in through windows round
after round; resources on the floor; a hub between levels with an armory,
crafting, an XP bar and attribute points. Die and the run is over.

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

1. **Hub.** Three panels of cards: the next map (a map preview, rounds,
   a per-round enemy chart, resources on the floor), gear & inventory
   (health, XP bar, attribute cards, loadout slots, unlocked guns, items)
   and the armory (unlock guns with score and weapon parts, craft bandages,
   grenades and decoys). WASD moves across the cards, Tab switches panel,
   Enter selects, Space deploys.
2. **Level.** You start at the entrance of a dark building with a flashlight
   and whatever you equipped. Zombies climb in through the windows of the
   rooms you have opened up, round after round. Kill every zombie of every
   round and the level is cleared; you return to the hub with your score,
   experience and everything you picked up. Ammo is refilled in the hub.
3. **Progression.** Kills give score (spent on guns) and XP; each player
   level gives an attribute point for vitality, agility, handling or power.
4. **Death** ends the run: back to level 1 with the pistol and knife. Best
   level and score are kept. Progress is saved in the browser (localStorage).

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
| Interact            | E (doors, lights)          |
| Bandage             | H                          |
| Flashlight          | F                          |
| Switch weapon       | 1 / 2 or mouse wheel       |
| Hub                 | WASD move between cards, Tab switch panel, Enter select, Q active weapon, Space deploy, N new run |

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
- `src/data/` is pure data: weapons, item types, recipes, armory unlocks, attributes.
- `src/mapgen/` generates and validates maps (BSP rooms, courtyards, areas,
  openings, doors, windows, entrance, lights). Runs in the browser and in Node.
- `src/level.js` turns (level, run seed) into a map, a round plan and loot.
- `src/run.js` is the run state and its persistence; `src/hub.js` the hub.
- `src/game.js` owns a level in play and calls the systems in order.
- `src/entities/`, `src/systems/`, `src/render/` as in v1: things, rules, drawing.

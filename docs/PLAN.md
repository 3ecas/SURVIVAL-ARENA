# Survival Arena – design plan (v2: expedition mode)

## Concept

Top-down survival shooter with rogue-lite structure. A run is a sequence of
expeditions into generated maps that grow each level. Between maps the player
is in the **hub**: stats, gear, crafting and a briefing about the next map.
On a map it is dark; the player sees only a small glow around them and a
flashlight cone. Some rooms have lights that can be switched on and off, or
shot out. Zombies climb in through windows. Resources are scattered on the
floor and picked up by walking over them. The objective is to **board up
every window** with planks found on the map, then get back to the entrance
and extract. Death ends the run.

## Run structure

```
hub  --deploy-->  level N  --extract-->  hub (level N+1)  --deploy--> ...
                          --death-->    hub (run reset, best score kept)
```

Run state (level, weapons and ammo, inventory, health, score, kills) is saved
in localStorage after every hub visit and extraction.

## Map generation

`src/mapgen/generator.js` (browser + Node) generates a cave map from seeded
value noise for a given `{ width, height, areas, seed }`:

1. noise + cellular smoothing → floor/rock
2. connect caverns with noise-weighted Dijkstra corridors
3. spread area seeds, grow areas, force loops, wall the borders
4. doors on legal border tiles (spanning tree + loop edges), no prices
5. open void pockets in solid rock; windows on walls with void behind
6. entrance on the outer ring in area 0; spawn just inside it
7. one or two lights per area on open floor

Level size grows with the level (see `LEVELS` in `config.js`): 30x22 at level
1, +4x+3 per level, capped at 62x46 (the cap is easy to change).

`tools/check-map.js` validates generated levels for several seeds and sizes.
`tools/gen-map.js <level> <seed>` prints one.

## Files (changes from v1)

```
src/config.js                camera zoom/lookahead, lighting, levels, items, hub
src/data/weapons.js          no prices; source 'start' | 'craft'
src/data/items.js            pickup types (plank, scrap, cloth, ammo, medkit, parts, grenade, decoy)
src/data/recipes.js          crafting recipes (ammo, bandage, weapons)
src/mapgen/rng.js            seeded RNG + hash
src/mapgen/noise.js          value noise / fBm
src/mapgen/generator.js      the generator above (pure logic, no I/O)
src/mapgen/validate.js       checkMap(): structural validation shared by tools
src/level.js                 builds a level from (run seed, level): map, enemy budget, loot
src/run.js                   run state + localStorage persistence
src/hub.js                   hub state: crafting, deploy, briefing
src/world.js                 parses generated map: areas, doors, windows, entrance, lights
src/game.js                  a level in play; extraction/death report back to main
src/main.js                  app state machine: hub <-> level
src/entities/item.js         floor pickup
src/systems/lighting.js      light sources, raycast visibility polygons, light damage
src/systems/items.js         loot placement and pickup
src/systems/objectives.js    board windows, extract
src/systems/spawning.js      window spawns from the level's enemy budget
src/systems/interaction.js   doors, windows (board), lights (toggle), entrance (extract)
src/systems/crafting.js      apply recipes to the run inventory
src/render/lighting.js       darkness overlay with light cut-outs
src/render/hub.js            hub screen
removed: rounds.js, economy.js, data/map*.js, wall buys, crate
```

## Controls

WASD move, mouse aim, left click fire, R reload, right click / V knife,
G grenade, Q decoy, E interact, H bandage, F flashlight, 1/2 or wheel switch
weapon. Hub: number keys craft, Enter deploy, N new run.

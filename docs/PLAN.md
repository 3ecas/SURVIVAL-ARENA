# Survival Arena – design plan

This document is the plan that was drawn up before writing code: the file layout
and the map layout. The code follows it.

## File structure

```
index.html                 canvas element + module script
style.css                  full-window canvas, no scrollbars
package.json               `npm start` (static server) and `npm run check-map`
tools/check-map.js         Node script that validates src/data/map.js

src/main.js                bootstrap, resize, fixed-step game loop
src/config.js              every tunable: sizes, speeds, health, points, prices,
                           round scaling, timings, colours, key bindings
src/input.js               keyboard + mouse -> per-frame intent object
src/game.js                Game state + orchestration of the systems
src/world.js               parses data/map.js into a runtime tile grid
                           (areas, doors, windows, wall buys, crate)
src/particles.js           particle pool (data + update, no drawing)

src/data/weapons.js        weapon definitions (pure data)
src/data/map.js            ASCII tile grid, areas, doors, wall buys (pure data)

src/entities/player.js     position, health/regen, points, inventory
src/entities/weapon.js     runtime state of one carried gun (ammo, reload, burst)
src/entities/zombie.js     climb-in, steering, attack windup/cooldown
src/entities/projectile.js bullet / explosive shell
src/entities/grenade.js    thrown, bounces, fuse
src/entities/decoy.js      thrown, attracts zombies, then explodes

src/systems/combat.js      firing, projectile sweeps, headshots, melee, damage
src/systems/scoring.js     point values -> player points/score + floaters
src/systems/rounds.js      round progression, scaling, spawn queue, window pick
src/systems/pathfinding.js flow field (BFS over walkable tiles)
src/systems/collision.js   circle-vs-tiles, circle-vs-circle separation
src/systems/economy.js     doors, wall buys, crate, interaction prompts
src/systems/explosions.js  area damage to zombies and (reduced) to the player

src/render/renderer.js     camera + draw order
src/render/camera.js       follow + clamp, screen<->world
src/render/world.js        static map (cached offscreen), doors, buys, crate
src/render/entities.js     player, zombies, projectiles, grenades, decoys
src/render/effects.js      particles, floaters, explosion rings, melee arc
src/render/hud.js          health, points, round, weapon, ammo, prompts, overlays

src/utils/math.js          vector helpers, random, segment/circle tests
```

Rules kept throughout:

- `config.js` and `data/` are the only places with literal tunables.
- `render/` files only draw; `systems/` and `entities/` never touch the canvas.
- `data/` files contain no logic.

## Map layout

Tile grid 46 x 34, tile size 40 px (1840 x 1360 px world). The camera follows
the player. Legend: `#` wall, `W` window (zombie entry), digit = floor of that
area, letter = door tile, `X` = mystery crate, `P` = player spawn.

```
col  0         1         2         3         4
     0123456789012345678901234567890123456789012345
 0   '                                              '
 1   ' ####W#####W#######W#####W##########W######## '
 2   ' #66666XX666666#3333333333333#44444444444444# '
 3   ' #6666666666666#3333333333333#44444444444444# '
 4   ' #6666666666666#3333333333333#44444444444444# '
 5   ' W6666666666666#33###333###33E44444####44444# '
 6   ' #6666666666666#33###333###33E44444####44444W '
 7   ' #66##6666##666#3333333333333#44444####44444# '
 8   ' #66##6666##666#3333333333333#44444444444444# '
 9   ' #6666666666666#33333###33333#44444444444444# '
10   ' #66666##666666#33333###33333#44444444444444# '
11   ' #66666##666666#3333333333333#######FF####### '
12   ' #6666666666666#3333333333333#22222222222222# '
13   ' #66##6666##666#3333333333333#22222222222222W '
14   ' #66##6666##666#33###333###33#222########222# '
15   ' W6666666666666I33###333###33C222########222# '
16   ' #6666666666666I3333333333333C222########222# '
17   ' #6666666666666#3333333333333#222########222# '
18   ' #6666666666666#3333333333333#222########222# '
19   ' #6666666666666#3333333333333#22222222222222W '
20   ' #6666666666666#3333333333333#22222222222222# '
21   ' ######HH############DD#############BB####### '
22   ' #5555555555555#0000000000000#11111111111111# '
23   ' #5555555555555#0000000000000#11111111111111# '
24   ' #55##555##5555#0000000000000#111##111111111# '
25   ' #55##555##5555#00000###00000#111##111111111W '
26   ' #5555555555555G00000###00000A11111111111111# '
27   ' W5555555555555G0000000000000A11111111111111# '
28   ' #55##555##5555#000000P000000#111111111##111# '
29   ' #55##555##5555#0000000000000#111111111##111# '
30   ' #5555555555555#0000000000000#11111111111111# '
31   ' #5555555555555#0000000000000#11111111111111# '
32   ' #######W##########W#####W###########W####### '
33   '                                              '
```

### Areas

| id | name           | shape                       | windows | wall buy               |
|----|----------------|-----------------------------|---------|------------------------|
| 0  | Start Room     | open room, centre pillar    | 2 (S)   | Pump Shotgun 750       |
| 1  | East Yard      | open room, two pillars      | 2 (S,E) | Vector SMG 1000        |
| 2  | East Hall      | ring corridor round a block | 2 (E)   | Trident Burst 1250     |
| 3  | Laboratory     | tall room with bench blocks | 2 (N)   | Commando AR 1500       |
| 4  | Generator Room | room around a generator     | 2 (N,E) | Marksman DMR 1750      |
| 5  | Storage        | shelf aisles                | 2 (S,W) | Commando AR 1500       |
| 6  | Armory         | tall room, pillars, crate   | 4       | Mystery crate 950      |

### Doors (price rises with distance from the start)

| door | connects              | price |
|------|-----------------------|-------|
| A    | Start – East Yard     | 500   |
| B    | East Yard – East Hall | 750   |
| C    | East Hall – Lab       | 1000  |
| D    | Start – Lab           | 1000  |
| E    | Lab – Generator       | 1250  |
| F    | East Hall – Generator | 1250  |
| G    | Start – Storage       | 1500  |
| H    | Storage – Armory      | 1750  |
| I    | Lab – Armory          | 1750  |

### Loops

- Start → East Yard → East Hall → Lab → Start (doors A, B, C, D).
- East Hall → Generator → Lab → East Hall (doors F, E, C).
- Start → Storage → Armory → Lab → Start (doors G, H, I, D).
- Inside every room the pillars/blocks give a local kiting circle, and the
  East Hall is a pure ring corridor.

There are no dead-end rooms: every area has at least two doors except the
Generator Room and Armory, which each have two doors as well (E/F and H/I).
Windows are only on the outer wall; only windows of unlocked areas spawn.

## Build order

1. map + player movement  2. shooting  3. zombies, pathfinding, separation
4. rounds  5. scoring  6. doors + wall buys  7. crate  8. grenades + decoy
9. HUD  10. balance pass (round 1 easy with pistol, round 10 hard without
upgrades).

# Survival Arena – design plan (v3: rounds, hub progression, buildings)

## Concept

Top-down survival shooter with rogue-lite structure. A run is a sequence of
levels; each level is a generated building where you survive a number of
rounds of zombies climbing in through the windows. Between levels you are in
the **hub**: next-map briefing, gear & inventory (attributes, loadout),
armory (unlock guns with score and weapon parts, craft consumables from
resources). Kills give score and experience; player levels give attribute
points. Death ends the run; best level and score are kept.

## Run structure

```
hub  --deploy-->  level N (rounds 1..R)  --all cleared-->  hub (level N+1)
                                        --death-->        hub (run reset)
```

Between levels ammo is refilled; health, resources, consumables, unlocks,
XP and attributes carry over. Saved in localStorage after every hub action.

## Map generation (src/mapgen/generator.js)

Architectural, not noise:

1. BSP-split the building into rectangular rooms (4-14 tiles a side);
   the split lines are 1-tile walls.
2. Pick an entrance room on the border; turn ~20% of rooms into courtyards
   (void) so interior rooms get windows too; keep the room graph connected.
3. Group rooms into areas (farthest-point seeds, BFS growth). Rooms of one
   area are joined by 2-3 tile openings (spanning tree + extras); areas are
   joined by 2-tile doors (spanning tree + loop edges so each area has two).
4. 1x1 / 2x2 pillars in big rooms, an entrance on the outer ring, windows
   spread along walls that face the outside or a courtyard, a ceiling light
   at the centre of the biggest rooms of each area.
5. Validate with src/mapgen/validate.js; retry the seed on failure.

Levels grow from 30x22 to a 62x46 cap (`LEVELS` in config.js).

## Rounds (src/systems/rounds.js)

Level L has 3 + L/2 rounds (max 8). Round r spawns
4 + 2(r-1) + 2(L-1) zombies with 150 + 25(L-1) + 12(r-1) health; runners
appear from level 3, never in a level's first round. Zombies only spawn from
windows in rooms the player has opened up (reachable through open doors).
Round cleared: +100 score, +30 XP. Level cleared: +300 x L score, +80 x L XP,
then back to the hub after a few seconds.

## Progression

- XP thresholds grow by 1.35 per player level; each level gives 1 point.
- Attributes: Vitality (+10 max health), Agility (+4% speed),
  Handling (-7% reload time), Power (+5% damage). Max 10 each.
- Armory unlocks cost score and weapon parts and require a player level
  (src/data/armory.js). Unlocked guns can be equipped in either slot.
- Consumables (bandage, grenade, decoy) are crafted from cloth/scrap/parts.

## Lighting

Darkness overlay; the player glow, the flashlight cone and lit lamps are cut
out with radial falloff. Visibility is an exact grid raycast; every wall
tile a ray hits is lit as a whole block with the same falloff, so the wall
piece in the flashlight beam and the walls around a ceiling light are bright.

## Controls

WASD move, mouse aim, left click fire, R reload, right click / V knife,
G grenade, Q decoy, E interact (doors, lights), H bandage, F flashlight,
1/2 or wheel switch weapon. Hub: Tab / A / D switch section, W/S move,
Enter select, Q active weapon, Space deploy, N new run.

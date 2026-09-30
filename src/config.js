// Every tunable number in the game lives here (or in src/data/).

export const TILE_SIZE = 40;

export const LOOP = {
  FIXED_STEP: 1 / 60,
  MAX_STEPS_PER_FRAME: 5,
  MAX_FRAME_DT: 0.1,
};

export const CONTROLS = {
  UP: ['KeyW', 'ArrowUp'],
  DOWN: ['KeyS', 'ArrowDown'],
  LEFT: ['KeyA', 'ArrowLeft'],
  RIGHT: ['KeyD', 'ArrowRight'],
  RELOAD: ['KeyR'],
  MELEE: ['KeyV'],
  GRENADE: ['KeyG'],
  DECOY: ['KeyQ'],
  INTERACT: ['KeyE'],
  HEAL: ['KeyH'],
  FLASHLIGHT: ['KeyF'],
  WEAPON_1: ['Digit1'],
  WEAPON_2: ['Digit2'],
  CRAFT: ['Enter'],
  DEPLOY: ['Space'],
  NEXT_PANEL: ['Tab'],
  NEW_RUN: ['KeyN'],
  FIRE_BUTTON: 0,
  MELEE_BUTTON: 2,
};

export const PLAYER = {
  RADIUS: 14,
  SPEED: 170,
  MAX_HEALTH: 100,
  REGEN_DELAY: 6,
  REGEN_RATE: 0, // no passive regeneration in expedition mode; use bandages
  START_GRENADES: 1,
  MAX_GRENADES: 4,
  START_DECOYS: 1,
  MAX_DECOYS: 2,
  START_BANDAGES: 1,
  MAX_BANDAGES: 5,
  BANDAGE_HEAL: 40,
  BANDAGE_TIME: 2.5,
  MAX_WEAPONS: 2,
  INTERACT_RANGE: 70,
  PICKUP_RANGE: 26,
  AIM_LINE_LENGTH: 24,
  DAMAGE_FLASH_TIME: 0.3,
  THROW_COOLDOWN: 0.5,
};

export const MELEE = {
  NAME: 'Knife',
  RANGE: 52,
  ARC: Math.PI * 0.9,
  DAMAGE: 150,
  COOLDOWN: 0.65,
  SWING_TIME: 0.16,
};

export const ZOMBIE = {
  RADIUS: 14,
  HEAD_RADIUS: 6,
  BASE_HEALTH: 150,
  HEALTH_PER_LEVEL: 25,
  HEALTH_PER_ROUND: 12,
  WALKER_SPEED: 52,
  WALKER_SPEED_PER_LEVEL: 2,
  WALKER_MAX_SPEED: 85,
  RUNNER_SPEED: 110,
  RUNNER_SPEED_PER_LEVEL: 3,
  RUNNER_MAX_SPEED: 145,
  ATTACK_REACH: 10,
  ATTACK_DAMAGE: 25,
  ATTACK_WINDUP: 0.4,
  ATTACK_LANDING_TOLERANCE: 1.3,
  ATTACK_COOLDOWN: 1.0,
  CLIMB_TIME: 1.6,
  HIT_FLASH_TIME: 0.12,
  SPEED_VARIANCE: 0.1,
  SEPARATION_ITERATIONS: 3,
  PLAYER_PUSH_SHARE: 0.25,
};

// How maps and their contents scale with the level number.
export const LEVELS = {
  BASE_WIDTH: 30,
  BASE_HEIGHT: 22,
  WIDTH_PER_LEVEL: 4,
  HEIGHT_PER_LEVEL: 3,
  MAX_WIDTH: 62,
  MAX_HEIGHT: 46,
  BASE_AREAS: 4,
  AREAS_PER_LEVEL: 0.5,
  MAX_AREAS: 9,
  WINDOWS_PER_AREA: 2,
  LIGHTS_PER_AREA: [1, 2],
  // Rounds per level and zombies per round.
  BASE_ROUNDS: 3,
  ROUNDS_PER_LEVEL: 0.34,
  MAX_ROUNDS: 6,
  ROUND_BASE_COUNT: 4,
  ROUND_COUNT_PER_ROUND: 2,
  ROUND_COUNT_PER_LEVEL: 1.5,
  RUNNER_START_LEVEL: 3,
  RUNNER_SHARE_PER_LEVEL: 0.08,
  RUNNER_MAX_SHARE: 0.45,
  SPAWN_INTERVAL: 2.0,
  SPAWN_INTERVAL_PER_LEVEL: 0.1,
  MIN_SPAWN_INTERVAL: 0.7,
  MAX_ALIVE: 12,
  MAX_ALIVE_PER_LEVEL: 1,
  MAX_ALIVE_CAP: 26,
  FIRST_ROUND_DELAY: 5,
  INTERMISSION: 6,
  LEVEL_COMPLETE_DELAY: 4,
  WINDOW_SAME_AREA_WEIGHT: 3,
  WINDOW_DISTANCE_SOFTENING: 300,
  // Loot budget per level: base + per level.
  LOOT: {
    scrap: { base: 4, perLevel: 1 },
    cloth: { base: 2, perLevel: 0.5 },
    ammo: { base: 4, perLevel: 1 },
    medkit: { base: 1, perLevel: 0.3 },
    parts: { base: 1, perLevel: 0.5 },
    grenade: { base: 1, perLevel: 0.3 },
    decoy: { base: 0, perLevel: 0.25 },
  },
  AMMO_BOX_FRACTION: 0.5, // of the current weapon's magazine size, per box
  ZOMBIE_AMMO_DROP_CHANCE: 0.12,
};

// Experience and character progression.
export const XP = {
  KILL_WALKER: 10,
  KILL_RUNNER: 16,
  HEADSHOT_BONUS: 4,
  ROUND_CLEAR: 30,
  LEVEL_CLEAR_PER_LEVEL: 80,
  BASE_TO_NEXT: 120,
  GROWTH: 1.35,
  POINTS_PER_LEVEL: 1,
};

export const CAMERA = {
  ZOOM: 1.6,
  LOOKAHEAD: 0.28, // fraction of the aim offset the camera leads toward
  MAX_LOOKAHEAD: 140,
  SMOOTHING: 6, // higher = snappier
  CLAMP_TO_MAP: false, // false: always centred on the player
  SHAKE_DECAY: 14,
};

export const LIGHTING = {
  AMBIENT: 0.93, // darkness alpha over unlit areas
  PLAYER_GLOW_RADIUS: 80,
  FLASHLIGHT_ANGLE: Math.PI / 3,
  FLASHLIGHT_LENGTH: 460,
  FLASHLIGHT_RAYS: 140,
  ROOM_LIGHT_RADIUS: 210,
  ROOM_LIGHT_RAYS: 180,
  FULL_BRIGHT_FRACTION: 0.55, // part of a light's radius that is fully lit
  WALL_LIGHT_DEPTH: 6, // px a light reaches into a wall so the wall face is lit
  LIGHT_RADIUS: 8, // hit circle of a lamp
  LIGHT_HEALTH: 30,
  LIGHTS_ON_CHANCE: 0.5,
};

export const POINTS = {
  HIT: 10,
  KILL: 50,
  HEADSHOT_KILL: 100,
  MELEE_KILL: 130,
  ROUND_CLEAR: 100,
  LEVEL_CLEAR_PER_LEVEL: 300,
};

export const COMBAT = {
  HEADSHOT_MULTIPLIER: 2,
  BULLET_SPEED: 1500,
  BULLET_MAX_DISTANCE: 1400,
  BULLET_RADIUS: 2,
  BULLET_RAY_STEP: 6,
  MUZZLE_OFFSET: 6,
};

export const EXPLOSION = {
  PLAYER_DAMAGE_FACTOR: 0.3,
  PLAYER_MAX_DAMAGE: 60,
  EDGE_DAMAGE_FRACTION: 0.35,
  RING_TIME: 0.4,
  PARTICLES: 28,
  SHAKE: 8,
};

export const GRENADE = {
  RADIUS: 6,
  FRICTION: 3,
  MIN_THROW_DISTANCE: 60,
  MAX_THROW_DISTANCE: 420,
  FUSE: 1.5,
  DAMAGE: 450,
  BLAST_RADIUS: 130,
  BOUNCE: 0.45,
};

export const DECOY = {
  RADIUS: 7,
  FRICTION: 3,
  MIN_THROW_DISTANCE: 60,
  MAX_THROW_DISTANCE: 380,
  SETTLE_SPEED: 12,
  DURATION: 6,
  DAMAGE: 300,
  BLAST_RADIUS: 110,
  PULSE_INTERVAL: 0.5,
  PULSE_RADIUS: 60,
  BOUNCE: 0.45,
};

export const PATHFINDING = {
  RECALC_INTERVAL: 0.35,
};

export const FLOATERS = {
  LIFE: 0.9,
  RISE_SPEED: 45,
  SMALL_SIZE: 13,
  BIG_SIZE: 18,
  SPREAD: 10,
};

export const PARTICLES = {
  MAX: 600,
  BLOOD_COUNT: 5,
  BLOOD_SPEED: 120,
  BLOOD_LIFE: 0.45,
  HEADSHOT_COUNT: 14,
  HEADSHOT_SPEED: 180,
  HEADSHOT_LIFE: 0.5,
  DEATH_COUNT: 12,
  DEATH_SPEED: 90,
  DEATH_LIFE: 0.6,
  MUZZLE_COUNT: 3,
  MUZZLE_SPEED: 260,
  MUZZLE_LIFE: 0.08,
  EXPLOSION_SPEED: 320,
  EXPLOSION_LIFE: 0.55,
  GLASS_COUNT: 10,
  GLASS_SPEED: 140,
  GLASS_LIFE: 0.4,
  DRAG: 4,
};

export const ITEMS = {
  RADIUS: 9,
  BOB_SPEED: 3,
  BOB_HEIGHT: 2,
};

export const STORAGE_KEY = 'survival-arena.run';

export const COLORS = {
  BACKGROUND: '#0b0d10',
  VOID: '#0f1114',
  WALL: '#4a4f5a',
  WALL_EDGE: '#5d6370',
  FLOOR_GRID: 'rgba(255,255,255,0.03)',
  FLOOR_BY_AREA: ['#2c3140', '#2b3a30', '#3a2f2f', '#2e3648', '#3b3729', '#352d3c', '#2a3a3a', '#3a3030', '#2d3838'],
  WINDOW_FRAME: '#3a2a1c',
  WINDOW_PLANK: '#8a5a2b',
  WINDOW_BOARDED: '#c9955a',
  ENTRANCE: '#2f6f8f',
  ENTRANCE_EDGE: '#7fd0f0',
  DOOR_CLOSED: '#6b4a32',
  DOOR_CLOSED_EDGE: '#a8763f',
  DOOR_OPEN: 'rgba(168,118,63,0.25)',
  DOOR_TEXT: '#ffe0c2',
  LIGHT_ON: '#ffe9a8',
  LIGHT_OFF: '#6f6a55',
  LIGHT_BROKEN: '#3b3830',
  LIGHT_GLOW: 'rgba(255,233,168,0.9)',
  FLASHLIGHT: 'rgba(255,250,230,1)',
  PLAYER: '#4fc3f7',
  PLAYER_OUTLINE: '#e3f7ff',
  PLAYER_AIM: '#ffffff',
  PLAYER_DAMAGE: 'rgba(255,60,60,0.55)',
  ZOMBIE_WALKER: '#6aa84f',
  ZOMBIE_WALKER_HEAD: '#3c6b2a',
  ZOMBIE_RUNNER: '#c0504d',
  ZOMBIE_RUNNER_HEAD: '#6d2323',
  ZOMBIE_WINDUP: '#ffd27f',
  ZOMBIE_FLASH: '#ffffff',
  ZOMBIE_HP_BACK: 'rgba(0,0,0,0.6)',
  ZOMBIE_HP: '#d9534f',
  BULLET: '#ffe28a',
  EXPLOSIVE_SHELL: '#ff8a3d',
  GRENADE: '#2f3b2f',
  GRENADE_FUSE: '#ffb347',
  DECOY: '#4dd0e1',
  DECOY_PULSE: 'rgba(77,208,225,0.5)',
  EXPLOSION_RING: 'rgba(255,170,60,0.8)',
  BLOOD: '#7a1f1f',
  HEADSHOT: '#ffe066',
  DEATH: '#3d5a2a',
  MUZZLE: '#fff3b0',
  GLASS: '#d8f0ff',
  MELEE_ARC: 'rgba(255,255,255,0.35)',
  ITEM_OUTLINE: '#ffffff',
  HUD_TEXT: '#ffffff',
  HUD_DIM: 'rgba(255,255,255,0.6)',
  HUD_PANEL: 'rgba(0,0,0,0.45)',
  HUD_PANEL_EDGE: 'rgba(255,255,255,0.15)',
  HEALTH: '#4caf50',
  HEALTH_LOW: '#e53935',
  HEALTH_BACK: 'rgba(255,255,255,0.15)',
  POINTS: '#ffd54f',
  OBJECTIVE_DONE: '#8fd18f',
  OBJECTIVE_OPEN: '#ffffff',
  FLOATER_HIT: '#ffffff',
  FLOATER_KILL: '#ffd54f',
  FLOATER_HEADSHOT: '#ffe066',
  FLOATER_MELEE: '#ff8a65',
  FLOATER_PICKUP: '#8fd18f',
  FLOATER_BAD: '#ef5350',
  ANNOUNCE: '#ff5252',
  SUCCESS: '#8fd18f',
  XP: '#b39ddb',
  XP_BACK: 'rgba(179,157,219,0.2)',
  HUB_PANEL: 'rgba(255,255,255,0.04)',
  HUB_PANEL_FOCUS: 'rgba(79,195,247,0.5)',
  LOCKED: 'rgba(255,255,255,0.35)',
  PROMPT_BACK: 'rgba(0,0,0,0.7)',
  OVERLAY: 'rgba(0,0,0,0.75)',
  HUB_BACKGROUND: '#101318',
  HUB_ACCENT: '#4fc3f7',
  HUB_DISABLED: 'rgba(255,255,255,0.3)',
};

export const HUD = {
  MARGIN: 20,
  HEALTH_WIDTH: 240,
  HEALTH_HEIGHT: 16,
  LOW_HEALTH_FRACTION: 0.35,
  FONT: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  FONT_SIZE: 16,
  FONT_SIZE_LARGE: 26,
  FONT_SIZE_TITLE: 64,
  PROMPT_Y_FRACTION: 0.72,
  ANNOUNCE_TIME: 3,
  ANNOUNCE_FADE: 0.6,
  INVENTORY_ICON: 14,
};

export const HUB = {
  COLUMN_GAP: 24,
  LINE: 22,
  TITLE_SIZE: 30,
  HEADING_SIZE: 17,
  TEXT_SIZE: 14,
  PADDING: 22,
  PANEL_RADIUS: 8,
  PANEL_PAD: 16,
};

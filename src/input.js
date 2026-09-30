// Keyboard + mouse, turned into a per-frame intent object. Nothing else in the
// game touches DOM events, so touch controls can be added here later.

import { CONTROLS } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keysDown = new Set();
    this.keysPressed = new Set();
    this.buttonsDown = new Set();
    this.buttonsPressed = new Set();
    this.mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    this.wheel = 0;
    this.click = false;
    this.doubleClick = false;
    this.lastClick = { time: -Infinity, x: 0, y: 0 };
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keysDown.add(e.code);
      this.keysPressed.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));
    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.buttonsDown.clear();
    });
    this.canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      this.buttonsDown.add(e.button);
      this.buttonsPressed.add(e.button);
      if (e.button === CONTROLS.FIRE_BUTTON) {
        const now = performance.now();
        const near = Math.hypot(e.clientX - this.lastClick.x, e.clientY - this.lastClick.y) <= CONTROLS.DOUBLE_CLICK_DISTANCE;
        const isDouble = near && now - this.lastClick.time <= CONTROLS.DOUBLE_CLICK_TIME;
        this.click = true;
        this.doubleClick = this.doubleClick || isDouble; // sticky until the frame ends
        this.lastClick = { time: isDouble ? -Infinity : now, x: e.clientX, y: e.clientY };
      }
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => this.buttonsDown.delete(e.button));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
  }

  anyDown(codes) {
    return codes.some((c) => this.keysDown.has(c));
  }

  anyPressed(codes) {
    return codes.some((c) => this.keysPressed.has(c));
  }

  // Snapshot of the player's intent for this frame.
  getFrame() {
    let moveX = 0;
    let moveY = 0;
    if (this.anyDown(CONTROLS.LEFT)) moveX -= 1;
    if (this.anyDown(CONTROLS.RIGHT)) moveX += 1;
    if (this.anyDown(CONTROLS.UP)) moveY -= 1;
    if (this.anyDown(CONTROLS.DOWN)) moveY += 1;

    let weaponSlot = -1;
    if (this.anyPressed(CONTROLS.WEAPON_1)) weaponSlot = 0;
    if (this.anyPressed(CONTROLS.WEAPON_2)) weaponSlot = 1;

    return {
      moveX,
      moveY,
      aimScreen: { x: this.mouse.x, y: this.mouse.y },
      clickPressed: this.click,
      doubleClickPressed: this.doubleClick,
      fireHeld: this.buttonsDown.has(CONTROLS.FIRE_BUTTON),
      firePressed: this.buttonsPressed.has(CONTROLS.FIRE_BUTTON),
      meleePressed: this.buttonsPressed.has(CONTROLS.MELEE_BUTTON) || this.anyPressed(CONTROLS.MELEE),
      reloadPressed: this.anyPressed(CONTROLS.RELOAD),
      grenadePressed: this.anyPressed(CONTROLS.GRENADE),
      decoyPressed: this.anyPressed(CONTROLS.DECOY),
      interactPressed: this.anyPressed(CONTROLS.INTERACT),
      healPressed: this.anyPressed(CONTROLS.HEAL),
      flashlightPressed: this.anyPressed(CONTROLS.FLASHLIGHT),
      navUpPressed: this.anyPressed(CONTROLS.UP),
      navDownPressed: this.anyPressed(CONTROLS.DOWN),
      navLeftPressed: this.anyPressed(CONTROLS.LEFT),
      navRightPressed: this.anyPressed(CONTROLS.RIGHT),
      nextPanelPressed: this.anyPressed(CONTROLS.NEXT_PANEL),
      craftPressed: this.anyPressed(CONTROLS.CRAFT),
      deployPressed: this.anyPressed(CONTROLS.DEPLOY),
      newRunPressed: this.anyPressed(CONTROLS.NEW_RUN),
      weaponSlot,
      weaponScroll: Math.sign(this.wheel),
    };
  }

  // Same frame with all one-shot presses removed (for extra fixed steps).
  static withoutEdges(frame) {
    return {
      ...frame,
      clickPressed: false,
      doubleClickPressed: false,
      firePressed: false,
      meleePressed: false,
      reloadPressed: false,
      grenadePressed: false,
      decoyPressed: false,
      interactPressed: false,
      healPressed: false,
      flashlightPressed: false,
      navUpPressed: false,
      navDownPressed: false,
      navLeftPressed: false,
      navRightPressed: false,
      nextPanelPressed: false,
      craftPressed: false,
      deployPressed: false,
      newRunPressed: false,
      weaponSlot: -1,
      weaponScroll: 0,
    };
  }

  endFrame() {
    this.keysPressed.clear();
    this.buttonsPressed.clear();
    this.wheel = 0;
    this.click = false;
    this.doubleClick = false;
  }
}

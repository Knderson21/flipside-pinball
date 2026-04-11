// ─── Input State ─────────────────────────────────────────────────────────────

export interface InputState {
  leftFlipper: boolean;
  rightFlipper: boolean;
  /** True while the plunger key/touch is held */
  plungerHeld: boolean;
  /** True for exactly one frame when the plunger is released */
  plungerJustReleased: boolean;
  /** True for exactly one frame when the start action is triggered */
  startGame: boolean;
}

type TouchZone = 'left' | 'right' | 'plunger';

// ─── InputManager ─────────────────────────────────────────────────────────────

/**
 * Listens to keyboard and touch events and exposes a flat InputState.
 * Call `clearFrameFlags()` once per game loop tick to reset one-shot flags.
 */
export class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private state: InputState = {
    leftFlipper: false,
    rightFlipper: false,
    plungerHeld: false,
    plungerJustReleased: false,
    startGame: false,
  };

  /** Maps touch identifier → zone so we can handle multi-touch correctly */
  private activeTouches = new Map<number, TouchZone>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindKeyboard();
    this.bindTouch();
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  /** Call once per frame after consuming the state to reset one-shot flags. */
  clearFrameFlags(): void {
    this.state.plungerJustReleased = false;
    this.state.startGame = false;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
  }

  // ─── Keyboard ───────────────────────────────────────────────────────────────

  private bindKeyboard(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyZ':
      case 'ArrowLeft':
        this.state.leftFlipper = true;
        break;
      case 'KeyX':
      case 'ArrowRight':
        this.state.rightFlipper = true;
        break;
      case 'Space':
        e.preventDefault(); // prevent page scroll
        this.state.plungerHeld = true;
        break;
      case 'Enter':
        this.state.startGame = true;
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyZ':
      case 'ArrowLeft':
        this.state.leftFlipper = false;
        break;
      case 'KeyX':
      case 'ArrowRight':
        this.state.rightFlipper = false;
        break;
      case 'Space':
        e.preventDefault();
        if (this.state.plungerHeld) {
          this.state.plungerHeld = false;
          this.state.plungerJustReleased = true;
          this.state.startGame = true; // also acts as start in attract/gameover
        }
        break;
      case 'Enter':
        this.state.startGame = true;
        break;
    }
  };

  // ─── Touch ──────────────────────────────────────────────────────────────────

  private bindTouch(): void {
    const opts: AddEventListenerOptions = { passive: false };
    this.canvas.addEventListener('touchstart', this.onTouchStart, opts);
    this.canvas.addEventListener('touchend', this.onTouchEnd, opts);
    this.canvas.addEventListener('touchcancel', this.onTouchEnd, opts);
    this.canvas.addEventListener('touchmove', this.onTouchMove, opts);
  }

  private classifyTouch(touch: Touch): TouchZone {
    const rect = this.canvas.getBoundingClientRect();
    const relX = (touch.clientX - rect.left) / rect.width;
    if (relX < 0.40) return 'left';
    if (relX > 0.60) return 'right';
    return 'plunger';
  }

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      const zone = this.classifyTouch(touch);
      this.activeTouches.set(touch.identifier, zone);
      this.applyTouchZone(zone, true);
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      const zone = this.activeTouches.get(touch.identifier);
      if (zone !== undefined) {
        this.activeTouches.delete(touch.identifier);
        // Only deactivate the zone if no other active touch is using it
        const stillActive = Array.from(this.activeTouches.values()).includes(zone);
        if (!stillActive) {
          this.applyTouchZone(zone, false);
          // Releasing the plunger zone sets the "just released" flag
          if (zone === 'plunger' && this.state.plungerHeld) {
            this.state.plungerHeld = false;
            this.state.plungerJustReleased = true;
            this.state.startGame = true;
          }
        }
      }
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    // Reclassify moved touches (thumb may slide into adjacent zone)
    for (const touch of Array.from(e.changedTouches)) {
      const oldZone = this.activeTouches.get(touch.identifier);
      const newZone = this.classifyTouch(touch);
      if (oldZone !== undefined && oldZone !== newZone) {
        // Deactivate old zone if not used by another touch
        const stillActive = Array.from(this.activeTouches.values()).filter(z => z === oldZone).length > 1;
        if (!stillActive) this.applyTouchZone(oldZone, false);
        this.activeTouches.set(touch.identifier, newZone);
        this.applyTouchZone(newZone, true);
      }
    }
  };

  private applyTouchZone(zone: TouchZone, active: boolean): void {
    switch (zone) {
      case 'left':
        this.state.leftFlipper = active;
        if (active) this.state.startGame = true;
        break;
      case 'right':
        this.state.rightFlipper = active;
        if (active) this.state.startGame = true;
        break;
      case 'plunger':
        if (active) {
          this.state.plungerHeld = true;
          this.state.startGame = true;
        }
        // Release is handled in onTouchEnd to set plungerJustReleased
        break;
    }
  }
}

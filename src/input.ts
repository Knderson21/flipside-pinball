// ─── Input State ─────────────────────────────────────────────────────────────

export interface InputState {
  leftFlipper: boolean;
  rightFlipper: boolean;
  plungerHeld: boolean;
  /** True for exactly one frame when the plunger is released */
  plungerJustReleased: boolean;
  /** True for exactly one frame when the start action is triggered */
  startGame: boolean;
  /** True for exactly one frame when the theme-swap key is pressed */
  swapTheme: boolean;
}

type TouchZone = 'left' | 'right' | 'plunger' | 'themeSwap';

/**
 * Listens to keyboard and touch events and exposes a flat InputState.
 * Call `clearFrameFlags()` once per game-loop tick to reset one-shot flags.
 */
export class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private state: InputState = {
    leftFlipper: false,
    rightFlipper: false,
    plungerHeld: false,
    plungerJustReleased: false,
    startGame: false,
    swapTheme: false,
  };

  private activeTouches = new Map<number, TouchZone>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindKeyboard();
    this.bindTouch();
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  clearFrameFlags(): void {
    this.state.plungerJustReleased = false;
    this.state.startGame = false;
    this.state.swapTheme = false;
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
      case 'Slash':
      case 'ArrowRight':
        this.state.rightFlipper = true;
        break;
      case 'Space':
        e.preventDefault();
        this.state.plungerHeld = true;
        break;
      case 'Enter':
        this.state.startGame = true;
        break;
      case 'KeyF':
        this.state.swapTheme = true;
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyZ':
      case 'ArrowLeft':
        this.state.leftFlipper = false;
        break;
      case 'Slash':
      case 'ArrowRight':
        this.state.rightFlipper = false;
        break;
      case 'Space':
        e.preventDefault();
        if (this.state.plungerHeld) {
          this.state.plungerHeld = false;
          this.state.plungerJustReleased = true;
          this.state.startGame = true;
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
    const relY = (touch.clientY - rect.top) / rect.height;
    // Top 8% of screen = theme swap zone
    if (relY < 0.08) return 'themeSwap';
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
        const stillActive = Array.from(this.activeTouches.values()).includes(zone);
        if (!stillActive) {
          this.applyTouchZone(zone, false);
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
    for (const touch of Array.from(e.changedTouches)) {
      const oldZone = this.activeTouches.get(touch.identifier);
      const newZone = this.classifyTouch(touch);
      if (oldZone !== undefined && oldZone !== newZone) {
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
        break;
      case 'themeSwap':
        if (active) this.state.swapTheme = true;
        break;
    }
  }
}

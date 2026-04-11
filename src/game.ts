import type { Ball, Bumper, GameState, Plunger } from './types';
import {
  BALLS_PER_GAME,
  BALL_RADIUS,
  BUMPER_LIT_DURATION_MS,
  DEFAULT_BUMPERS,
  BUMPER_RADIUS,
  GUIDE_WALLS,
  HIGH_SCORE_KEY,
  TABLE,
} from './constants';
import {
  collideBallBumper,
  collideBallFlipper,
  collideBallSegment,
  collideBallWalls,
  DRAIN_DELAY_MS,
  isBallDrained,
  launchBall,
  makeLeftFlipper,
  makeRightFlipper,
  stepBall,
  updateFlipper,
  updatePlunger,
} from './physics';
import { Renderer } from './renderer';
import { InputManager } from './input';
import { defaultTheme } from './theme';

// ─── Game ─────────────────────────────────────────────────────────────────────

export class Game {
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly state: GameState;
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, defaultTheme);
    this.input = new InputManager(canvas);
    this.state = this.buildInitialState();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  start(): void {
    this.rafId = requestAnimationFrame(this.loop);
  }

handleResize(windowW: number, windowH: number): void {
    this.renderer.resize(windowW, windowH);
  }

  // ─── Game Loop ───────────────────────────────────────────────────────────────

  private loop = (timestamp: number): void => {
    // Cap dt to ~2 frames to keep physics stable after tab-backgrounding
    const dtMs = Math.min(timestamp - this.state.lastFrameTime, 32);
    this.state.lastFrameTime = timestamp;

    this.handleInput(dtMs);
    this.update(dtMs);
    this.renderer.render(this.state);
    this.input.clearFrameFlags();

    this.rafId = requestAnimationFrame(this.loop);
  };

  // ─── Input → State ──────────────────────────────────────────────────────────

  private handleInput(dtMs: number): void {
    const input = this.input.getState();
    const { state } = this;

    // Start-game action
    if (input.startGame) {
      if (state.phase === 'attract' || state.phase === 'gameover') {
        this.initGame();
        return;
      }
    }

    // Flipper state
    state.flippers[0].isActive = input.leftFlipper;
    state.flippers[1].isActive = input.rightFlipper;

    // Plunger charging
    if (state.phase === 'launching') {
      state.plunger.charging = input.plungerHeld;
    }

    void dtMs; // dtMs not needed here but kept for symmetry
  }

  // ─── Per-Frame Update ────────────────────────────────────────────────────────

  private update(dtMs: number): void {
    const { state } = this;

    // Always update flippers regardless of phase (they can animate during launching)
    updateFlipper(state.flippers[0], dtMs);
    updateFlipper(state.flippers[1], dtMs);

    switch (state.phase) {
      case 'launching':
        this.updateLaunching(dtMs);
        break;
      case 'playing':
        this.updatePlaying(dtMs);
        break;
      case 'draining':
        this.updateDraining(dtMs);
        break;
      default:
        break;
    }
  }

  private updateLaunching(dtMs: number): void {
    const { state } = this;
    const input = this.input.getState();

    updatePlunger(state.plunger, dtMs);

    // Lock ball position in the plunger lane (compresses visually with charge)
    state.ball.position.x = TABLE.BALL_SPAWN_X;
    state.ball.position.y = TABLE.BALL_SPAWN_Y - state.plunger.charge * 0.04;
    state.ball.velocity.x = 0;
    state.ball.velocity.y = 0;
    state.ball.active = true;

    // Launch on release – require a minimum charge so that releasing Space to
    // dismiss the attract screen doesn't trigger an immediate zero-velocity launch.
    if (input.plungerJustReleased && state.plunger.charge > 0.02) {
      launchBall(state.ball, state.plunger);
      state.phase = 'playing';
    }
  }

  private updatePlaying(dtMs: number): void {
    const { state } = this;

    stepBall(state.ball, dtMs);
    collideBallWalls(state.ball);

    // Bumper collisions
    for (const bumper of state.bumpers) {
      const result = collideBallBumper(state.ball, bumper);
      if (result) {
        state.score += bumper.scoreValue;
        bumper.lit = true;
        bumper.litTimer = BUMPER_LIT_DURATION_MS;
      }
      // Tick down bumper lit timer
      if (bumper.lit) {
        bumper.litTimer -= dtMs;
        if (bumper.litTimer <= 0) {
          bumper.lit = false;
          bumper.litTimer = 0;
        }
      }
    }

    // Guide wall collisions (angled walls near flippers)
    for (const seg of GUIDE_WALLS) {
      collideBallSegment(state.ball, seg.x1, seg.y1, seg.x2, seg.y2);
    }

    // Flipper collisions
    collideBallFlipper(state.ball, state.flippers[0]);
    collideBallFlipper(state.ball, state.flippers[1]);

    // If the ball reached the lane floor (weak launch fell back down), reset to
    // launching without costing a ball. Check this before the drain test so
    // the floor wall always wins over the drain line for lane-side balls.
    if (
      state.ball.position.x > TABLE.PLUNGER_LANE_LEFT &&
      state.ball.position.y + state.ball.radius >= TABLE.LANE_FLOOR_Y
    ) {
      this.initBall();
      state.phase = 'launching';
      return;
    }

    // Detect drain
    if (isBallDrained(state.ball)) {
      state.ball.active = false;
      state.ballsRemaining -= 1;
      state.phase = 'draining';
      state.drainTimer = 0;
    }
  }

  private updateDraining(dtMs: number): void {
    const { state } = this;
    state.drainTimer += dtMs;

    if (state.drainTimer >= DRAIN_DELAY_MS) {
      if (state.ballsRemaining > 0) {
        this.initBall();
        state.phase = 'launching';
      } else {
        this.saveHighScore();
        state.phase = 'gameover';
      }
    }
  }

  // ─── State Builders ──────────────────────────────────────────────────────────

  private buildInitialState(): GameState {
    return {
      phase: 'attract',
      score: 0,
      highScore: this.loadHighScore(),
      ballsRemaining: BALLS_PER_GAME,
      ball: this.makeBall(),
      flippers: [makeLeftFlipper(), makeRightFlipper()],
      bumpers: this.makeBumpers(),
      plunger: this.makePlunger(),
      lastFrameTime: performance.now(),
      drainTimer: 0,
    };
  }

  private initGame(): void {
    const { state } = this;
    state.score = 0;
    state.ballsRemaining = BALLS_PER_GAME;
    state.flippers[0] = makeLeftFlipper();
    state.flippers[1] = makeRightFlipper();
    state.bumpers = this.makeBumpers();
    this.initBall();
    state.phase = 'launching';
  }

  private initBall(): void {
    const { state } = this;
    state.ball = this.makeBall();
    state.plunger = this.makePlunger();
    state.drainTimer = 0;
  }

  private makeBall(): Ball {
    return {
      position: { x: TABLE.BALL_SPAWN_X, y: TABLE.BALL_SPAWN_Y },
      velocity: { x: 0, y: 0 },
      radius: BALL_RADIUS,
      active: true,
    };
  }

  private makePlunger(): Plunger {
    return { charge: 0, charging: false, launched: false };
  }

  private makeBumpers(): Bumper[] {
    return DEFAULT_BUMPERS.map((def, i) => ({
      id: `bumper-${i}`,
      position: { x: def.x, y: def.y },
      radius: BUMPER_RADIUS,
      scoreValue: def.score,
      lit: false,
      litTimer: 0,
    }));
  }

  // ─── High Score Persistence ──────────────────────────────────────────────────

  private loadHighScore(): number {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      return raw !== null ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    const { state } = this;
    if (state.score > state.highScore) {
      state.highScore = state.score;
    }
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(state.highScore));
    } catch {
      // localStorage may be unavailable in some contexts; silently ignore
    }
  }
}

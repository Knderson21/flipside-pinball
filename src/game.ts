import type { Ball, Bumper, DropTarget, GameState, MissionState, Plunger, ThemePack } from './types';
import {
  BALLS_PER_GAME,
  BALL_RADIUS,
  BUMPER_LIT_DURATION_MS,
  BUMPER_RADIUS,
  DEFAULT_BUMPERS,
  DEFAULT_DROP_TARGETS,
  DRAIN_DELAY_MS,
  DROP_TARGET_BONUS,
  GUIDE_WALLS,
  HIGH_SCORE_KEY,
  MISSION_BANNER_DURATION_MS,
  MULTIBALL_BALLS,
  TABLE,
} from './constants';
import {
  collideBallBumper,
  collideBallDropTarget,
  collideBallFlipper,
  collideBallSegment,
  collideBallWalls,
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
import { AudioManager } from './audio';
import { themes } from './theme';

export class Game {
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly audio: AudioManager;
  private readonly state: GameState;
  private readonly themeList: ThemePack[];
  private themeIndex = 0;
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement, themeList: ThemePack[] = themes) {
    if (themeList.length === 0) throw new Error('Game requires at least one ThemePack');
    this.themeList = themeList;
    const first = themeList[0]!;
    this.renderer = new Renderer(canvas, first);
    this.input = new InputManager(canvas);
    this.audio = new AudioManager();
    this.audio.setSounds(first.sounds);
    this.state = this.buildInitialState();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  start(): void {
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }

  handleResize(windowW: number, windowH: number): void {
    this.renderer.resize(windowW, windowH);
  }

  // ─── Game Loop ───────────────────────────────────────────────────────────────

  private loop = (timestamp: number): void => {
    const dtMs = Math.min(timestamp - this.state.lastFrameTime, 32);
    this.state.lastFrameTime = timestamp;

    this.handleInput();
    this.update(dtMs);
    this.renderer.render(this.state);
    this.input.clearFrameFlags();

    this.rafId = requestAnimationFrame(this.loop);
  };

  // ─── Input → State ──────────────────────────────────────────────────────────

  private handleInput(): void {
    const input = this.input.getState();
    const { state } = this;

    if (input.swapTheme) {
      this.cycleTheme();
    }

    if (input.startGame) {
      if (state.phase === 'attract' || state.phase === 'gameover') {
        this.initGame();
        return;
      }
    }

    // Play flipper sound on the rising edge of either side
    const prevLeft = state.flippers[0].isActive;
    const prevRight = state.flippers[1].isActive;
    state.flippers[0].isActive = input.leftFlipper;
    state.flippers[1].isActive = input.rightFlipper;
    if (!prevLeft && input.leftFlipper) this.audio.play('flipper');
    if (!prevRight && input.rightFlipper) this.audio.play('flipper');

    // Allow plunger charging during 'launching' OR whenever a lane ball exists
    // mid-play (ball rolled back into the lane during 'playing' phase).
    if (state.phase === 'launching' || state.balls.some(b => b.inPlunger)) {
      state.plunger.charging = input.plungerHeld;
    }
  }

  // ─── Per-Frame Update ────────────────────────────────────────────────────────

  private update(dtMs: number): void {
    const { state } = this;

    updateFlipper(state.flippers[0], dtMs);
    updateFlipper(state.flippers[1], dtMs);

    // Mission banner fade
    if (state.mission.bannerTimer > 0) {
      state.mission.bannerTimer = Math.max(0, state.mission.bannerTimer - dtMs);
    }

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

    // The lane ball is always balls[0] during launching
    const laneBall = state.balls[0];
    if (!laneBall) return;
    laneBall.position.x = TABLE.BALL_SPAWN_X;
    laneBall.position.y = TABLE.BALL_SPAWN_Y - state.plunger.charge * 0.04;
    laneBall.velocity.x = 0;
    laneBall.velocity.y = 0;
    laneBall.active = true;
    laneBall.inPlunger = true;

    if (input.plungerJustReleased && state.plunger.charge > 0.02) {
      launchBall(laneBall, state.plunger);
      this.audio.play('launch');
      state.phase = 'playing';
    }
  }

  private updatePlaying(dtMs: number): void {
    const { state } = this;
    const input = this.input.getState();

    // Step and collide every active ball that is not held in the plunger lane.
    for (const ball of state.balls) {
      if (!ball.active || ball.inPlunger) continue;
      stepBall(ball, dtMs);
      collideBallWalls(ball);

      for (const bumper of state.bumpers) {
        const hit = collideBallBumper(ball, bumper);
        if (hit) {
          state.score += bumper.scoreValue * state.mission.multiplier;
          bumper.lit = true;
          bumper.litTimer = BUMPER_LIT_DURATION_MS;
          this.audio.play('bumper');
        }
      }

      for (const t of state.dropTargets) {
        if (collideBallDropTarget(ball, t)) {
          state.score += t.scoreValue * state.mission.multiplier;
          this.audio.play('dropTarget');
          this.onDropTargetHit();
        }
      }

      for (const seg of GUIDE_WALLS) {
        collideBallSegment(ball, seg.x1, seg.y1, seg.x2, seg.y2);
      }

      collideBallFlipper(ball, state.flippers[0]);
      collideBallFlipper(ball, state.flippers[1]);
    }

    // Tick bumper lit timers once per frame.
    for (const bumper of state.bumpers) {
      if (bumper.lit) {
        bumper.litTimer -= dtMs;
        if (bumper.litTimer <= 0) {
          bumper.lit = false;
          bumper.litTimer = 0;
        }
      }
    }

    // Drain check — iterate backwards so splices are safe.
    // inPlunger balls are locked in the lane and cannot drain.
    for (let i = state.balls.length - 1; i >= 0; i--) {
      const ball = state.balls[i];
      if (!ball || !ball.active || ball.inPlunger) continue;
      if (isBallDrained(ball)) {
        ball.active = false;
        state.balls.splice(i, 1);
      }
    }

    // Transition to draining only when every ball (including any lane ball) is gone.
    if (state.balls.length === 0) {
      this.audio.play('drain');
      state.ballsRemaining -= 1;
      state.phase = 'draining';
      state.drainTimer = 0;
      state.mission.multiplier = 1;
    }
  }

  private updateDraining(dtMs: number): void {
    const { state } = this;
    state.drainTimer += dtMs;

    if (state.drainTimer >= DRAIN_DELAY_MS) {
      if (state.ballsRemaining > 0) {
        this.resetToLaunching();
      } else {
        this.saveHighScore();
        this.audio.play('gameOver');
        state.phase = 'gameover';
      }
    }
  }

  // ─── Mission / Drop Target Logic ─────────────────────────────────────────────

  private onDropTargetHit(): void {
    const { state } = this;
    const allDown = state.dropTargets.every(t => t.down);
    if (!allDown) return;

    // Bank cleared! Award bonus, raise multiplier, start multiball, reset targets.
    state.mission.banksCleared += 1;
    state.mission.multiplier = Math.min(state.mission.multiplier + 1, 5);
    state.score += DROP_TARGET_BONUS * state.mission.banksCleared;

    const inMultiball = state.balls.filter(b => b.active).length > 1;

    if (inMultiball) {
      state.mission.bannerText = 'BANK CLEAR!';
    } else {
      state.mission.bannerText = 'MULTIBALL!';
      this.spawnMultiball();
    }
    state.mission.bannerTimer = MISSION_BANNER_DURATION_MS;
    state.mission.phase = 'complete';
    this.audio.play('missionComplete');

    // Reset the drop-target bank so it can be cleared again.
    for (const t of state.dropTargets) t.down = false;
  }

  private spawnMultiball(): void {
    const { state } = this;
    // Use an existing live ball as the seed position (first active one we find).
    const seed = state.balls.find(b => b.active && !b.inPlunger) ?? state.balls[0];
    if (!seed) return;

    for (let i = 0; i < MULTIBALL_BALLS; i++) {
      const angle = -Math.PI / 2 + (i - (MULTIBALL_BALLS - 1) / 2) * 0.6;
      const speed = 0.0018;
      state.balls.push({
        position: { x: seed.position.x, y: seed.position.y },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        radius: BALL_RADIUS,
        active: true,
        inPlunger: false,
      });
    }
  }

  // ─── State Builders ──────────────────────────────────────────────────────────

  private buildInitialState(): GameState {
    return {
      phase: 'attract',
      score: 0,
      highScore: this.loadHighScore(),
      ballsRemaining: BALLS_PER_GAME,
      balls: [this.makeBall()],
      flippers: [makeLeftFlipper(), makeRightFlipper()],
      bumpers: this.makeBumpers(),
      dropTargets: this.makeDropTargets(),
      plunger: this.makePlunger(),
      mission: this.makeMission(),
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
    state.dropTargets = this.makeDropTargets();
    state.mission = this.makeMission();
    this.resetToLaunching();
  }

  private resetToLaunching(): void {
    const { state } = this;
    state.balls = [this.makeBall()];
    state.plunger = this.makePlunger();
    state.drainTimer = 0;
    state.phase = 'launching';
  }

  private makeBall(): Ball {
    return {
      position: { x: TABLE.BALL_SPAWN_X, y: TABLE.BALL_SPAWN_Y },
      velocity: { x: 0, y: 0 },
      radius: BALL_RADIUS,
      active: true,
      inPlunger: true,
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

  private makeDropTargets(): DropTarget[] {
    return DEFAULT_DROP_TARGETS.map((def, i) => ({
      id: `drop-${i}`,
      position: { x: def.x, y: def.y },
      halfWidth: def.halfWidth,
      halfHeight: def.halfHeight,
      scoreValue: def.score,
      down: false,
    }));
  }

  private makeMission(): MissionState {
    return {
      phase: 'idle',
      banksCleared: 0,
      multiplier: 1,
      bannerTimer: 0,
      bannerText: '',
    };
  }

  // ─── Theme Switching ────────────────────────────────────────────────────────

  private cycleTheme(): void {
    this.themeIndex = (this.themeIndex + 1) % this.themeList.length;
    const next = this.themeList[this.themeIndex]!;
    this.renderer.setTheme(next);
    this.audio.setSounds(next.sounds);
    // Flash a banner so the user sees the swap feedback.
    this.state.mission.bannerText = next.name.toUpperCase();
    this.state.mission.bannerTimer = 1200;
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
      /* ignore */
    }
  }
}

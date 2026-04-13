import type { Ball, Bumper, DropTarget, GameState, MissionState, Plunger, RolloverLane, Slingshot, ThemePack } from './types';
import {
  BALLS_PER_GAME,
  BALL_RADIUS,
  BUMPER_LIT_DURATION_MS,
  BUMPER_RADIUS,
  DEFAULT_BUMPERS,
  DEFAULT_DROP_TARGETS,
  DEFAULT_ROLLOVERS,
  DEFAULT_SLINGSHOTS,
  DRAIN_DELAY_MS,
  DROP_TARGET_BONUS,
  GUIDE_WALLS,
  HIGH_SCORE_KEY,
  BALLS_TO_LOCK,
  LOCK_SCOOP,
  MISSION_BANNER_DURATION_MS,
  ORBIT_ENTRY_RADIUS,
  ORBIT_INNER_WALLS,
  ORBIT_LEFT,
  ORBIT_MIN_SPEED,
  ORBIT_OUTER_WALLS,
  ORBIT_OUTER_WALLS_ONEWAY,
  ORBIT_RIGHT,
  ORBIT_SCORE,
  PHYSICS_SUBSTEPS,
  ROLLOVER_RADIUS,
  SLINGSHOT_LIT_DURATION_MS,
  TABLE,
} from './constants';
import {
  checkOrbitZone,
  checkRollover,
  isBallInScoop,
  collideBallBumper,
  collideBallDropTarget,
  collideBallFlipper,
  collideBallSegment,
  collideBallSegmentOneSided,
  collideBallSlingshot,
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
    laneBall.position.y = TABLE.LANE_FLOOR_Y - BALL_RADIUS;
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

    // Step and collide every active ball that is not held in the plunger lane.
    // Sub-stepping prevents tunneling: at BALL_MAX_SPEED (0.003/ms) and the
    // 32ms frame cap, each sub-step moves the ball at most 0.024 units — safely
    // below the ball radius (0.025) and flipper detection range (0.036).
    const subDt = dtMs / PHYSICS_SUBSTEPS;
    for (const ball of state.balls) {
      if (!ball.active || ball.inPlunger) continue;

      for (let step = 0; step < PHYSICS_SUBSTEPS; step++) {
        stepBall(ball, subDt);
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

        for (const seg of ORBIT_OUTER_WALLS) {
          collideBallSegment(ball, seg.x1, seg.y1, seg.x2, seg.y2);
        }
        for (const seg of ORBIT_OUTER_WALLS_ONEWAY) {
          collideBallSegmentOneSided(ball, seg.x1, seg.y1, seg.x2, seg.y2);
        }
        for (const seg of ORBIT_INNER_WALLS) {
          collideBallSegment(ball, seg.x1, seg.y1, seg.x2, seg.y2);
        }

        for (const sling of state.slingshots) {
          if (collideBallSlingshot(ball, sling)) {
            state.score += sling.scoreValue * state.mission.multiplier;
            sling.lit = true;
            sling.litTimer = SLINGSHOT_LIT_DURATION_MS;
            this.audio.play('slingshot');
          }
        }

        for (const ro of state.rollovers) {
          if (!ro.lit && checkRollover(ball, ro.position.x, ro.position.y, ROLLOVER_RADIUS)) {
            ro.lit = true;
            state.score += ro.scoreValue * state.mission.multiplier;
            this.audio.play('rollover');
            this.checkRolloversComplete();
          }
        }

        collideBallFlipper(ball, state.flippers[0]);
        collideBallFlipper(ball, state.flippers[1]);
      }
    }

    // Orbit lane entry/exit detection — ball physically travels through the lane
    // via wall collisions (handled above). Here we detect entry and award score.
    for (const ball of state.balls) {
      if (!ball.active || ball.inPlunger) continue;

      // Detect entry into left orbit zone
      if (!ball.orbitEnteredFrom && checkOrbitZone(ball, ORBIT_LEFT.x, ORBIT_LEFT.y, ORBIT_ENTRY_RADIUS, ORBIT_MIN_SPEED)) {
        ball.orbitEnteredFrom = 'left';
        state.score += ORBIT_SCORE * state.mission.multiplier;
        this.audio.play('orbitShot');
        state.mission.bannerText = 'ORBIT!';
        state.mission.bannerTimer = 1200;
      }

      // Detect entry into right orbit zone
      if (!ball.orbitEnteredFrom && checkOrbitZone(ball, ORBIT_RIGHT.x, ORBIT_RIGHT.y, ORBIT_ENTRY_RADIUS, ORBIT_MIN_SPEED)) {
        ball.orbitEnteredFrom = 'right';
        state.score += ORBIT_SCORE * state.mission.multiplier;
        this.audio.play('orbitShot');
        state.mission.bannerText = 'ORBIT!';
        state.mission.bannerTimer = 1200;
      }

      // Detect full orbit: ball exits the opposite side from where it entered
      if (ball.orbitEnteredFrom === 'left' && checkOrbitZone(ball, ORBIT_RIGHT.x, ORBIT_RIGHT.y, ORBIT_ENTRY_RADIUS, ORBIT_MIN_SPEED)) {
        state.score += ORBIT_SCORE * 2 * state.mission.multiplier;
        state.mission.bannerText = 'FULL ORBIT!';
        state.mission.bannerTimer = 1500;
        ball.orbitEnteredFrom = undefined;
      } else if (ball.orbitEnteredFrom === 'right' && checkOrbitZone(ball, ORBIT_LEFT.x, ORBIT_LEFT.y, ORBIT_ENTRY_RADIUS, ORBIT_MIN_SPEED)) {
        state.score += ORBIT_SCORE * 2 * state.mission.multiplier;
        state.mission.bannerText = 'FULL ORBIT!';
        state.mission.bannerTimer = 1500;
        ball.orbitEnteredFrom = undefined;
      }

      // Clear orbit tracking when ball drops well below the orbit lane
      if (ball.orbitEnteredFrom && ball.position.y > 0.50) {
        ball.orbitEnteredFrom = undefined;
      }
    }

    // Check ball lock scoop — must happen after all collisions
    this.checkLockScoop();

    // Tick bumper and slingshot lit timers once per frame.
    for (const bumper of state.bumpers) {
      if (bumper.lit) {
        bumper.litTimer -= dtMs;
        if (bumper.litTimer <= 0) {
          bumper.lit = false;
          bumper.litTimer = 0;
        }
      }
    }
    for (const sling of state.slingshots) {
      if (sling.lit) {
        sling.litTimer -= dtMs;
        if (sling.litTimer <= 0) {
          sling.lit = false;
          sling.litTimer = 0;
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

    // A ball that was launched but fell back to the lane floor (insufficient power)
    // is returned to the plunger so the player can re-launch with no penalty.
    for (const ball of state.balls) {
      if (!ball.active || ball.inPlunger) continue;
      if (
        ball.position.x > TABLE.PLUNGER_LANE_LEFT &&
        ball.position.y + ball.radius >= TABLE.LANE_FLOOR_Y - 0.01
      ) {
        ball.inPlunger = true;
        ball.velocity.x = 0;
        ball.velocity.y = 0;
        state.plunger.charge = 0;
        state.plunger.charging = false;
        state.plunger.launched = false;
      }
    }

    // Mid-play lane ball: animate the pull-back and handle re-launch.
    // Mirrors the launching-phase logic so a returned ball can be re-shot.
    const midPlayLaneBall = state.balls.find(b => b.active && b.inPlunger);
    if (midPlayLaneBall) {
      updatePlunger(state.plunger, dtMs);
      midPlayLaneBall.position.x = TABLE.BALL_SPAWN_X;
      midPlayLaneBall.position.y = TABLE.LANE_FLOOR_Y - BALL_RADIUS;
      midPlayLaneBall.velocity.x = 0;
      midPlayLaneBall.velocity.y = 0;
      const input = this.input.getState();
      if (input.plungerJustReleased && state.plunger.charge > 0.02) {
        launchBall(midPlayLaneBall, state.plunger);
        this.audio.play('launch');
      }
    }

    // Multiball end: when only 1 ball remains during multiball, reset lock state.
    if (state.mission.lock.phase === 'multiball') {
      const activeBalls = state.balls.filter(b => b.active && !b.inPlunger).length;
      if (activeBalls <= 1) {
        state.mission.lock.phase = 'idle';
        state.mission.lock.ballsLocked = 0;
        state.mission.lock.lockLit = false;
        state.mission.multiplier = 1;
      }
    }

    // Transition to draining only when every ball (including any lane ball) is gone.
    if (state.balls.length === 0) {
      this.audio.play('drain');
      state.ballsRemaining -= 1;
      state.phase = 'draining';
      state.drainTimer = 0;
      state.mission.multiplier = 1;
      // Reset lock state on drain
      state.mission.lock.phase = 'idle';
      state.mission.lock.ballsLocked = 0;
      state.mission.lock.lockLit = false;
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

    // Bank cleared! Award bonus and raise multiplier. No longer triggers multiball
    // — multiball is now driven by the ball lock system.
    state.mission.banksCleared += 1;
    state.mission.multiplier = Math.min(state.mission.multiplier + 1, 5);
    state.score += DROP_TARGET_BONUS * state.mission.banksCleared;

    state.mission.bannerText = 'BANK CLEAR!';
    state.mission.bannerTimer = MISSION_BANNER_DURATION_MS;
    state.mission.phase = 'complete';
    this.audio.play('missionComplete');

    // Reset the drop-target bank so it can be cleared again.
    for (const t of state.dropTargets) t.down = false;
  }

  // ─── Ball Lock / Multiball System ───────────────────────────────────────────

  /** Called when a rollover is lit — checks if all rollovers are complete. */
  private checkRolloversComplete(): void {
    const { state } = this;
    if (state.mission.lock.phase !== 'idle') return;
    if (!state.rollovers.every(r => r.lit)) return;

    // All rollovers lit — light the lock!
    state.mission.lock.phase = 'lit';
    state.mission.lock.lockLit = true;
    state.mission.bannerText = 'LOCK IS LIT';
    state.mission.bannerTimer = MISSION_BANNER_DURATION_MS;
    this.audio.play('missionComplete');

    // Reset rollovers for next cycle
    for (const r of state.rollovers) r.lit = false;
  }

  /** Per-frame check: is any active ball inside the lock scoop? */
  private checkLockScoop(): void {
    const { state } = this;
    const lock = state.mission.lock;
    // Only capture when lock is lit or in locked phase (accumulating more locks)
    if (lock.phase !== 'lit' && lock.phase !== 'locked') return;

    for (let i = state.balls.length - 1; i >= 0; i--) {
      const ball = state.balls[i]!;
      if (!ball.active || ball.inPlunger) continue;
      if (!isBallInScoop(ball, LOCK_SCOOP.x, LOCK_SCOOP.y, LOCK_SCOOP.radius)) continue;

      // Ball captured!
      ball.active = false;
      state.balls.splice(i, 1);
      lock.ballsLocked += 1;

      if (lock.ballsLocked >= lock.ballsToLock) {
        // All balls locked — trigger multiball!
        this.triggerMultiball();
      } else {
        // Ball locked, serve a new ball (does NOT consume ballsRemaining)
        lock.phase = 'locked';
        state.mission.bannerText = `BALL ${lock.ballsLocked} LOCKED`;
        state.mission.bannerTimer = MISSION_BANNER_DURATION_MS;
        this.audio.play('lockBall');
        this.serveLockBall();
      }
      return; // only lock one ball per frame
    }
  }

  /** Serve a new ball into the plunger lane after a lock (no ballsRemaining cost). */
  private serveLockBall(): void {
    const newBall = this.makeBall();
    this.state.balls.push(newBall);
    this.state.plunger = this.makePlunger();
  }

  /** Release all locked balls + current ball = multiball. */
  private triggerMultiball(): void {
    const { state } = this;
    const lock = state.mission.lock;
    lock.phase = 'multiball';
    lock.lockLit = false;

    state.mission.bannerText = 'MULTIBALL!';
    state.mission.bannerTimer = MISSION_BANNER_DURATION_MS;
    this.audio.play('missionComplete');

    // Spawn ballsToLock balls spread across the playfield
    const spawnCount = lock.ballsToLock;
    for (let i = 0; i < spawnCount; i++) {
      const angle = -Math.PI / 2 + (i - (spawnCount - 1) / 2) * 0.5;
      const speed = 0.0018;
      state.balls.push({
        position: { x: 0.3375 + i * 0.10, y: 0.35 },
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
      slingshots: this.makeSlingshots(),
      rollovers: this.makeRollovers(),
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
    state.slingshots = this.makeSlingshots();
    state.rollovers = this.makeRollovers();
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

  private makeRollovers(): RolloverLane[] {
    return DEFAULT_ROLLOVERS.map((def, i) => ({
      id: `rollover-${i}`,
      position: { x: def.x, y: def.y },
      radius: ROLLOVER_RADIUS,
      lit: false,
      scoreValue: def.score,
    }));
  }

  private makeSlingshots(): Slingshot[] {
    return DEFAULT_SLINGSHOTS.map((def, i) => ({
      id: `slingshot-${i}`,
      vertices: [
        { x: def.v0.x, y: def.v0.y },
        { x: def.v1.x, y: def.v1.y },
        { x: def.v2.x, y: def.v2.y },
      ],
      kickEdgeIndex: def.kickEdge,
      openEdgeIndex: def.openEdge,
      scoreValue: def.score,
      lit: false,
      litTimer: 0,
    }));
  }

  private makeMission(): MissionState {
    return {
      phase: 'idle',
      banksCleared: 0,
      multiplier: 1,
      bannerTimer: 0,
      bannerText: '',
      lock: {
        phase: 'idle',
        ballsLocked: 0,
        ballsToLock: BALLS_TO_LOCK,
        lockLit: false,
      },
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

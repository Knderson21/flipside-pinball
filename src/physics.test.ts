import { describe, it, expect } from 'vitest';
import type { Ball, Bumper, DropTarget, Flipper, Plunger } from './types';
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
  clamp,
} from './physics';
import {
  BALL_MAX_SPEED,
  BALL_RADIUS,
  BUMPER_RADIUS,
  GRAVITY,
  MAX_PLUNGER_VELOCITY,
  TABLE,
} from './constants';

function makeBall(overrides: Partial<Ball> = {}): Ball {
  return {
    position: { x: 0.5, y: 0.5 },
    velocity: { x: 0, y: 0 },
    radius: BALL_RADIUS,
    active: true,
    inPlunger: false,
    ...overrides,
  };
}

function makeBumper(overrides: Partial<Bumper> = {}): Bumper {
  return {
    id: 'b0',
    position: { x: 0.5, y: 0.3 },
    radius: BUMPER_RADIUS,
    scoreValue: 100,
    lit: false,
    litTimer: 0,
    ...overrides,
  };
}

function makeDropTarget(overrides: Partial<DropTarget> = {}): DropTarget {
  return {
    id: 'd0',
    position: { x: 0.5, y: 0.55 },
    halfWidth: 0.04,
    halfHeight: 0.015,
    scoreValue: 250,
    down: false,
    ...overrides,
  };
}

// ─── Utilities ──────────────────────────────────────────────────────────────

describe('clamp', () => {
  it('returns the value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps to min', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

// ─── stepBall ───────────────────────────────────────────────────────────────

describe('stepBall', () => {
  it('applies gravity to vy', () => {
    const ball = makeBall();
    stepBall(ball, 16);
    expect(ball.velocity.y).toBeCloseTo(GRAVITY * 16, 10);
  });

  it('integrates position from velocity', () => {
    const ball = makeBall({ velocity: { x: 0.001, y: 0 } });
    const startX = ball.position.x;
    stepBall(ball, 10);
    expect(ball.position.x).toBeCloseTo(startX + 0.01, 10);
  });

  it('caps speed at BALL_MAX_SPEED', () => {
    const huge = BALL_MAX_SPEED * 10;
    const ball = makeBall({ velocity: { x: huge, y: 0 } });
    stepBall(ball, 1);
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    expect(speed).toBeLessThanOrEqual(BALL_MAX_SPEED + 1e-9);
  });
});

// ─── collideBallWalls ───────────────────────────────────────────────────────

describe('collideBallWalls', () => {
  it('bounces off the left wall with damped velocity', () => {
    const ball = makeBall({
      position: { x: TABLE.LEFT_WALL - 0.01, y: 0.5 },
      velocity: { x: -0.002, y: 0 },
    });
    collideBallWalls(ball);
    expect(ball.velocity.x).toBeGreaterThan(0);
    expect(Math.abs(ball.velocity.x)).toBeLessThan(0.002);
    expect(ball.position.x).toBeGreaterThanOrEqual(TABLE.LEFT_WALL + ball.radius - 1e-9);
  });

  it('bounces off the right wall with damped velocity', () => {
    const ball = makeBall({
      position: { x: TABLE.RIGHT_WALL + 0.01, y: 0.5 },
      velocity: { x: 0.002, y: 0 },
    });
    collideBallWalls(ball);
    expect(ball.velocity.x).toBeLessThan(0);
    expect(ball.position.x).toBeLessThanOrEqual(TABLE.RIGHT_WALL - ball.radius + 1e-9);
  });

  it('bounces off the top wall in the play area', () => {
    const ball = makeBall({
      position: { x: 0.5, y: TABLE.TOP_WALL - 0.01 },
      velocity: { x: 0, y: -0.002 },
    });
    collideBallWalls(ball);
    expect(ball.velocity.y).toBeGreaterThan(0);
  });
});

// ─── collideBallBumper ──────────────────────────────────────────────────────

describe('collideBallBumper', () => {
  it('returns null when not touching', () => {
    const ball = makeBall({ position: { x: 0.0, y: 0.0 } });
    const bumper = makeBumper({ position: { x: 0.9, y: 0.9 } });
    expect(collideBallBumper(ball, bumper)).toBeNull();
  });

  it('reflects velocity along the normal on hit', () => {
    const ball = makeBall({
      position: { x: 0.5, y: 0.3 + BUMPER_RADIUS * 0.5 },
      velocity: { x: 0, y: -0.001 }, // moving upward (into the bumper from below)
    });
    const bumper = makeBumper();
    const hit = collideBallBumper(ball, bumper);
    expect(hit).not.toBeNull();
    // The ball was below the bumper moving up, so after bounce vy should be positive (downward)
    expect(ball.velocity.y).toBeGreaterThan(0);
  });

  it('pushes the ball out of the bumper', () => {
    const ball = makeBall({ position: { x: 0.5, y: 0.3 } }); // concentric
    const bumper = makeBumper({ position: { x: 0.5, y: 0.3 } });
    collideBallBumper(ball, bumper);
    const dx = ball.position.x - bumper.position.x;
    const dy = ball.position.y - bumper.position.y;
    const dist = Math.hypot(dx, dy);
    expect(dist).toBeGreaterThanOrEqual(ball.radius + bumper.radius - 1e-9);
  });

  it('does not exceed max ball speed after the energy kick', () => {
    const ball = makeBall({
      position: { x: 0.5, y: 0.3 + BUMPER_RADIUS * 0.5 },
      velocity: { x: 0, y: -BALL_MAX_SPEED },
    });
    collideBallBumper(ball, makeBumper());
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    expect(speed).toBeLessThanOrEqual(BALL_MAX_SPEED + 1e-9);
  });
});

// ─── collideBallDropTarget ──────────────────────────────────────────────────

describe('collideBallDropTarget', () => {
  it('does not collide when target is already down', () => {
    const ball = makeBall({ position: { x: 0.5, y: 0.55 } });
    const target = makeDropTarget({ down: true });
    expect(collideBallDropTarget(ball, target)).toBe(false);
  });

  it('marks target as down on contact', () => {
    const ball = makeBall({ position: { x: 0.5, y: 0.54 }, velocity: { x: 0, y: 0.001 } });
    const target = makeDropTarget();
    const hit = collideBallDropTarget(ball, target);
    expect(hit).toBe(true);
    expect(target.down).toBe(true);
  });

  it('reflects ball moving into target', () => {
    const ball = makeBall({
      position: { x: 0.5, y: 0.54 },
      velocity: { x: 0, y: 0.001 }, // moving down into target from above
    });
    const target = makeDropTarget();
    collideBallDropTarget(ball, target);
    expect(ball.velocity.y).toBeLessThan(0); // should now be moving up
  });

  it('ignores targets far from the ball', () => {
    const ball = makeBall({ position: { x: 0.1, y: 0.1 } });
    const target = makeDropTarget();
    expect(collideBallDropTarget(ball, target)).toBe(false);
    expect(target.down).toBe(false);
  });
});

// ─── collideBallFlipper ─────────────────────────────────────────────────────

describe('collideBallFlipper', () => {
  it('returns false when ball is far from flipper', () => {
    const flipper = makeLeftFlipper();
    const ball = makeBall({ position: { x: 0.0, y: 0.0 } });
    expect(collideBallFlipper(ball, flipper)).toBe(false);
  });

  it('detects a collision when ball overlaps the flipper capsule', () => {
    const flipper = makeLeftFlipper();
    // Place the ball at the flipper pivot
    const ball = makeBall({
      position: { x: flipper.pivotX, y: flipper.pivotY },
      velocity: { x: 0, y: -0.001 },
    });
    expect(collideBallFlipper(ball, flipper)).toBe(true);
  });
});

// ─── collideBallSegment ─────────────────────────────────────────────────────

describe('collideBallSegment', () => {
  it('reflects velocity on contact with a horizontal segment', () => {
    const ball = makeBall({
      position: { x: 0.5, y: 0.5 + BALL_RADIUS * 0.5 },
      velocity: { x: 0, y: -0.001 },
    });
    // Horizontal segment above the ball
    const hit = collideBallSegment(ball, 0.4, 0.5, 0.6, 0.5);
    expect(hit).toBe(true);
    expect(ball.velocity.y).toBeGreaterThan(0);
  });

  it('returns false when the ball is not touching the segment', () => {
    const ball = makeBall({ position: { x: 0.1, y: 0.1 } });
    const hit = collideBallSegment(ball, 0.8, 0.8, 0.9, 0.9);
    expect(hit).toBe(false);
  });
});

// ─── updateFlipper ──────────────────────────────────────────────────────────

describe('updateFlipper', () => {
  it('snaps toward active angle when isActive', () => {
    const f: Flipper = makeLeftFlipper();
    f.isActive = true;
    const before = f.currentAngle;
    updateFlipper(f, 50);
    expect(f.currentAngle).toBeLessThan(before); // active angle is smaller
  });

  it('reaches the target angle given enough time', () => {
    const f: Flipper = makeRightFlipper();
    f.isActive = true;
    for (let i = 0; i < 200; i++) updateFlipper(f, 16);
    expect(Math.abs(f.currentAngle - f.activeAngle)).toBeLessThan(0.01);
  });

  it('records angular velocity while rotating', () => {
    const f: Flipper = makeLeftFlipper();
    f.isActive = true;
    updateFlipper(f, 10);
    expect(f.angularVelocity).not.toBe(0);
  });
});

// ─── launchBall + updatePlunger ─────────────────────────────────────────────

describe('plunger', () => {
  it('updatePlunger charges while held', () => {
    const p: Plunger = { charge: 0, charging: true, launched: false };
    updatePlunger(p, 750);
    expect(p.charge).toBeGreaterThan(0);
    expect(p.charge).toBeLessThanOrEqual(1);
  });

  it('updatePlunger caps charge at 1', () => {
    const p: Plunger = { charge: 0, charging: true, launched: false };
    updatePlunger(p, 10_000);
    expect(p.charge).toBe(1);
  });

  it('launchBall applies upward velocity proportional to charge', () => {
    const ball = makeBall({ inPlunger: true });
    const plunger: Plunger = { charge: 1, charging: false, launched: false };
    launchBall(ball, plunger);
    expect(ball.velocity.y).toBeCloseTo(-MAX_PLUNGER_VELOCITY, 10);
    expect(ball.inPlunger).toBe(false);
    expect(plunger.charge).toBe(0);
    expect(plunger.launched).toBe(true);
  });
});

// ─── isBallDrained ──────────────────────────────────────────────────────────

describe('isBallDrained', () => {
  it('returns true when ball is below drain line', () => {
    const ball = makeBall({ position: { x: 0.5, y: TABLE.DRAIN_Y + 0.1 } });
    expect(isBallDrained(ball)).toBe(true);
  });

  it('returns false when ball is above drain line', () => {
    const ball = makeBall({ position: { x: 0.5, y: 0.5 } });
    expect(isBallDrained(ball)).toBe(false);
  });
});

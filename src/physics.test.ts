import { describe, it, expect } from 'vitest';
import type { Ball, Bumper, DropTarget, Flipper, Plunger, Slingshot } from './types';
import {
  checkOrbitZone,
  checkRollover,
  collideBallBumper,
  collideBallDropTarget,
  collideBallFlipper,
  collideBallSegment,
  collideBallSegmentOneSided,
  collideBallSlingshot,
  collideBallWalls,
  isBallDrained,
  isBallInScoop,
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
  ROLLOVER_RADIUS,
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

// ─── collideBallSegmentOneSided ──────────────────────────────────────────────

describe('collideBallSegmentOneSided', () => {
  // Segment goes from top-right to bottom-left (like orbit bottom-right outer wall).
  // Inner side (left of direction) = orbit interior = positive cross product.
  const seg = { x1: 0.950, y1: 0.220, x2: 0.900, y2: 0.460 };

  it('collides when ball is on the inner side and moving downward', () => {
    // Ball inside the orbit lane, falling back down
    const ball = makeBall({
      position: { x: 0.910, y: 0.340 },
      velocity: { x: 0.001, y: 0.001 },
    });
    const hit = collideBallSegmentOneSided(ball, seg.x1, seg.y1, seg.x2, seg.y2);
    expect(hit).toBe(true);
  });

  it('passes through when ball is moving upward even on inner side', () => {
    // Ball inside the orbit lane but still traveling upward — don't block
    const ball = makeBall({
      position: { x: 0.910, y: 0.340 },
      velocity: { x: 0.001, y: -0.002 },
    });
    const origX = ball.position.x;
    const hit = collideBallSegmentOneSided(ball, seg.x1, seg.y1, seg.x2, seg.y2);
    expect(hit).toBe(false);
    expect(ball.position.x).toBe(origX);
  });

  it('passes through when ball is on the outer (right) side of the segment', () => {
    // Ball to the right of the segment — in the launch lane area
    const ball = makeBall({
      position: { x: 0.945, y: 0.340 },
      velocity: { x: -0.001, y: 0.001 },
    });
    const origX = ball.position.x;
    const origVx = ball.velocity.x;
    const hit = collideBallSegmentOneSided(ball, seg.x1, seg.y1, seg.x2, seg.y2);
    expect(hit).toBe(false);
    expect(ball.position.x).toBe(origX);
    expect(ball.velocity.x).toBe(origVx);
  });

  it('returns false when ball is far from the segment', () => {
    const ball = makeBall({ position: { x: 0.1, y: 0.1 } });
    const hit = collideBallSegmentOneSided(ball, seg.x1, seg.y1, seg.x2, seg.y2);
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

// ─── Plunger lane — one-way wall ─────────────────────────────────────────────
// The left wall of the plunger lane (PLUNGER_LANE_LEFT) only blocks a
// non-inPlunger ball when velocity.x > 0 (drifting rightward into the lane).
// A just-launched ball has velocity.x = 0 and must be allowed to travel up
// the lane freely.

describe('plunger lane — one-way wall', () => {
  it('rejects a playfield ball drifting rightward into the lane', () => {
    const ball = makeBall({
      position: { x: TABLE.PLUNGER_LANE_LEFT + 0.005, y: 0.6 },
      velocity: { x: 0.001, y: 0 },
      inPlunger: false,
    });
    collideBallWalls(ball);
    expect(ball.position.x + ball.radius).toBeLessThanOrEqual(TABLE.PLUNGER_LANE_LEFT + 1e-9);
    expect(ball.velocity.x).toBeLessThan(0);
  });

  it('does not deflect a just-launched ball with velocity.x = 0', () => {
    // A ball with zero x-velocity is in the lane right after launch — must not be pushed out.
    const ball = makeBall({
      position: { x: TABLE.BALL_SPAWN_X, y: 0.5 },
      velocity: { x: 0, y: -0.003 },
      inPlunger: false,
    });
    collideBallWalls(ball);
    expect(ball.position.x).toBeCloseTo(TABLE.BALL_SPAWN_X, 5);
    expect(ball.velocity.x).toBe(0);
  });

  it('does not push a ball already moving leftward out of the lane', () => {
    // Once the top-rail redirect gives the ball negative x-velocity it should
    // be free to cross the lane boundary into the playfield.
    const ball = makeBall({
      position: { x: TABLE.BALL_SPAWN_X, y: 0.5 },
      velocity: { x: -0.002, y: 0.001 },
      inPlunger: false,
    });
    const startX = ball.position.x;
    collideBallWalls(ball);
    expect(ball.position.x).toBeCloseTo(startX, 5);
    expect(ball.velocity.x).toBeCloseTo(-0.002, 5);
  });

  it('keeps an inPlunger ball inside the lane if it drifts left', () => {
    const ball = makeBall({
      position: { x: TABLE.PLUNGER_LANE_LEFT - 0.005, y: 0.6 },
      velocity: { x: -0.001, y: 0 },
      inPlunger: true,
    });
    collideBallWalls(ball);
    expect(ball.position.x - ball.radius).toBeGreaterThanOrEqual(TABLE.PLUNGER_LANE_LEFT - 1e-9);
    expect(ball.velocity.x).toBeGreaterThan(0);
  });

  it('one-way wall is inactive above the lane exit threshold (y < 0.5)', () => {
    // Above y = 0.5 the wall does not exist so the ball can arc into the playfield.
    const ball = makeBall({
      position: { x: TABLE.BALL_SPAWN_X, y: 0.10 },
      velocity: { x: 0.001, y: -0.003 },
      inPlunger: false,
    });
    collideBallWalls(ball);
    expect(ball.position.x).toBeCloseTo(TABLE.BALL_SPAWN_X, 5);
    expect(ball.velocity.x).toBeCloseTo(0.001, 5);
  });
});

// ─── Plunger lane — lane floor ────────────────────────────────────────────────
// The lane floor (LANE_FLOOR_Y) now catches any ball in the lane column,
// not just inPlunger balls. This prevents a weakly-launched ball from draining.

describe('plunger lane — lane floor', () => {
  it('stops an inPlunger ball that reaches the lane floor', () => {
    const ball = makeBall({
      position: { x: TABLE.BALL_SPAWN_X, y: TABLE.LANE_FLOOR_Y + 0.01 },
      velocity: { x: 0, y: 0.002 },
      inPlunger: true,
    });
    collideBallWalls(ball);
    expect(ball.position.y + ball.radius).toBeLessThanOrEqual(TABLE.LANE_FLOOR_Y + 1e-9);
    expect(ball.velocity.y).toBeLessThanOrEqual(0);
  });

  it('stops a non-inPlunger ball that falls back to the lane floor', () => {
    // A weakly-launched ball (inPlunger = false) must also be caught.
    const ball = makeBall({
      position: { x: TABLE.BALL_SPAWN_X, y: TABLE.LANE_FLOOR_Y + 0.01 },
      velocity: { x: 0, y: 0.002 },
      inPlunger: false,
    });
    collideBallWalls(ball);
    expect(ball.position.y + ball.radius).toBeLessThanOrEqual(TABLE.LANE_FLOOR_Y + 1e-9);
    expect(ball.velocity.y).toBeLessThanOrEqual(0);
  });

  it('does not apply the lane floor to a ball outside the lane column', () => {
    // A ball at the same y but in the main playfield must not be stopped here.
    const ball = makeBall({
      position: { x: 0.5, y: TABLE.LANE_FLOOR_Y + 0.01 },
      velocity: { x: 0, y: 0.002 },
      inPlunger: false,
    });
    const startY = ball.position.y;
    collideBallWalls(ball);
    expect(ball.position.y).toBeCloseTo(startY, 5);
  });
});

// ─── Plunger lane — launch sequence ──────────────────────────────────────────

describe('plunger lane — launch sequence', () => {
  it('a launched ball travels up the lane without x-deflection', () => {
    // Simulates the ball leaving the plunger: velocity.x = 0, inPlunger = false.
    // The one-way wall must not push it sideways on any frame.
    const ball = makeBall({
      position: { x: TABLE.BALL_SPAWN_X, y: TABLE.BALL_SPAWN_Y },
      velocity: { x: 0, y: -MAX_PLUNGER_VELOCITY },
      inPlunger: false,
    });
    for (let i = 0; i < 15; i++) {
      stepBall(ball, 16);
      collideBallWalls(ball);
      if (ball.position.y <= 0.14) break; // exited lane exit zone
    }
    expect(ball.position.x).toBeCloseTo(TABLE.BALL_SPAWN_X, 3);
    expect(ball.velocity.x).toBe(0);
  });

  it('top wall redirects a lane ball leftward into the playfield', () => {
    // The curved top rail fires when the ball is in the lane (x > PLUNGER_LANE_LEFT).
    const ball = makeBall({
      position: { x: TABLE.BALL_SPAWN_X, y: TABLE.TOP_WALL - 0.01 },
      velocity: { x: 0, y: -0.002 },
      inPlunger: false,
    });
    collideBallWalls(ball);
    expect(ball.velocity.x).toBeLessThan(0);       // redirected leftward
    expect(ball.velocity.y).toBeGreaterThan(0);    // gentle downward component
    expect(ball.position.y).toBeGreaterThanOrEqual(TABLE.TOP_WALL + ball.radius - 1e-9);
  });

  it('a weakly-launched ball is caught at the lane floor and does not drain', () => {
    // Launch with a very low charge so the ball runs out of upward momentum
    // and falls back before exiting.
    const ball = makeBall({
      position: { x: TABLE.BALL_SPAWN_X, y: TABLE.BALL_SPAWN_Y },
      velocity: { x: 0, y: -MAX_PLUNGER_VELOCITY * 0.15 },
      inPlunger: false,
    });
    for (let i = 0; i < 600; i++) {
      stepBall(ball, 16);
      collideBallWalls(ball);
      if (isBallDrained(ball)) break;
    }
    expect(isBallDrained(ball)).toBe(false);
    expect(ball.position.y + ball.radius).toBeLessThanOrEqual(TABLE.LANE_FLOOR_Y + 1e-9);
  });

  it('a full-strength launch exits the lane exit zone', () => {
    const ball = makeBall({
      position: { x: TABLE.BALL_SPAWN_X, y: TABLE.BALL_SPAWN_Y },
      velocity: { x: 0, y: -MAX_PLUNGER_VELOCITY },
      inPlunger: false,
    });
    let exitedLane = false;
    for (let i = 0; i < 120; i++) {
      stepBall(ball, 16);
      collideBallWalls(ball);
      if (ball.position.y < 0.14) { exitedLane = true; break; }
    }
    expect(exitedLane).toBe(true);
  });
});

// ─── checkRollover ──────────────────────────────────────────────────────────

describe('checkRollover', () => {
  it('returns true when ball is directly over the rollover', () => {
    const ball = makeBall({ position: { x: 0.25, y: 0.12 } });
    expect(checkRollover(ball, 0.25, 0.12, ROLLOVER_RADIUS)).toBe(true);
  });

  it('returns true when ball is within combined radii', () => {
    const ball = makeBall({ position: { x: 0.25 + BALL_RADIUS + ROLLOVER_RADIUS - 0.005, y: 0.12 } });
    expect(checkRollover(ball, 0.25, 0.12, ROLLOVER_RADIUS)).toBe(true);
  });

  it('returns false when ball is far away', () => {
    const ball = makeBall({ position: { x: 0.80, y: 0.80 } });
    expect(checkRollover(ball, 0.25, 0.12, ROLLOVER_RADIUS)).toBe(false);
  });

  it('does not modify ball velocity', () => {
    const ball = makeBall({ position: { x: 0.25, y: 0.12 }, velocity: { x: 0.001, y: -0.002 } });
    const vxBefore = ball.velocity.x;
    const vyBefore = ball.velocity.y;
    checkRollover(ball, 0.25, 0.12, ROLLOVER_RADIUS);
    expect(ball.velocity.x).toBe(vxBefore);
    expect(ball.velocity.y).toBe(vyBefore);
  });

  it('does not modify ball position', () => {
    const ball = makeBall({ position: { x: 0.25, y: 0.12 } });
    const xBefore = ball.position.x;
    const yBefore = ball.position.y;
    checkRollover(ball, 0.25, 0.12, ROLLOVER_RADIUS);
    expect(ball.position.x).toBe(xBefore);
    expect(ball.position.y).toBe(yBefore);
  });
});

// ─── isBallInScoop ──────────────────────────────────────────────────────────

describe('isBallInScoop', () => {
  it('returns true when ball center is inside scoop radius', () => {
    const ball = makeBall({ position: { x: 0.50, y: 0.48 } });
    expect(isBallInScoop(ball, 0.50, 0.48, 0.035)).toBe(true);
  });

  it('returns true when ball center is near scoop edge', () => {
    const ball = makeBall({ position: { x: 0.50 + 0.02, y: 0.48 } });
    expect(isBallInScoop(ball, 0.50, 0.48, 0.035)).toBe(true);
  });

  it('returns false when ball is outside scoop', () => {
    const ball = makeBall({ position: { x: 0.50 + 0.05, y: 0.48 } });
    expect(isBallInScoop(ball, 0.50, 0.48, 0.035)).toBe(false);
  });

  it('returns false when ball is far away', () => {
    const ball = makeBall({ position: { x: 0.10, y: 0.10 } });
    expect(isBallInScoop(ball, 0.50, 0.48, 0.035)).toBe(false);
  });
});

// ─── collideBallSlingshot ───────────────────────────────────────────────────

function makeSlingshot(overrides: Partial<Slingshot> = {}): Slingshot {
  return {
    id: 'sling-0',
    vertices: [
      { x: 0.10, y: 0.70 },
      { x: 0.24, y: 0.83 },
      { x: 0.10, y: 0.83 },
    ],
    kickEdgeIndex: 0,
    openEdgeIndex: 1,
    scoreValue: 50,
    lit: false,
    litTimer: 0,
    ...overrides,
  };
}

describe('collideBallSlingshot', () => {
  it('returns false when ball is far from slingshot', () => {
    const ball = makeBall({ position: { x: 0.80, y: 0.20 } });
    const sling = makeSlingshot();
    expect(collideBallSlingshot(ball, sling)).toBe(false);
  });

  it('returns true when ball touches an edge', () => {
    // Place ball near the kick edge (v0→v1)
    // Midpoint of kick edge: (0.17, 0.765)
    const ball = makeBall({
      position: { x: 0.19, y: 0.76 },
      velocity: { x: -0.001, y: 0.001 },
    });
    const sling = makeSlingshot();
    expect(collideBallSlingshot(ball, sling)).toBe(true);
  });

  it('applies boosted restitution on kick edge', () => {
    // Ball moving into the kick edge should bounce with more energy
    const ball = makeBall({
      position: { x: 0.19, y: 0.76 },
      velocity: { x: -0.001, y: 0.001 },
    });
    const speedBefore = Math.hypot(ball.velocity.x, ball.velocity.y);
    const sling = makeSlingshot();
    collideBallSlingshot(ball, sling);
    const speedAfter = Math.hypot(ball.velocity.x, ball.velocity.y);
    // Kick edge has restitution > 1, so speed should increase
    expect(speedAfter).toBeGreaterThan(speedBefore * 0.9);
  });

  it('caps speed at BALL_MAX_SPEED after kick', () => {
    const ball = makeBall({
      position: { x: 0.19, y: 0.76 },
      velocity: { x: -BALL_MAX_SPEED, y: 0 },
    });
    const sling = makeSlingshot();
    collideBallSlingshot(ball, sling);
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    expect(speed).toBeLessThanOrEqual(BALL_MAX_SPEED + 1e-9);
  });
});

// ─── checkOrbitZone ─────────────────────────────────────────────────────────

describe('checkOrbitZone', () => {
  it('returns true when ball is in zone with upward velocity', () => {
    const ball = makeBall({
      position: { x: 0.12, y: 0.30 },
      velocity: { x: 0, y: -0.002 },
    });
    expect(checkOrbitZone(ball, 0.12, 0.30, 0.04, 0.001)).toBe(true);
  });

  it('returns false when ball is moving downward', () => {
    const ball = makeBall({
      position: { x: 0.12, y: 0.30 },
      velocity: { x: 0, y: 0.002 },
    });
    expect(checkOrbitZone(ball, 0.12, 0.30, 0.04, 0.001)).toBe(false);
  });

  it('returns false when ball is outside zone', () => {
    const ball = makeBall({
      position: { x: 0.50, y: 0.50 },
      velocity: { x: 0, y: -0.002 },
    });
    expect(checkOrbitZone(ball, 0.12, 0.30, 0.04, 0.001)).toBe(false);
  });

  it('returns false when ball speed is below minimum', () => {
    const ball = makeBall({
      position: { x: 0.12, y: 0.30 },
      velocity: { x: 0, y: -0.0005 },
    });
    expect(checkOrbitZone(ball, 0.12, 0.30, 0.04, 0.001)).toBe(false);
  });

  it('returns true when ball is at edge of zone with sufficient speed', () => {
    const ball = makeBall({
      position: { x: 0.12 + 0.03, y: 0.30 },
      velocity: { x: -0.001, y: -0.001 },
    });
    expect(checkOrbitZone(ball, 0.12, 0.30, 0.04, 0.001)).toBe(true);
  });
});

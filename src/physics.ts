import type { Ball, Bumper, Flipper, Plunger, Vec2 } from './types';
import {
  BALL_MAX_SPEED,
  BUMPER_RESTITUTION,
  DRAIN_DELAY_MS,
  FLIPPER_ANGULAR_SPEED,
  FLIPPER_RESTITUTION,
  FLIPPER_THICKNESS,
  GRAVITY,
  LEFT_FLIPPER_ACTIVE_ANGLE,
  LEFT_FLIPPER_REST_ANGLE,
  MAX_PLUNGER_CHARGE_MS,
  MAX_PLUNGER_VELOCITY,
  RIGHT_FLIPPER_ACTIVE_ANGLE,
  RIGHT_FLIPPER_REST_ANGLE,
  TABLE,
  WALL_RESTITUTION,
} from './constants';

// ─── Vec2 Helpers ─────────────────────────────────────────────────────────────

function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ─── Ball Movement ────────────────────────────────────────────────────────────

/**
 * Advance the ball one physics step using simple Euler integration.
 * Gravity is applied to the y-velocity, then the position is updated.
 */
export function stepBall(ball: Ball, dtMs: number): void {
  // Apply gravity
  ball.velocity.y += GRAVITY * dtMs;

  // Cap speed
  const spd = length(ball.velocity);
  if (spd > BALL_MAX_SPEED) {
    ball.velocity.x = (ball.velocity.x / spd) * BALL_MAX_SPEED;
    ball.velocity.y = (ball.velocity.y / spd) * BALL_MAX_SPEED;
  }

  // Integrate position
  ball.position.x += ball.velocity.x * dtMs;
  ball.position.y += ball.velocity.y * dtMs;
}

// ─── Wall Collisions ──────────────────────────────────────────────────────────

/**
 * Resolve axis-aligned wall collisions (left, right, top).
 * The bottom is a drain, handled separately via isBallDrained().
 */
export function collideBallWalls(ball: Ball): void {
  const r = ball.radius;

  // Left wall
  if (ball.position.x - r < TABLE.LEFT_WALL) {
    ball.position.x = TABLE.LEFT_WALL + r;
    ball.velocity.x = Math.abs(ball.velocity.x) * WALL_RESTITUTION;
  }

  // Right wall (only in main play area – plunger lane has its own right boundary)
  if (ball.position.x + r > TABLE.RIGHT_WALL) {
    ball.position.x = TABLE.RIGHT_WALL - r;
    ball.velocity.x = -Math.abs(ball.velocity.x) * WALL_RESTITUTION;
  }

  // Top wall
  if (ball.position.y - r < TABLE.TOP_WALL) {
    ball.position.y = TABLE.TOP_WALL + r;
    if (ball.position.x > TABLE.PLUNGER_LANE_LEFT) {
      // Ball reached the top while still in the plunger lane.
      // Redirect it leftward to simulate the curved top guide rail that
      // routes the ball from the shooter lane into the main play area.
      const speed = length(ball.velocity);
      ball.velocity.x = -speed * WALL_RESTITUTION;
      ball.velocity.y = speed * 0.15; // slight downward component so it arcs in
    } else {
      ball.velocity.y = Math.abs(ball.velocity.y) * WALL_RESTITUTION;
    }
  }

  // Plunger lane floor – catches the ball if a weak launch falls back down.
  // The ball bounces off this floor (heavily damped) instead of draining.
  // game.ts detects the ball resting here and transitions back to 'launching'.
  if (ball.position.x > TABLE.PLUNGER_LANE_LEFT) {
    if (ball.position.y + r > TABLE.LANE_FLOOR_Y) {
      ball.position.y = TABLE.LANE_FLOOR_Y - r;
      ball.velocity.y = -Math.abs(ball.velocity.y) * WALL_RESTITUTION * 0.25;
      ball.velocity.x *= 0.4; // kill horizontal drift too
    }
  }

  // Plunger lane left divider – solid wall from both sides below LANE_EXIT_Y.
  // Above that threshold the lane is open so the ball can arc from the shooter
  // lane into the main play area after launch.
  const LANE_EXIT_Y = 0.14;
  if (ball.position.y > LANE_EXIT_Y) {
    if (ball.position.x >= TABLE.PLUNGER_LANE_LEFT) {
      // Ball is in the lane – prevent it from escaping left through the divider.
      if (ball.position.x - r < TABLE.PLUNGER_LANE_LEFT) {
        ball.position.x = TABLE.PLUNGER_LANE_LEFT + r;
        ball.velocity.x = Math.abs(ball.velocity.x) * WALL_RESTITUTION;
      }
    } else {
      // Ball is in the main play area – prevent it from entering the lane.
      if (ball.position.x + r > TABLE.PLUNGER_LANE_LEFT) {
        ball.position.x = TABLE.PLUNGER_LANE_LEFT - r;
        ball.velocity.x = -Math.abs(ball.velocity.x) * WALL_RESTITUTION;
      }
    }
  }
}

// ─── Bumper Collisions ────────────────────────────────────────────────────────

export interface BumperHitResult {
  bumper: Bumper;
  hit: true;
}

/**
 * Circle-vs-circle collision between the ball and a bumper.
 * Returns a hit result if a collision occurred, otherwise null.
 */
export function collideBallBumper(ball: Ball, bumper: Bumper): BumperHitResult | null {
  const dx = ball.position.x - bumper.position.x;
  const dy = ball.position.y - bumper.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = ball.radius + bumper.radius;

  if (dist >= minDist) return null;

  // Collision normal pointing from bumper center toward ball
  const nx = dist === 0 ? 1 : dx / dist;
  const ny = dist === 0 ? 0 : dy / dist;

  // Push ball completely out of the bumper
  const overlap = minDist - dist;
  ball.position.x += nx * overlap;
  ball.position.y += ny * overlap;

  // Reflect velocity along normal and apply bumper restitution (energy kick)
  const vDotN = ball.velocity.x * nx + ball.velocity.y * ny;
  ball.velocity.x = (ball.velocity.x - 2 * vDotN * nx) * BUMPER_RESTITUTION;
  ball.velocity.y = (ball.velocity.y - 2 * vDotN * ny) * BUMPER_RESTITUTION;

  // Re-cap speed after the energetic kick
  const spd = length(ball.velocity);
  if (spd > BALL_MAX_SPEED) {
    ball.velocity.x = (ball.velocity.x / spd) * BALL_MAX_SPEED;
    ball.velocity.y = (ball.velocity.y / spd) * BALL_MAX_SPEED;
  }

  return { bumper, hit: true };
}

// ─── Flipper Kinematics ───────────────────────────────────────────────────────

/**
 * Advance the flipper toward its target angle (active or rest).
 * Also tracks angularVelocity so that collision response can impart momentum.
 */
export function updateFlipper(flipper: Flipper, dtMs: number): void {
  const targetAngle = flipper.isActive ? flipper.activeAngle : flipper.restAngle;
  const delta = targetAngle - flipper.currentAngle;

  if (Math.abs(delta) < 0.001) {
    flipper.currentAngle = targetAngle;
    flipper.angularVelocity = 0;
    return;
  }

  const maxStep = FLIPPER_ANGULAR_SPEED * dtMs;
  const step = clamp(delta, -maxStep, maxStep);
  flipper.currentAngle += step;
  // angularVelocity in rad/ms (used in collision response)
  flipper.angularVelocity = step / dtMs;
}

// ─── Flipper Collision ────────────────────────────────────────────────────────

/**
 * Resolve a ball-vs-flipper collision.
 * The flipper is modelled as a capsule: a line segment (pivot → tip) with
 * a radius equal to half the flipper thickness.
 *
 * Returns true if a collision occurred.
 */
export function collideBallFlipper(ball: Ball, flipper: Flipper): boolean {
  const halfThick = FLIPPER_THICKNESS / 2;

  // Tip position
  const tipX = flipper.pivotX + Math.cos(flipper.currentAngle) * flipper.length;
  const tipY = flipper.pivotY + Math.sin(flipper.currentAngle) * flipper.length;

  // Segment vector (pivot → tip)
  const segX = tipX - flipper.pivotX;
  const segY = tipY - flipper.pivotY;
  const segLenSq = segX * segX + segY * segY;

  // Project ball center onto segment to find closest point
  const toBallX = ball.position.x - flipper.pivotX;
  const toBallY = ball.position.y - flipper.pivotY;
  const t = clamp(
    segLenSq > 0 ? (toBallX * segX + toBallY * segY) / segLenSq : 0,
    0,
    1
  );

  const closestX = flipper.pivotX + t * segX;
  const closestY = flipper.pivotY + t * segY;

  const dx = ball.position.x - closestX;
  const dy = ball.position.y - closestY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = ball.radius + halfThick;

  if (dist >= minDist) return false;

  // Collision normal (closest point → ball center)
  const nx = dist === 0 ? 0 : dx / dist;
  const ny = dist === 0 ? -1 : dy / dist;

  // Push ball out of the flipper
  const overlap = minDist - dist;
  ball.position.x += nx * overlap;
  ball.position.y += ny * overlap;

  // Surface velocity of the flipper at the contact point.
  // The contact point is at distance `r` from the pivot; the tangential
  // surface speed is ω × r.  The tangent is perpendicular to (closest - pivot).
  const rX = closestX - flipper.pivotX;
  const rY = closestY - flipper.pivotY;
  const r = Math.sqrt(rX * rX + rY * rY);
  // tangent direction (perpendicular to radius, in the direction of rotation)
  const surfVelMag = flipper.angularVelocity * r;
  const surfVelX = -surfVelMag * (rY / (r || 1));
  const surfVelY = surfVelMag * (rX / (r || 1));

  // Relative velocity of ball vs flipper surface
  const relVx = ball.velocity.x - surfVelX;
  const relVy = ball.velocity.y - surfVelY;

  // Reflect relative velocity along normal
  const relVDotN = relVx * nx + relVy * ny;
  if (relVDotN < 0) {
    // Ball is moving into the flipper – apply impulse
    ball.velocity.x -= (1 + FLIPPER_RESTITUTION) * relVDotN * nx;
    ball.velocity.y -= (1 + FLIPPER_RESTITUTION) * relVDotN * ny;
  }

  return true;
}

// ─── Static Wall Segment Collision ───────────────────────────────────────────

/**
 * Resolve a ball collision against a static line segment (no surface velocity).
 * Used for the angled guide walls near the flippers.
 * Returns true if a collision occurred.
 */
export function collideBallSegment(
  ball: Ball,
  x1: number, y1: number,
  x2: number, y2: number,
): boolean {
  const segX = x2 - x1;
  const segY = y2 - y1;
  const segLenSq = segX * segX + segY * segY;

  const toBallX = ball.position.x - x1;
  const toBallY = ball.position.y - y1;
  const t = clamp(
    segLenSq > 0 ? (toBallX * segX + toBallY * segY) / segLenSq : 0,
    0, 1,
  );

  const closestX = x1 + t * segX;
  const closestY = y1 + t * segY;

  const dx = ball.position.x - closestX;
  const dy = ball.position.y - closestY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist >= ball.radius || dist === 0) return false;

  // Normal pointing from wall surface toward ball center
  const nx = dx / dist;
  const ny = dy / dist;

  // Push ball fully out of the wall
  ball.position.x += nx * (ball.radius - dist);
  ball.position.y += ny * (ball.radius - dist);

  // Reflect velocity along normal (only if ball is moving into the wall)
  const vDotN = ball.velocity.x * nx + ball.velocity.y * ny;
  if (vDotN < 0) {
    ball.velocity.x -= (1 + WALL_RESTITUTION) * vDotN * nx;
    ball.velocity.y -= (1 + WALL_RESTITUTION) * vDotN * ny;
  }

  return true;
}

// ─── Plunger ──────────────────────────────────────────────────────────────────

/**
 * Advance the plunger charge while the player holds the key.
 */
export function updatePlunger(plunger: Plunger, dtMs: number): void {
  if (plunger.charging) {
    plunger.charge = clamp(plunger.charge + dtMs / MAX_PLUNGER_CHARGE_MS, 0, 1);
  }
}

/**
 * Launch the ball from the plunger lane.
 * The ball is given an upward velocity proportional to the charge.
 */
export function launchBall(ball: Ball, plunger: Plunger): void {
  ball.velocity.y = -(plunger.charge * MAX_PLUNGER_VELOCITY);
  ball.velocity.x = 0;
  plunger.charge = 0;
  plunger.charging = false;
  plunger.launched = true;
}

// ─── Drain Detection ──────────────────────────────────────────────────────────

export function isBallDrained(ball: Ball): boolean {
  return ball.position.y - ball.radius > TABLE.DRAIN_Y;
}

// ─── Flipper Factory ──────────────────────────────────────────────────────────

export function makeLeftFlipper(): Flipper {
  return {
    side: 'left',
    pivotX: TABLE.LEFT_FLIPPER_X,
    pivotY: TABLE.FLIPPER_Y,
    length: 0.20,
    restAngle: LEFT_FLIPPER_REST_ANGLE,
    activeAngle: LEFT_FLIPPER_ACTIVE_ANGLE,
    currentAngle: LEFT_FLIPPER_REST_ANGLE,
    angularVelocity: 0,
    isActive: false,
  };
}

export function makeRightFlipper(): Flipper {
  return {
    side: 'right',
    pivotX: TABLE.RIGHT_FLIPPER_X,
    pivotY: TABLE.FLIPPER_Y,
    length: 0.20,
    restAngle: RIGHT_FLIPPER_REST_ANGLE,
    activeAngle: RIGHT_FLIPPER_ACTIVE_ANGLE,
    currentAngle: RIGHT_FLIPPER_REST_ANGLE,
    angularVelocity: 0,
    isActive: false,
  };
}

// Re-export DRAIN_DELAY_MS so game.ts can use it without importing constants directly.
export { DRAIN_DELAY_MS };

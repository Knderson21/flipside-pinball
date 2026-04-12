import type { Ball, Bumper, DropTarget, Flipper, Plunger, Vec2 } from './types';
import {
  BALL_MAX_SPEED,
  BUMPER_RESTITUTION,
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

export function stepBall(ball: Ball, dtMs: number): void {
  ball.velocity.y += GRAVITY * dtMs;

  const spd = length(ball.velocity);
  if (spd > BALL_MAX_SPEED) {
    ball.velocity.x = (ball.velocity.x / spd) * BALL_MAX_SPEED;
    ball.velocity.y = (ball.velocity.y / spd) * BALL_MAX_SPEED;
  }

  ball.position.x += ball.velocity.x * dtMs;
  ball.position.y += ball.velocity.y * dtMs;
}

// ─── Wall Collisions ──────────────────────────────────────────────────────────

export function collideBallWalls(ball: Ball): void {
  const r = ball.radius;

  if (ball.position.x - r < TABLE.LEFT_WALL) {
    ball.position.x = TABLE.LEFT_WALL + r;
    ball.velocity.x = Math.abs(ball.velocity.x) * WALL_RESTITUTION;
  }

  if (ball.position.x + r > TABLE.RIGHT_WALL) {
    ball.position.x = TABLE.RIGHT_WALL - r;
    ball.velocity.x = -Math.abs(ball.velocity.x) * WALL_RESTITUTION;
  }

  if (ball.position.y - r < TABLE.TOP_WALL) {
    ball.position.y = TABLE.TOP_WALL + r;
    if (ball.position.x > TABLE.PLUNGER_LANE_LEFT) {
      // Curved top rail: route lane-launched ball back into the play field.
      const speed = length(ball.velocity);
      ball.velocity.x = -speed * WALL_RESTITUTION;
      ball.velocity.y = speed * 0.15;
    } else {
      ball.velocity.y = Math.abs(ball.velocity.y) * WALL_RESTITUTION;
    }
  }

  if (ball.position.x > TABLE.PLUNGER_LANE_LEFT) {
    if (ball.position.y + r > TABLE.LANE_FLOOR_Y) {
      ball.position.y = TABLE.LANE_FLOOR_Y - r;
      ball.velocity.y = -Math.abs(ball.velocity.y) * WALL_RESTITUTION * 0.25;
      ball.velocity.x *= 0.4;
    }
  }

  const LANE_EXIT_Y = 0.14;
  if (ball.position.y > LANE_EXIT_Y) {
    if (ball.position.x >= TABLE.PLUNGER_LANE_LEFT) {
      if (ball.position.x - r < TABLE.PLUNGER_LANE_LEFT) {
        ball.position.x = TABLE.PLUNGER_LANE_LEFT + r;
        ball.velocity.x = Math.abs(ball.velocity.x) * WALL_RESTITUTION;
      }
    } else {
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

export function collideBallBumper(ball: Ball, bumper: Bumper): BumperHitResult | null {
  const dx = ball.position.x - bumper.position.x;
  const dy = ball.position.y - bumper.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = ball.radius + bumper.radius;

  if (dist >= minDist) return null;

  const nx = dist === 0 ? 1 : dx / dist;
  const ny = dist === 0 ? 0 : dy / dist;

  const overlap = minDist - dist;
  ball.position.x += nx * overlap;
  ball.position.y += ny * overlap;

  const vDotN = ball.velocity.x * nx + ball.velocity.y * ny;
  ball.velocity.x = (ball.velocity.x - 2 * vDotN * nx) * BUMPER_RESTITUTION;
  ball.velocity.y = (ball.velocity.y - 2 * vDotN * ny) * BUMPER_RESTITUTION;

  const spd = length(ball.velocity);
  if (spd > BALL_MAX_SPEED) {
    ball.velocity.x = (ball.velocity.x / spd) * BALL_MAX_SPEED;
    ball.velocity.y = (ball.velocity.y / spd) * BALL_MAX_SPEED;
  }

  return { bumper, hit: true };
}

// ─── Drop Target Collisions ───────────────────────────────────────────────────

/**
 * AABB collision between the ball (as a circle approximated with its bounding box)
 * and a drop target. Returns true on hit, and marks the target as down.
 */
export function collideBallDropTarget(ball: Ball, target: DropTarget): boolean {
  if (target.down) return false;

  const minX = target.position.x - target.halfWidth;
  const maxX = target.position.x + target.halfWidth;
  const minY = target.position.y - target.halfHeight;
  const maxY = target.position.y + target.halfHeight;

  // Closest point on AABB to the ball center
  const cx = clamp(ball.position.x, minX, maxX);
  const cy = clamp(ball.position.y, minY, maxY);
  const dx = ball.position.x - cx;
  const dy = ball.position.y - cy;
  const distSq = dx * dx + dy * dy;

  if (distSq >= ball.radius * ball.radius) return false;

  const dist = Math.sqrt(distSq);
  const nx = dist === 0 ? 0 : dx / dist;
  const ny = dist === 0 ? -1 : dy / dist;

  // Push ball out and reflect
  const overlap = ball.radius - dist;
  ball.position.x += nx * overlap;
  ball.position.y += ny * overlap;

  const vDotN = ball.velocity.x * nx + ball.velocity.y * ny;
  if (vDotN < 0) {
    ball.velocity.x -= (1 + WALL_RESTITUTION) * vDotN * nx;
    ball.velocity.y -= (1 + WALL_RESTITUTION) * vDotN * ny;
  }

  target.down = true;
  return true;
}

// ─── Flipper Kinematics ───────────────────────────────────────────────────────

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
  flipper.angularVelocity = step / dtMs;
}

// ─── Flipper Collision ────────────────────────────────────────────────────────

export function collideBallFlipper(ball: Ball, flipper: Flipper): boolean {
  const halfThick = FLIPPER_THICKNESS / 2;

  const tipX = flipper.pivotX + Math.cos(flipper.currentAngle) * flipper.length;
  const tipY = flipper.pivotY + Math.sin(flipper.currentAngle) * flipper.length;

  const segX = tipX - flipper.pivotX;
  const segY = tipY - flipper.pivotY;
  const segLenSq = segX * segX + segY * segY;

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

  const nx = dist === 0 ? 0 : dx / dist;
  const ny = dist === 0 ? -1 : dy / dist;

  const overlap = minDist - dist;
  ball.position.x += nx * overlap;
  ball.position.y += ny * overlap;

  const rX = closestX - flipper.pivotX;
  const rY = closestY - flipper.pivotY;
  const r = Math.sqrt(rX * rX + rY * rY);
  const surfVelMag = flipper.angularVelocity * r;
  const surfVelX = -surfVelMag * (rY / (r || 1));
  const surfVelY = surfVelMag * (rX / (r || 1));

  const relVx = ball.velocity.x - surfVelX;
  const relVy = ball.velocity.y - surfVelY;

  const relVDotN = relVx * nx + relVy * ny;
  if (relVDotN < 0) {
    ball.velocity.x -= (1 + FLIPPER_RESTITUTION) * relVDotN * nx;
    ball.velocity.y -= (1 + FLIPPER_RESTITUTION) * relVDotN * ny;
  }

  return true;
}

// ─── Static Wall Segment Collision ───────────────────────────────────────────

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

  const nx = dx / dist;
  const ny = dy / dist;

  ball.position.x += nx * (ball.radius - dist);
  ball.position.y += ny * (ball.radius - dist);

  const vDotN = ball.velocity.x * nx + ball.velocity.y * ny;
  if (vDotN < 0) {
    ball.velocity.x -= (1 + WALL_RESTITUTION) * vDotN * nx;
    ball.velocity.y -= (1 + WALL_RESTITUTION) * vDotN * ny;
  }

  return true;
}

// ─── Plunger ──────────────────────────────────────────────────────────────────

export function updatePlunger(plunger: Plunger, dtMs: number): void {
  if (plunger.charging) {
    plunger.charge = clamp(plunger.charge + dtMs / MAX_PLUNGER_CHARGE_MS, 0, 1);
  }
}

export function launchBall(ball: Ball, plunger: Plunger): void {
  ball.velocity.y = -(plunger.charge * MAX_PLUNGER_VELOCITY);
  ball.velocity.x = 0;
  ball.inPlunger = false;
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

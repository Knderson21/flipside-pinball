import type { Ball, Bumper, DropTarget, Flipper, Plunger, Slingshot, Vec2 } from './types';
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
  SLINGSHOT_RESTITUTION,
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
      // Curved launch lane: redirect ball leftward with a natural exit angle.
      // The launch lane curve segments in constants.ts provide additional
      // guidance as the ball travels across the upper playfield.
      const speed = length(ball.velocity);
      ball.velocity.x = -speed * 0.75;
      ball.velocity.y = speed * 0.45;
    } else {
      ball.velocity.y = Math.abs(ball.velocity.y) * WALL_RESTITUTION;
    }
  }

  // Lane floor — catches any ball in the plunger lane, including one that was
  // launched with insufficient power and fell back before exiting the top.
  if (ball.position.x > TABLE.PLUNGER_LANE_LEFT) {
    if (ball.position.y + r > TABLE.LANE_FLOOR_Y) {
      ball.position.y = TABLE.LANE_FLOOR_Y - r;
      ball.velocity.y = -Math.abs(ball.velocity.y) * WALL_RESTITUTION * 0.25;
      ball.velocity.x *= 0.4;
    }
  }

  // Plunger lane left wall — one-way exit only.
  // A ball seated in the lane (inPlunger) is kept inside; any other ball is
  // immediately pushed back into the playfield so it can never re-enter the lane.
  const LANE_EXIT_Y = 0.5;
  if (ball.position.y > LANE_EXIT_Y) {
    if (ball.inPlunger) {
      // Keep the lane ball inside the lane.
      if (ball.position.x - r < TABLE.PLUNGER_LANE_LEFT) {
        ball.position.x = TABLE.PLUNGER_LANE_LEFT + r;
        ball.velocity.x = Math.abs(ball.velocity.x) * WALL_RESTITUTION;
      }
    } else {
      // One-way: push any playing ball that is drifting rightward into the lane back
      // to the playfield. The velocity.x > 0 guard is critical: a just-launched ball
      // starts at x = BALL_SPAWN_X (inside the lane) with velocity.x = 0, so it must
      // be allowed to travel up the lane freely. Only a playfield ball approaching the
      // lane from the left will have positive x-velocity, so we only block that case.
      if (ball.position.x + r > TABLE.PLUNGER_LANE_LEFT && ball.velocity.x > 0) {
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

// ─── Orbit Zone Detection ────────────────────────────────────────────────────

/** Check if a ball is within an orbit entry/exit zone and moving upward fast enough. */
export function checkOrbitZone(
  ball: Ball,
  zoneX: number, zoneY: number, zoneRadius: number,
  minSpeed: number,
): boolean {
  const dx = ball.position.x - zoneX;
  const dy = ball.position.y - zoneY;
  if (dx * dx + dy * dy >= zoneRadius * zoneRadius) return false;
  if (ball.velocity.y >= 0) return false;
  const spd = length(ball.velocity);
  return spd >= minSpeed;
}

// ─── Scoop Detection ─────────────────────────────────────────────────────────

export function isBallInScoop(
  ball: Ball,
  scoopX: number, scoopY: number, scoopRadius: number,
): boolean {
  const dx = ball.position.x - scoopX;
  const dy = ball.position.y - scoopY;
  return dx * dx + dy * dy < scoopRadius * scoopRadius;
}

// ─── Rollover Detection ──────────────────────────────────────────────────────
// Pure detection — does NOT modify ball velocity or position.

export function checkRollover(
  ball: Ball,
  rolloverX: number, rolloverY: number, rolloverRadius: number,
): boolean {
  const dx = ball.position.x - rolloverX;
  const dy = ball.position.y - rolloverY;
  return dx * dx + dy * dy < (ball.radius + rolloverRadius) * (ball.radius + rolloverRadius);
}

// ─── Slingshot Collision ──────────────────────────────────────────────────────

/**
 * Tests ball against each edge of a triangular slingshot. The kick edge uses
 * SLINGSHOT_RESTITUTION (> 1, adds energy); other edges use WALL_RESTITUTION.
 * Returns true if any edge was hit.
 */
export function collideBallSlingshot(ball: Ball, slingshot: Slingshot): boolean {
  const verts = slingshot.vertices;
  let hit = false;

  for (let i = 0; i < 3; i++) {
    if (i === slingshot.openEdgeIndex) continue;
    const v1 = verts[i]!;
    const v2 = verts[(i + 1) % 3]!;

    const segX = v2.x - v1.x;
    const segY = v2.y - v1.y;
    const segLenSq = segX * segX + segY * segY;

    const toBallX = ball.position.x - v1.x;
    const toBallY = ball.position.y - v1.y;
    const t = clamp(
      segLenSq > 0 ? (toBallX * segX + toBallY * segY) / segLenSq : 0,
      0, 1,
    );

    const closestX = v1.x + t * segX;
    const closestY = v1.y + t * segY;

    const dx = ball.position.x - closestX;
    const dy = ball.position.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= ball.radius || dist === 0) continue;

    const nx = dx / dist;
    const ny = dy / dist;

    ball.position.x += nx * (ball.radius - dist);
    ball.position.y += ny * (ball.radius - dist);

    const vDotN = ball.velocity.x * nx + ball.velocity.y * ny;
    if (vDotN < 0) {
      const restitution = i === slingshot.kickEdgeIndex
        ? SLINGSHOT_RESTITUTION
        : WALL_RESTITUTION;
      ball.velocity.x -= (1 + restitution) * vDotN * nx;
      ball.velocity.y -= (1 + restitution) * vDotN * ny;
    }

    // Cap speed after energy-adding kick
    if (i === slingshot.kickEdgeIndex) {
      const spd = length(ball.velocity);
      if (spd > BALL_MAX_SPEED) {
        ball.velocity.x = (ball.velocity.x / spd) * BALL_MAX_SPEED;
        ball.velocity.y = (ball.velocity.y / spd) * BALL_MAX_SPEED;
      }
    }

    hit = true;
  }

  return hit;
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
    length: 0.175,
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
    length: 0.175,
    restAngle: RIGHT_FLIPPER_REST_ANGLE,
    activeAngle: RIGHT_FLIPPER_ACTIVE_ANGLE,
    currentAngle: RIGHT_FLIPPER_REST_ANGLE,
    angularVelocity: 0,
    isActive: false,
  };
}

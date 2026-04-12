// ─── Physics Constants ────────────────────────────────────────────────────────
// All distances are in normalized (0..1) table coordinates. Time is ms.

export const GRAVITY = 0.0000018;
export const BALL_RADIUS = 0.025;
export const BALL_MAX_SPEED = 0.003;
export const WALL_RESTITUTION = 0.65;
export const BUMPER_RESTITUTION = 1.15;
export const FLIPPER_RESTITUTION = 0.75;
export const FLIPPER_ANGULAR_SPEED = 0.018;
export const FLIPPER_THICKNESS = 0.022;
export const MAX_PLUNGER_CHARGE_MS = 1500;
export const MAX_PLUNGER_VELOCITY = 0.004;
export const BUMPER_LIT_DURATION_MS = 300;
export const DRAIN_DELAY_MS = 1000;
export const BALLS_PER_GAME = 3;
export const HIGH_SCORE_KEY = 'pinball_high_score';

// Mission
export const MULTIBALL_BALLS = 2;              // extra balls spawned on mission complete
export const MISSION_BANNER_DURATION_MS = 2500;
export const DROP_TARGET_BONUS = 1000;         // base bonus for clearing a bank

// ─── Table Layout (normalized coordinates) ───────────────────────────────────

export const TABLE = {
  LEFT_WALL: 0.05,
  RIGHT_WALL: 0.95,
  TOP_WALL: 0.04,
  DRAIN_Y: 0.97,

  PLUNGER_X: 0.885,
  PLUNGER_LANE_LEFT: 0.825,

  FLIPPER_Y: 0.87,
  LEFT_FLIPPER_X: 0.30,
  RIGHT_FLIPPER_X: 0.70,

  BALL_SPAWN_X: 0.885,
  BALL_SPAWN_Y: 0.84,

  LANE_FLOOR_Y: 0.91,
} as const;

// ─── Flipper Angles (radians) ─────────────────────────────────────────────────

export const LEFT_FLIPPER_REST_ANGLE = 0.45;
export const LEFT_FLIPPER_ACTIVE_ANGLE = -0.45;
export const RIGHT_FLIPPER_REST_ANGLE = Math.PI - 0.45;
export const RIGHT_FLIPPER_ACTIVE_ANGLE = Math.PI + 0.45;

// ─── Default Bumper Layout ────────────────────────────────────────────────────

export const DEFAULT_BUMPERS: ReadonlyArray<{ x: number; y: number; score: number }> = [
  { x: 0.30, y: 0.24, score: 100 },
  { x: 0.55, y: 0.18, score: 100 },
  { x: 0.72, y: 0.28, score: 150 },
  { x: 0.40, y: 0.36, score: 75 },
  { x: 0.64, y: 0.40, score: 75 },
] as const;

export const BUMPER_RADIUS = 0.055;
export const TABLE_ASPECT = 0.52;

// ─── Drop Target Layout ───────────────────────────────────────────────────────
// A horizontal bank of 3 targets between the bumpers and the flippers.

export interface DropTargetDef {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
  score: number;
}

export const DEFAULT_DROP_TARGETS: ReadonlyArray<DropTargetDef> = [
  { x: 0.30, y: 0.55, halfWidth: 0.035, halfHeight: 0.012, score: 250 },
  { x: 0.40, y: 0.55, halfWidth: 0.035, halfHeight: 0.012, score: 250 },
  { x: 0.50, y: 0.55, halfWidth: 0.035, halfHeight: 0.012, score: 250 },
] as const;

// ─── Guide Wall Segments ──────────────────────────────────────────────────────

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const GUIDE_WALLS: ReadonlyArray<WallSegment> = [
  { x1: TABLE.LEFT_WALL,                y1: TABLE.FLIPPER_Y - 0.08, x2: TABLE.LEFT_FLIPPER_X  - 0.01, y2: TABLE.FLIPPER_Y + 0.01 },
  { x1: TABLE.PLUNGER_LANE_LEFT,        y1: TABLE.FLIPPER_Y - 0.08, x2: TABLE.RIGHT_FLIPPER_X + 0.01, y2: TABLE.FLIPPER_Y + 0.01 },
  { x1: TABLE.LEFT_WALL + 0.04,         y1: TABLE.FLIPPER_Y + 0.04, x2: TABLE.LEFT_FLIPPER_X  - 0.06, y2: TABLE.FLIPPER_Y + 0.01 },
  { x1: TABLE.PLUNGER_LANE_LEFT - 0.04, y1: TABLE.FLIPPER_Y + 0.04, x2: TABLE.RIGHT_FLIPPER_X + 0.06, y2: TABLE.FLIPPER_Y + 0.01 },
];

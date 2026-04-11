// ─── Physics Constants ────────────────────────────────────────────────────────
// All distances are in normalized (0..1) table coordinates.
// Time is in milliseconds.

/** Downward acceleration applied each ms */
export const GRAVITY = 0.0000018;

/** Ball radius (fraction of table width) */
export const BALL_RADIUS = 0.025;

/** Max ball speed (normalized units / ms) */
export const BALL_MAX_SPEED = 0.003;

/** Coefficient of restitution – walls */
export const WALL_RESTITUTION = 0.65;

/** Coefficient of restitution – bumpers (> 1 = energetic kick) */
export const BUMPER_RESTITUTION = 1.15;

/** Coefficient of restitution – flippers */
export const FLIPPER_RESTITUTION = 0.75;

/** How fast a flipper snaps to its target angle (rad/ms) */
export const FLIPPER_ANGULAR_SPEED = 0.018;

/** Half-thickness of a flipper arm (normalized) */
export const FLIPPER_THICKNESS = 0.022;

/** Normalized length of each flipper arm */
export const FLIPPER_LENGTH = 0.20;

/** Maximum plunger charge time in ms */
export const MAX_PLUNGER_CHARGE_MS = 1500;

/** Maximum launch speed at full charge (normalized units / ms) */
export const MAX_PLUNGER_VELOCITY = 0.004;

/** Duration of bumper "lit" flash in ms */
export const BUMPER_LIT_DURATION_MS = 300;

/** How long to wait in the draining phase before resetting (ms) */
export const DRAIN_DELAY_MS = 1000;

/** Number of balls per game */
export const BALLS_PER_GAME = 3;

/** localStorage key for high score */
export const HIGH_SCORE_KEY = 'pinball_high_score';

// ─── Table Layout (normalized coordinates) ───────────────────────────────────

export const TABLE = {
  LEFT_WALL: 0.05,
  RIGHT_WALL: 0.95,
  TOP_WALL: 0.04,
  /** y position below which the ball is considered drained */
  DRAIN_Y: 0.97,

  /** x center of the plunger (the ball rests here) */
  PLUNGER_X: 0.885,
  /** x of the left wall of the plunger lane */
  PLUNGER_LANE_LEFT: 0.825,

  /** y of both flipper pivots */
  FLIPPER_Y: 0.87,
  LEFT_FLIPPER_X: 0.30,
  RIGHT_FLIPPER_X: 0.70,

  /** Where the ball spawns when the plunger is reset */
  BALL_SPAWN_X: 0.885,
  BALL_SPAWN_Y: 0.84,

  /** Floor of the plunger lane – the ball cannot go below this point.
   *  A weak launch falls back here and the player can try again. */
  LANE_FLOOR_Y: 0.91,
} as const;

// ─── Flipper Angles (radians) ─────────────────────────────────────────────────
// Canvas y-axis points downward, so positive angle = clockwise.

/** Left flipper – drooped toward center of table */
export const LEFT_FLIPPER_REST_ANGLE = 0.45;
/** Left flipper – raised */
export const LEFT_FLIPPER_ACTIVE_ANGLE = -0.45;

/** Right flipper – drooped toward center of table (pointing left+down) */
export const RIGHT_FLIPPER_REST_ANGLE = Math.PI - 0.45;
/** Right flipper – raised */
export const RIGHT_FLIPPER_ACTIVE_ANGLE = Math.PI + 0.45;

// ─── Default Bumper Layout ────────────────────────────────────────────────────

export const DEFAULT_BUMPERS: ReadonlyArray<{ x: number; y: number; score: number }> = [
  { x: 0.30, y: 0.24, score: 100 },
  { x: 0.55, y: 0.18, score: 100 },
  { x: 0.72, y: 0.28, score: 150 },
  { x: 0.40, y: 0.36, score: 75 },
  { x: 0.64, y: 0.40, score: 75 },
] as const;

/** Radius of each bumper in normalized units */
export const BUMPER_RADIUS = 0.055;

/** Aspect ratio of the table: width / height */
export const TABLE_ASPECT = 0.52;

// ─── Guide Wall Segments ──────────────────────────────────────────────────────
// Angled walls that funnel the ball toward the flippers.
// Defined here (not in the renderer) so physics and rendering stay in sync.
// Each entry is { x1, y1, x2, y2 } in normalized table coordinates.

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const GUIDE_WALLS: ReadonlyArray<WallSegment> = [
  // Left outer guide: left boundary → left flipper pivot area
  { x1: TABLE.LEFT_WALL,                y1: TABLE.FLIPPER_Y - 0.08, x2: TABLE.LEFT_FLIPPER_X  - 0.01, y2: TABLE.FLIPPER_Y + 0.01 },
  // Right outer guide: lane divider → right flipper pivot area
  { x1: TABLE.PLUNGER_LANE_LEFT,        y1: TABLE.FLIPPER_Y - 0.08, x2: TABLE.RIGHT_FLIPPER_X + 0.01, y2: TABLE.FLIPPER_Y + 0.01 },
  // Left inlane wall (short diagonal between left wall and left flipper gap)
  { x1: TABLE.LEFT_WALL + 0.04,         y1: TABLE.FLIPPER_Y + 0.04, x2: TABLE.LEFT_FLIPPER_X  - 0.06, y2: TABLE.FLIPPER_Y + 0.01 },
  // Right inlane wall (short diagonal between lane divider and right flipper gap)
  { x1: TABLE.PLUNGER_LANE_LEFT - 0.04, y1: TABLE.FLIPPER_Y + 0.04, x2: TABLE.RIGHT_FLIPPER_X + 0.06, y2: TABLE.FLIPPER_Y + 0.01 },
];

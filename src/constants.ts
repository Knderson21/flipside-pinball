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

// Ball Lock / Multiball
export const BALLS_TO_LOCK = 3;               // balls that must be locked to trigger multiball
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

// ─── Rollover Lane Layout ─────────────────────────────────────────────────────
// Three rollover switches in the upper playfield. The ball passes over them
// without bouncing. Lighting all three lights the ball lock for multiball.

export interface RolloverDef {
  x: number;
  y: number;
  score: number;
}

export const DEFAULT_ROLLOVERS: ReadonlyArray<RolloverDef> = [
  { x: 0.25, y: 0.12, score: 25 },
  { x: 0.42, y: 0.12, score: 25 },
  { x: 0.59, y: 0.12, score: 25 },
] as const;

export const ROLLOVER_RADIUS = 0.022;

// ─── Lock Scoop ──────────────────────────────────────────────────────────────
// The ball lock scoop sits center-ish, below the bumper cluster and above the
// drop targets. When the lock is lit, a ball entering the scoop is captured.

export const LOCK_SCOOP = {
  x: 0.50,
  y: 0.48,
  radius: 0.032,
} as const;

// ─── Orbit Shot ──────────────────────────────────────────────────────────────
// An orbit loop across the upper playfield. When the ball enters the entry zone
// with sufficient velocity, it's "warped" along the orbit path and deposited at
// the exit point. This avoids complex channel collision physics.

export const ORBIT = {
  entryX: 0.12,
  entryY: 0.30,
  entryRadius: 0.04,
  /** Ball must be moving upward (negative vy) to enter */
  minSpeed: 0.001,
  exitX: 0.75,
  exitY: 0.30,
  exitVx: 0.0008,
  exitVy: 0.001,
  transitTimeMs: 400,
  score: 500,
  /** Polyline path for rendering and animation interpolation */
  path: [
    { x: 0.12, y: 0.30 },
    { x: 0.10, y: 0.22 },
    { x: 0.12, y: 0.14 },
    { x: 0.20, y: 0.08 },
    { x: 0.35, y: 0.05 },
    { x: 0.50, y: 0.04 },
    { x: 0.65, y: 0.05 },
    { x: 0.73, y: 0.10 },
    { x: 0.76, y: 0.20 },
    { x: 0.75, y: 0.30 },
  ] as ReadonlyArray<{ x: number; y: number }>,
} as const;

// ─── Slingshot Layout ─────────────────────────────────────────────────────────
// Triangular kickers above each flipper. The kick edge (hypotenuse) faces the
// playfield and adds energy on contact (restitution > 1). The other two edges
// are passive walls with normal restitution.

export interface SlingshotDef {
  v0: { x: number; y: number };
  v1: { x: number; y: number };
  v2: { x: number; y: number };
  /** Which edge (0=v0→v1, 1=v1→v2, 2=v2→v0) is the kick edge */
  kickEdge: number;
  score: number;
}

export const DEFAULT_SLINGSHOTS: ReadonlyArray<SlingshotDef> = [
  {
    // Left slingshot: between left wall and left flipper
    v0: { x: 0.10, y: 0.70 },   // upper corner (near wall)
    v1: { x: 0.24, y: 0.83 },   // lower-right (near flipper)
    v2: { x: 0.10, y: 0.83 },   // lower-left (near wall)
    kickEdge: 0,                 // v0→v1 is the hypotenuse (playfield-facing)
    score: 50,
  },
  {
    // Right slingshot: between right flipper and plunger lane
    v0: { x: 0.78, y: 0.70 },   // upper corner (near lane wall)
    v1: { x: 0.78, y: 0.83 },   // lower-right (near lane wall)
    v2: { x: 0.64, y: 0.83 },   // lower-left (near flipper)
    kickEdge: 2,                 // v2→v0 is the hypotenuse (playfield-facing)
    score: 50,
  },
] as const;

export const SLINGSHOT_RESTITUTION = 1.10;
export const SLINGSHOT_LIT_DURATION_MS = 200;

// ─── Launch Lane Curve ────────────────────────────────────────────────────────
// Inner rail of the curved launch lane. These segments guide the ball from the
// top of the plunger lane leftward into the upper playfield. The outer boundary
// is the existing top wall and right wall. The top-wall collision in physics.ts
// provides the initial redirect; these segments constrain the ball's path after.

export const LAUNCH_LANE_CURVE: ReadonlyArray<WallSegment> = [
  { x1: 0.825, y1: 0.14,  x2: 0.82,  y2: 0.12 },
  { x1: 0.82,  y1: 0.12,  x2: 0.81,  y2: 0.105 },
  { x1: 0.81,  y1: 0.105, x2: 0.79,  y2: 0.095 },
  { x1: 0.79,  y1: 0.095, x2: 0.75,  y2: 0.09 },
  { x1: 0.75,  y1: 0.09,  x2: 0.68,  y2: 0.10 },
  { x1: 0.68,  y1: 0.10,  x2: 0.60,  y2: 0.115 },
];

export const GUIDE_WALLS: ReadonlyArray<WallSegment> = [
  // Upper inlane guides — endpoints stop 0.02 units ABOVE each flipper pivot.
  // This intentional gap redirects the ball onto the flipper face instead of
  // the pivot end-cap, avoiding the corner trap that occurs when the wall
  // terminates exactly at the pivot.
  { x1: TABLE.LEFT_WALL,                y1: TABLE.FLIPPER_Y - 0.08, x2: TABLE.LEFT_FLIPPER_X,  y2: TABLE.FLIPPER_Y - 0.02 },
  { x1: TABLE.PLUNGER_LANE_LEFT,        y1: TABLE.FLIPPER_Y - 0.08, x2: TABLE.RIGHT_FLIPPER_X, y2: TABLE.FLIPPER_Y - 0.02 },
  // Lower outlane guides (below and outside the flippers)
  { x1: TABLE.LEFT_WALL + 0.04,         y1: TABLE.FLIPPER_Y + 0.04, x2: TABLE.LEFT_FLIPPER_X  - 0.06, y2: TABLE.FLIPPER_Y + 0.01 },
  { x1: TABLE.PLUNGER_LANE_LEFT - 0.04, y1: TABLE.FLIPPER_Y + 0.04, x2: TABLE.RIGHT_FLIPPER_X + 0.06, y2: TABLE.FLIPPER_Y + 0.01 },
];

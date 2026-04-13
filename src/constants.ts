// ─── Physics Constants ────────────────────────────────────────────────────────
// All distances are in normalized (0..1) table coordinates. Time is ms.

export const GRAVITY = 0.0000018;
export const BALL_RADIUS = 0.025;
export const BALL_MAX_SPEED = 0.0025;
// Sub-steps per frame for ball physics. At BALL_MAX_SPEED (0.003/ms) and the
// 32ms frame cap, 4 substeps keep per-step movement (≤0.024) below both the
// ball radius (0.025) and the flipper detection range (0.036), preventing
// tunneling through flippers, slingshots, and wall segments.
export const PHYSICS_SUBSTEPS = 4;
export const WALL_RESTITUTION = 0.40;
export const BUMPER_RESTITUTION = 1.08;
export const FLIPPER_RESTITUTION = 0.40;
export const FLIPPER_ANGULAR_SPEED = 0.018;
export const FLIPPER_THICKNESS = 0.042;
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

  PLUNGER_X: 0.910,
  PLUNGER_LANE_LEFT: 0.870,

  FLIPPER_Y: 0.87,
  LEFT_FLIPPER_X: 0.226,
  RIGHT_FLIPPER_X: 0.694,

  BALL_SPAWN_X: 0.910,
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
  { x: 0.485, y: 0.19, score: 100 },
  { x: 0.285, y: 0.28, score: 100 },
  { x: 0.685, y: 0.28, score: 100 },
  { x: 0.365, y: 0.37, score: 75 },
  { x: 0.605, y: 0.37, score: 75 },
] as const;

export const BUMPER_RADIUS = 0.045;
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
  { x: 0.275, y: 0.55, halfWidth: 0.035, halfHeight: 0.012, score: 250 },
  { x: 0.415, y: 0.55, halfWidth: 0.035, halfHeight: 0.012, score: 250 },
  { x: 0.555, y: 0.55, halfWidth: 0.035, halfHeight: 0.012, score: 250 },
  { x: 0.695, y: 0.55, halfWidth: 0.035, halfHeight: 0.012, score: 250 },
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
  { x: 0.230, y: 0.12, score: 25 },
  { x: 0.410, y: 0.12, score: 25 },
  { x: 0.590, y: 0.12, score: 25 },
  { x: 0.770, y: 0.12, score: 25 },
] as const;

export const ROLLOVER_RADIUS = 0.022;

// ─── Lock Scoop ──────────────────────────────────────────────────────────────
// The ball lock scoop sits center-ish, below the bumper cluster and above the
// drop targets. When the lock is lit, a ball entering the scoop is captured.

export const LOCK_SCOOP = {
  x: 0.485,
  y: 0.48,
  radius: 0.032,
} as const;

// ─── Orbit Lane ──────────────────────────────────────────────────────────────
// A physical lane wrapping around the upper playfield. The ball travels through
// it using real physics, bouncing between outer and inner walls. The inner wall
// has a gap at the top so balls can fall through to the rollover area.
// Both ends are open; orbit score is awarded on entry, with a bonus when the
// ball enters one side and exits the other.

export const ORBIT_SCORE = 500;
export const ORBIT_MIN_SPEED = 0.001;
export const ORBIT_ENTRY_RADIUS = 0.04;

// Entry/exit zones at the bottom of each side of the lane
export const ORBIT_LEFT = { x: 0.152, y: 0.460 };
export const ORBIT_RIGHT = { x: 0.848, y: 0.460 };

// Outer wall — follows the perimeter of the lane (full loop, left to right).
// The outermost points touch LEFT_WALL (0.05) and RIGHT_WALL (0.95).
// Right side is a mirror of the left side (x' = 1.0 - x).
// Bottom-right segments are in a separate one-way array (ORBIT_OUTER_WALLS_ONEWAY).
export const ORBIT_OUTER_WALLS: ReadonlyArray<WallSegment> = [
  // Left side
  { x1: 0.130, y1: 0.500, x2: 0.068, y2: 0.400 },   // left entry → up
  { x1: 0.068, y1: 0.400, x2: 0.050, y2: 0.240 },   // up left wall (touches LEFT_WALL)
  { x1: 0.050, y1: 0.240, x2: 0.099, y2: 0.120 },   // mid-left
  { x1: 0.099, y1: 0.120, x2: 0.174, y2: 0.070 },   // upper-left corner
  { x1: 0.174, y1: 0.070, x2: 0.301, y2: 0.042 },   // rounding top-left
  // Top
  { x1: 0.301, y1: 0.042, x2: 0.699, y2: 0.042 },   // along top (symmetric)
  // Right side (mirror of left)
  { x1: 0.699, y1: 0.042, x2: 0.826, y2: 0.070 },   // rounding top-right
  { x1: 0.826, y1: 0.070, x2: 0.901, y2: 0.120 },   // upper-right corner
  { x1: 0.901, y1: 0.120, x2: 0.950, y2: 0.240 },   // mid-right (touches RIGHT_WALL)
];

// Right outer wall — one-way collision (inner side only, downward-moving balls).
// These are the inward-curving segments (x decreases going down) at the lower
// right. Balls moving upward from the launch lane pass through; balls falling
// inside the orbit are blocked and guided toward the playfield.
export const ORBIT_OUTER_WALLS_ONEWAY: ReadonlyArray<WallSegment> = [
  { x1: 0.950, y1: 0.240, x2: 0.932, y2: 0.400 },   // down right wall
  { x1: 0.932, y1: 0.400, x2: 0.870, y2: 0.500 },   // right → exit
];

// Inner wall — offset ~0.08 inward from outer wall.
// Gap between left and right sections at the top lets balls fall to rollovers.
// Right side is mirrored from left side (x' = 1.0 - x).
export const ORBIT_INNER_WALLS: ReadonlyArray<WallSegment> = [
  // Left inner wall (entry up to gap)
  { x1: 0.200, y1: 0.460, x2: 0.146, y2: 0.370 },
  { x1: 0.146, y1: 0.370, x2: 0.133, y2: 0.249 },
  { x1: 0.133, y1: 0.249, x2: 0.164, y2: 0.173 },
  { x1: 0.164, y1: 0.173, x2: 0.206, y2: 0.145 },   // gap starts here
  // Right inner wall (mirror of left, gap to exit)
  { x1: 0.794, y1: 0.145, x2: 0.836, y2: 0.173 },   // gap ends here
  { x1: 0.836, y1: 0.173, x2: 0.867, y2: 0.249 },
  { x1: 0.867, y1: 0.249, x2: 0.854, y2: 0.370 },
  { x1: 0.854, y1: 0.370, x2: 0.800, y2: 0.460 },
];

// Center path for rendering — midpoint between outer and inner walls.
// Right side is mirrored from left side.
export const ORBIT_PATH: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0.136, y: 0.460 },
  { x: 0.107, y: 0.342 },
  { x: 0.092, y: 0.245 },
  { x: 0.132, y: 0.147 },
  { x: 0.190, y: 0.108 },
  { x: 0.306, y: 0.082 },
  { x: 0.694, y: 0.082 },
  { x: 0.810, y: 0.108 },
  { x: 0.868, y: 0.147 },
  { x: 0.908, y: 0.245 },
  { x: 0.893, y: 0.342 },
  { x: 0.864, y: 0.460 },
];

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
  /** Which edge is the open bottom — no collision on this edge so the ball can roll underneath */
  openEdge: number;
  score: number;
}

export const DEFAULT_SLINGSHOTS: ReadonlyArray<SlingshotDef> = [
  {
    // Left slingshot: between left wall and left flipper
    // Wall-side at x=0.139 leaves ~0.089 gap from LEFT_WALL (0.05) for ball to pass behind.
    // Raised 0.015 units and shifted 0.015 inward from walls for more passage room below and behind.
    // Bottom corner (v2) raised so ball can roll underneath.
    v0: { x: 0.139, y: 0.665 },   // upper corner (near wall)
    v1: { x: 0.230, y: 0.7766 },  // lower-right (near flipper)
    v2: { x: 0.139, y: 0.745 },   // lower-left (near wall) — raised to open bottom passage
    kickEdge: 0,                   // v0→v1 is the hypotenuse (playfield-facing)
    openEdge: 1,                   // v1→v2 is the open bottom — ball rolls freely underneath
    score: 50,
  },
  {
    // Right slingshot: between right flipper and plunger lane
    // Wall-side at x=0.781 leaves ~0.089 gap from PLUNGER_LANE_LEFT (0.870) for ball to pass behind.
    // Raised 0.015 units and shifted 0.015 inward from walls for more passage room below and behind.
    // Bottom corner (v1) raised so ball can roll underneath.
    v0: { x: 0.781, y: 0.665 },  // upper corner (near lane wall)
    v1: { x: 0.781, y: 0.745 },  // lower-right (near lane wall) — raised to open bottom passage
    v2: { x: 0.690, y: 0.7766 }, // lower-left (near flipper)
    kickEdge: 2,                   // v2→v0 is the hypotenuse (playfield-facing)
    openEdge: 1,                   // v1→v2 is the open bottom — ball rolls freely underneath
    score: 50,
  },
] as const;

export const SLINGSHOT_RESTITUTION = 1.05;
export const SLINGSHOT_LIT_DURATION_MS = 200;

export const GUIDE_WALLS: ReadonlyArray<WallSegment> = [
  // Upper inlane guides — endpoints stop 0.02 units ABOVE each flipper pivot.
  // This intentional gap redirects the ball onto the flipper face instead of
  // the pivot end-cap, avoiding the corner trap that occurs when the wall
  // terminates exactly at the pivot.
  { x1: TABLE.LEFT_WALL,                y1: TABLE.FLIPPER_Y - 0.08, x2: TABLE.LEFT_FLIPPER_X,  y2: TABLE.FLIPPER_Y - 0.02 },
  { x1: TABLE.PLUNGER_LANE_LEFT,        y1: TABLE.FLIPPER_Y - 0.08, x2: TABLE.RIGHT_FLIPPER_X, y2: TABLE.FLIPPER_Y - 0.02 },
  // Lower outlane guides (below and outside the flippers)
  { x1: TABLE.LEFT_WALL + 0.042,         y1: TABLE.FLIPPER_Y + 0.04, x2: TABLE.LEFT_FLIPPER_X  - 0.063, y2: TABLE.FLIPPER_Y + 0.01 },
  { x1: TABLE.PLUNGER_LANE_LEFT - 0.042, y1: TABLE.FLIPPER_Y + 0.04, x2: TABLE.RIGHT_FLIPPER_X + 0.063, y2: TABLE.FLIPPER_Y + 0.01 },
];

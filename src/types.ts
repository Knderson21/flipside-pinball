// ─── Core Math ───────────────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

// ─── Game Objects ─────────────────────────────────────────────────────────────

export interface Ball {
  position: Vec2;
  velocity: Vec2;
  radius: number;
  /** false while the ball is spawning or has been drained */
  active: boolean;
}

export type FlipperSide = 'left' | 'right';

export interface Flipper {
  side: FlipperSide;
  /** Pivot point in normalized (0..1) table coordinates */
  pivotX: number;
  pivotY: number;
  /** Normalized length of the flipper arm */
  length: number;
  /** Angle (radians) when flipper is at rest / drooped */
  restAngle: number;
  /** Angle (radians) when flipper is raised / active */
  activeAngle: number;
  /** Current render/physics angle (radians) */
  currentAngle: number;
  /** Angular velocity (rad/ms) – used to impart momentum to ball on contact */
  angularVelocity: number;
  /** True while the corresponding key/touch is held down */
  isActive: boolean;
}

export interface Bumper {
  id: string;
  /** Center in normalized (0..1) table coordinates */
  position: Vec2;
  /** Radius in normalized units */
  radius: number;
  /** Points awarded on each hit */
  scoreValue: number;
  /** True for a brief flash after being hit */
  lit: boolean;
  /** Milliseconds remaining in the lit flash */
  litTimer: number;
}

export interface Plunger {
  /** 0 = uncharged, 1 = fully charged */
  charge: number;
  /** True while the player is holding the plunger key/touch */
  charging: boolean;
  /** True after the ball has been launched (one-shot flag) */
  launched: boolean;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type GamePhase =
  | 'attract'   // idle / title screen
  | 'launching' // ball in plunger lane, player is charging
  | 'playing'   // ball is live on the table
  | 'draining'  // brief pause while ball drain animation plays
  | 'gameover'; // all balls used

export interface GameState {
  phase: GamePhase;
  score: number;
  highScore: number;
  ballsRemaining: number;
  ball: Ball;
  /** Index 0 = left flipper, index 1 = right flipper */
  flippers: [Flipper, Flipper];
  bumpers: Bumper[];
  plunger: Plunger;
  /** DOMHighResTimeStamp of the last frame, used for delta-time calculation */
  lastFrameTime: number;
  /** Elapsed ms in the current 'draining' phase, for drain delay timing */
  drainTimer: number;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export interface Theme {
  background: string;
  tableBorder: string;
  tableFill: string;
  ballColor: string;
  ballHighlight: string;
  flipperColor: string;
  flipperActiveColor: string;
  bumperIdleColor: string;
  bumperLitColor: string;
  bumperBorderColor: string;
  bumperLitBorderColor: string;
  wallColor: string;
  plungerTrackColor: string;
  plungerColor: string;
  plungerChargedColor: string;
  /** Font template – renderer replaces `{size}` with a computed pixel value */
  scoreFont: string;
  scoreColor: string;
  hudBackground: string;
  labelColor: string;
  drainColor: string;
  guideColor: string;
}

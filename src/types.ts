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
  /** true while this ball is locked in the plunger lane waiting to launch */
  inPlunger: boolean;
}

export type FlipperSide = 'left' | 'right';

export interface Flipper {
  side: FlipperSide;
  pivotX: number;
  pivotY: number;
  length: number;
  restAngle: number;
  activeAngle: number;
  currentAngle: number;
  angularVelocity: number;
  isActive: boolean;
}

export interface Bumper {
  id: string;
  position: Vec2;
  radius: number;
  scoreValue: number;
  lit: boolean;
  litTimer: number;
}

export interface DropTarget {
  id: string;
  /** Center in normalized coordinates */
  position: Vec2;
  /** Half-width (x) */
  halfWidth: number;
  /** Half-height (y) */
  halfHeight: number;
  scoreValue: number;
  /** true once the ball has knocked this target down */
  down: boolean;
}

export interface Plunger {
  charge: number;
  charging: boolean;
  launched: boolean;
}

// ─── Mission / Mode State ─────────────────────────────────────────────────────

export type MissionPhase = 'idle' | 'active' | 'complete';

export interface MissionState {
  phase: MissionPhase;
  /** How many drop-target banks the player has completed this ball */
  banksCleared: number;
  /** Scoring multiplier, grows with banksCleared */
  multiplier: number;
  /** ms remaining to show the "MULTIBALL!" banner */
  bannerTimer: number;
  bannerText: string;
}

// ─── Game Phases ──────────────────────────────────────────────────────────────

export type GamePhase =
  | 'attract'
  | 'launching'
  | 'playing'
  | 'draining'
  | 'gameover';

export interface GameState {
  phase: GamePhase;
  score: number;
  highScore: number;
  ballsRemaining: number;
  /** All live balls on the table. Single-ball play uses length 1; multiball grows it. */
  balls: Ball[];
  flippers: [Flipper, Flipper];
  bumpers: Bumper[];
  dropTargets: DropTarget[];
  plunger: Plunger;
  mission: MissionState;
  lastFrameTime: number;
  drainTimer: number;
}

// ─── Theme Pack ───────────────────────────────────────────────────────────────

export interface ColorPalette {
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
  dropTargetColor: string;
  dropTargetDownColor: string;
  wallColor: string;
  plungerTrackColor: string;
  plungerColor: string;
  plungerChargedColor: string;
  scoreColor: string;
  hudBackground: string;
  labelColor: string;
  drainColor: string;
  guideColor: string;
  /** Overlay fill behind the attract / gameover screens */
  overlay: string;
  /** Accent color for the mission banner */
  accent: string;
}

export interface ThemeFonts {
  /** Font family for score digits. Monospace strongly recommended. */
  score: string;
  /** Font family for labels and HUD text */
  label: string;
  /** Font family for the title screen */
  title: string;
}

export interface ThemeStrings {
  title: string;
  subtitle: string;
  pressStart: string;
  gameOver: string;
  playAgain: string;
  pull: string;
  controls: string[];
}

/** Sound definition — either a URL asset or a synthesized beep */
export type SoundDef =
  | { type: 'url'; src: string; volume?: number }
  | { type: 'synth'; freq: number; durationMs: number; wave?: OscillatorType; volume?: number; slide?: number };

export interface ThemeSounds {
  bumper?: SoundDef;
  flipper?: SoundDef;
  launch?: SoundDef;
  drain?: SoundDef;
  dropTarget?: SoundDef;
  missionComplete?: SoundDef;
  gameOver?: SoundDef;
}

/** Screen-space render context passed to theme draw overrides */
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  /** normalized x → CSS pixel x */
  sx: (nx: number) => number;
  /** normalized y → CSS pixel y */
  sy: (ny: number) => number;
  /** normalized length → CSS pixels */
  sl: (nl: number) => number;
  tableX: number;
  tableY: number;
  tableW: number;
  tableH: number;
}

/**
 * A ThemePack fully describes the *presentation* of the game — colors, fonts,
 * strings, sprite slots, sound events, and optional per-object draw overrides.
 * Physics, layout, and game rules are entirely independent of the theme.
 */
export interface ThemePack {
  id: string;
  name: string;
  palette: ColorPalette;
  fonts: ThemeFonts;
  strings: ThemeStrings;
  sounds: ThemeSounds;
  /** Optional draw overrides. Return true if the theme handled drawing. */
  drawBackdrop?: (rc: RenderContext, palette: ColorPalette) => void;
  drawBumper?: (rc: RenderContext, bumper: Bumper, palette: ColorPalette) => void;
  drawBall?: (rc: RenderContext, ball: Ball, palette: ColorPalette) => void;
  drawFlipper?: (rc: RenderContext, flipper: Flipper, palette: ColorPalette) => void;
  drawDropTarget?: (rc: RenderContext, target: DropTarget, palette: ColorPalette) => void;
}

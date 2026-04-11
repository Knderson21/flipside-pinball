import type { Ball, Bumper, Flipper, GameState, Theme, Vec2 } from './types';
import { BALLS_PER_GAME, FLIPPER_THICKNESS, GUIDE_WALLS, TABLE, TABLE_ASPECT } from './constants';

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly theme: Theme;

  // Table bounds in CSS pixels (updated on every resize)
  private tableX = 0;
  private tableY = 0;
  private tableW = 0;
  private tableH = 0;

  constructor(canvas: HTMLCanvasElement, theme: Theme) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not obtain 2D canvas context');
    this.ctx = ctx;
    this.theme = theme;
  }

  // ─── Resize / Scaling ───────────────────────────────────────────────────────

  resize(windowW: number, windowH: number): void {
    const dpr = window.devicePixelRatio ?? 1;
    this.canvas.width = Math.round(windowW * dpr);
    this.canvas.height = Math.round(windowH * dpr);
    this.canvas.style.width = `${windowW}px`;
    this.canvas.style.height = `${windowH}px`;

    this.ctx.scale(dpr, dpr);
    this.computeTableBounds(windowW, windowH);
  }

  private computeTableBounds(windowW: number, windowH: number): void {
    const padding = 0.96; // use 96% of the limiting dimension
    const winAspect = windowW / windowH;

    if (winAspect > TABLE_ASPECT) {
      // Window is wider than table – constrain by height
      this.tableH = windowH * padding;
      this.tableW = this.tableH * TABLE_ASPECT;
    } else {
      // Window is taller / narrower – constrain by width
      this.tableW = windowW * padding;
      this.tableH = this.tableW / TABLE_ASPECT;
    }

    this.tableX = (windowW - this.tableW) / 2;
    this.tableY = (windowH - this.tableH) / 2;
  }

  // ─── Coordinate Transforms ──────────────────────────────────────────────────

  /** Normalized x → CSS pixel x */
  private sx(nx: number): number {
    return this.tableX + nx * this.tableW;
  }

  /** Normalized y → CSS pixel y */
  private sy(ny: number): number {
    return this.tableY + ny * this.tableH;
  }

  /** Normalized length → CSS pixels (uses table width as reference) */
  private sl(nl: number): number {
    return nl * this.tableW;
  }

  // ─── Main Render Entry ──────────────────────────────────────────────────────

  render(state: GameState): void {
    const { ctx } = this;
    const W = this.canvas.width / (window.devicePixelRatio ?? 1);
    const H = this.canvas.height / (window.devicePixelRatio ?? 1);

    // Clear the full canvas
    ctx.fillStyle = this.theme.background;
    ctx.fillRect(0, 0, W, H);

    this.drawTable();
    this.drawPlungerLane(state);
    this.drawBumpers(state.bumpers);
    this.drawFlippers(state.flippers);
    this.drawBall(state.ball);
    this.drawHUD(state);

    if (state.phase === 'draining') {
      this.drawDrainOverlay();
    }
    if (state.phase === 'attract') {
      this.drawAttractScreen();
    }
    if (state.phase === 'gameover') {
      this.drawGameOverScreen(state);
    }
    if (state.phase === 'launching') {
      this.drawTouchHints();
    }
  }

  // ─── Table Background ───────────────────────────────────────────────────────

  private drawTable(): void {
    const { ctx } = this;
    const x = this.tableX;
    const y = this.tableY;
    const w = this.tableW;
    const h = this.tableH;

    // Background fill
    ctx.fillStyle = this.theme.tableFill;
    ctx.fillRect(x, y, w, h);

    // Side guide rails (decorative dark lanes along left/right edges)
    ctx.fillStyle = this.theme.guideColor;
    ctx.fillRect(x, y, this.sl(TABLE.LEFT_WALL), h);
    ctx.fillRect(this.sx(TABLE.RIGHT_WALL), y, this.sl(1 - TABLE.RIGHT_WALL), h);

    // Border
    ctx.strokeStyle = this.theme.tableBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Inner play-field walls (left and right of play area)
    ctx.strokeStyle = this.theme.wallColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.sx(TABLE.LEFT_WALL), this.sy(TABLE.TOP_WALL));
    ctx.lineTo(this.sx(TABLE.LEFT_WALL), this.sy(TABLE.DRAIN_Y));
    ctx.moveTo(this.sx(TABLE.RIGHT_WALL), this.sy(TABLE.TOP_WALL));
    ctx.lineTo(this.sx(TABLE.RIGHT_WALL), this.sy(TABLE.DRAIN_Y));
    // Top wall
    ctx.moveTo(this.sx(TABLE.LEFT_WALL), this.sy(TABLE.TOP_WALL));
    ctx.lineTo(this.sx(TABLE.RIGHT_WALL), this.sy(TABLE.TOP_WALL));
    ctx.stroke();

    // Angled guide walls near flippers (classic pinball "inlane" shape)
    this.drawFlipperGuides();
  }

  /** Angled walls that funnel the ball toward the flippers.
   *  Drawn from GUIDE_WALLS so they always match the physics segments. */
  private drawFlipperGuides(): void {
    const { ctx } = this;
    ctx.strokeStyle = this.theme.wallColor;
    ctx.lineWidth = 2.5;

    for (const seg of GUIDE_WALLS) {
      ctx.beginPath();
      ctx.moveTo(this.sx(seg.x1), this.sy(seg.y1));
      ctx.lineTo(this.sx(seg.x2), this.sy(seg.y2));
      ctx.stroke();
    }
  }

  // ─── Plunger Lane ───────────────────────────────────────────────────────────

  private drawPlungerLane(state: GameState): void {
    const { ctx } = this;

    // Lane background
    ctx.fillStyle = this.theme.plungerTrackColor;
    ctx.fillRect(
      this.sx(TABLE.PLUNGER_LANE_LEFT),
      this.sy(TABLE.TOP_WALL),
      this.sl(TABLE.RIGHT_WALL - TABLE.PLUNGER_LANE_LEFT),
      this.sy(TABLE.DRAIN_Y) - this.sy(TABLE.TOP_WALL)
    );

    // Lane left divider wall
    ctx.strokeStyle = this.theme.wallColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.sx(TABLE.PLUNGER_LANE_LEFT), this.sy(TABLE.TOP_WALL));
    ctx.lineTo(this.sx(TABLE.PLUNGER_LANE_LEFT), this.sy(TABLE.DRAIN_Y));
    ctx.stroke();

    if (state.phase === 'launching' || state.phase === 'playing') {
      this.drawPlunger(state);
    }
  }

  private drawPlunger(state: GameState): void {
    const { ctx } = this;
    const charge = state.plunger.charge;

    const laneLeft = this.sx(TABLE.PLUNGER_LANE_LEFT);
    const laneRight = this.sx(TABLE.RIGHT_WALL);
    const laneWidth = laneRight - laneLeft;
    const laneBottom = this.sy(TABLE.DRAIN_Y);
    const plungerHeight = this.sl(0.12); // fixed visual height of plunger rod

    // Tick marks on the lane wall (charge indicator)
    const tickCount = 5;
    const tickAreaH = this.sl(0.18);
    ctx.strokeStyle = this.theme.labelColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= tickCount; i++) {
      const ty = laneBottom - (i / tickCount) * tickAreaH;
      ctx.beginPath();
      ctx.moveTo(laneLeft + 2, ty);
      ctx.lineTo(laneLeft + 8, ty);
      ctx.stroke();
    }

    // Plunger rod – compressed as charge increases (visually moves ball up)
    const compressionOffset = charge * this.sl(0.06);
    const rodY = laneBottom - compressionOffset;
    const rodH = plungerHeight * (1 - charge * 0.4);

    // Color transition based on charge
    const r = Math.round(85 + charge * 170);
    const g = Math.round(102 - charge * 102);
    const b = Math.round(119 - charge * 85);
    ctx.fillStyle = charge > 0.1
      ? `rgb(${r},${g},${b})`
      : this.theme.plungerColor;

    ctx.beginPath();
    ctx.roundRect(
      laneLeft + laneWidth * 0.2,
      rodY - rodH,
      laneWidth * 0.6,
      rodH,
      3
    );
    ctx.fill();

    // "PULL" label when not charging
    if (charge === 0 && state.phase === 'launching') {
      ctx.fillStyle = this.theme.labelColor;
      const fontSize = Math.round(this.sl(0.035));
      ctx.font = `600 ${fontSize}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('PULL', laneLeft + laneWidth / 2, laneBottom - this.sl(0.16));
    }
  }

  // ─── Bumpers ────────────────────────────────────────────────────────────────

  private drawBumpers(bumpers: Bumper[]): void {
    for (const bumper of bumpers) {
      this.drawBumper(bumper);
    }
  }

  private drawBumper(bumper: Bumper): void {
    const { ctx } = this;
    const cx = this.sx(bumper.position.x);
    const cy = this.sy(bumper.position.y);
    const r = this.sl(bumper.radius);

    const lit = bumper.lit;
    const fillColor = lit ? this.theme.bumperLitColor : this.theme.bumperIdleColor;
    const borderColor = lit ? this.theme.bumperLitBorderColor : this.theme.bumperBorderColor;

    // Outer glow when lit
    if (lit) {
      const grd = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.8);
      grd.addColorStop(0, 'rgba(255, 140, 0, 0.35)');
      grd.addColorStop(1, 'rgba(255, 140, 0, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lit ? 3 : 2;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = lit ? '#ffffff' : borderColor;
    ctx.fill();

    // Score label
    const fontSize = Math.max(9, Math.round(this.sl(0.032)));
    ctx.fillStyle = lit ? '#ffffff' : this.theme.labelColor;
    ctx.font = `700 ${fontSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(bumper.scoreValue), cx, cy + r * 1.55);
    ctx.textBaseline = 'alphabetic';
  }

  // ─── Flippers ───────────────────────────────────────────────────────────────

  private drawFlippers(flippers: [Flipper, Flipper]): void {
    for (const flipper of flippers) {
      this.drawFlipper(flipper);
    }
  }

  private drawFlipper(flipper: Flipper): void {
    const { ctx } = this;
    const pivotX = this.sx(flipper.pivotX);
    const pivotY = this.sy(flipper.pivotY);
    const len = this.sl(flipper.length);
    const thick = this.sl(FLIPPER_THICKNESS);

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(flipper.currentAngle);

    // Flipper shape: tapered from thick at pivot to thin at tip
    const halfThickBase = thick * 0.65;
    const halfThickTip = thick * 0.28;

    ctx.beginPath();
    ctx.moveTo(0, -halfThickBase);
    ctx.lineTo(len, -halfThickTip);
    ctx.arc(len, 0, halfThickTip, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(0, halfThickBase);
    ctx.arc(0, 0, halfThickBase, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();

    ctx.fillStyle = flipper.isActive
      ? this.theme.flipperActiveColor
      : this.theme.flipperColor;
    ctx.fill();

    // Highlight stripe
    ctx.strokeStyle = flipper.isActive
      ? 'rgba(100, 180, 255, 0.6)'
      : 'rgba(60, 120, 200, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(halfThickBase * 0.5, -halfThickBase * 0.5);
    ctx.lineTo(len * 0.85, -halfThickTip * 0.5);
    ctx.stroke();

    ctx.restore();

    // Pivot dot
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, this.sl(0.012), 0, Math.PI * 2);
    ctx.fillStyle = this.theme.wallColor;
    ctx.fill();
  }

  // ─── Ball ────────────────────────────────────────────────────────────────────

  private drawBall(ball: Ball): void {
    if (!ball.active) return;
    const { ctx } = this;
    const cx = this.sx(ball.position.x);
    const cy = this.sy(ball.position.y);
    const r = this.sl(ball.radius);

    // Ball body with metallic radial gradient
    const grd = ctx.createRadialGradient(
      cx - r * 0.35, cy - r * 0.35, r * 0.05,
      cx, cy, r
    );
    grd.addColorStop(0, this.theme.ballHighlight);
    grd.addColorStop(0.45, this.theme.ballColor);
    grd.addColorStop(1, '#444455');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  private drawHUD(state: GameState): void {
    const { ctx } = this;
    const fontSize = Math.max(10, Math.round(this.tableW * 0.055));
    const smallFont = Math.max(8, Math.round(this.tableW * 0.038));

    // HUD background bar
    const hudH = this.tableH * 0.065;
    const hudY = this.tableY - hudH - 4;
    ctx.fillStyle = this.theme.hudBackground;
    ctx.fillRect(this.tableX, hudY, this.tableW, hudH + 4);

    ctx.textBaseline = 'middle';
    const midY = hudY + (hudH + 4) / 2;

    // Current score (left)
    ctx.font = `700 ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = this.theme.scoreColor;
    ctx.textAlign = 'left';
    ctx.fillText(String(state.score).padStart(7, '0'), this.tableX + 8, midY);

    // High score (right)
    ctx.font = `600 ${smallFont}px "Courier New", monospace`;
    ctx.fillStyle = this.theme.labelColor;
    ctx.textAlign = 'right';
    ctx.fillText(`HI ${String(state.highScore).padStart(7, '0')}`, this.tableX + this.tableW - 8, midY);

    // Ball dots (center)
    const dotR = Math.max(4, this.tableW * 0.018);
    const dotSpacing = dotR * 2.8;
    const centerX = this.tableX + this.tableW / 2;
    for (let i = 0; i < BALLS_PER_GAME; i++) {
      const dx = centerX + (i - (BALLS_PER_GAME - 1) / 2) * dotSpacing;
      ctx.beginPath();
      ctx.arc(dx, midY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = i < state.ballsRemaining ? this.theme.scoreColor : '#333344';
      ctx.fill();
    }

    ctx.textBaseline = 'alphabetic';
  }

  // ─── Drain Overlay ───────────────────────────────────────────────────────────

  private drawDrainOverlay(): void {
    const { ctx } = this;
    ctx.fillStyle = this.theme.drainColor;
    ctx.fillRect(this.tableX, this.tableY, this.tableW, this.tableH);
  }

  // ─── Attract Screen ──────────────────────────────────────────────────────────

  private drawAttractScreen(): void {
    const { ctx } = this;
    const cx = this.tableX + this.tableW / 2;
    const cy = this.tableY + this.tableH / 2;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 20, 0.78)';
    ctx.fillRect(this.tableX, this.tableY, this.tableW, this.tableH);

    // Title
    const titleSize = Math.round(this.tableW * 0.14);
    ctx.font = `900 ${titleSize}px "Courier New", monospace`;
    ctx.fillStyle = this.theme.scoreColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PINBALL', cx, cy - this.tableH * 0.12);

    // Subtitle
    const subSize = Math.round(this.tableW * 0.055);
    ctx.font = `600 ${subSize}px "Courier New", monospace`;
    ctx.fillStyle = this.theme.labelColor;
    ctx.fillText('PRESS SPACE OR ENTER', cx, cy + this.tableH * 0.04);

    // Controls hint
    const hintSize = Math.round(this.tableW * 0.038);
    ctx.font = `${hintSize}px "Courier New", monospace`;
    ctx.fillStyle = this.theme.labelColor;
    ctx.fillText('Z / ← = LEFT FLIPPER', cx, cy + this.tableH * 0.12);
    ctx.fillText('X / → = RIGHT FLIPPER', cx, cy + this.tableH * 0.16);
    ctx.fillText('SPACE = PLUNGER', cx, cy + this.tableH * 0.20);

    ctx.textBaseline = 'alphabetic';
  }

  // ─── Game Over Screen ─────────────────────────────────────────────────────────

  private drawGameOverScreen(state: GameState): void {
    const { ctx } = this;
    const cx = this.tableX + this.tableW / 2;
    const cy = this.tableY + this.tableH / 2;

    ctx.fillStyle = 'rgba(0, 0, 20, 0.82)';
    ctx.fillRect(this.tableX, this.tableY, this.tableW, this.tableH);

    const titleSize = Math.round(this.tableW * 0.11);
    ctx.font = `900 ${titleSize}px "Courier New", monospace`;
    ctx.fillStyle = '#ff4422';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', cx, cy - this.tableH * 0.10);

    const scoreSize = Math.round(this.tableW * 0.065);
    ctx.font = `700 ${scoreSize}px "Courier New", monospace`;
    ctx.fillStyle = this.theme.scoreColor;
    ctx.fillText(String(state.score).padStart(7, '0'), cx, cy + this.tableH * 0.04);

    const subSize = Math.round(this.tableW * 0.042);
    ctx.font = `600 ${subSize}px "Courier New", monospace`;
    ctx.fillStyle = this.theme.labelColor;
    ctx.fillText('PRESS SPACE TO PLAY AGAIN', cx, cy + this.tableH * 0.14);

    ctx.textBaseline = 'alphabetic';
  }

  // ─── Touch Hints (shown during launching phase on mobile) ────────────────────

  private drawTouchHints(): void {
    const { ctx } = this;
    const W = this.canvas.width / (window.devicePixelRatio ?? 1);
    const H = this.canvas.height / (window.devicePixelRatio ?? 1);
    const arrowH = Math.min(48, H * 0.06);

    // Only show if canvas is narrow enough to suggest mobile
    if (W > 600) return;

    const drawArrow = (x: number, dir: 'left' | 'right' | 'up'): void => {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = this.theme.scoreColor;
      ctx.beginPath();
      if (dir === 'left') {
        ctx.moveTo(x - arrowH / 2, H - arrowH * 0.6);
        ctx.lineTo(x + arrowH / 2, H - arrowH * 1.1);
        ctx.lineTo(x + arrowH / 2, H - arrowH * 0.1);
      } else if (dir === 'right') {
        ctx.moveTo(x + arrowH / 2, H - arrowH * 0.6);
        ctx.lineTo(x - arrowH / 2, H - arrowH * 1.1);
        ctx.lineTo(x - arrowH / 2, H - arrowH * 0.1);
      } else {
        ctx.moveTo(x, H - arrowH * 1.1);
        ctx.lineTo(x - arrowH / 2, H - arrowH * 0.1);
        ctx.lineTo(x + arrowH / 2, H - arrowH * 0.1);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    drawArrow(W * 0.20, 'left');
    drawArrow(W * 0.80, 'right');
    drawArrow(W * 0.50, 'up');
  }
}

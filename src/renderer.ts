import type {
  Ball,
  BallLockState,
  Bumper,
  ColorPalette,
  DropTarget,
  Flipper,
  GameState,
  RenderContext,
  RolloverLane,
  Slingshot,
  ThemePack,
} from './types';
import {
  BALL_RADIUS,
  BALLS_PER_GAME,
  FLIPPER_THICKNESS,
  GUIDE_WALLS,
  LOCK_SCOOP,
  ORBIT_INNER_WALLS,
  ORBIT_LEFT,
  ORBIT_OUTER_WALLS,
  ORBIT_OUTER_WALLS_ONEWAY,
  ORBIT_RIGHT,
  TABLE,
  TABLE_ASPECT
} from './constants';

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private theme: ThemePack;

  // Table bounds in CSS pixels (updated on every resize)
  private tableX = 0;
  private tableY = 0;
  private tableW = 0;
  private tableH = 0;

  // Cache the last window size so we can re-apply the dpr transform on demand.
  private lastW = 0;
  private lastH = 0;

  constructor(canvas: HTMLCanvasElement, theme: ThemePack) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not obtain 2D canvas context');
    this.ctx = ctx;
    this.theme = theme;
  }

  setTheme(theme: ThemePack): void {
    this.theme = theme;
  }

  getTheme(): ThemePack {
    return this.theme;
  }

  // ─── Resize / Scaling ───────────────────────────────────────────────────────

  resize(windowW: number, windowH: number): void {
    const dpr = window.devicePixelRatio ?? 1;
    this.canvas.width = Math.round(windowW * dpr);
    this.canvas.height = Math.round(windowH * dpr);
    this.canvas.style.width = `${windowW}px`;
    this.canvas.style.height = `${windowH}px`;

    // Use setTransform — not scale() — so the dpr transform doesn't accumulate
    // across resize events (which was a latent bug in the previous version).
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.lastW = windowW;
    this.lastH = windowH;
    this.computeTableBounds(windowW, windowH);
  }

  private computeTableBounds(windowW: number, windowH: number): void {
    const padding = 0.96;

    // Reserve space above the table for the HUD bar + theme label below it.
    // HUD height is tableH * 0.065 + 4px gap + ~14px for the theme label line.
    // Since tableH isn't known yet, estimate HUD needs as a fraction of windowH
    // and shrink available height accordingly.
    const hudReserve = windowH * 0.06;
    const availH = windowH - hudReserve;
    const winAspect = windowW / availH;

    if (winAspect > TABLE_ASPECT) {
      this.tableH = availH * padding;
      this.tableW = this.tableH * TABLE_ASPECT;
    } else {
      this.tableW = windowW * padding;
      this.tableH = this.tableW / TABLE_ASPECT;
    }

    this.tableX = (windowW - this.tableW) / 2;
    // Center the table within the remaining space below the HUD reserve
    this.tableY = hudReserve + (availH - this.tableH) / 2;
  }

  // ─── Coordinate Transforms ──────────────────────────────────────────────────

  private sx = (nx: number): number => this.tableX + nx * this.tableW;
  private sy = (ny: number): number => this.tableY + ny * this.tableH;
  private sl = (nl: number): number => nl * this.tableW;

  private makeRenderContext(): RenderContext {
    return {
      ctx: this.ctx,
      sx: this.sx,
      sy: this.sy,
      sl: this.sl,
      tableX: this.tableX,
      tableY: this.tableY,
      tableW: this.tableW,
      tableH: this.tableH,
    };
  }

  // ─── Main Render Entry ──────────────────────────────────────────────────────

  render(state: GameState): void {
    const { ctx } = this;
    const palette = this.theme.palette;
    const W = this.lastW;
    const H = this.lastH;

    // Background
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);

    const rc = this.makeRenderContext();

    // Backdrop (theme may override)
    if (this.theme.drawBackdrop) {
      this.theme.drawBackdrop(rc, palette);
    } else {
      this.drawTable(palette);
    }

    this.drawPlungerLane(state, palette);
    // Chrome (wall strokes) drawn after all fills so nothing covers them
    this.drawTableChrome(palette);
    this.drawOrbit(rc, palette);
    this.drawScoop(state.mission.lock, rc, palette);
    this.drawDropTargets(state.dropTargets, rc, palette);
    this.drawRollovers(state.rollovers, rc, palette);
    this.drawSlingshots(state.slingshots, rc, palette);
    this.drawBumpers(state.bumpers, rc, palette);
    this.drawFlippers(state.flippers, rc, palette);
    for (const ball of state.balls) {
      this.drawBall(ball, rc, palette);
    }
    this.drawHUD(state, palette);
    this.drawMissionBanner(state, palette);

    if (state.phase === 'draining') this.drawDrainOverlay(palette);
    if (state.phase === 'attract') this.drawAttractScreen(palette);
    if (state.phase === 'gameover') this.drawGameOverScreen(state, palette);
    if (state.phase === 'launching') this.drawTouchHints(palette);
  }

  // ─── Table Background ───────────────────────────────────────────────────────

  private drawTable(palette: ColorPalette): void {
    const { ctx } = this;
    const x = this.tableX;
    const y = this.tableY;
    const w = this.tableW;
    const h = this.tableH;

    ctx.fillStyle = palette.tableFill;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = palette.guideColor;
    ctx.fillRect(x, y, this.sl(TABLE.LEFT_WALL), h);
    ctx.fillRect(this.sx(TABLE.RIGHT_WALL), y, this.sl(1 - TABLE.RIGHT_WALL), h);
  }

  /** Borders and playfield walls — drawn on top of any custom backdrop. */
  private drawTableChrome(palette: ColorPalette): void {
    const { ctx } = this;
    const x = this.tableX;
    const y = this.tableY;
    const w = this.tableW;
    const h = this.tableH;

    ctx.strokeStyle = palette.tableBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.strokeStyle = palette.wallColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.sx(TABLE.LEFT_WALL), this.sy(TABLE.TOP_WALL));
    ctx.lineTo(this.sx(TABLE.LEFT_WALL), this.sy(TABLE.DRAIN_Y));
    ctx.moveTo(this.sx(TABLE.RIGHT_WALL), this.sy(TABLE.TOP_WALL));
    ctx.lineTo(this.sx(TABLE.RIGHT_WALL), this.sy(TABLE.DRAIN_Y));
    ctx.moveTo(this.sx(TABLE.LEFT_WALL), this.sy(TABLE.TOP_WALL));
    ctx.lineTo(this.sx(TABLE.RIGHT_WALL), this.sy(TABLE.TOP_WALL));
    ctx.stroke();

    this.drawFlipperGuides(palette);
  }

  private drawFlipperGuides(palette: ColorPalette): void {
    const { ctx } = this;
    ctx.strokeStyle = palette.wallColor;
    ctx.lineWidth = 2.5;
    for (const seg of GUIDE_WALLS) {
      ctx.beginPath();
      ctx.moveTo(this.sx(seg.x1), this.sy(seg.y1));
      ctx.lineTo(this.sx(seg.x2), this.sy(seg.y2));
      ctx.stroke();
    }
  }

  // ─── Plunger Lane ───────────────────────────────────────────────────────────

  private drawPlungerLane(state: GameState, palette: ColorPalette): void {
    const { ctx } = this;

    ctx.fillStyle = palette.tableFill;
    ctx.fillRect(
      this.sx(TABLE.PLUNGER_LANE_LEFT),
      this.sy(TABLE.TOP_WALL),
      this.sl(TABLE.RIGHT_WALL - TABLE.PLUNGER_LANE_LEFT),
      this.sy(TABLE.DRAIN_Y) - this.sy(TABLE.TOP_WALL)
    );

    ctx.strokeStyle = palette.wallColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Lane left wall stops at y=0.5
    ctx.moveTo(this.sx(TABLE.PLUNGER_LANE_LEFT), this.sy(0.5));
    ctx.lineTo(this.sx(TABLE.PLUNGER_LANE_LEFT), this.sy(TABLE.DRAIN_Y));
    ctx.stroke();

    if (state.phase === 'launching' || state.phase === 'playing') {
      this.drawPlunger(state, palette);
    }
  }

  private drawPlunger(state: GameState, palette: ColorPalette): void {
    const { ctx } = this;
    const charge = state.plunger.charge;

    const laneLeft = this.sx(TABLE.PLUNGER_LANE_LEFT);
    const laneRight = this.sx(TABLE.RIGHT_WALL);
    const laneWidth = laneRight - laneLeft;
    const laneBottom = this.sy(TABLE.DRAIN_Y);
    const plungerHeight = this.sl(0.14);

    const tickCount = 5;
    const tickAreaH = this.sl(0.18);
    ctx.strokeStyle = palette.labelColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= tickCount; i++) {
      const ty = laneBottom - (i / tickCount) * tickAreaH;
      ctx.beginPath();
      ctx.moveTo(laneLeft + 2, ty);
      ctx.lineTo(laneLeft + 8, ty);
      ctx.stroke();
    }

    // Cradle bar — the horizontal stop the ball visually rests on
    const cradleY = this.sy(TABLE.LANE_FLOOR_Y - 0.015);
    const cradleH = Math.max(4, this.sl(0.008));
    ctx.fillStyle = palette.plungerColor;
    ctx.fillRect(laneLeft, cradleY, laneWidth, cradleH);

    const compressionOffset = charge * this.sl(0.06);
    const rodY = laneBottom + compressionOffset;
    const rodH = plungerHeight * (1 - charge * 0.4);

    ctx.fillStyle = charge > 0.1 ? palette.plungerChargedColor : palette.plungerColor;

    ctx.beginPath();
    ctx.roundRect(
      laneLeft + laneWidth * 0.2,
      rodY - rodH,
      laneWidth * 0.6,
      rodH,
      3
    );
    ctx.fill();

    if (charge === 0 && state.phase === 'launching') {
      ctx.fillStyle = palette.labelColor;
      const fontSize = Math.round(this.sl(0.035));
      ctx.font = `600 ${fontSize}px ${this.theme.fonts.label}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(this.theme.strings.pull, laneLeft + laneWidth / 2, laneBottom + 4);
      ctx.textBaseline = 'alphabetic';
    }
  }

  // ─── Bumpers ────────────────────────────────────────────────────────────────

  private drawBumpers(bumpers: Bumper[], rc: RenderContext, palette: ColorPalette): void {
    for (const bumper of bumpers) {
      if (this.theme.drawBumper) {
        this.theme.drawBumper(rc, bumper, palette);
      } else {
        this.drawDefaultBumper(bumper, palette);
      }
    }
  }

  private drawDefaultBumper(bumper: Bumper, palette: ColorPalette): void {
    const { ctx } = this;
    const cx = this.sx(bumper.position.x);
    const cy = this.sy(bumper.position.y);
    const r = this.sl(bumper.radius);

    const lit = bumper.lit;
    const fillColor = lit ? palette.bumperLitColor : palette.bumperIdleColor;
    const borderColor = lit ? palette.bumperLitBorderColor : palette.bumperBorderColor;

    if (lit) {
      const grd = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.8);
      grd.addColorStop(0, 'rgba(255, 140, 0, 0.35)');
      grd.addColorStop(1, 'rgba(255, 140, 0, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lit ? 3 : 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = lit ? '#ffffff' : borderColor;
    ctx.fill();

    const fontSize = Math.max(9, Math.round(this.sl(0.032)));
    ctx.fillStyle = lit ? '#ffffff' : palette.labelColor;
    ctx.font = `700 ${fontSize}px ${this.theme.fonts.label}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(bumper.scoreValue), cx, cy + r * 1.55);
    ctx.textBaseline = 'alphabetic';
  }

  // ─── Drop Targets ───────────────────────────────────────────────────────────

  private drawDropTargets(targets: DropTarget[], rc: RenderContext, palette: ColorPalette): void {
    for (const t of targets) {
      if (this.theme.drawDropTarget) {
        this.theme.drawDropTarget(rc, t, palette);
      } else {
        this.drawDefaultDropTarget(t, palette);
      }
    }
  }

  private drawDefaultDropTarget(t: DropTarget, palette: ColorPalette): void {
    const { ctx } = this;
    const x = this.sx(t.position.x - t.halfWidth);
    const y = this.sy(t.position.y - t.halfHeight);
    const w = this.sl(t.halfWidth * 2);
    const h = this.sl(t.halfHeight * 2);

    ctx.fillStyle = t.down ? palette.dropTargetDownColor : palette.dropTargetColor;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = t.down ? palette.wallColor : palette.accent;
    ctx.lineWidth = t.down ? 1 : 2;
    ctx.strokeRect(x, y, w, h);
  }

  // ─── Orbit ──────────────────────────────────────────────────────────────────

  /**
   * Draws a smooth centripetal Catmull-Rom spline through normalized points.
   *
   * Uses alpha = 0.5 (centripetal parameterization), which weights each
   * segment's tangent magnitude by the square-root of its chord length.
   * This prevents the overshoot/divet artifacts that uniform Catmull-Rom
   * produces when consecutive points have very different spacing — exactly
   * what happens at the orbit's top corners where the short angled segments
   * meet the long flat top segment.
   *
   * Endpoint tangents are clamped (ghost point = endpoint) so the spline
   * starts and ends without overshoot.
   */
  private drawSmoothPolyline(pts: ReadonlyArray<{ x: number; y: number }>): void {
    const { ctx } = this;
    const n = pts.length;
    if (n < 2) return;

    const at = (i: number) => pts[Math.max(0, Math.min(n - 1, i))]!;

    // Centripetal knot distance: |P_b - P_a|^0.5
    const knotDist = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      return Math.sqrt(Math.sqrt(dx * dx + dy * dy)); // (d²)^0.25 = d^0.5
    };

    ctx.beginPath();
    ctx.moveTo(this.sx(at(0).x), this.sy(at(0).y));

    if (n === 2) {
      ctx.lineTo(this.sx(at(1).x), this.sy(at(1).y));
      ctx.stroke();
      return;
    }

    for (let i = 0; i < n - 1; i++) {
      const p0 = at(i - 1);
      const p1 = at(i);
      const p2 = at(i + 1);
      const p3 = at(i + 2);

      // Knot intervals in arc-length parameter space
      const dt01 = knotDist(p0, p1) || 1e-4;  // guard against coincident ghost pts
      const dt12 = knotDist(p1, p2) || 1e-4;
      const dt23 = knotDist(p2, p3) || 1e-4;

      // Centripetal tangents at p1 and p2, scaled to the current interval dt12
      const m1x = dt12 * ((p1.x - p0.x) / dt01 - (p2.x - p0.x) / (dt01 + dt12) + (p2.x - p1.x) / dt12);
      const m1y = dt12 * ((p1.y - p0.y) / dt01 - (p2.y - p0.y) / (dt01 + dt12) + (p2.y - p1.y) / dt12);
      const m2x = dt12 * ((p2.x - p1.x) / dt12 - (p3.x - p1.x) / (dt12 + dt23) + (p3.x - p2.x) / dt23);
      const m2y = dt12 * ((p2.y - p1.y) / dt12 - (p3.y - p1.y) / (dt12 + dt23) + (p3.y - p2.y) / dt23);

      ctx.bezierCurveTo(
        this.sx(p1.x + m1x / 3), this.sy(p1.y + m1y / 3),
        this.sx(p2.x - m2x / 3), this.sy(p2.y - m2y / 3),
        this.sx(p2.x),           this.sy(p2.y),
      );
    }
    ctx.stroke();
  }

  /**
   * Extracts an ordered polyline from a chain of connected wall segments.
   * Each segment's end point is the next segment's start point.
   */
  private segsToPoints(segs: ReadonlyArray<{ x1: number; y1: number; x2: number; y2: number }>): Array<{ x: number; y: number }> {
    if (segs.length === 0) return [];
    const first = segs[0]!;
    const pts: Array<{ x: number; y: number }> = [{ x: first.x1, y: first.y1 }];
    for (const s of segs) pts.push({ x: s.x2, y: s.y2 });
    return pts;
  }

  private drawOrbit(rc: RenderContext, palette: ColorPalette): void {
    if (this.theme.drawOrbit) {
      this.theme.drawOrbit(rc, palette);
      return;
    }
    const { ctx } = this;
    ctx.strokeStyle = palette.orbitRailColor;
    ctx.lineWidth = 2;

    // Outer wall: ORBIT_OUTER_WALLS + ORBIT_OUTER_WALLS_ONEWAY form one
    // continuous chain — draw as a single smooth curve.
    const outerPts = [
      ...this.segsToPoints(ORBIT_OUTER_WALLS),
      // ONEWAY picks up where OUTER_WALLS ends; drop the duplicated junction point
      ...this.segsToPoints(ORBIT_OUTER_WALLS_ONEWAY).slice(1),
    ];
    this.drawSmoothPolyline(outerPts);

    // Inner walls: two separate chains with a deliberate gap at the top.
    const innerLeft  = ORBIT_INNER_WALLS.slice(0, 4);   // left chain (4 segs)
    const innerRight = ORBIT_INNER_WALLS.slice(4);        // right chain (4 segs)
    this.drawSmoothPolyline(this.segsToPoints(innerLeft));
    this.drawSmoothPolyline(this.segsToPoints(innerRight));

    // Entry/exit indicators (small circles at lane openings)
    ctx.lineWidth = 1.5;
    const r = this.sl(0.015);
    ctx.beginPath();
    ctx.arc(this.sx(ORBIT_LEFT.x), this.sy(ORBIT_LEFT.y), r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.sx(ORBIT_RIGHT.x), this.sy(ORBIT_RIGHT.y), r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ─── Lock Scoop ─────────────────────────────────────────────────────────────

  private drawScoop(lock: BallLockState, rc: RenderContext, palette: ColorPalette): void {
    if (this.theme.drawScoop) {
      this.theme.drawScoop(rc, lock, palette);
      return;
    }
    const { ctx } = this;
    const cx = this.sx(LOCK_SCOOP.x);
    const cy = this.sy(LOCK_SCOOP.y);
    const r = this.sl(LOCK_SCOOP.radius);
    const isLit = lock.lockLit;

    // Scoop pocket (semicircle opening upward)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = isLit ? palette.scoopLitColor : palette.scoopColor;
    ctx.globalAlpha = isLit ? 0.5 : 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = isLit ? palette.scoopLitColor : palette.wallColor;
    ctx.lineWidth = isLit ? 3 : 2;
    ctx.stroke();

    // Glow when lit
    if (isLit) {
      const grd = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2);
      grd.addColorStop(0, 'rgba(0, 255, 200, 0.25)');
      grd.addColorStop(1, 'rgba(0, 255, 200, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Lock indicators (small dots showing how many balls are locked)
    const dotR = Math.max(2, r * 0.18);
    const dotSpacing = dotR * 3;
    for (let i = 0; i < lock.ballsToLock; i++) {
      const dx = cx + (i - (lock.ballsToLock - 1) / 2) * dotSpacing;
      const dy = cy + r * 1.6;
      ctx.beginPath();
      ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = i < lock.ballsLocked
        ? palette.lockIndicatorColor
        : palette.scoopColor;
      ctx.fill();
    }
  }

  // ─── Rollovers ──────────────────────────────────────────────────────────────

  private drawRollovers(rollovers: RolloverLane[], rc: RenderContext, palette: ColorPalette): void {
    for (const ro of rollovers) {
      if (this.theme.drawRollover) {
        this.theme.drawRollover(rc, ro, palette);
      } else {
        this.drawDefaultRollover(ro, palette);
      }
    }
  }

  private drawDefaultRollover(ro: RolloverLane, palette: ColorPalette): void {
    const { ctx } = this;
    const cx = this.sx(ro.position.x);
    const cy = this.sy(ro.position.y);
    const r = this.sl(ro.radius);

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.6, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.6, cy);
    ctx.closePath();

    if (ro.lit) {
      ctx.fillStyle = palette.rolloverLitColor;
      ctx.fill();
      // Glow
      ctx.shadowColor = palette.rolloverLitColor;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = palette.rolloverColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ─── Slingshots ──────────────────────────────────────────────────────────────

  private drawSlingshots(slingshots: Slingshot[], rc: RenderContext, palette: ColorPalette): void {
    for (const sling of slingshots) {
      if (this.theme.drawSlingshot) {
        this.theme.drawSlingshot(rc, sling, palette);
      } else {
        this.drawDefaultSlingshot(sling, palette);
      }
    }
  }

  private drawDefaultSlingshot(sling: Slingshot, palette: ColorPalette): void {
    const { ctx } = this;
    const [v0, v1, v2] = sling.vertices;

    // Filled triangle
    ctx.beginPath();
    ctx.moveTo(this.sx(v0.x), this.sy(v0.y));
    ctx.lineTo(this.sx(v1.x), this.sy(v1.y));
    ctx.lineTo(this.sx(v2.x), this.sy(v2.y));
    ctx.closePath();

    ctx.fillStyle = sling.lit ? palette.slingshotLitColor : palette.slingshotColor;
    ctx.globalAlpha = sling.lit ? 0.6 : 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = palette.wallColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight the kick edge with a thicker, brighter line
    const ki = sling.kickEdgeIndex;
    const kv1 = sling.vertices[ki]!;
    const kv2 = sling.vertices[(ki + 1) % 3]!;
    ctx.strokeStyle = sling.lit ? palette.accent : palette.slingshotColor;
    ctx.lineWidth = sling.lit ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(this.sx(kv1.x), this.sy(kv1.y));
    ctx.lineTo(this.sx(kv2.x), this.sy(kv2.y));
    ctx.stroke();
  }

  // ─── Flippers ───────────────────────────────────────────────────────────────

  private drawFlippers(flippers: [Flipper, Flipper], rc: RenderContext, palette: ColorPalette): void {
    for (const flipper of flippers) {
      if (this.theme.drawFlipper) {
        this.theme.drawFlipper(rc, flipper, palette);
      } else {
        this.drawDefaultFlipper(flipper, palette);
      }
    }
  }

  private drawDefaultFlipper(flipper: Flipper, palette: ColorPalette): void {
    const { ctx } = this;
    const pivotX = this.sx(flipper.pivotX);
    const pivotY = this.sy(flipper.pivotY);
    const len = this.sl(flipper.length);
    const thick = this.sl(FLIPPER_THICKNESS);

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(flipper.currentAngle);

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
      ? palette.flipperActiveColor
      : palette.flipperColor;
    ctx.fill();

    ctx.strokeStyle = flipper.isActive
      ? 'rgba(100, 180, 255, 0.6)'
      : 'rgba(60, 120, 200, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(halfThickBase * 0.5, -halfThickBase * 0.5);
    ctx.lineTo(len * 0.85, -halfThickTip * 0.5);
    ctx.stroke();

    ctx.restore();

    ctx.beginPath();
    ctx.arc(pivotX, pivotY, this.sl(0.012), 0, Math.PI * 2);
    ctx.fillStyle = palette.wallColor;
    ctx.fill();
  }

  // ─── Ball ────────────────────────────────────────────────────────────────────

  private drawBall(ball: Ball, rc: RenderContext, palette: ColorPalette): void {
    if (!ball.active) return;
    if (this.theme.drawBall) {
      this.theme.drawBall(rc, ball, palette);
      return;
    }
    const { ctx } = this;
    const cx = this.sx(ball.position.x);
    const cy = this.sy(ball.position.y);
    const r = this.sl(ball.radius);

    const grd = ctx.createRadialGradient(
      cx - r * 0.35, cy - r * 0.35, r * 0.05,
      cx, cy, r
    );
    grd.addColorStop(0, palette.ballHighlight);
    grd.addColorStop(0.45, palette.ballColor);
    grd.addColorStop(1, '#444455');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  private drawHUD(state: GameState, palette: ColorPalette): void {
    const { ctx } = this;
    const fontSize = Math.max(10, Math.round(this.tableW * 0.055));
    const smallFont = Math.max(8, Math.round(this.tableW * 0.038));

    const hudH = this.tableH * 0.065;
    const hudY = this.tableY - hudH - 4;
    ctx.fillStyle = palette.hudBackground;
    ctx.fillRect(this.tableX, hudY, this.tableW, hudH + 4);

    ctx.textBaseline = 'middle';
    const midY = hudY + (hudH + 4) / 2;

    ctx.font = `700 ${fontSize}px ${this.theme.fonts.score}`;
    ctx.fillStyle = palette.scoreColor;
    ctx.textAlign = 'left';
    ctx.fillText(String(state.score).padStart(7, '0'), this.tableX + 8, midY);

    ctx.font = `600 ${smallFont}px ${this.theme.fonts.label}`;
    ctx.fillStyle = palette.labelColor;
    ctx.textAlign = 'right';
    ctx.fillText(
      `HI ${String(state.highScore).padStart(7, '0')}`,
      this.tableX + this.tableW - 8,
      midY,
    );

    // Ball dots
    const dotR = Math.max(4, this.tableW * 0.018);
    const dotSpacing = dotR * 2.8;
    const centerX = this.tableX + this.tableW / 2;
    for (let i = 0; i < BALLS_PER_GAME; i++) {
      const dx = centerX + (i - (BALLS_PER_GAME - 1) / 2) * dotSpacing;
      ctx.beginPath();
      ctx.arc(dx, midY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = i < state.ballsRemaining ? palette.scoreColor : '#333344';
      ctx.fill();
    }

    // Multiplier indicator, shown only when > 1
    if (state.mission.multiplier > 1) {
      ctx.font = `700 ${smallFont}px ${this.theme.fonts.label}`;
      ctx.fillStyle = palette.accent;
      ctx.textAlign = 'center';
      ctx.fillText(`x${state.mission.multiplier}`, centerX, midY + dotR * 2.2);
    }

    // Theme name (bottom-right of HUD bar)
    ctx.font = `400 ${Math.max(7, smallFont - 2)}px ${this.theme.fonts.label}`;
    ctx.fillStyle = palette.labelColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(this.theme.name, this.tableX + this.tableW - 4, hudY + hudH + 6);

    ctx.textBaseline = 'alphabetic';
  }

  // ─── Mission Banner ─────────────────────────────────────────────────────────

  private drawMissionBanner(state: GameState, palette: ColorPalette): void {
    if (state.mission.bannerTimer <= 0) return;

    const { ctx } = this;
    const cx = this.tableX + this.tableW / 2;
    const cy = this.tableY + this.tableH * 0.42;

    // Fade the last 400ms
    const alpha = Math.min(1, state.mission.bannerTimer / 400);
    ctx.save();
    ctx.globalAlpha = alpha;

    const size = Math.round(this.tableW * 0.12);
    ctx.font = `900 ${size}px ${this.theme.fonts.title}`;
    ctx.fillStyle = palette.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.mission.bannerText, cx, cy);

    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  // ─── Drain Overlay ───────────────────────────────────────────────────────────

  private drawDrainOverlay(palette: ColorPalette): void {
    const { ctx } = this;
    ctx.fillStyle = palette.drainColor;
    ctx.fillRect(this.tableX, this.tableY, this.tableW, this.tableH);
  }

  // ─── Attract Screen ──────────────────────────────────────────────────────────

  private drawAttractScreen(palette: ColorPalette): void {
    const { ctx } = this;
    const cx = this.tableX + this.tableW / 2;
    const cy = this.tableY + this.tableH / 2;

    ctx.fillStyle = palette.overlay;
    ctx.fillRect(this.tableX, this.tableY, this.tableW, this.tableH);

    const titleSize = Math.round(this.tableW * 0.14);
    ctx.font = `900 ${titleSize}px ${this.theme.fonts.title}`;
    ctx.fillStyle = palette.scoreColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.theme.strings.title, cx, cy - this.tableH * 0.18);

    const subSize = Math.round(this.tableW * 0.055);
    ctx.font = `600 ${subSize}px ${this.theme.fonts.label}`;
    ctx.fillStyle = palette.labelColor;
    ctx.fillText(this.theme.strings.subtitle, cx, cy - this.tableH * 0.06);

    ctx.font = `600 ${Math.round(subSize * 0.85)}px ${this.theme.fonts.label}`;
    ctx.fillStyle = palette.accent;
    ctx.fillText(this.theme.strings.pressStart, cx, cy + this.tableH * 0.02);

    const hintSize = Math.round(this.tableW * 0.038);
    ctx.font = `${hintSize}px ${this.theme.fonts.label}`;
    ctx.fillStyle = palette.labelColor;
    for (let i = 0; i < this.theme.strings.controls.length; i++) {
      const line = this.theme.strings.controls[i];
      if (!line) continue;
      ctx.fillText(line, cx, cy + this.tableH * 0.12 + i * this.tableH * 0.04);
    }

    ctx.textBaseline = 'alphabetic';
  }

  // ─── Game Over Screen ─────────────────────────────────────────────────────────

  private drawGameOverScreen(state: GameState, palette: ColorPalette): void {
    const { ctx } = this;
    const cx = this.tableX + this.tableW / 2;
    const cy = this.tableY + this.tableH / 2;

    ctx.fillStyle = palette.overlay;
    ctx.fillRect(this.tableX, this.tableY, this.tableW, this.tableH);

    const titleSize = Math.round(this.tableW * 0.11);
    ctx.font = `900 ${titleSize}px ${this.theme.fonts.title}`;
    ctx.fillStyle = palette.bumperLitColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.theme.strings.gameOver, cx, cy - this.tableH * 0.10);

    const scoreSize = Math.round(this.tableW * 0.065);
    ctx.font = `700 ${scoreSize}px ${this.theme.fonts.score}`;
    ctx.fillStyle = palette.scoreColor;
    ctx.fillText(String(state.score).padStart(7, '0'), cx, cy + this.tableH * 0.04);

    const subSize = Math.round(this.tableW * 0.042);
    ctx.font = `600 ${subSize}px ${this.theme.fonts.label}`;
    ctx.fillStyle = palette.labelColor;
    ctx.fillText(this.theme.strings.playAgain, cx, cy + this.tableH * 0.14);

    ctx.textBaseline = 'alphabetic';
  }

  // ─── Touch Hints ─────────────────────────────────────────────────────────────

  private drawTouchHints(palette: ColorPalette): void {
    const { ctx } = this;
    const W = this.lastW;
    const H = this.lastH;
    const arrowH = Math.min(48, H * 0.06);

    if (W > 600) return;

    const drawArrow = (x: number, dir: 'left' | 'right' | 'up'): void => {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = palette.scoreColor;
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

import type { ColorPalette, ThemePack } from './types';

// ─── Default theme: Neon Arcade ───────────────────────────────────────────────

const neonPalette: ColorPalette = {
  background: '#0a0a1a',
  tableFill: '#0b1523',
  tableBorder: '#1e3a5f',
  ballColor: '#b0b8c8',
  ballHighlight: '#e8f0ff',
  flipperColor: '#1a44aa',
  flipperActiveColor: '#3388ff',
  bumperIdleColor: '#112244',
  bumperLitColor: '#ff6600',
  bumperBorderColor: '#2255bb',
  bumperLitBorderColor: '#ffaa22',
  dropTargetColor: '#22ccff',
  dropTargetDownColor: '#113355',
  wallColor: '#1e3a5f',
  plungerTrackColor: '#080f1a',
  plungerColor: '#556677',
  plungerChargedColor: '#ff3322',
  scoreColor: '#00ff99',
  hudBackground: 'rgba(0, 0, 0, 0.65)',
  labelColor: '#8899cc',
  drainColor: 'rgba(180, 0, 0, 0.35)',
  guideColor: '#0d2040',
  slingshotColor: '#22ccff',
  slingshotLitColor: '#66eeff',
  rolloverColor: '#4488aa',
  rolloverLitColor: '#00ff99',
  scoopColor: '#334466',
  scoopLitColor: '#00ffcc',
  lockIndicatorColor: '#00ff99',
  orbitRailColor: '#1a5577',
  overlay: 'rgba(0, 0, 20, 0.78)',
  accent: '#00ffcc',
};

export const neonTheme: ThemePack = {
  id: 'neon',
  name: 'Neon Arcade',
  palette: neonPalette,
  fonts: {
    score: '"Orbitron", sans-serif',
    label: '"Exo 2", sans-serif',
    title: '"Orbitron", sans-serif',
  },
  strings: {
    title: 'Neon Arcade',
    subtitle: 'GET THE HIGH SCORE!',
    pressStart: 'PRESS SPACE OR ENTER',
    gameOver: 'GAME OVER',
    playAgain: 'PRESS SPACE TO PLAY AGAIN',
    pull: 'PULL',
    controls: [
      'Z or ← = LEFT FLIPPER',
      '/ or → = RIGHT FLIPPER',
      'SPACE = PLUNGER',
      'F = SWAP THEME (TAP TOP ON MOBILE)',
    ],
  },
  sounds: {
    bumper:          { type: 'synth', freq: 620, durationMs: 80,  wave: 'square',   volume: 0.15 },
    flipper:         { type: 'synth', freq: 180, durationMs: 45,  wave: 'triangle', volume: 0.12 },
    launch:          { type: 'synth', freq: 240, durationMs: 200, wave: 'sawtooth', volume: 0.15, slide: 540 },
    drain:           { type: 'synth', freq: 380, durationMs: 350, wave: 'sawtooth', volume: 0.2,  slide: -320 },
    dropTarget:      { type: 'synth', freq: 880, durationMs: 60,  wave: 'square',   volume: 0.18 },
    slingshot:       { type: 'synth', freq: 520, durationMs: 60,  wave: 'triangle', volume: 0.14 },
    rollover:        { type: 'synth', freq: 1200, durationMs: 40, wave: 'sine',     volume: 0.10 },
    lockBall:        { type: 'synth', freq: 330, durationMs: 300, wave: 'square',   volume: 0.18, slide: 220 },
    orbitShot:       { type: 'synth', freq: 300, durationMs: 400, wave: 'sine',     volume: 0.16, slide: 500 },
    missionComplete: { type: 'synth', freq: 440, durationMs: 550, wave: 'square',   volume: 0.22, slide: 660 },
    gameOver:        { type: 'synth', freq: 220, durationMs: 700, wave: 'sawtooth', volume: 0.22, slide: -180 },
  },
  // Synthwave grid backdrop.
  drawBackdrop: (rc, palette) => {
    const { ctx, tableX, tableY, tableW, tableH } = rc;
    ctx.fillStyle = palette.tableFill;
    ctx.fillRect(tableX, tableY, tableW, tableH);

    const cols = 12;
    const rows = 24;
    const cellW = tableW / cols;
    const cellH = tableH / rows;

    ctx.strokeStyle = palette.wallColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.25;

    for (let c = 0; c <= cols; c++) {
      const x = tableX + c * cellW;
      ctx.beginPath();
      ctx.moveTo(x, tableY);
      ctx.lineTo(x, tableY + tableH);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = tableY + r * cellH;
      ctx.beginPath();
      ctx.moveTo(tableX, y);
      ctx.lineTo(tableX + tableW, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};

// ─── Alternate theme: Retro Terminal (orange-on-black) ───────────────────────
// Proves the override hooks work: custom bumper drawing, custom backdrop stars.

const retroPalette: ColorPalette = {
  background: '#000000',
  tableFill: '#0a0a0a',
  tableBorder: '#ff8800',
  ballColor: '#ffcc66',
  ballHighlight: '#ffffcc',
  flipperColor: '#cc4400',
  flipperActiveColor: '#ff8822',
  bumperIdleColor: '#331100',
  bumperLitColor: '#ffcc00',
  bumperBorderColor: '#ff8800',
  bumperLitBorderColor: '#ffee44',
  dropTargetColor: '#ff4400',
  dropTargetDownColor: '#221100',
  wallColor: '#ff8800',
  plungerTrackColor: '#110800',
  plungerColor: '#884422',
  plungerChargedColor: '#ffaa00',
  scoreColor: '#ffaa00',
  hudBackground: 'rgba(20, 10, 0, 0.75)',
  labelColor: '#cc8844',
  drainColor: 'rgba(255, 68, 0, 0.28)',
  guideColor: '#1a0a00',
  slingshotColor: '#ff4400',
  slingshotLitColor: '#ffaa00',
  rolloverColor: '#884422',
  rolloverLitColor: '#ffaa00',
  scoopColor: '#442200',
  scoopLitColor: '#ffee44',
  lockIndicatorColor: '#ffaa00',
  orbitRailColor: '#663300',
  overlay: 'rgba(20, 10, 0, 0.82)',
  accent: '#ffee44',
};

export const retroTheme: ThemePack = {
  id: 'retro',
  name: 'Retro Terminal',
  palette: retroPalette,
  fonts: {
    score: '"VT323", monospace',
    label: '"Share Tech Mono", monospace',
    title: '"VT323", monospace',
  },
  strings: {
    title: 'Retro Terminal',
    subtitle: '>>> INSERT COIN <<<',
    pressStart: 'PRESS SPACE TO BEGIN MISSION',
    gameOver: 'MISSION FAILED',
    playAgain: 'PRESS SPACE TO RETRY',
    pull: 'LAUNCH',
    controls: [
      'Z or ← = PORT THRUSTER',
      '/ or → = STARBOARD THRUSTER',
      'SPACE = LAUNCH',
      'F = SWAP THEME (TAP TOP ON MOBILE)',
    ],
  },
  sounds: {
    bumper:          { type: 'synth', freq: 1040, durationMs: 50,  wave: 'square',   volume: 0.14 },
    flipper:         { type: 'synth', freq: 90,   durationMs: 40,  wave: 'square',   volume: 0.12 },
    launch:          { type: 'synth', freq: 120,  durationMs: 280, wave: 'sawtooth', volume: 0.18, slide: 680 },
    drain:           { type: 'synth', freq: 420,  durationMs: 400, wave: 'sawtooth', volume: 0.22, slide: -400 },
    dropTarget:      { type: 'synth', freq: 1200, durationMs: 55,  wave: 'triangle', volume: 0.16 },
    slingshot:       { type: 'synth', freq: 700,  durationMs: 50,  wave: 'square',   volume: 0.14 },
    rollover:        { type: 'synth', freq: 1500, durationMs: 35,  wave: 'sine',     volume: 0.10 },
    lockBall:        { type: 'synth', freq: 280,  durationMs: 350, wave: 'square',   volume: 0.20, slide: 180 },
    orbitShot:       { type: 'synth', freq: 250,  durationMs: 450, wave: 'sine',     volume: 0.18, slide: 400 },
    missionComplete: { type: 'synth', freq: 520,  durationMs: 650, wave: 'square',   volume: 0.24, slide: 880 },
    gameOver:        { type: 'synth', freq: 180,  durationMs: 900, wave: 'sawtooth', volume: 0.24, slide: -140 },
  },
  // Custom backdrop: scatter a deterministic starfield over the play-field.
  drawBackdrop: (rc, palette) => {
    const { ctx, tableX, tableY, tableW, tableH } = rc;
    ctx.fillStyle = palette.tableFill;
    ctx.fillRect(tableX, tableY, tableW, tableH);

    // Deterministic pseudo-random stars using a hash to avoid diagonal banding.
    ctx.fillStyle = palette.labelColor;
    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
      // Simple integer hash (xorshift-style) to break linear patterns.
      let hx = i * 374761393 + 1013904223; hx = ((hx >>> 16) ^ hx) * 1274126177; hx = (hx >>> 16) ^ hx;
      let hy = i * 668265263 + 2654435761; hy = ((hy >>> 16) ^ hy) * 2246822519; hy = (hy >>> 16) ^ hy;
      const sx = (hx >>> 0) / 4294967296;
      const sy = (hy >>> 0) / 4294967296;
      const r = 0.5 + (((hx >>> 8) & 3) * 0.4);
      ctx.globalAlpha = 0.3 + ((hy >>> 12) % 5) * 0.1;
      ctx.fillRect(tableX + sx * tableW, tableY + sy * tableH, r, r);
    }
    ctx.globalAlpha = 1;
  },
  // Custom bumper: concentric rings instead of the default filled disc.
  drawBumper: (rc, bumper, palette) => {
    const { ctx, sx, sy, sl } = rc;
    const cx = sx(bumper.position.x);
    const cy = sy(bumper.position.y);
    const r = sl(bumper.radius);
    const lit = bumper.lit;

    ctx.strokeStyle = lit ? palette.bumperLitColor : palette.bumperBorderColor;
    ctx.lineWidth = lit ? 3 : 2;
    for (let i = 3; i > 0; i--) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * (i / 3), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = lit ? palette.bumperLitColor : palette.labelColor;
    const fontSize = Math.max(9, Math.round(sl(0.032)));
    ctx.font = `700 ${fontSize}px ${rc.tableW > 0 ? '"Courier New", monospace' : 'monospace'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(bumper.scoreValue), cx, cy);
    ctx.textBaseline = 'alphabetic';
  },
};

// ─── Alternate theme: Sakura Dream (pink/pastel) ────────────────────────────

const sakuraPalette: ColorPalette = {
  background: '#fff0f5',
  tableFill: '#fce4ec',
  tableBorder: '#f48fb1',
  ballColor: '#ffffff',
  ballHighlight: '#fff9c4',
  flipperColor: '#e91e90',
  flipperActiveColor: '#ff69b4',
  bumperIdleColor: '#fce4ec',
  bumperLitColor: '#ff80ab',
  bumperBorderColor: '#f48fb1',
  bumperLitBorderColor: '#ff4081',
  dropTargetColor: '#f06292',
  dropTargetDownColor: '#f8bbd0',
  wallColor: '#f48fb1',
  plungerTrackColor: '#fce4ec',
  plungerColor: '#e91e90',
  plungerChargedColor: '#ff4081',
  scoreColor: '#ad1457',
  hudBackground: 'rgba(252, 228, 236, 0.80)',
  labelColor: '#c2185b',
  drainColor: 'rgba(233, 30, 99, 0.20)',
  guideColor: '#f8bbd0',
  slingshotColor: '#f06292',
  slingshotLitColor: '#ff80ab',
  rolloverColor: '#f48fb1',
  rolloverLitColor: '#ff4081',
  scoopColor: '#f8bbd0',
  scoopLitColor: '#ff80ab',
  lockIndicatorColor: '#ff4081',
  orbitRailColor: '#f48fb1',
  overlay: 'rgba(252, 228, 236, 0.85)',
  accent: '#e91e63',
};

export const sakuraTheme: ThemePack = {
  id: 'sakura',
  name: 'Sakura Dream',
  palette: sakuraPalette,
  fonts: {
    score: '"Lato", sans-serif',
    label: '"Quicksand", sans-serif',
    title: '"Playfair Display", serif',
  },
  strings: {
    title: 'SAKURA',
    subtitle: '~ a dreamy pinball ~',
    pressStart: 'TAP OR PRESS SPACE',
    gameOver: 'SWEET DREAMS...',
    playAgain: 'PRESS SPACE TO PLAY AGAIN',
    pull: 'PULL',
    controls: [
      'Z or \u2190 = LEFT FLIPPER',
      '/ or \u2192 = RIGHT FLIPPER',
      'SPACE = PLUNGER',
      'F = SWAP THEME (TAP TOP ON MOBILE)',
    ],
  },
  sounds: {
    bumper:          { type: 'synth', freq: 880,  durationMs: 120, wave: 'sine',     volume: 0.08, slide: 440 },
    flipper:         { type: 'synth', freq: 330,  durationMs: 60,  wave: 'sine',     volume: 0.07 },
    launch:          { type: 'synth', freq: 440,  durationMs: 300, wave: 'sine',     volume: 0.10, slide: 880 },
    drain:           { type: 'synth', freq: 660,  durationMs: 500, wave: 'sine',     volume: 0.10, slide: -330 },
    dropTarget:      { type: 'synth', freq: 1047, durationMs: 100, wave: 'sine',     volume: 0.09, slide: 523 },
    slingshot:       { type: 'synth', freq: 784,  durationMs: 80,  wave: 'sine',     volume: 0.08, slide: 392 },
    rollover:        { type: 'synth', freq: 1319, durationMs: 80,  wave: 'sine',     volume: 0.06, slide: 660 },
    lockBall:        { type: 'synth', freq: 523,  durationMs: 400, wave: 'sine',     volume: 0.10, slide: 262 },
    orbitShot:       { type: 'synth', freq: 660,  durationMs: 500, wave: 'sine',     volume: 0.09, slide: 1320 },
    missionComplete: { type: 'synth', freq: 523,  durationMs: 700, wave: 'sine',     volume: 0.12, slide: 1047 },
    gameOver:        { type: 'synth', freq: 440,  durationMs: 900, wave: 'sine',     volume: 0.12, slide: -220 },
  },
  drawBackdrop: (rc, palette) => {
    const { ctx, tableX, tableY, tableW, tableH } = rc;
    ctx.fillStyle = palette.tableFill;
    ctx.fillRect(tableX, tableY, tableW, tableH);

    // Deterministic sparkles using a hash to avoid diagonal banding.
    ctx.fillStyle = '#ffffff';
    const sparkleCount = 50;
    for (let i = 0; i < sparkleCount; i++) {
      let hx = (i + 200) * 374761393 + 1013904223; hx = ((hx >>> 16) ^ hx) * 1274126177; hx = (hx >>> 16) ^ hx;
      let hy = (i + 200) * 668265263 + 2654435761; hy = ((hy >>> 16) ^ hy) * 2246822519; hy = (hy >>> 16) ^ hy;
      const sx = (hx >>> 0) / 4294967296;
      const sy = (hy >>> 0) / 4294967296;
      const size = 1 + ((hx >>> 8) & 3);
      ctx.globalAlpha = 0.25 + ((hy >>> 12) % 4) * 0.1;
      // Draw a 4-point star sparkle
      const px = tableX + sx * tableW;
      const py = tableY + sy * tableH;
      ctx.beginPath();
      ctx.moveTo(px, py - size);
      ctx.lineTo(px + size * 0.3, py);
      ctx.lineTo(px, py + size);
      ctx.lineTo(px - size * 0.3, py);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - size, py);
      ctx.lineTo(px, py + size * 0.3);
      ctx.lineTo(px + size, py);
      ctx.lineTo(px, py - size * 0.3);
      ctx.closePath();
      ctx.fill();
    }

    // Deterministic sakura flower outlines scattered across the table.
    // Two layers: pink flowers and smaller white flowers for depth.
    const flowers: Array<{ count: number; seed: number; color: string; alpha: number; sizeBase: number; sizeRange: number }> = [
      { count: 16, seed: 500, color: '#f48fb1', alpha: 0.2,  sizeBase: 6, sizeRange: 5 },
      { count: 10, seed: 800, color: '#ffffff', alpha: 0.18, sizeBase: 4, sizeRange: 4 },
    ];
    for (const layer of flowers) {
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = layer.alpha;
      for (let i = 0; i < layer.count; i++) {
        let hx = (i + layer.seed) * 374761393 + 1013904223; hx = ((hx >>> 16) ^ hx) * 1274126177; hx = (hx >>> 16) ^ hx;
        let hy = (i + layer.seed) * 668265263 + 2654435761; hy = ((hy >>> 16) ^ hy) * 2246822519; hy = (hy >>> 16) ^ hy;
        const fx = (hx >>> 0) / 4294967296;
        const fy = (hy >>> 0) / 4294967296;
        const fr = layer.sizeBase + ((hx >>> 8) % layer.sizeRange) * 2;
        const cx = tableX + fx * tableW;
        const cy = tableY + fy * tableH;
        // Draw 5 petals as overlapping ellipses
        for (let p = 0; p < 5; p++) {
          const angle = (p * Math.PI * 2) / 5 - Math.PI / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.ellipse(0, -fr * 0.6, fr * 0.38, fr * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        // Small circle center
        ctx.beginPath();
        ctx.arc(cx, cy, fr * 0.18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  },
  drawBumper: (rc, bumper, palette) => {
    const { ctx, sx, sy, sl } = rc;
    const cx = sx(bumper.position.x);
    const cy = sy(bumper.position.y);
    const r = sl(bumper.radius);
    const lit = bumper.lit;

    // Soft filled circle with a flower-like border
    ctx.fillStyle = lit ? palette.bumperLitColor : palette.bumperIdleColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Petal scallops around the edge
    ctx.strokeStyle = lit ? palette.bumperLitBorderColor : palette.bumperBorderColor;
    ctx.lineWidth = lit ? 2.5 : 1.5;
    const petalCount = 6;
    for (let p = 0; p < petalCount; p++) {
      const angle = (p * Math.PI * 2) / petalCount;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r * 0.55, cy + Math.sin(angle) * r * 0.55, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = lit ? palette.bumperLitBorderColor : palette.labelColor;
    const fontSize = Math.max(9, Math.round(sl(0.032)));
    ctx.font = `700 ${fontSize}px "Georgia", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(bumper.scoreValue), cx, cy);
    ctx.textBaseline = 'alphabetic';
  },
};

// ─── Alternate theme: Welcome To Hell ────────────────────────────────────────

const hellPalette: ColorPalette = {
  background: '#0a0000',
  tableFill: '#1a0505',
  tableBorder: '#8b0000',
  ballColor: '#ff4500',
  ballHighlight: '#ffcc00',
  flipperColor: '#8b0000',
  flipperActiveColor: '#ff2200',
  bumperIdleColor: '#330000',
  bumperLitColor: '#ff4400',
  bumperBorderColor: '#990000',
  bumperLitBorderColor: '#ff6600',
  dropTargetColor: '#cc3300',
  dropTargetDownColor: '#2a0a00',
  wallColor: '#660000',
  plungerTrackColor: '#0d0000',
  plungerColor: '#772200',
  plungerChargedColor: '#ff3300',
  scoreColor: '#ff4400',
  hudBackground: 'rgba(20, 0, 0, 0.80)',
  labelColor: '#cc4400',
  drainColor: 'rgba(255, 0, 0, 0.35)',
  guideColor: '#2a0000',
  slingshotColor: '#cc2200',
  slingshotLitColor: '#ff6600',
  rolloverColor: '#772200',
  rolloverLitColor: '#ff4400',
  scoopColor: '#440000',
  scoopLitColor: '#ff2200',
  lockIndicatorColor: '#ff3300',
  orbitRailColor: '#550000',
  overlay: 'rgba(15, 0, 0, 0.88)',
  accent: '#ff6600',
};

export const hellTheme: ThemePack = {
  id: 'hell',
  name: 'Welcome To Hell',
  palette: hellPalette,
  fonts: {
    score: '"Nosifer", cursive',
    label: '"Creepster", cursive',
    title: '"Nosifer", cursive',
  },
  strings: {
    title: 'WELCOME TO HELL',
    subtitle: 'ABANDON ALL HOPE',
    pressStart: 'PRESS SPACE... IF YOU DARE',
    gameOver: 'YOUR SOUL IS LOST',
    playAgain: 'PRESS SPACE TO SUFFER AGAIN',
    pull: 'DAMN',
    controls: [
      'Z or \u2190 = LEFT CLAW',
      '/ or \u2192 = RIGHT CLAW',
      'SPACE = HELLFIRE LAUNCHER',
      'F = SWAP REALM (TAP TOP ON MOBILE)',
    ],
  },
  sounds: {
    bumper:          { type: 'synth', freq: 80,   durationMs: 200, wave: 'sawtooth', volume: 0.20, slide: -40 },
    flipper:         { type: 'synth', freq: 55,   durationMs: 80,  wave: 'sawtooth', volume: 0.15 },
    launch:          { type: 'synth', freq: 60,   durationMs: 500, wave: 'sawtooth', volume: 0.22, slide: 200 },
    drain:           { type: 'synth', freq: 120,  durationMs: 800, wave: 'sawtooth', volume: 0.25, slide: -100 },
    dropTarget:      { type: 'synth', freq: 150,  durationMs: 120, wave: 'square',   volume: 0.20, slide: -80 },
    slingshot:       { type: 'synth', freq: 100,  durationMs: 100, wave: 'sawtooth', volume: 0.18, slide: -50 },
    rollover:        { type: 'synth', freq: 200,  durationMs: 150, wave: 'square',   volume: 0.12, slide: -100 },
    lockBall:        { type: 'synth', freq: 70,   durationMs: 600, wave: 'sawtooth', volume: 0.24, slide: 50 },
    orbitShot:       { type: 'synth', freq: 90,   durationMs: 700, wave: 'sawtooth', volume: 0.20, slide: -30 },
    missionComplete: { type: 'synth', freq: 110,  durationMs: 800, wave: 'square',   volume: 0.25, slide: -60 },
    gameOver:        { type: 'synth', freq: 50,   durationMs: 1200, wave: 'sawtooth', volume: 0.28, slide: -30 },
  },
  drawBackdrop: (rc, palette) => {
    const { ctx, tableX, tableY, tableW, tableH } = rc;

    // Dark base with subtle red gradient from bottom (hellfire below)
    ctx.fillStyle = palette.tableFill;
    ctx.fillRect(tableX, tableY, tableW, tableH);

    const grad = ctx.createLinearGradient(tableX, tableY, tableX, tableY + tableH);
    grad.addColorStop(0, 'rgba(20, 0, 0, 0)');
    grad.addColorStop(0.7, 'rgba(80, 10, 0, 0.15)');
    grad.addColorStop(1, 'rgba(150, 20, 0, 0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(tableX, tableY, tableW, tableH);

    // Deterministic cracks / fissures in the ground
    ctx.strokeStyle = '#440000';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    const crackCount = 18;
    for (let i = 0; i < crackCount; i++) {
      let hx = (i + 666) * 374761393 + 1013904223; hx = ((hx >>> 16) ^ hx) * 1274126177; hx = (hx >>> 16) ^ hx;
      let hy = (i + 666) * 668265263 + 2654435761; hy = ((hy >>> 16) ^ hy) * 2246822519; hy = (hy >>> 16) ^ hy;
      const startX = tableX + ((hx >>> 0) / 4294967296) * tableW;
      const startY = tableY + ((hy >>> 0) / 4294967296) * tableH;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      // Each crack has 3-4 jagged segments
      let cx = startX, cy = startY;
      const segments = 3 + ((hx >>> 20) & 1);
      for (let s = 0; s < segments; s++) {
        let hs = (i * 17 + s * 31 + 999) * 374761393; hs = ((hs >>> 16) ^ hs) * 1274126177; hs = (hs >>> 16) ^ hs;
        cx += ((hs >>> 0) / 4294967296 - 0.5) * tableW * 0.12;
        cy += ((hs >>> 12) / 4294967296) * tableH * 0.06 + tableH * 0.01;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Glowing embers floating up
    const emberCount = 30;
    for (let i = 0; i < emberCount; i++) {
      let hx = (i + 300) * 374761393 + 1013904223; hx = ((hx >>> 16) ^ hx) * 1274126177; hx = (hx >>> 16) ^ hx;
      let hy = (i + 300) * 668265263 + 2654435761; hy = ((hy >>> 16) ^ hy) * 2246822519; hy = (hy >>> 16) ^ hy;
      const ex = tableX + ((hx >>> 0) / 4294967296) * tableW;
      const ey = tableY + ((hy >>> 0) / 4294967296) * tableH;
      const size = 1 + ((hx >>> 8) & 1);
      ctx.globalAlpha = 0.3 + ((hy >>> 12) % 4) * 0.12;
      ctx.fillStyle = ((hx >>> 16) & 1) ? '#ff4400' : '#ff8800';
      ctx.beginPath();
      ctx.arc(ex, ey, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scattered skulls (simple skull shapes)
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#660000';
    ctx.lineWidth = 1.2;
    const skullCount = 8;
    for (let i = 0; i < skullCount; i++) {
      let hx = (i + 100) * 374761393 + 1013904223; hx = ((hx >>> 16) ^ hx) * 1274126177; hx = (hx >>> 16) ^ hx;
      let hy = (i + 100) * 668265263 + 2654435761; hy = ((hy >>> 16) ^ hy) * 2246822519; hy = (hy >>> 16) ^ hy;
      const sx = tableX + ((hx >>> 0) / 4294967296) * tableW;
      const sy = tableY + ((hy >>> 0) / 4294967296) * tableH;
      const sr = 5 + ((hx >>> 8) % 4) * 2;

      // Skull dome
      ctx.beginPath();
      ctx.arc(sx, sy - sr * 0.1, sr, Math.PI, 0);
      ctx.stroke();
      // Jaw
      ctx.beginPath();
      ctx.arc(sx, sy + sr * 0.2, sr * 0.7, 0, Math.PI);
      ctx.stroke();
      // Eye sockets
      ctx.beginPath();
      ctx.arc(sx - sr * 0.3, sy - sr * 0.1, sr * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx + sr * 0.3, sy - sr * 0.1, sr * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  },
  drawBumper: (rc, bumper, palette) => {
    const { ctx, sx, sy, sl } = rc;
    const cx = sx(bumper.position.x);
    const cy = sy(bumper.position.y);
    const r = sl(bumper.radius);
    const lit = bumper.lit;

    // Fiery glow behind
    if (lit) {
      const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.8);
      glow.addColorStop(0, 'rgba(255, 68, 0, 0.4)');
      glow.addColorStop(1, 'rgba(255, 68, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main circle — dark with red border
    ctx.fillStyle = lit ? '#551100' : palette.bumperIdleColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Pentagram-ish star outline
    ctx.strokeStyle = lit ? palette.bumperLitBorderColor : palette.bumperBorderColor;
    ctx.lineWidth = lit ? 2.5 : 1.5;
    ctx.beginPath();
    for (let p = 0; p < 5; p++) {
      const angle = (p * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = cx + Math.cos(angle) * r * 0.7;
      const py = cy + Math.sin(angle) * r * 0.7;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Score text
    ctx.fillStyle = lit ? palette.bumperLitColor : palette.labelColor;
    const fontSize = Math.max(9, Math.round(sl(0.028)));
    ctx.font = `700 ${fontSize}px "Creepster", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(bumper.scoreValue), cx, cy);
    ctx.textBaseline = 'alphabetic';
  },
};

// ─── Theme registry ───────────────────────────────────────────────────────────

export const themes: ThemePack[] = [neonTheme, retroTheme, sakuraTheme, hellTheme];

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
  overlay: 'rgba(0, 0, 20, 0.78)',
  accent: '#00ffcc',
};

export const neonTheme: ThemePack = {
  id: 'neon',
  name: 'Neon Arcade',
  palette: neonPalette,
  fonts: {
    score: '"Courier New", monospace',
    label: '"Courier New", monospace',
    title: '"Courier New", monospace',
  },
  strings: {
    title: 'PINBALL',
    subtitle: 'PRESS SPACE OR ENTER',
    pressStart: 'PRESS SPACE OR ENTER',
    gameOver: 'GAME OVER',
    playAgain: 'PRESS SPACE TO PLAY AGAIN',
    pull: 'PULL',
    controls: [
      'Z / ← = LEFT FLIPPER',
      'X / → = RIGHT FLIPPER',
      'SPACE = PLUNGER',
      'T = SWAP THEME',
    ],
  },
  sounds: {
    bumper:          { type: 'synth', freq: 620, durationMs: 80,  wave: 'square',   volume: 0.15 },
    flipper:         { type: 'synth', freq: 180, durationMs: 45,  wave: 'triangle', volume: 0.12 },
    launch:          { type: 'synth', freq: 240, durationMs: 200, wave: 'sawtooth', volume: 0.15, slide: 540 },
    drain:           { type: 'synth', freq: 380, durationMs: 350, wave: 'sawtooth', volume: 0.2,  slide: -320 },
    dropTarget:      { type: 'synth', freq: 880, durationMs: 60,  wave: 'square',   volume: 0.18 },
    missionComplete: { type: 'synth', freq: 440, durationMs: 550, wave: 'square',   volume: 0.22, slide: 660 },
    gameOver:        { type: 'synth', freq: 220, durationMs: 700, wave: 'sawtooth', volume: 0.22, slide: -180 },
  },
  // Neon uses the renderer defaults (no overrides) — pure palette swap.
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
  overlay: 'rgba(20, 10, 0, 0.82)',
  accent: '#ffee44',
};

export const retroTheme: ThemePack = {
  id: 'retro',
  name: 'Retro Terminal',
  palette: retroPalette,
  fonts: {
    score: '"Courier New", monospace',
    label: '"Courier New", monospace',
    title: '"Courier New", monospace',
  },
  strings: {
    title: 'SPACE CADET',
    subtitle: '>>> INSERT COIN <<<',
    pressStart: 'PRESS SPACE TO BEGIN MISSION',
    gameOver: 'MISSION FAILED',
    playAgain: 'PRESS SPACE TO RETRY',
    pull: 'LAUNCH',
    controls: [
      'Z / ← = PORT THRUSTER',
      'X / → = STARBOARD THRUSTER',
      'SPACE = LAUNCH',
      'T = SWAP THEME',
    ],
  },
  sounds: {
    bumper:          { type: 'synth', freq: 1040, durationMs: 50,  wave: 'square',   volume: 0.14 },
    flipper:         { type: 'synth', freq: 90,   durationMs: 40,  wave: 'square',   volume: 0.12 },
    launch:          { type: 'synth', freq: 120,  durationMs: 280, wave: 'sawtooth', volume: 0.18, slide: 680 },
    drain:           { type: 'synth', freq: 420,  durationMs: 400, wave: 'sawtooth', volume: 0.22, slide: -400 },
    dropTarget:      { type: 'synth', freq: 1200, durationMs: 55,  wave: 'triangle', volume: 0.16 },
    missionComplete: { type: 'synth', freq: 520,  durationMs: 650, wave: 'square',   volume: 0.24, slide: 880 },
    gameOver:        { type: 'synth', freq: 180,  durationMs: 900, wave: 'sawtooth', volume: 0.24, slide: -140 },
  },
  // Custom backdrop: scatter a deterministic starfield over the play-field.
  drawBackdrop: (rc, palette) => {
    const { ctx, tableX, tableY, tableW, tableH } = rc;
    ctx.fillStyle = palette.tableFill;
    ctx.fillRect(tableX, tableY, tableW, tableH);

    // Deterministic pseudo-random stars (seeded by position — no RNG state).
    ctx.fillStyle = palette.labelColor;
    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
      const sx = ((i * 9301 + 49297) % 233280) / 233280;
      const sy = ((i * 4903 + 17321) % 233280) / 233280;
      const r = 0.5 + ((i * 131) % 3) * 0.4;
      ctx.globalAlpha = 0.3 + ((i * 37) % 5) * 0.1;
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

// ─── Theme registry ───────────────────────────────────────────────────────────

export const themes: ThemePack[] = [neonTheme, retroTheme];

export const defaultTheme = neonTheme;

import { createTheme } from './_builder';
import { SOUND_MOODS } from './_presets';

export const retroTheme = createTheme({
  id: 'retro',
  name: 'Retro Terminal',
  palette: {
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
  },
  fonts: {
    score: '"VT323", monospace',
    label: '"Share Tech Mono", monospace',
    title: '"VT323", monospace',
  },
  strings: {
    title: 'Retro Terminal',
    subtitle: '>>> INSERT COIN <<<',
    pressStart: 'PRESS SPACE TO BEGIN MISSION',
    pressStartTouch: 'TAP TO BEGIN MISSION',
    gameOver: 'MISSION FAILED',
    playAgain: 'PRESS SPACE TO RETRY',
    playAgainTouch: 'TAP TO RETRY',
    pull: 'LAUNCH',
    controls: [
      'Z or \u2190 = PORT THRUSTER',
      '/ or \u2192 = STARBOARD THRUSTER',
      'SPACE = LAUNCH',
      'F = SWAP THEME',
    ],
    controlsTouch: [
      'TAP LEFT = PORT THRUSTER',
      'TAP RIGHT = STARBOARD THRUSTER',
      'HOLD & RELEASE CENTER = LAUNCH',
      'TAP TOP = SWAP THEME',
    ],
  },
  sounds: { ...SOUND_MOODS.chiptune },
  draw: {
    drawBackdrop: (rc, palette) => {
      const { ctx, tableX, tableY, tableW, tableH } = rc;
      ctx.fillStyle = palette.tableFill;
      ctx.fillRect(tableX, tableY, tableW, tableH);

      ctx.fillStyle = palette.labelColor;
      const starCount = 80;
      for (let i = 0; i < starCount; i++) {
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
  },
});

import { createTheme } from './_builder';
import { SOUND_MOODS } from './_presets';

export const hellTheme = createTheme({
  id: 'hell',
  name: 'Welcome To Hell',
  palette: {
    background: '#0a0000',
    tableFill: '#1a0505',
    tableBorder: '#aa0000',
    ballColor: '#ff1a00',
    ballHighlight: '#ff6666',
    flipperColor: '#990000',
    flipperActiveColor: '#ff0000',
    bumperIdleColor: '#3a0000',
    bumperLitColor: '#ff1100',
    bumperBorderColor: '#aa0000',
    bumperLitBorderColor: '#ff3333',
    dropTargetColor: '#cc1100',
    dropTargetDownColor: '#2a0500',
    wallColor: '#770000',
    plungerTrackColor: '#0d0000',
    plungerColor: '#881111',
    plungerChargedColor: '#ff0000',
    scoreColor: '#ff1100',
    hudBackground: 'rgba(25, 0, 0, 0.82)',
    labelColor: '#dd1100',
    drainColor: 'rgba(255, 0, 0, 0.40)',
    guideColor: '#330000',
    slingshotColor: '#cc0000',
    slingshotLitColor: '#ff3333',
    rolloverColor: '#881111',
    rolloverLitColor: '#ff1100',
    scoopColor: '#550000',
    scoopLitColor: '#ff0000',
    lockIndicatorColor: '#ff0000',
    orbitRailColor: '#660000',
    overlay: 'rgba(15, 0, 0, 0.88)',
    accent: '#ff2200',
  },
  fonts: {
    score: '"Nosifer", cursive',
    label: '"Creepster", cursive',
    title: '"Nosifer", cursive',
  },
  strings: {
    title: 'WELCOME TO HELL',
    subtitle: 'ABANDON ALL HOPE',
    pressStart: 'PRESS SPACE... IF YOU DARE',
    pressStartTouch: 'TAP... IF YOU DARE',
    gameOver: 'YOUR SOUL IS LOST',
    playAgain: 'PRESS SPACE TO SUFFER AGAIN',
    playAgainTouch: 'TAP TO SUFFER AGAIN',
    pull: 'DAMN',
    controls: [
      'Z or \u2190 = LEFT CLAW',
      '/ or \u2192 = RIGHT CLAW',
      'SPACE = HELLFIRE LAUNCHER',
      'F = SWAP REALM',
    ],
    controlsTouch: [
      'TAP LEFT = LEFT CLAW',
      'TAP RIGHT = RIGHT CLAW',
      'HOLD & RELEASE CENTER = HELLFIRE LAUNCHER',
      'TAP TOP = SWAP REALM',
    ],
  },
  sounds: { ...SOUND_MOODS.horror },
  draw: {
    drawBackdrop: (rc, palette) => {
      const { ctx, tableX, tableY, tableW, tableH } = rc;

      ctx.fillStyle = palette.tableFill;
      ctx.fillRect(tableX, tableY, tableW, tableH);

      const grad = ctx.createLinearGradient(tableX, tableY, tableX, tableY + tableH);
      grad.addColorStop(0, 'rgba(20, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(80, 10, 0, 0.15)');
      grad.addColorStop(1, 'rgba(150, 20, 0, 0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect(tableX, tableY, tableW, tableH);

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

        ctx.beginPath();
        ctx.arc(sx, sy - sr * 0.1, sr, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx, sy + sr * 0.2, sr * 0.7, 0, Math.PI);
        ctx.stroke();
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

      if (lit) {
        const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.8);
        glow.addColorStop(0, 'rgba(255, 68, 0, 0.4)');
        glow.addColorStop(1, 'rgba(255, 68, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = lit ? '#551100' : palette.bumperIdleColor;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

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

      ctx.fillStyle = lit ? palette.bumperLitColor : palette.labelColor;
      const fontSize = Math.max(9, Math.round(sl(0.028)));
      ctx.font = `700 ${fontSize}px "Creepster", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(bumper.scoreValue), cx, cy);
      ctx.textBaseline = 'alphabetic';
    },
  },
});

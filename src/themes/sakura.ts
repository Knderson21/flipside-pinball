import { createTheme } from './_builder';
import { DEFAULT_STRINGS, PALETTE_PRESETS, SOUND_MOODS } from './_presets';

export const sakuraTheme = createTheme({
  id: 'sakura',
  name: 'Sakura Dream',
  palette: { ...PALETTE_PRESETS.pastel },
  fonts: {
    score: '"Lato", sans-serif',
    label: '"Quicksand", sans-serif',
    title: '"Playfair Display", serif',
  },
  strings: {
    ...DEFAULT_STRINGS,
    title: 'SAKURA DREAM',
    subtitle: '~ a kawaii pinball ~',
    pressStart: 'PRESS SPACE TO DREAM',
    pressStartTouch: 'TAP TO DREAM',
    gameOver: 'SWEET DREAMS...',
    playAgainTouch: 'TAP TO DREAM AGAIN',
  },
  sounds: { ...SOUND_MOODS.dreamy },
  draw: {
    drawBackdrop: (rc, palette) => {
      const { ctx, tableX, tableY, tableW, tableH } = rc;
      ctx.fillStyle = palette.tableFill;
      ctx.fillRect(tableX, tableY, tableW, tableH);

      ctx.fillStyle = '#ffffff';
      const sparkleCount = 50;
      for (let i = 0; i < sparkleCount; i++) {
        let hx = (i + 200) * 374761393 + 1013904223; hx = ((hx >>> 16) ^ hx) * 1274126177; hx = (hx >>> 16) ^ hx;
        let hy = (i + 200) * 668265263 + 2654435761; hy = ((hy >>> 16) ^ hy) * 2246822519; hy = (hy >>> 16) ^ hy;
        const sx = (hx >>> 0) / 4294967296;
        const sy = (hy >>> 0) / 4294967296;
        const size = 1 + ((hx >>> 8) & 3);
        ctx.globalAlpha = 0.25 + ((hy >>> 12) % 4) * 0.1;
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

      ctx.fillStyle = lit ? palette.bumperLitColor : palette.bumperIdleColor;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

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
  },
});

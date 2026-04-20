import { createTheme } from './_builder';
import { DEFAULT_STRINGS, PALETTE_PRESETS, SOUND_MOODS } from './_presets';

export const neonTheme = createTheme({
  id: 'neon',
  name: 'Neon Arcade',
  palette: { ...PALETTE_PRESETS.dark },
  fonts: {
    score: '"Orbitron", sans-serif',
    label: '"Exo 2", sans-serif',
    title: '"Orbitron", sans-serif',
  },
  strings: {
    ...DEFAULT_STRINGS,
    title: 'Neon Arcade',
  },
  sounds: { ...SOUND_MOODS.arcade },
  draw: {
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
  },
});

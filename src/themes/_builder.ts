import type { ColorPalette, ThemeFonts, ThemePack, ThemeSounds, ThemeStrings } from '../types';
import { DEFAULT_FONTS } from './_presets';

type DrawOverrides = Pick<ThemePack,
  | 'drawBackdrop'
  | 'drawBumper'
  | 'drawBall'
  | 'drawFlipper'
  | 'drawDropTarget'
  | 'drawSlingshot'
  | 'drawRollover'
  | 'drawScoop'
  | 'drawOrbit'
>;

export interface CreateThemeOptions {
  id: string;
  name: string;
  /** Full 38-key palette. Spread a `PALETTE_PRESETS` base then override the keys that define the theme. */
  palette: ColorPalette;
  /** Optional. Missing keys fall back to system-stack defaults. */
  fonts?: Partial<ThemeFonts>;
  strings: ThemeStrings;
  /** Spread a `SOUND_MOODS` bundle then override individual events to taste. */
  sounds: ThemeSounds;
  /** Optional draw overrides — supply only the hooks you customize. */
  draw?: Partial<DrawOverrides>;
}

export function createTheme(opts: CreateThemeOptions): ThemePack {
  return {
    id: opts.id,
    name: opts.name,
    palette: opts.palette,
    fonts: { ...DEFAULT_FONTS, ...opts.fonts },
    strings: opts.strings,
    sounds: opts.sounds,
    ...opts.draw,
  };
}

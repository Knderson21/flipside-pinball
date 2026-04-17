import type { ThemePack } from '../types';
import { neonTheme } from './neon';
import { retroTheme } from './retro';
import { sakuraTheme } from './sakura';
import { hellTheme } from './hell';

export { neonTheme, retroTheme, sakuraTheme, hellTheme };
export { createTheme } from './_builder';
export type { CreateThemeOptions } from './_builder';
export { DEFAULT_FONTS, DEFAULT_STRINGS, PALETTE_PRESETS, SOUND_MOODS } from './_presets';

export const themes: ThemePack[] = [neonTheme, retroTheme, sakuraTheme, hellTheme];

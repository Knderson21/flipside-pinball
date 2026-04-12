# Flipside Pinball

A web-based pinball game built with TypeScript and HTML5 Canvas. No game engine — just the browser APIs.

Inspired by the classic *Space Cadet* 3D Pinball that shipped with Windows. Gameplay is theme-agnostic: every visual, string, and sound lives in a swappable `ThemePack`, so the same physics can be reskinned without touching game logic.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Controls

| Action        | Keyboard                      | Touch                    |
|---------------|-------------------------------|--------------------------|
| Left flipper  | `Z` or `←`                    | Tap left 40% of screen   |
| Right flipper | `X` or `→`                    | Tap right 40% of screen  |
| Plunger       | Hold `Space`, release to fire | Hold center 20%, release |
| Start game    | `Space` or `Enter`            | Any touch                |
| Swap theme    | `T`                           | —                        |

## Features

- **Multiball** — clear the three-target drop bank to trigger multiball and raise the score multiplier (up to ×5).
- **Live theme swap** — press `T` to cycle between Neon Arcade and Space Cadet. Palette, fonts, strings, sounds, and custom draw routines all swap instantly.
- **Synthesized audio** — no asset files required. Sound events are defined per-theme and played through Web Audio oscillators.
- **Responsive** — scales to any viewport using a normalized coordinate system; fills width in portrait, height in landscape.
- **Zero runtime dependencies** — just the Canvas API.

## Scripts

```bash
npm run dev         # dev server with hot reload
npm run build       # production build → dist/
npm run preview     # preview the production build
npm run typecheck   # TypeScript type check (strict, zero errors)
npm test            # run Vitest suite once
npm run test:watch  # Vitest in watch mode
```

## Stack

- **TypeScript** (strict mode, `noUncheckedIndexedAccess`)
- **HTML5 Canvas API**
- **Vite** (dev server + bundler)
- **Vitest** (tests for `physics.ts`)
- No runtime dependencies

## Project layout

```
src/
  types.ts         — shared interfaces (Ball, Flipper, Bumper, DropTarget, MissionState, ThemePack, …)
  constants.ts     — physics constants, table layout, default bumper/drop-target positions
  theme.ts         — neonTheme, retroTheme, themes[] registry
  physics.ts       — pure collision / integration functions
  audio.ts         — AudioManager (Web Audio synth + URL playback)
  renderer.ts      — Renderer class; only place that uses pixel coordinates
  input.ts         — InputManager (keyboard + multi-touch)
  game.ts          — Game class; rAF loop, state machine, mission logic
  main.ts          — entry point
  physics.test.ts  — Vitest suite
```

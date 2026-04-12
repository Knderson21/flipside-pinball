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
| Right flipper | `/` or `→`                    | Tap right 40% of screen  |
| Plunger       | Hold `Space`, release to fire | Hold center 20%, release |
| Start game    | `Space` or `Enter`            | Any touch                |
| Swap theme    | `T`                           | —                        |

## Features

- **Ball lock multiball** — light all 3 rollover lanes to activate lock, then lock 3 balls in the scoop to trigger multiball. A proper progression system inspired by real pinball tables.
- **Slingshots** — triangular kickers above each flipper that add energy on contact, keeping the ball moving.
- **Rollover lanes** — 3 pass-over switches in the upper playfield. Light all 3 to activate the ball lock.
- **Orbit shot** — hit the left-side entry with enough speed and the ball warps across the upper playfield, exiting on the right.
- **Curved launch lane** — the plunger lane curves around the top-right corner into the upper playfield, matching realistic pinball table design.
- **Drop target bank** — 3 targets that award bonus points and raise the score multiplier (up to x5) when cleared.
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
  types.ts         — shared interfaces (Ball, Flipper, Bumper, Slingshot, RolloverLane, OrbitState, ThemePack, …)
  constants.ts     — physics constants, table layout, positions for bumpers, slingshots, rollovers, scoop, orbit
  theme.ts         — neonTheme, retroTheme, themes[] registry
  physics.ts       — pure collision / integration functions
  audio.ts         — AudioManager (Web Audio synth + URL playback)
  renderer.ts      — Renderer class; only place that uses pixel coordinates
  input.ts         — InputManager (keyboard + multi-touch)
  game.ts          — Game class; rAF loop, state machine, mission logic
  main.ts          — entry point
  physics.test.ts  — Vitest suite
```

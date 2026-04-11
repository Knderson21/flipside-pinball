# Pinball

A web-based pinball game built with TypeScript and HTML5 Canvas. No game engine — just the browser APIs.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Left flipper | `Z` or `←` | Tap left 40% of screen |
| Right flipper | `X` or `→` | Tap right 40% of screen |
| Plunger | Hold `Space`, release to fire | Hold center 20%, release |
| Start game | `Space` or `Enter` | Any touch |

## Scripts

```bash
npm run dev        # dev server with hot reload
npm run build      # production build → dist/
npm run preview    # preview the production build
npm run typecheck  # TypeScript type check (strict, zero errors)
```

## Stack

- **TypeScript** (strict mode)
- **HTML5 Canvas API**
- **Vite** (dev server + bundler)
- No runtime dependencies

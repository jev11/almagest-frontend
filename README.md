# Almagest Frontend

Astrology software platform frontend — natal charts, transits, live sky dashboard. Built with TypeScript, React, Canvas 2D, and a framework-agnostic rendering engine.

**Stack:** TypeScript 5.5 | React 19 | Vite 5 | Tailwind CSS 4 | shadcn/ui | TanStack Query 5 | Zustand | Canvas 2D / SVG | Vitest

## Quick Start

```bash
npm install
npm run dev --workspace=apps/web     # http://localhost:5173
```

The backend (`almagest-backend` repo) must be running for API features. See [Backend Setup](#backend-setup).

## Project Structure

```
almagest-frontend/
├── packages/
│   ├── shared-types/        # TypeScript types generated from backend OpenAPI spec
│   ├── chart-renderer/      # Canvas/SVG chart wheel rendering engine
│   ├── astro-client/        # API SDK + IndexedDB cache + TanStack Query hooks
│   └── approx-engine/       # VSOP87 (planets) + ELP2000 (Moon) client-side calc
│
├── apps/
│   └── web/                 # Vite + React SPA
│       ├── src/routes/      # Page components (home, chart-new, chart-view, etc.)
│       ├── src/components/  # UI components (layout, chart, home, forms, ui/)
│       ├── src/hooks/       # Custom hooks (auth, settings, current-sky, etc.)
│       ├── src/stores/      # Zustand stores (sky-store)
│       └── src/lib/         # Utilities (formatting, cn())
│
├── package.json             # npm workspaces root
├── tsconfig.base.json       # Shared TypeScript config
├── CLAUDE.md                # Development guide
└── CHART_RENDERING_SPEC.md  # Chart wheel rendering specification
```

## Development Commands

```bash
# All workspaces
npm install                                    # Install dependencies
npm run build --workspaces                     # Build everything
npm test --workspaces                          # Run all tests
npm run typecheck --workspaces                 # Type check everything
npm run lint --workspaces                      # Lint everything

# Specific package
npm run build --workspace=packages/chart-renderer
npm test --workspace=packages/chart-renderer

# Web app
npm run dev --workspace=apps/web               # Dev server (port 5173)
npm run build --workspace=apps/web             # Production build → apps/web/dist/
npm run preview --workspace=apps/web           # Preview production build

# shadcn/ui components
cd apps/web && npx shadcn@latest add button    # Add a component
```

## Packages

### shared-types

Contract layer — all TypeScript types shared across packages. Generated from the backend OpenAPI spec. Contains enums (`CelestialBody`, `AspectType`, `Element`), model interfaces, and constants like `SIGN_ORDER` and `SIGN_ELEMENT`.

### chart-renderer

Framework-agnostic chart wheel rendering engine. Takes a `ChartData` object and a Canvas 2D context (or produces SVG markup). Knows nothing about React, DOM events, or application state.

**Key concepts:**
- **Layers** — independent drawing functions (zodiac ring, planets, aspects, houses). Each can be toggled, reordered, or replaced.
- **Themes** — plain objects conforming to `ChartTheme`. Switching themes = passing a different object.
- **Layout** — collision avoidance algorithm that resolves overlapping planet labels using spring-force repulsion.
- **Biwheel** — overlaid natal + transit chart with inter-chart aspects.

```
chart-renderer/src/
├── core/       # renderer, geometry, layout (collision), constants
├── themes/     # dark.ts, light.ts, types.ts
├── glyphs/     # Unicode astrological symbols (planets, signs)
├── layers/     # zodiac-ring, planet-ring, aspect-web, house-overlay, background
├── charts/     # biwheel (transit/synastry overlay)
└── adapters/   # SVG export
```

### astro-client

API SDK for the `almagest-backend`. Wraps fetch calls, manages response typing, integrates with TanStack Query for caching, and coordinates the snap-to-server pattern (show approximate data instantly, replace with precise API data).

Exports: `AstroClient`, `AstroClientProvider`, `useNatalChart`, `useTransitChart`, `useCalculateChart`, `ChartCache` (IndexedDB).

### approx-engine

Pure TypeScript implementation of VSOP87 (planetary positions) and ELP2000 (Moon). Used for real-time client-side calculation — the live chart wheel on the home screen and transit timeline scrubbing. No network calls, no dependencies.

## How Packages Connect

```
approx-engine ──→ Instant positions (home page, transit scrub)
                         ↓
                    apps/web ←── astro-client ──→ Backend API (precise calc)
                         ↓
                  chart-renderer ←── shared-types (data contract)
                         ↓
                    Canvas / SVG
```

1. `approx-engine` provides instant planet positions for the live sky dashboard
2. `astro-client` fetches precise calculations from the backend, replacing approximate data
3. `chart-renderer` draws the chart wheel from `ChartData` (regardless of data source)
4. `shared-types` defines the data contract between all packages

## Web App Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Live sky wheel, moon phase, aspects today, retrograde tracker |
| `/chart/new` | New Chart | Birth data form → natal chart calculation |
| `/chart/:id` | Chart View | Full chart wheel + planet/aspect/house tables |
| `/charts` | My Charts | Saved chart list with search and management |
| `/transits` | Transits | Transit timeline with aspect bell curves |
| `/settings` | Settings | Theme, node type, aspect orbs, time format |
| `/login` | Login | Authentication |
| `/register` | Register | New account |

## State Management

| Concern | Tool | Storage |
|---------|------|---------|
| Server data (charts, API responses) | TanStack Query | In-memory cache |
| Chart data cache | `ChartCache` (astro-client) | IndexedDB |
| UI state (sidebar, theme, settings) | Zustand | localStorage |
| Live sky data | Zustand (`sky-store`) | Session memory |

## Environment Variables

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:8000    # Backend API endpoint
VITE_APP_NAME=Almagest               # App display name
```

The dev server proxies `/v1/*` and `/health` to the backend URL.

## Backend Setup

The calculation backend lives in the separate `almagest-backend` repository.

```bash
# In the almagest-backend repo:
docker-compose up                    # Runs on http://localhost:8000

# Then in this repo:
npm run dev --workspace=apps/web     # Proxies API calls to backend
```

The app works without the backend for approximate-only features (home page live sky, transit scrubbing). Precise chart calculations and chart storage require the backend.

## Architecture Decisions

1. **Packages are independent** — each has its own `package.json`, `tsconfig`, and test suite. They depend on each other through workspace references.

2. **shared-types is the contract** — all types used across packages come from here. Generated from the backend OpenAPI spec. Manual types stay in the package that owns them.

3. **chart-renderer is framework-agnostic** — takes `ChartData` + Canvas context. No React, no DOM events, no application state. Can render in any JavaScript environment with a canvas.

4. **Themes are data, not code** — a theme is a plain object (`ChartTheme` interface). Dark/light switching is passing a different object, not toggling CSS classes.

5. **Layers are composable** — each visual element (zodiac ring, planets, aspects) is an independent function. Layers can be toggled on/off, reordered, or replaced without touching other layers.

## Design System

Dark-mode-first. Light mode supported.

**Dark theme:**
| Token | Value |
|-------|-------|
| `bg-primary` | `#0A0E17` |
| `bg-secondary` | `#131926` |
| `bg-tertiary` | `#1C2333` |
| `accent-primary` | `#6C8EEF` |
| `text-primary` | `#E8ECF1` |
| `text-secondary` | `#8892A4` |
| `border-subtle` | `#2A3040` |

**Typography:** Inter, system-ui, -apple-system, sans-serif

**Spacing:** Fibonacci-based scale (5, 8, 13, 21, 34, 55, 89px) using golden ratio (phi = 1.618) proportions.

**Layout:** 61.8/38.2 golden ratio column splits. Sidebar widths at consecutive Fibonacci numbers (89px collapsed, 144px expanded).

## Coding Standards

- TypeScript strict mode, no `any`
- Pure functions where possible (layers, geometry, calculations)
- ESM modules (`import`/`export`, no `require`)
- camelCase for variables/functions, PascalCase for types/interfaces
- Tests alongside source: `geometry.ts` -> `geometry.test.ts`
- Vitest for all testing

## Deployment

Static SPA — no server-side rendering.

```bash
npm run build --workspace=apps/web   # Output: apps/web/dist/
```

Deploy `apps/web/dist/` to any static host (S3 + CloudFront, Vercel, Netlify, etc.). The build produces optimized vendor chunks for React, Router, Query, and Zustand.

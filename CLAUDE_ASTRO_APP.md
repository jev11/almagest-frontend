# Astro App — Frontend & Mobile

## Project Overview

This is the frontend monorepo for an astrology software platform. It contains the web application, chart rendering engine, client-side approximation engine, and API client SDK. The backend calculation API lives in a separate repository (astro-api).

**Tech stack:** TypeScript, React 18, Vite, Canvas 2D / SVG, npm workspaces
**Design direction:** Minimalist, modern, dark-mode-first
**Design tool:** Pencil.dev (`.pen` files in repo, usable via MCP)

## Repository Structure

```
astro-app/
├── packages/
│   ├── shared-types/             # TypeScript types generated from OpenAPI spec
│   │   ├── src/
│   │   │   ├── index.ts          # Re-exports all types
│   │   │   ├── enums.ts          # CelestialBody, HouseSystem, ZodiacType, etc.
│   │   │   ├── models.ts         # CelestialPosition, ZodiacPosition, Aspect, etc.
│   │   │   ├── requests.ts       # NatalRequest, TransitRequest, etc.
│   │   │   └── responses.ts      # NatalResponse, ChartMetadata, etc.
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── astro-client/             # API SDK + caching layer
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── client.ts         # HTTP client wrapping fetch
│   │   │   ├── cache.ts          # IndexedDB caching layer
│   │   │   └── types.ts          # SDK-specific types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── approx-engine/            # VSOP87/ELP2000 client-side approximation
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── vsop87.ts         # Planet position approximation
│   │   │   ├── elp2000.ts        # Moon position approximation
│   │   │   ├── nodes.ts          # Lunar node approximation
│   │   │   └── utils.ts          # Julian day, coordinate math
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── chart-renderer/           # Canvas/SVG chart rendering engine
│       ├── src/
│       │   ├── index.ts          # Public API exports
│       │   ├── core/
│       │   │   ├── renderer.ts   # Main renderer orchestrator
│       │   │   ├── geometry.ts   # Degree↔xy conversion, arc math
│       │   │   ├── layout.ts     # Label collision avoidance
│       │   │   └── constants.ts  # Ring proportions, spacing
│       │   ├── layers/
│       │   │   ├── background.ts # Background fill/clear
│       │   │   ├── zodiac-ring.ts    # 12 signs, degree markers
│       │   │   ├── house-overlay.ts  # House cusp lines + numbers
│       │   │   ├── planet-ring.ts    # Planet glyphs at positions
│       │   │   ├── aspect-web.ts     # Aspect lines in center
│       │   │   └── degree-labels.ts  # Degree/minute labels
│       │   ├── glyphs/
│       │   │   ├── planets.ts    # SVG path data for planet symbols
│       │   │   ├── signs.ts      # SVG path data for zodiac signs
│       │   │   └── aspects.ts    # SVG path data for aspect symbols
│       │   ├── themes/
│       │   │   ├── types.ts      # Theme interface definition
│       │   │   ├── dark.ts       # Dark theme (primary)
│       │   │   └── light.ts      # Light theme
│       │   ├── charts/
│       │   │   ├── radix.ts      # Single natal wheel
│       │   │   └── biwheel.ts    # Transit/synastry overlay
│       │   └── adapters/
│       │       ├── canvas.ts     # HTML Canvas 2D adapter
│       │       └── svg.ts        # SVG DOM export adapter
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── web/                      # React SPA (Phase 3)
│   └── mobile/                   # Capacitor (Phase 6)
│
├── design/                       # Pencil.dev design files
│   ├── design-system.pen
│   ├── chart-design.pen
│   └── screens.pen
│
├── package.json                  # npm workspaces root
├── tsconfig.base.json            # Shared TypeScript config
└── CLAUDE.md                     # This file
```

## Development Commands

```bash
# Install all dependencies
npm install

# Build all packages
npm run build --workspaces

# Build a specific package
npm run build --workspace=packages/chart-renderer

# Run tests across all packages
npm test --workspaces

# Run tests for a specific package
npm test --workspace=packages/chart-renderer

# Type check all packages
npm run typecheck --workspaces

# Lint all packages
npm run lint --workspaces

# Dev mode for chart-renderer (with watch)
npm run dev --workspace=packages/chart-renderer
```

## Key Design Principles

1. **Packages are independent**: Each package has its own package.json, tsconfig, and test suite. They depend on each other through workspace references.

2. **shared-types is the contract**: All types used across packages come from shared-types. This package is generated from the backend OpenAPI spec. Manual types go in the package that owns them.

3. **chart-renderer is framework-agnostic**: It takes a ChartData object and a Canvas2D context (or SVG element). It knows nothing about React, DOM events, or application state. This makes it testable and portable.

4. **Themes are data, not code**: A theme is a plain object conforming to the ChartTheme interface. Switching themes means passing a different object — no conditional logic in the renderer.

5. **Layers are composable**: Each visual element (zodiac ring, planets, aspects) is an independent layer function. The renderer calls them in order. Layers can be toggled, reordered, or replaced.

## Coding Standards

- TypeScript strict mode everywhere
- No `any` types — use `unknown` and narrow
- Pure functions where possible (layers, geometry, calculations)
- ESM modules (import/export, no require)
- Naming: camelCase for variables/functions, PascalCase for types/interfaces
- Tests alongside source files: `geometry.ts` → `geometry.test.ts`
- Vitest for testing

## Design System Reference

See `docs/DESIGN_SYSTEM.md` for the complete color palette, typography scale, and spacing system. The chart-renderer themes must use these exact values.

**Critical colors for chart rendering:**
- Dark background: `#0A0E17`
- Fire signs: `#E85D4A` / Earth: `#5BA858` / Air: `#5B9FD4` / Water: `#7B6DB5`
- Aspect colors: conjunction `#E8ECF1`, sextile `#5B9FD4`, square `#E85D4A`, trine `#5BA858`, opposition `#E85D4A`, quincunx `#FBBF24`

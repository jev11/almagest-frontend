# Almagest Frontend

## Project Overview

This is the frontend monorepo for an astrology software platform. It contains the web application, chart rendering engine, client-side approximation engine, and API client SDK. The backend calculation API lives in a separate repository (almagest-backend).

**Tech stack:** TypeScript, React 18, Vite, Canvas 2D / SVG, npm workspaces
**Design direction:** Minimalist, modern, dark-mode-first, **adaptive by default**
**Design tool:** Pencil.dev (`.pen` files in repo, usable via MCP)

## Adaptive Design Requirement (non-negotiable)

**Every feature, component, route, and UI decision in this project must be adaptive.** A change is not complete until it works across phone (<640 px), tablet (640–1023 px), desktop (1024–1439 px), and wide (≥1440 px). No more desktop-only screens. No more "we'll make it responsive later."

**What "adaptive" means here — enforced, not aspirational:**

1. **Use the semantic breakpoints, not raw pixels or Tailwind defaults.** Tailwind's `sm:/md:/lg:/xl:/2xl:` are disabled. Only `tablet:`, `desktop:`, `wide:` (defined in `apps/web/src/index.css` `@theme inline`) and the default phone-first (no prefix) are valid.

2. **Use the density tokens, not hard-coded pixel values** for spacing, typography, card geometry, and chart metrics. The tokens in `apps/web/src/index.css` (`--pad-*`, `--gap-*`, `--card-pad`, `--card-radius`, `--text-*`, `--chart-*`) automatically ramp across tiers. Reach for `p-pad`, `gap-gap`, `text-[length:var(--text-base)]` — not `p-6`, `gap-4`, `text-[16px]`. Add new tokens at all four tiers if the existing set doesn't cover your need; do not introduce single-value hard-codes.

3. **Use `useBreakpoint()` when JavaScript needs to branch** — e.g., rendering different markup per tier, feeding density into a canvas, adapting numeric geometry. The hook lives at `apps/web/src/hooks/use-breakpoint.ts` and returns `{ tier, isPhone, isTabletOrSmaller, isDesktopOrLarger, isWide }`. Do not add ad-hoc `window.matchMedia` calls or `useEffect` resize listeners.

4. **Chart-renderer is density-aware.** Any new layer or adapter must read stroke / glyph / label sizes from `dim.density` (`ChartDensity`). The web app supplies density by reading `--chart-*` CSS vars via `chart-canvas.tsx` — mirror that pattern in any new canvas host.

5. **Design decisions must name the tier.** When proposing layouts, always describe behavior at every tier — "1 col on phone, 2 col on tablet, 3 col on desktop, 4 col on wide." "Responsive" without tier-by-tier detail is not a design; it's a hope.

6. **Reference source of truth:** `docs/DESIGN_DOCUMENT.md` §1.5 (Breakpoints) and the appended "Adaptive Design Policy" section. `apps/web/src/index.css` is the token definition. When the two diverge, code wins and the doc must be updated.

**When this rule applies (everywhere):**
- New components, new routes, new forms, new dialogs, new charts, new canvas layers.
- Refactors: if you touch a file, leave it more adaptive, not less.
- Bug fixes: don't introduce desktop-only markup even for a "quick fix."
- Third-party components (shadcn/ui, etc.): if a copied component has fixed widths or a Tailwind default prefix, adapt it before committing.

**Reject the request, ask for clarification, or propose an adaptive alternative** if you're asked to implement something desktop-only or phone-only without a tier-by-tier design. Silently shipping non-adaptive code is the one failure mode not tolerated.

## Repository Structure

```
almagest-frontend/
├── packages/
│   ├── shared-types/             # TypeScript types generated from OpenAPI spec
│   ├── chart-renderer/           # Canvas/SVG chart rendering engine (Phase 2 ✅)
│   ├── astro-client/             # API SDK + caching layer (Phase 3)
│   └── approx-engine/            # VSOP87/ELP2000 client-side approximation (Phase 3)
│
├── apps/
│   └── web/                      # Vite + React SPA (Phase 3)
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

# Type check all packages
npm run typecheck --workspaces

# Start the Vite dev server
npm run dev --workspace=apps/web

# Build for production (outputs to apps/web/dist/)
npm run build --workspace=apps/web

# Add a shadcn/ui component
cd apps/web && npx shadcn@latest add button
```

## Key Design Principles

1. **Packages are independent**: Each package has its own package.json, tsconfig, and test suite. They depend on each other through workspace references.

2. **shared-types is the contract**: All types used across packages come from shared-types. This package is generated from the backend OpenAPI spec. Manual types go in the package that owns them.

3. **chart-renderer is framework-agnostic**: It takes a ChartData object and a Canvas2D context (or SVG element). It knows nothing about React, DOM events, or application state.

4. **Themes are data, not code**: A theme is a plain object conforming to the ChartTheme interface. Switching themes means passing a different object.

5. **Layers are composable**: Each visual element (zodiac ring, planets, aspects) is an independent layer function. Layers can be toggled, reordered, or replaced.

## Coding Standards

- TypeScript strict mode everywhere
- No `any` types — use `unknown` and narrow
- Pure functions where possible (layers, geometry, calculations)
- ESM modules (import/export, no require)
- Naming: camelCase for variables/functions, PascalCase for types/interfaces
- Tests alongside source files: `geometry.ts` → `geometry.test.ts`
- Vitest for testing

---

## Phase 3: Web Application (Vite + React + shadcn/ui)

### Tech Stack

- **Build tool:** Vite
- **Framework:** React 18 with TypeScript
- **Routing:** React Router v7
- **UI components:** shadcn/ui (copy-paste components, owned by us)
- **Styling:** Tailwind CSS (required by shadcn/ui)
- **Server state:** TanStack Query (React Query)
- **Client state:** Zustand (persisted to localStorage)
- **Persistent cache:** IndexedDB via `idb` package
- **Icons:** Lucide React
- **Deployment:** Static files → S3 + CloudFront (or any static host)

### New Packages in This Phase

**astro-client** (`packages/astro-client/`) — TypeScript SDK for the almagest-backend backend. Wraps fetch calls, handles response typing, integrates with TanStack Query for caching, and coordinates the snap-to-server pattern.

**approx-engine** (`packages/approx-engine/`) — Pure TypeScript implementation of VSOP87 (planets) and ELP2000 (Moon) for real-time client-side calculation. Used for the live chart wheel on the home screen and transit timeline scrubbing.

**web** (`apps/web/`) — Vite + React SPA. This is the user-facing product.

### apps/web Structure

```
apps/web/
├── index.html
├── vite.config.ts
├── components.json           # shadcn/ui config
├── tsconfig.json
├── package.json
├── .env                      # VITE_API_URL=http://localhost:8000
│
└── src/
    ├── main.tsx              # React entry point
    ├── App.tsx               # Router + providers
    │
    ├── routes/               # Page components (one per route)
    │   ├── home.tsx
    │   ├── chart-new.tsx
    │   ├── chart-view.tsx
    │   ├── charts.tsx
    │   ├── transits.tsx
    │   └── settings.tsx
    │
    ├── components/
    │   ├── layout/
    │   │   ├── app-layout.tsx
    │   │   ├── sidebar.tsx
    │   │   └── mobile-tabs.tsx
    │   ├── chart/
    │   │   ├── chart-canvas.tsx
    │   │   ├── planet-table.tsx
    │   │   ├── aspect-table.tsx
    │   │   ├── house-table.tsx
    │   │   └── chart-card.tsx
    │   ├── home/
    │   │   ├── current-sky.tsx
    │   │   ├── moon-card.tsx
    │   │   ├── aspects-today.tsx
    │   │   ├── retrograde-tracker.tsx
    │   │   └── personal-transits.tsx
    │   ├── forms/
    │   │   ├── birth-data-form.tsx
    │   │   ├── location-search.tsx
    │   │   └── date-time-picker.tsx
    │   └── ui/               # shadcn/ui components (auto-generated)
    │
    ├── hooks/
    │   ├── use-chart.ts
    │   ├── use-current-sky.ts
    │   ├── use-moon-phase.ts
    │   ├── use-settings.ts
    │   └── use-sidebar.ts
    │
    ├── lib/
    │   ├── utils.ts          # cn() function
    │   └── format.ts         # Degree formatting, glyphs
    │
    └── styles/
        └── globals.css       # Tailwind directives + CSS vars
```

### Backend API

The backend runs separately (almagest-backend repo). During development:
```bash
# In the almagest-backend repo:
docker-compose up    # Runs on http://localhost:8000

# In apps/web/.env:
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Almagest
```

### Key Conventions

- All components are client-side (no SSR — this is a Vite SPA)
- TanStack Query for all API state management
- Zustand for client-only UI state (sidebar, theme, active selections)
- localStorage for UI preferences (sidebar state, theme, settings)
- IndexedDB for chart data cache (via astro-client package)
- shadcn/ui components live in `src/components/ui/` — modify freely, they're your code
- Design reference: `design.pen` and `DESIGN_DOCUMENT.md`
- Environment variables: prefix with `VITE_` for client access

### Design System Colors

**Dark mode (primary):**
- bg-primary: `#0A0E17`
- bg-secondary: `#131926`
- bg-tertiary: `#1C2333`
- accent-primary: `#6C8EEF`
- text-primary: `#E8ECF1`
- text-secondary: `#8892A4`
- border-subtle: `#2A3040`


# Workflow
after each task I will update the checklist in the `PHASE3_TASK_CHECKLIST.md` file. And create a commit. Commit comment should state phase number and task number.
After each change update AGENT_CHANGELOG.md file with changes summary and decision made. 

# Subagents usage
Always use subagents for task implementation. 

# Adaptive design
All design is 
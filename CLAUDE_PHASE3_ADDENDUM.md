# Astro App — Phase 3 Addendum to CLAUDE.md

Add the following to the existing CLAUDE.md in the astro-app repo root.

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

**astro-client** (`packages/astro-client/`) — TypeScript SDK for the astro-api backend. Wraps fetch calls, handles response typing, integrates with TanStack Query for caching, and coordinates the snap-to-server pattern.

**approx-engine** (`packages/approx-engine/`) — Pure TypeScript implementation of VSOP87 (planets) and ELP2000 (Moon) for real-time client-side calculation. Used for the live chart wheel on the home screen and transit timeline scrubbing.

**web** (`apps/web/`) — Vite + React SPA. This is the user-facing product.

### Updated Project Structure

```
astro-app/
├── packages/
│   ├── shared-types/             # Phase 2 ✅
│   ├── chart-renderer/           # Phase 2 ✅
│   ├── astro-client/             # Phase 3 — API SDK
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── client.ts         # AstroClient class
│   │   │   ├── cache.ts          # IndexedDB caching layer
│   │   │   ├── hooks.ts          # TanStack Query hooks
│   │   │   └── snap.ts           # Snap-to-server coordinator
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── approx-engine/            # Phase 3 — client-side calc
│       ├── src/
│       │   ├── index.ts
│       │   ├── vsop87.ts         # Planet approximation
│       │   ├── elp2000.ts        # Moon approximation
│       │   ├── nodes.ts          # Lunar node approximation
│       │   ├── julian.ts         # Julian day math
│       │   └── types.ts          # Output types (matches ChartData)
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   └── web/                      # Phase 3 — Vite + React SPA
│       ├── index.html            # Vite entry point
│       ├── vite.config.ts
│       ├── tailwind.config.ts    # Tailwind + shadcn/ui config
│       ├── components.json       # shadcn/ui config
│       ├── tsconfig.json
│       ├── package.json
│       │
│       ├── src/
│       │   ├── main.tsx          # React entry point
│       │   ├── App.tsx           # Router + providers
│       │   │
│       │   ├── routes/           # Page components (one per route)
│       │   │   ├── home.tsx
│       │   │   ├── chart-new.tsx
│       │   │   ├── chart-view.tsx
│       │   │   ├── charts.tsx
│       │   │   ├── transits.tsx
│       │   │   └── settings.tsx
│       │   │
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── app-layout.tsx    # Sidebar + main + mobile tabs
│       │   │   │   ├── sidebar.tsx
│       │   │   │   └── mobile-tabs.tsx
│       │   │   ├── chart/
│       │   │   │   ├── chart-canvas.tsx  # Canvas wrapper for chart-renderer
│       │   │   │   ├── planet-table.tsx
│       │   │   │   ├── aspect-table.tsx
│       │   │   │   ├── house-table.tsx
│       │   │   │   └── chart-card.tsx
│       │   │   ├── home/
│       │   │   │   ├── current-sky.tsx
│       │   │   │   ├── moon-card.tsx
│       │   │   │   ├── aspects-today.tsx
│       │   │   │   ├── retrograde-tracker.tsx
│       │   │   │   └── personal-transits.tsx
│       │   │   ├── forms/
│       │   │   │   ├── birth-data-form.tsx
│       │   │   │   ├── location-search.tsx
│       │   │   │   └── date-time-picker.tsx
│       │   │   └── ui/               # shadcn/ui components (auto-generated)
│       │   │       ├── button.tsx
│       │   │       ├── input.tsx
│       │   │       ├── card.tsx
│       │   │       ├── dropdown-menu.tsx
│       │   │       ├── dialog.tsx
│       │   │       ├── select.tsx
│       │   │       ├── slider.tsx
│       │   │       ├── switch.tsx
│       │   │       ├── tabs.tsx
│       │   │       ├── tooltip.tsx
│       │   │       ├── toast.tsx
│       │   │       └── ... (added as needed via shadcn CLI)
│       │   │
│       │   ├── hooks/
│       │   │   ├── use-chart.ts
│       │   │   ├── use-current-sky.ts
│       │   │   ├── use-moon-phase.ts
│       │   │   ├── use-settings.ts
│       │   │   └── use-sidebar.ts
│       │   │
│       │   ├── lib/
│       │   │   ├── utils.ts          # shadcn/ui utility (cn function)
│       │   │   └── format.ts         # Degree formatting, glyphs
│       │   │
│       │   └── styles/
│       │       └── globals.css       # Tailwind directives + custom CSS vars
│       │
│       ├── public/
│       │   └── fonts/                # Inter font (self-hosted)
│       │
│       └── design.pen               # Design reference
│
├── package.json                  # npm workspaces root
├── tsconfig.base.json
└── CLAUDE.md
```

### Development Commands

```bash
# Start the Vite dev server
npm run dev --workspace=apps/web

# Build for production (outputs to apps/web/dist/)
npm run build --workspace=apps/web

# Preview production build locally
npm run preview --workspace=apps/web

# Build all packages
npm run build --workspaces

# Run all tests
npm test --workspaces

# Type check everything
npm run typecheck --workspaces

# Add a shadcn/ui component
cd apps/web && npx shadcn@latest add button
```

### Backend API

The backend runs separately (astro-api repo). During development:
```bash
# In the astro-api repo:
docker-compose up    # Runs on http://localhost:8000

# In apps/web/.env:
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Almagest
```

Note: Vite exposes env vars prefixed with `VITE_` to client code. Access via `import.meta.env.VITE_API_URL`.

### Deployment

Vite builds to static files in `apps/web/dist/`. Deploy anywhere that serves static files:
```bash
# Build
npm run build --workspace=apps/web

# Upload to S3
aws s3 sync apps/web/dist/ s3://your-bucket-name --delete

# Or serve locally
npx serve apps/web/dist
```

For SPA routing on S3 + CloudFront: configure CloudFront to return `index.html` for all 404s (so React Router handles all routes client-side).

### Key Conventions

- All components are client-side (no SSR — this is a Vite SPA)
- TanStack Query for all API state management
- Zustand for client-only UI state (sidebar, theme, active selections)
- localStorage for UI preferences (sidebar state, theme, settings)
- IndexedDB for chart data cache (via astro-client package)
- shadcn/ui components live in `src/components/ui/` — modify freely, they're your code
- Design reference: `design.pen` and `docs/DESIGN_DOCUMENT.md`
- Environment variables: prefix with `VITE_` for client access

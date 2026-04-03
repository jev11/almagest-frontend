# Phase 3: Web Application — Implementation Specification

## Goal

Build the user-facing Vite + React web application that connects the chart-renderer (Phase 2) to the calculation API (Phase 1). By the end of Phase 3, users can create natal charts, view them interactively, see the current sky in real-time, and browse a local chart library. No authentication or cloud storage yet — that's Phase 4.

**Stack:** Vite, React 18, TypeScript, React Router v7, shadcn/ui, Tailwind CSS, TanStack Query, Zustand

## Prerequisites

- Phase 1 complete: almagest-backend running, `/v1/chart/natal` endpoint working
- Phase 2 complete: chart-renderer renders radix and bi-wheel charts
- Design complete: `design.pen` file in the repo with screen designs
- Design system spec: `docs/DESIGN_DOCUMENT.md`

## Deliverables

### 1. Vite + React App Scaffolding

```bash
# From almagest-frontend repo root
cd apps
npm create vite@latest web -- --template react-ts
cd web

# Install core dependencies
npm install react-router-dom @tanstack/react-query zustand idb lucide-react
npm install date-fns date-fns-tz

# Install Tailwind CSS
npm install -D tailwindcss @tailwindcss/vite

# Initialize shadcn/ui
npx shadcn@latest init
# When prompted:
#   Style: Default
#   Base color: Slate (we'll override with our design system colors)
#   CSS variables: Yes

# Install shadcn components we need
npx shadcn@latest add button input card select tabs tooltip dialog
npx shadcn@latest add dropdown-menu slider switch toast sonner
```

**vite.config.ts:**
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Workspace package aliases
      "@astro-app/shared-types": path.resolve(__dirname, "../../packages/shared-types/src"),
      "@astro-app/chart-renderer": path.resolve(__dirname, "../../packages/chart-renderer/src"),
      "@astro-app/astro-client": path.resolve(__dirname, "../../packages/astro-client/src"),
      "@astro-app/approx-engine": path.resolve(__dirname, "../../packages/approx-engine/src"),
    },
  },
});
```

**globals.css — override shadcn/ui CSS variables with our design system:**
```css
@import "tailwindcss";

@layer base {
  :root {
    /* Light mode */
    --background: 0 0% 100%;           /* #FFFFFF */
    --foreground: 220 14% 12%;         /* #1A1D24 */
    --card: 220 10% 97%;               /* #F5F6F8 */
    --card-foreground: 220 14% 12%;
    --primary: 224 78% 68%;            /* #6C8EEF */
    --primary-foreground: 0 0% 100%;
    --secondary: 220 10% 92%;
    --secondary-foreground: 220 14% 12%;
    --muted: 220 10% 92%;
    --muted-foreground: 220 10% 42%;   /* #5A6275 */
    --accent: 220 10% 92%;
    --accent-foreground: 220 14% 12%;
    --destructive: 0 84% 71%;         /* #F87171 */
    --destructive-foreground: 0 0% 100%;
    --border: 220 10% 82%;            /* #D0D5DD */
    --input: 220 10% 82%;
    --ring: 224 78% 68%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222 45% 6%;          /* #0A0E17 */
    --foreground: 218 25% 93%;         /* #E8ECF1 */
    --card: 222 30% 11%;              /* #131926 */
    --card-foreground: 218 25% 93%;
    --primary: 224 78% 68%;            /* #6C8EEF */
    --primary-foreground: 0 0% 100%;
    --secondary: 222 25% 17%;         /* #1C2333 */
    --secondary-foreground: 218 25% 93%;
    --muted: 222 25% 17%;
    --muted-foreground: 220 13% 59%;   /* #8892A4 */
    --accent: 222 25% 17%;
    --accent-foreground: 218 25% 93%;
    --destructive: 0 84% 71%;
    --destructive-foreground: 0 0% 100%;
    --border: 222 20% 21%;            /* #2A3040 */
    --input: 222 35% 10%;             /* #0F1420 */
    --ring: 224 78% 68%;
  }
}
```

### 2. React Router Setup

```typescript
// src/App.tsx

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AstroClientProvider } from "@astro-app/astro-client";
import { AppLayout } from "@/components/layout/app-layout";
import { Toaster } from "@/components/ui/sonner";

import { HomePage } from "@/routes/home";
import { ChartNewPage } from "@/routes/chart-new";
import { ChartViewPage } from "@/routes/chart-view";
import { ChartsPage } from "@/routes/charts";
import { TransitsPage } from "@/routes/transits";
import { SettingsPage } from "@/routes/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes default
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AstroClientProvider baseUrl={import.meta.env.VITE_API_URL}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/chart/new" element={<ChartNewPage />} />
              <Route path="/chart/:id" element={<ChartViewPage />} />
              <Route path="/charts" element={<ChartsPage />} />
              <Route path="/transits" element={<TransitsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AstroClientProvider>
    </QueryClientProvider>
  );
}
```

```typescript
// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### 3. App Layout with Sidebar

```typescript
// src/components/layout/app-layout.tsx

import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { MobileTabBar } from "./mobile-tabs";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
```

```typescript
// src/components/layout/sidebar.tsx

// Uses: useLocation() from react-router-dom for active state
// Uses: useNavigate() for navigation on click
// Uses: useSidebar() Zustand hook for collapsed/expanded state

// Nav items with their routes and Lucide icons:
//   Home        → /           → Home icon
//   New Chart   → /chart/new  → PlusCircle icon
//   My Charts   → /charts     → Sun icon
//   Transits    → /transits   → RefreshCw icon
//   Settings    → /settings   → Settings icon

// Collapsed state (64px):
//   Icons only, centered
//   Tooltip on hover showing label (use shadcn Tooltip component)
//   Active: bg accent-muted, icon color primary

// Expanded state (240px):
//   Icon + label per item
//   Active: left border 2px primary, bg accent-muted
//   App name "Almagest" at top
//   User area at bottom (placeholder for Phase 4)

// Toggle: button at top, rotates arrow icon
// State: persisted in localStorage via Zustand
// Keyboard: Cmd+B / Ctrl+B
// Responsive: hidden below 768px (CSS media query)
```

```typescript
// src/components/layout/mobile-tabs.tsx

// Bottom tab bar, visible only below 768px
// Uses: useLocation() for active state
// Uses: useNavigate() for navigation

// 5 tabs: Home, New, Charts, Transits, Settings
// Fixed to bottom, height 56px + safe-area-inset-bottom
// Active: primary color icon + label
// Inactive: muted-foreground
// Background: card color with top border
```

### 4. astro-client Package

Same as previous spec — the package is framework-agnostic. Key files:

**client.ts** — AstroClient class with methods:
- `calculateNatal(request)` → NatalResponse
- `calculateTransits(request)` → TransitResponse
- `calculateBatch(request)` → BatchResponse
- `health()` → status object
- Error handling with ApiError class
- Configurable timeout

**provider.tsx** — React context for AstroClient:
```typescript
// Creates AstroClient instance from VITE_API_URL
// Provides via React context
// useAstroClient() hook for consuming
```

**hooks.ts** — TanStack Query hooks:
- `useNatalChart(request)` — query with `staleTime: Infinity` (natal charts are deterministic)
- `useCalculateChart()` — mutation that pre-populates the query cache on success
- `chartKeys` factory for consistent cache keys
- Deterministic request hashing for cache keys

**cache.ts** — IndexedDB via `idb`:
- `ChartCache` class: get, set, getAll, delete, clear
- Stores chart results + metadata (name, timestamp)

**snap.ts** — Snap-to-server coordinator:
- Holds current best data (approximate or precise)
- `snap(preciseData)` replaces approximate with server response
- Used by home screen and transits page

### 5. approx-engine Package

Pure TypeScript, zero dependencies. Same spec as before:

- `calculateApproximate(datetime, lat, lon)` → ChartData shape
- `calculateBodyPosition(datetime, body)` → CelestialPosition
- `moonPhaseAngle(datetime)` → number (0-360)
- `moonPhaseName(angle)` → string

Implementation: truncated VSOP87 for planets, simplified ELP2000 for Moon, mean node formula. Performance target: all bodies < 1ms.

### 6. ChartCanvas Component

```typescript
// src/components/chart/chart-canvas.tsx

import { useRef, useEffect, useCallback } from "react";
import { renderRadix, renderBiwheel } from "@astro-app/chart-renderer";
import { darkTheme, lightTheme } from "@astro-app/chart-renderer/themes";
import type { ChartData } from "@astro-app/shared-types";

interface ChartCanvasProps {
  data: ChartData;
  outerData?: ChartData;          // For bi-wheel
  theme?: "dark" | "light";
  className?: string;
  layers?: {
    background?: boolean;
    zodiacRing?: boolean;
    houseOverlay?: boolean;
    planetRing?: boolean;
    aspectWeb?: boolean;
    degreeLabels?: boolean;
  };
}

export function ChartCanvas({ data, outerData, theme = "dark", className, layers }: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const chartTheme = theme === "dark" ? darkTheme : lightTheme;

    if (outerData) {
      renderBiwheel({ canvas, data, outerData, theme: chartTheme, layers });
    } else {
      renderRadix({ canvas, data, theme: chartTheme, layers });
    }
  }, [data, outerData, theme, layers]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const observer = new ResizeObserver(() => render());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [render]);

  return (
    <div ref={containerRef} className={className} style={{ aspectRatio: "1 / 1" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
```

### 7. Route Pages

**Home (`/`)** — see DESIGN_DOCUMENT.md "Home Screen" section:
- CurrentSky: approx-engine renders live chart immediately, API snaps to precise
- MoonCard: phase icon, sign, progress bar, next ingress
- AspectsToday: chronological timeline of exact aspects within 24h
- RetrogradeTracker: list of retrograde planets from speed data
- PersonalTransits: blurred premium teaser

**New Chart (`/chart/new`)** — centered form card:
- BirthDataForm with fields: name, date, time, location, house system, zodiac, ayanamsa
- LocationSearch: debounced geocoding (Nominatim/OpenStreetMap), autocomplete dropdown
- DateTimePicker: date calendar + time input
- Timezone handling: local time + timezone from location → UTC for API
- On submit: mutation → navigate to `/chart/:id`

**Chart View (`/chart/:id`)** — two-column layout:
- Left (60%): ChartCanvas + tabs (Chart / Transits / Aspects)
- Right (40%): scrollable panels (PlanetTable, AspectTable, HouseTable)
- Top bar: back button, chart info, action icons (settings popover, save)
- Mobile: stacked layout, collapsible panels

**My Charts (`/charts`)** — card grid:
- Load from IndexedDB (ChartCache.getAll())
- Cards: Sun sign glyph, name, sign, date, ⋯ menu
- Search/filter, empty state, free tier limit display
- Grid: 3 / 2 / 1 columns responsive

**Transits (`/transits`)** — current sky exploration:
- Date controls: [←] [date] [→] [Today]
- Full chart wheel with current positions
- Date navigation: approx-engine for instant updates, debounced API snap
- Side panel: positions + today's aspects

**Settings (`/settings`)** — preferences:
- Zustand store persisted to localStorage
- Sections: Defaults, Appearance, Aspects, Account placeholder
- Auto-save on change with toast notification

### 8. Zustand Stores

```typescript
// src/hooks/use-settings.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppSettings {
  defaults: {
    houseSystem: string;
    zodiacType: string;
    ayanamsa: string | null;
  };
  appearance: {
    theme: "dark" | "light" | "system";
  };
  aspects: {
    showMinor: boolean;
    orbs: Record<string, number>;
  };
}

interface SettingsStore extends AppSettings {
  setDefaults: (defaults: Partial<AppSettings["defaults"]>) => void;
  setTheme: (theme: AppSettings["appearance"]["theme"]) => void;
  setAspectOrb: (aspect: string, orb: number) => void;
  toggleMinorAspects: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      defaults: {
        houseSystem: "placidus",
        zodiacType: "tropical",
        ayanamsa: null,
      },
      appearance: {
        theme: "dark",
      },
      aspects: {
        showMinor: false,
        orbs: {
          conjunction: 8, opposition: 8, trine: 8,
          square: 7, sextile: 6, quincunx: 3,
        },
      },
      setDefaults: (defaults) =>
        set((s) => ({ defaults: { ...s.defaults, ...defaults } })),
      setTheme: (theme) =>
        set((s) => ({ appearance: { ...s.appearance, theme } })),
      setAspectOrb: (aspect, orb) =>
        set((s) => ({
          aspects: { ...s.aspects, orbs: { ...s.aspects.orbs, [aspect]: orb } },
        })),
      toggleMinorAspects: () =>
        set((s) => ({
          aspects: { ...s.aspects, showMinor: !s.aspects.showMinor },
        })),
    }),
    { name: "astro-settings" },
  ),
);
```

```typescript
// src/hooks/use-sidebar.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarStore {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebar = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: true,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    { name: "astro-sidebar" },
  ),
);
```

### 9. Utility Functions

```typescript
// src/lib/format.ts

import { ZodiacSign, CelestialBody, AspectType } from "@astro-app/shared-types";

export function formatDegree(degree: number, minute: number): string {
  return `${degree}°${minute.toString().padStart(2, "0")}'`;
}

export function formatZodiacPosition(sign: ZodiacSign, degree: number, minute: number): string {
  return `${SIGN_GLYPHS[sign]} ${formatDegree(degree, minute)}`;
}

export function formatOrb(orb: number): string {
  const deg = Math.floor(orb);
  const min = Math.round((orb - deg) * 60);
  return `${deg}°${min.toString().padStart(2, "0")}'`;
}

export const SIGN_GLYPHS: Record<ZodiacSign, string> = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋",
  leo: "♌", virgo: "♍", libra: "♎", scorpio: "♏",
  sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};

export const PLANET_GLYPHS: Record<string, string> = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂",
  jupiter: "♃", saturn: "♄", uranus: "♅", neptune: "♆", pluto: "♇",
  north_node: "☊", south_node: "☋", chiron: "⚷", lilith: "⚸",
};

export const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌", sextile: "⚹", square: "□", trine: "△",
  opposition: "☍", quincunx: "⚻",
};

export function getMoonPhaseName(elongation: number): string {
  if (elongation < 22.5) return "New Moon";
  if (elongation < 67.5) return "Waxing Crescent";
  if (elongation < 112.5) return "First Quarter";
  if (elongation < 157.5) return "Waxing Gibbous";
  if (elongation < 202.5) return "Full Moon";
  if (elongation < 247.5) return "Waning Gibbous";
  if (elongation < 292.5) return "Last Quarter";
  if (elongation < 337.5) return "Waning Crescent";
  return "New Moon";
}
```

### 10. Geocoding Integration

```typescript
// src/components/forms/location-search.tsx

// Autocomplete input for birth location
// API: Nominatim (OpenStreetMap) — free, no API key
// Endpoint: https://nominatim.openstreetmap.org/search?q=<query>&format=json&limit=5

// Debounced search: 300ms after 3+ characters
// Dropdown with results
// On select: set name, latitude, longitude
// Show coordinates below: "Rotterdam, Netherlands — 51.9225°N, 4.4792°E"
// Rate limit: 1 req/sec (Nominatim policy — debouncing handles this)

// For timezone from coordinates:
// Option A: geo-tz npm package (offline, ~5MB but reliable)
// Option B: browser Intl API (limited but no dependencies)
// Recommended: geo-tz for accuracy
```

### 11. S3 + CloudFront Deployment

```typescript
// vite.config.ts — production build outputs to dist/
// The output is plain HTML/CSS/JS — no server needed

// For SPA routing on CloudFront:
// Create a custom error response:
//   Error code: 403 → Response: /index.html, status 200
//   Error code: 404 → Response: /index.html, status 200
// This makes React Router handle all routes client-side

// CDK stack (in your infra repo or almagest-backend):
// S3 bucket (private, website hosting disabled)
// CloudFront distribution with:
//   - Origin: S3 bucket via OAC
//   - Default root object: index.html
//   - Error pages: 403,404 → /index.html
//   - HTTPS via ACM certificate
//   - Custom domain via Route53
```

## Acceptance Criteria

Phase 3 is complete when:

1. ✅ Vite dev server starts and displays the home screen
2. ✅ Sidebar navigation works (collapsed/expanded toggle, mobile tabs)
3. ✅ React Router navigates between all 6 pages without full reload
4. ✅ Home screen shows live chart wheel updating every 60 seconds
5. ✅ Home screen shows Moon phase, today's aspects, retrograde tracker
6. ✅ New Chart form submits to almagest-backend and receives chart data
7. ✅ Location search with geocoding works (autocomplete + coordinates)
8. ✅ Local time + timezone correctly converts to UTC for API calls
9. ✅ Chart Display page renders the chart wheel with data panels
10. ✅ Chart Display tabs switch between Chart / Transits / Aspects views
11. ✅ Planet, aspect, and house data tables display correctly
12. ✅ My Charts page shows locally saved charts from IndexedDB
13. ✅ Chart cards are clickable and navigate to Chart Display
14. ✅ Settings page saves preferences to localStorage via Zustand
15. ✅ Settings defaults apply to New Chart form
16. ✅ Transits page shows current sky with date navigation
17. ✅ approx-engine provides real-time positions for interactive features
18. ✅ Snap-to-server pattern works (approx → API → re-render)
19. ✅ Responsive layout works at desktop, tablet, and mobile breakpoints
20. ✅ Dark theme matches design system colors
21. ✅ `npm run build` produces static files deployable to S3
22. ✅ shadcn/ui components styled consistently with design system

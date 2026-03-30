# Phase 3: Task Checklist

## Implementation Order

**Stack:** Vite + React 18 + React Router v7 + shadcn/ui + Tailwind CSS
**Design reference:** `apps/web/design.pen` and `docs/DESIGN_DOCUMENT.md`
**Backend:** astro-api must be running on `http://localhost:8000` during development

---

### Task 1: Vite + React App Setup
**Goal:** Empty app with shadcn/ui, Tailwind, and routing running.

- [x] Create Vite + React app in `apps/web/` (`npm create vite@latest web -- --template react-ts`)
- [x] Install dependencies: react-router-dom, @tanstack/react-query, zustand, idb, lucide-react, date-fns, date-fns-tz
- [x] Install Tailwind CSS and @tailwindcss/vite
- [x] Initialize shadcn/ui (`npx shadcn@latest init`)
- [x] Configure `vite.config.ts` with workspace package aliases
- [x] Override shadcn CSS variables in `globals.css` with design system colors (dark + light)
- [x] Add Inter font (self-hosted in public/fonts/ or via Google Fonts link)
- [x] Create `src/main.tsx` entry point
- [x] Create `src/App.tsx` with BrowserRouter, QueryClientProvider, and a test route
- [x] Create `.env` with `VITE_API_URL=http://localhost:8000`
- [x] Install initial shadcn components: button, input, card, select, tabs, tooltip, dialog, dropdown-menu, slider, switch, toast, sonner
- [x] Verify: `npm run dev` starts on localhost:5173
- [x] Verify: shadcn Button renders with correct dark theme colors
- [x] Verify: workspace packages are importable (test import from shared-types)

**Definition of done:** Vite app runs with shadcn/ui, dark theme, and Inter font. Workspace packages importable.

---

### Task 2: App Layout + Sidebar
**Goal:** Persistent sidebar navigation with responsive behavior.

- [x] Create `src/hooks/use-sidebar.ts` — Zustand store with persist middleware
- [x] Create `src/components/layout/sidebar.tsx`:
  - [x] Collapsed state (64px): icons only
  - [x] Expanded state (240px): icons + labels + app name
  - [x] Toggle button with rotation animation
  - [x] Active state via `useLocation()` from React Router
  - [x] Navigation via `useNavigate()`
  - [x] Tooltips on collapsed icons (shadcn Tooltip)
  - [x] Nav items: Home (/), New Chart (/chart/new), My Charts (/charts), Transits (/transits), Settings (/settings)
  - [x] User avatar area at bottom (placeholder)
  - [x] Icons from lucide-react: Home, PlusCircle, Sun, RefreshCw, Settings, User
  - [x] Keyboard shortcut: Cmd+B / Ctrl+B (useEffect with keydown listener)
  - [x] Hidden below 768px (Tailwind: `hidden md:flex`)
- [x] Create `src/components/layout/mobile-tabs.tsx`:
  - [x] Bottom tab bar, visible only below 768px (`flex md:hidden`)
  - [x] 5 tabs matching sidebar items
  - [x] Active state via useLocation()
  - [x] Safe area padding: `pb-[env(safe-area-inset-bottom)]`
- [x] Create `src/components/layout/app-layout.tsx`:
  - [x] Flexbox: sidebar + main content area
  - [x] Main uses `<Outlet />` from React Router
  - [x] Mobile: bottom padding for tab bar
- [x] Set up all routes in `src/App.tsx` with placeholder pages
- [x] Verify: sidebar collapses/expands with animation
- [x] Verify: navigation works between placeholder pages
- [x] Verify: mobile tabs appear below 768px, sidebar hides
- [x] Verify: active state highlights correct nav item

**Definition of done:** Full app shell with responsive navigation. Matches design.pen.

---

### Task 3: astro-client Package
**Goal:** Type-safe API SDK with TanStack Query integration.

- [x] Create `packages/astro-client/src/client.ts`:
  - [x] AstroClient class with baseUrl config
  - [x] `calculateNatal(request)` → POST /v1/chart/natal
  - [x] `calculateTransits(request)` → POST /v1/chart/transits
  - [x] `calculateBatch(request)` → POST /v1/chart/batch
  - [x] `health()` → GET /health
  - [x] ApiError class with status code
  - [x] Request timeout (AbortController)
- [x] Create `packages/astro-client/src/provider.tsx`:
  - [x] React context + provider component
  - [x] `useAstroClient()` hook
  - [x] Creates AstroClient from VITE_API_URL
- [x] Create `packages/astro-client/src/hooks.ts`:
  - [x] `useNatalChart(request)` — staleTime: Infinity
  - [x] `useCalculateChart()` — mutation with cache population
  - [x] `chartKeys` factory
  - [x] `hashRequest()` for deterministic cache keys
- [x] Create `packages/astro-client/src/cache.ts`:
  - [x] ChartCache class with IndexedDB (idb package)
  - [x] get, set, getAll, delete, clear
- [x] Create `packages/astro-client/src/snap.ts`:
  - [x] createSnapController(approximateData)
  - [x] snap(preciseData) method
- [x] Write tests:
  - [x] Client URL construction
  - [x] Error handling (4xx, 5xx, timeout)
  - [x] Request hashing determinism
  - [x] Cache CRUD operations
- [x] Integration test: calculate a chart against running astro-api

**Definition of done:** API calls work, responses typed, caching works.

---

### Task 4: approx-engine Package
**Goal:** Client-side planetary position approximation.

- [x] Create `packages/approx-engine/src/julian.ts`:
  - [x] `dateToJulianDay(date)` → float
  - [x] `julianCenturies(jd)` → T from J2000
- [x] Create `packages/approx-engine/src/vsop87.ts`:
  - [x] Truncated VSOP87 coefficients for Sun through Neptune
  - [x] `calculatePlanetPosition(T, planet)` → { longitude, latitude, distance, speed }
- [x] Create `packages/approx-engine/src/elp2000.ts`:
  - [x] Simplified ELP2000 for Moon
  - [x] `calculateMoonPosition(T)` → { longitude, latitude, distance, speed }
- [x] Create `packages/approx-engine/src/nodes.ts`:
  - [x] Mean node: `125.0446 - 1934.1363 * T`
- [x] Create `packages/approx-engine/src/index.ts`:
  - [x] `calculateApproximate(date, lat, lon)` → ChartData
  - [x] `moonPhaseAngle(date)` → 0-360
  - [x] `moonPhaseName(angle)` → string
- [x] Write tests:
  - [x] Sun at J2000.0 within 1' of known value
  - [x] Moon within 3' of known value
  - [x] All planets calculable
  - [x] Moon phase names correct at known dates
  - [x] Performance: all bodies < 1ms
- [x] Cross-reference: compare output vs astro-api for same datetime

**Definition of done:** Approximate positions match API within tolerance. < 1ms.

---

### Task 5: Utility Functions
**Goal:** Shared formatters and glyph constants.

- [x] Create `src/lib/format.ts`:
  - [x] formatDegree, formatZodiacPosition, formatOrb
  - [x] getMoonPhaseName
  - [x] SIGN_GLYPHS, PLANET_GLYPHS, ASPECT_GLYPHS records
- [x] Create `src/lib/utils.ts`:
  - [x] `cn()` function (shadcn utility — should already exist)
  - [x] Timezone helpers: local time + tz string → UTC Date
- [x] Write tests for all formatters

**Definition of done:** All formatting functions tested and working.

---

### Task 6: ChartCanvas Component
**Goal:** React wrapper for chart-renderer.

- [x] Create `src/components/chart/chart-canvas.tsx`:
  - [x] Props: data, outerData?, theme?, className?, layers?
  - [x] useRef for canvas and container
  - [x] ResizeObserver for responsive re-rendering
  - [x] High-DPI handling (devicePixelRatio)
  - [x] Calls renderRadix or renderBiwheel from chart-renderer
- [x] Verify: renders test ChartData without errors
- [x] Verify: re-renders on data change
- [x] Verify: handles container resize

**Definition of done:** ChartCanvas renders responsively, re-renders on data/size change.

---

### Task 7: Home Screen
**Goal:** All 5 sections of the home page.

- [x] Create `src/components/home/current-sky.tsx`:
  - [x] On mount: approx-engine → immediate chart render
  - [x] API call → snap to precise
  - [x] 60s interval: approx-engine recalculate (Moon)
  - [x] 10min interval: fresh API call
  - [x] Left: ChartCanvas (~280px), Right: planet list
  - [x] Planet list: glyph, name, sign + degree, ℞
  - [x] Click wheel → navigate(/transits)
- [x] Create `src/components/home/moon-card.tsx`:
  - [x] Phase icon (SVG or Unicode), phase name
  - [x] Current sign + degree
  - [x] Progress bar (new→full→new)
  - [x] Next ingress estimate (from Moon speed + remaining degrees)
- [x] Create `src/components/home/aspects-today.tsx`:
  - [x] Calculate aspects exact within 24h (from positions + speeds)
  - [x] Sort chronologically
  - [x] Display: time, colored aspect glyphs, description, orb
- [x] Create `src/components/home/retrograde-tracker.tsx`:
  - [x] Check speed_longitude < 0 for each planet
  - [x] Show ℞ badge per retrograde planet
  - [x] "All planets direct ✓" when none
- [x] Create `src/components/home/personal-transits.tsx`:
  - [x] Blurred content + "Unlock Personal Transits →" CTA
- [x] Create `src/routes/home.tsx` composing all sections
- [x] Verify: page loads fast (approx-engine renders first frame instantly)
- [x] Verify: snap-to-server updates without flicker
- [x] Verify: responsive (mobile: stacked, planet list below wheel)

**Definition of done:** Home screen shows live sky, moon, aspects, retrogrades. Matches design.

---

### Task 8: New Chart Form
**Goal:** Birth data input that creates a chart.

- [x] Create `src/components/forms/location-search.tsx`:
  - [x] Text input with Search icon (lucide)
  - [x] Debounced Nominatim API call (300ms, after 3 chars)
  - [x] Dropdown with results (shadcn dropdown or custom)
  - [x] On select: set name, lat, lon, timezone
  - [x] Show coordinates below: "51.9225°N, 4.4792°E"
  - [x] Timezone: use geo-tz package from coordinates
- [x] Create `src/components/forms/date-time-picker.tsx`:
  - [x] Date input (native or shadcn date picker)
  - [x] Time input (HH:MM format)
  - [x] Combine into single datetime value
- [x] Create `src/components/forms/birth-data-form.tsx`:
  - [x] Fields: name, date, time, location, house system (Select), zodiac (Select), ayanamsa (conditional Select)
  - [x] Defaults from useSettings() store
  - [x] Validation: date, time, location required
  - [x] Submit: loading state → useCalculateChart() mutation
  - [x] On success: save to IndexedDB, navigate to /chart/:id
  - [x] Timezone: convert local + tz → UTC before API call
- [x] Create `src/routes/chart-new.tsx`:
  - [x] Centered card (max-w-md mx-auto), heading "New Chart"
- [x] Test: timezone conversion accuracy
- [x] Test: validation prevents bad submissions
- [x] Test: successful flow end-to-end (form → API → navigate)

**Definition of done:** Form creates charts. Location search works. Timezone handled correctly.

---

### Task 9: Chart Display Page
**Goal:** Core screen showing chart wheel with data panels.

- [x] Create `src/routes/chart-view.tsx`:
  - [x] useParams() for chart ID
  - [x] Load from IndexedDB cache or recalculate
  - [x] Two-column layout (desktop), stacked (mobile)
- [x] Create `src/components/chart/planet-table.tsx`:
  - [x] Columns: glyph, name, sign + degree, house, dignity, ℞
  - [x] Use shadcn Table or custom
- [x] Create `src/components/chart/aspect-table.tsx`:
  - [x] Columns: body1, aspect glyph (colored), body2, orb, applying/separating
  - [x] Sorted by orb tightness
- [x] Create `src/components/chart/house-table.tsx`:
  - [x] Columns: house number, sign + degree
- [x] Top bar: back button (navigate(-1)), chart name, action icons
  - [x] Save button: stores in IndexedDB
  - [x] Settings popover: change house system / zodiac (re-fetches chart)
- [x] Tabs below chart (shadcn Tabs):
  - [x] "Chart" → renderRadix
  - [x] "Transits" → renderBiwheel with current sky data
  - [x] "Aspects" → table view
- [x] Data panels: collapsible cards (right column / below on mobile)
- [x] Verify: matches design.pen chart display
- [x] Verify: responsive layout

**Definition of done:** Full chart display with wheel, data panels, tabs. Save works.

---

### Task 10: My Charts Page
**Goal:** Grid of saved charts.

- [x] Create `src/components/chart/chart-card.tsx`:
  - [x] Sun sign glyph (large, primary visual)
  - [x] Name, Sun sign name, date
  - [x] ⋯ menu (shadcn DropdownMenu): edit name, duplicate, delete
  - [x] Click → navigate(/chart/:id)
  - [x] Hover: subtle lift
- [x] Create `src/routes/charts.tsx`:
  - [x] Load charts from ChartCache.getAll()
  - [x] Grid: 3 cols (lg), 2 cols (md), 1 col (sm) — Tailwind grid
  - [x] "+ New Chart" button → navigate(/chart/new)
  - [x] Search input to filter by name
  - [x] Empty state: icon + message + CTA
  - [x] Free tier: "X of 3 charts" + upgrade prompt
- [x] Delete confirmation: shadcn Dialog
- [x] Verify: charts persist across refreshes (IndexedDB)

**Definition of done:** Chart library shows saved charts with CRUD operations.

---

### Task 11: Settings Page
**Goal:** Preferences that affect the whole app.

- [x] Create `src/hooks/use-settings.ts` (Zustand + persist) — if not already done
- [x] Create `src/routes/settings.tsx`:
  - [x] Defaults section (shadcn Select for house system, zodiac, ayanamsa)
  - [x] Appearance section (theme selector)
  - [x] Aspects section (Switch for minor, Slider per aspect orb)
  - [x] Account section (placeholder: "Sign in to sync charts")
  - [x] Layout: max-w-2xl, cards per section
  - [x] Auto-save: onChange handlers update Zustand store
  - [x] Toast on save: "Settings saved" (shadcn Sonner)
- [x] Wire theme to document: `document.documentElement.classList.toggle("dark")`
- [x] Wire defaults to birth data form
- [x] Verify: settings persist across refreshes
- [x] Verify: theme toggle works

**Definition of done:** Settings save and apply across the app.

---

### Task 12: Transits Page
**Goal:** Current sky with date navigation.

- [x] Create `src/routes/transits.tsx`:
  - [x] Date controls: ← button, date display (clickable), → button, "Today" button
  - [x] ChartCanvas: full-size wheel
  - [x] Side panel: planet positions + aspects for selected date
- [x] Date navigation:
  - [x] ← / →: ±1 day (approx-engine instant update)
  - [x] Date click: native date picker or shadcn popover calendar
  - [x] "Today": reset to Date.now()
  - [x] Debounced API call: 300ms after last navigation action
  - [x] Snap to precise data on API response
- [x] Verify: navigation feels instant (no loading between days)
- [x] Verify: precise data replaces approximate without flicker

**Definition of done:** Transits page with smooth date scrubbing and snap-to-server.

---

### Task 13: Responsive Polish + Final QA
**Goal:** Everything works at all breakpoints. Production-ready.

- [x] Test all pages at: 1440px, 1024px, 768px, 375px, 390px
- [x] Sidebar: collapses at tablet, hidden at mobile
- [x] Mobile tab bar: correct safe area padding
- [x] Chart display: graceful stack on mobile
- [x] Home: sections stack on mobile
- [x] Forms: full-width on mobile, adequate touch targets (44px min)
- [x] Loading states: skeleton screens (not spinners) for API content
- [x] Error states: inline error cards for API failures
- [x] Empty states: all pages handle empty data
- [x] Toast notifications: positioned correctly on mobile
- [x] Performance: `npm run build` succeeds, bundle size reasonable
- [x] Verify all colors match DESIGN_DOCUMENT.md
- [x] Verify all spacing follows the spacing scale
- [x] Test production build: `npm run build && npx serve dist`
- [x] Verify SPA routing works (all routes serve index.html)

**Definition of done:** App works flawlessly across all breakpoints. Ready for Phase 4.

---

## Dependencies

```bash
# apps/web:
npm install react-router-dom @tanstack/react-query zustand idb
npm install lucide-react date-fns date-fns-tz geo-tz
npm install -D tailwindcss @tailwindcss/vite
# + shadcn/ui components via CLI

# packages/astro-client:
npm install idb

# packages/approx-engine:
# No dependencies (pure math)
```

## Total Estimated Time: 3-4 weeks

Tasks 1-2: ~3 days (Vite setup + sidebar)
Tasks 3-4: ~4 days (API client + approx-engine)
Tasks 5-6: ~2 days (formatters + ChartCanvas)
Task 7: ~3 days (home screen)
Task 8: ~3 days (new chart form + geocoding)
Task 9: ~3 days (chart display)
Tasks 10-11: ~2 days (my charts + settings)
Task 12: ~2 days (transits)
Task 13: ~2 days (polish)
Buffer: ~3-4 days

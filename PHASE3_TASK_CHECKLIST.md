# Phase 3: Task Checklist

## Implementation Order

**Stack:** Vite + React 18 + React Router v7 + shadcn/ui + Tailwind CSS
**Design reference:** `apps/web/design.pen` and `docs/DESIGN_DOCUMENT.md`
**Backend:** astro-api must be running on `http://localhost:8000` during development

---

### Task 1: Vite + React App Setup
**Goal:** Empty app with shadcn/ui, Tailwind, and routing running.

- [ ] Create Vite + React app in `apps/web/` (`npm create vite@latest web -- --template react-ts`)
- [ ] Install dependencies: react-router-dom, @tanstack/react-query, zustand, idb, lucide-react, date-fns, date-fns-tz
- [ ] Install Tailwind CSS and @tailwindcss/vite
- [ ] Initialize shadcn/ui (`npx shadcn@latest init`)
- [ ] Configure `vite.config.ts` with workspace package aliases
- [ ] Override shadcn CSS variables in `globals.css` with design system colors (dark + light)
- [ ] Add Inter font (self-hosted in public/fonts/ or via Google Fonts link)
- [ ] Create `src/main.tsx` entry point
- [ ] Create `src/App.tsx` with BrowserRouter, QueryClientProvider, and a test route
- [ ] Create `.env` with `VITE_API_URL=http://localhost:8000`
- [ ] Install initial shadcn components: button, input, card, select, tabs, tooltip, dialog, dropdown-menu, slider, switch, toast, sonner
- [ ] Verify: `npm run dev` starts on localhost:5173
- [ ] Verify: shadcn Button renders with correct dark theme colors
- [ ] Verify: workspace packages are importable (test import from shared-types)

**Definition of done:** Vite app runs with shadcn/ui, dark theme, and Inter font. Workspace packages importable.

---

### Task 2: App Layout + Sidebar
**Goal:** Persistent sidebar navigation with responsive behavior.

- [ ] Create `src/hooks/use-sidebar.ts` — Zustand store with persist middleware
- [ ] Create `src/components/layout/sidebar.tsx`:
  - [ ] Collapsed state (64px): icons only
  - [ ] Expanded state (240px): icons + labels + app name
  - [ ] Toggle button with rotation animation
  - [ ] Active state via `useLocation()` from React Router
  - [ ] Navigation via `useNavigate()`
  - [ ] Tooltips on collapsed icons (shadcn Tooltip)
  - [ ] Nav items: Home (/), New Chart (/chart/new), My Charts (/charts), Transits (/transits), Settings (/settings)
  - [ ] User avatar area at bottom (placeholder)
  - [ ] Icons from lucide-react: Home, PlusCircle, Sun, RefreshCw, Settings, User
  - [ ] Keyboard shortcut: Cmd+B / Ctrl+B (useEffect with keydown listener)
  - [ ] Hidden below 768px (Tailwind: `hidden md:flex`)
- [ ] Create `src/components/layout/mobile-tabs.tsx`:
  - [ ] Bottom tab bar, visible only below 768px (`flex md:hidden`)
  - [ ] 5 tabs matching sidebar items
  - [ ] Active state via useLocation()
  - [ ] Safe area padding: `pb-[env(safe-area-inset-bottom)]`
- [ ] Create `src/components/layout/app-layout.tsx`:
  - [ ] Flexbox: sidebar + main content area
  - [ ] Main uses `<Outlet />` from React Router
  - [ ] Mobile: bottom padding for tab bar
- [ ] Set up all routes in `src/App.tsx` with placeholder pages
- [ ] Verify: sidebar collapses/expands with animation
- [ ] Verify: navigation works between placeholder pages
- [ ] Verify: mobile tabs appear below 768px, sidebar hides
- [ ] Verify: active state highlights correct nav item

**Definition of done:** Full app shell with responsive navigation. Matches design.pen.

---

### Task 3: astro-client Package
**Goal:** Type-safe API SDK with TanStack Query integration.

- [ ] Create `packages/astro-client/src/client.ts`:
  - [ ] AstroClient class with baseUrl config
  - [ ] `calculateNatal(request)` → POST /v1/chart/natal
  - [ ] `calculateTransits(request)` → POST /v1/chart/transits
  - [ ] `calculateBatch(request)` → POST /v1/chart/batch
  - [ ] `health()` → GET /health
  - [ ] ApiError class with status code
  - [ ] Request timeout (AbortController)
- [ ] Create `packages/astro-client/src/provider.tsx`:
  - [ ] React context + provider component
  - [ ] `useAstroClient()` hook
  - [ ] Creates AstroClient from VITE_API_URL
- [ ] Create `packages/astro-client/src/hooks.ts`:
  - [ ] `useNatalChart(request)` — staleTime: Infinity
  - [ ] `useCalculateChart()` — mutation with cache population
  - [ ] `chartKeys` factory
  - [ ] `hashRequest()` for deterministic cache keys
- [ ] Create `packages/astro-client/src/cache.ts`:
  - [ ] ChartCache class with IndexedDB (idb package)
  - [ ] get, set, getAll, delete, clear
- [ ] Create `packages/astro-client/src/snap.ts`:
  - [ ] createSnapController(approximateData)
  - [ ] snap(preciseData) method
- [ ] Write tests:
  - [ ] Client URL construction
  - [ ] Error handling (4xx, 5xx, timeout)
  - [ ] Request hashing determinism
  - [ ] Cache CRUD operations
- [ ] Integration test: calculate a chart against running astro-api

**Definition of done:** API calls work, responses typed, caching works.

---

### Task 4: approx-engine Package
**Goal:** Client-side planetary position approximation.

- [ ] Create `packages/approx-engine/src/julian.ts`:
  - [ ] `dateToJulianDay(date)` → float
  - [ ] `julianCenturies(jd)` → T from J2000
- [ ] Create `packages/approx-engine/src/vsop87.ts`:
  - [ ] Truncated VSOP87 coefficients for Sun through Neptune
  - [ ] `calculatePlanetPosition(T, planet)` → { longitude, latitude, distance, speed }
- [ ] Create `packages/approx-engine/src/elp2000.ts`:
  - [ ] Simplified ELP2000 for Moon
  - [ ] `calculateMoonPosition(T)` → { longitude, latitude, distance, speed }
- [ ] Create `packages/approx-engine/src/nodes.ts`:
  - [ ] Mean node: `125.0446 - 1934.1363 * T`
- [ ] Create `packages/approx-engine/src/index.ts`:
  - [ ] `calculateApproximate(date, lat, lon)` → ChartData
  - [ ] `moonPhaseAngle(date)` → 0-360
  - [ ] `moonPhaseName(angle)` → string
- [ ] Write tests:
  - [ ] Sun at J2000.0 within 1' of known value
  - [ ] Moon within 3' of known value
  - [ ] All planets calculable
  - [ ] Moon phase names correct at known dates
  - [ ] Performance: all bodies < 1ms
- [ ] Cross-reference: compare output vs astro-api for same datetime

**Definition of done:** Approximate positions match API within tolerance. < 1ms.

---

### Task 5: Utility Functions
**Goal:** Shared formatters and glyph constants.

- [ ] Create `src/lib/format.ts`:
  - [ ] formatDegree, formatZodiacPosition, formatOrb
  - [ ] getMoonPhaseName
  - [ ] SIGN_GLYPHS, PLANET_GLYPHS, ASPECT_GLYPHS records
- [ ] Create `src/lib/utils.ts`:
  - [ ] `cn()` function (shadcn utility — should already exist)
  - [ ] Timezone helpers: local time + tz string → UTC Date
- [ ] Write tests for all formatters

**Definition of done:** All formatting functions tested and working.

---

### Task 6: ChartCanvas Component
**Goal:** React wrapper for chart-renderer.

- [ ] Create `src/components/chart/chart-canvas.tsx`:
  - [ ] Props: data, outerData?, theme?, className?, layers?
  - [ ] useRef for canvas and container
  - [ ] ResizeObserver for responsive re-rendering
  - [ ] High-DPI handling (devicePixelRatio)
  - [ ] Calls renderRadix or renderBiwheel from chart-renderer
- [ ] Verify: renders test ChartData without errors
- [ ] Verify: re-renders on data change
- [ ] Verify: handles container resize

**Definition of done:** ChartCanvas renders responsively, re-renders on data/size change.

---

### Task 7: Home Screen
**Goal:** All 5 sections of the home page.

- [ ] Create `src/components/home/current-sky.tsx`:
  - [ ] On mount: approx-engine → immediate chart render
  - [ ] API call → snap to precise
  - [ ] 60s interval: approx-engine recalculate (Moon)
  - [ ] 10min interval: fresh API call
  - [ ] Left: ChartCanvas (~280px), Right: planet list
  - [ ] Planet list: glyph, name, sign + degree, ℞
  - [ ] Click wheel → navigate(/transits)
- [ ] Create `src/components/home/moon-card.tsx`:
  - [ ] Phase icon (SVG or Unicode), phase name
  - [ ] Current sign + degree
  - [ ] Progress bar (new→full→new)
  - [ ] Next ingress estimate (from Moon speed + remaining degrees)
- [ ] Create `src/components/home/aspects-today.tsx`:
  - [ ] Calculate aspects exact within 24h (from positions + speeds)
  - [ ] Sort chronologically
  - [ ] Display: time, colored aspect glyphs, description, orb
- [ ] Create `src/components/home/retrograde-tracker.tsx`:
  - [ ] Check speed_longitude < 0 for each planet
  - [ ] Show ℞ badge per retrograde planet
  - [ ] "All planets direct ✓" when none
- [ ] Create `src/components/home/personal-transits.tsx`:
  - [ ] Blurred content + "Unlock Personal Transits →" CTA
- [ ] Create `src/routes/home.tsx` composing all sections
- [ ] Verify: page loads fast (approx-engine renders first frame instantly)
- [ ] Verify: snap-to-server updates without flicker
- [ ] Verify: responsive (mobile: stacked, planet list below wheel)

**Definition of done:** Home screen shows live sky, moon, aspects, retrogrades. Matches design.

---

### Task 8: New Chart Form
**Goal:** Birth data input that creates a chart.

- [ ] Create `src/components/forms/location-search.tsx`:
  - [ ] Text input with Search icon (lucide)
  - [ ] Debounced Nominatim API call (300ms, after 3 chars)
  - [ ] Dropdown with results (shadcn dropdown or custom)
  - [ ] On select: set name, lat, lon, timezone
  - [ ] Show coordinates below: "51.9225°N, 4.4792°E"
  - [ ] Timezone: use geo-tz package from coordinates
- [ ] Create `src/components/forms/date-time-picker.tsx`:
  - [ ] Date input (native or shadcn date picker)
  - [ ] Time input (HH:MM format)
  - [ ] Combine into single datetime value
- [ ] Create `src/components/forms/birth-data-form.tsx`:
  - [ ] Fields: name, date, time, location, house system (Select), zodiac (Select), ayanamsa (conditional Select)
  - [ ] Defaults from useSettings() store
  - [ ] Validation: date, time, location required
  - [ ] Submit: loading state → useCalculateChart() mutation
  - [ ] On success: save to IndexedDB, navigate to /chart/:id
  - [ ] Timezone: convert local + tz → UTC before API call
- [ ] Create `src/routes/chart-new.tsx`:
  - [ ] Centered card (max-w-md mx-auto), heading "New Chart"
- [ ] Test: timezone conversion accuracy
- [ ] Test: validation prevents bad submissions
- [ ] Test: successful flow end-to-end (form → API → navigate)

**Definition of done:** Form creates charts. Location search works. Timezone handled correctly.

---

### Task 9: Chart Display Page
**Goal:** Core screen showing chart wheel with data panels.

- [ ] Create `src/routes/chart-view.tsx`:
  - [ ] useParams() for chart ID
  - [ ] Load from IndexedDB cache or recalculate
  - [ ] Two-column layout (desktop), stacked (mobile)
- [ ] Create `src/components/chart/planet-table.tsx`:
  - [ ] Columns: glyph, name, sign + degree, house, dignity, ℞
  - [ ] Use shadcn Table or custom
- [ ] Create `src/components/chart/aspect-table.tsx`:
  - [ ] Columns: body1, aspect glyph (colored), body2, orb, applying/separating
  - [ ] Sorted by orb tightness
- [ ] Create `src/components/chart/house-table.tsx`:
  - [ ] Columns: house number, sign + degree
- [ ] Top bar: back button (navigate(-1)), chart name, action icons
  - [ ] Save button: stores in IndexedDB
  - [ ] Settings popover: change house system / zodiac (re-fetches chart)
- [ ] Tabs below chart (shadcn Tabs):
  - [ ] "Chart" → renderRadix
  - [ ] "Transits" → renderBiwheel with current sky data
  - [ ] "Aspects" → table view
- [ ] Data panels: collapsible cards (right column / below on mobile)
- [ ] Verify: matches design.pen chart display
- [ ] Verify: responsive layout

**Definition of done:** Full chart display with wheel, data panels, tabs. Save works.

---

### Task 10: My Charts Page
**Goal:** Grid of saved charts.

- [ ] Create `src/components/chart/chart-card.tsx`:
  - [ ] Sun sign glyph (large, primary visual)
  - [ ] Name, Sun sign name, date
  - [ ] ⋯ menu (shadcn DropdownMenu): edit name, duplicate, delete
  - [ ] Click → navigate(/chart/:id)
  - [ ] Hover: subtle lift
- [ ] Create `src/routes/charts.tsx`:
  - [ ] Load charts from ChartCache.getAll()
  - [ ] Grid: 3 cols (lg), 2 cols (md), 1 col (sm) — Tailwind grid
  - [ ] "+ New Chart" button → navigate(/chart/new)
  - [ ] Search input to filter by name
  - [ ] Empty state: icon + message + CTA
  - [ ] Free tier: "X of 3 charts" + upgrade prompt
- [ ] Delete confirmation: shadcn Dialog
- [ ] Verify: charts persist across refreshes (IndexedDB)

**Definition of done:** Chart library shows saved charts with CRUD operations.

---

### Task 11: Settings Page
**Goal:** Preferences that affect the whole app.

- [ ] Create `src/hooks/use-settings.ts` (Zustand + persist) — if not already done
- [ ] Create `src/routes/settings.tsx`:
  - [ ] Defaults section (shadcn Select for house system, zodiac, ayanamsa)
  - [ ] Appearance section (theme selector)
  - [ ] Aspects section (Switch for minor, Slider per aspect orb)
  - [ ] Account section (placeholder: "Sign in to sync charts")
  - [ ] Layout: max-w-2xl, cards per section
  - [ ] Auto-save: onChange handlers update Zustand store
  - [ ] Toast on save: "Settings saved" (shadcn Sonner)
- [ ] Wire theme to document: `document.documentElement.classList.toggle("dark")`
- [ ] Wire defaults to birth data form
- [ ] Verify: settings persist across refreshes
- [ ] Verify: theme toggle works

**Definition of done:** Settings save and apply across the app.

---

### Task 12: Transits Page
**Goal:** Current sky with date navigation.

- [ ] Create `src/routes/transits.tsx`:
  - [ ] Date controls: ← button, date display (clickable), → button, "Today" button
  - [ ] ChartCanvas: full-size wheel
  - [ ] Side panel: planet positions + aspects for selected date
- [ ] Date navigation:
  - [ ] ← / →: ±1 day (approx-engine instant update)
  - [ ] Date click: native date picker or shadcn popover calendar
  - [ ] "Today": reset to Date.now()
  - [ ] Debounced API call: 300ms after last navigation action
  - [ ] Snap to precise data on API response
- [ ] Verify: navigation feels instant (no loading between days)
- [ ] Verify: precise data replaces approximate without flicker

**Definition of done:** Transits page with smooth date scrubbing and snap-to-server.

---

### Task 13: Responsive Polish + Final QA
**Goal:** Everything works at all breakpoints. Production-ready.

- [ ] Test all pages at: 1440px, 1024px, 768px, 375px, 390px
- [ ] Sidebar: collapses at tablet, hidden at mobile
- [ ] Mobile tab bar: correct safe area padding
- [ ] Chart display: graceful stack on mobile
- [ ] Home: sections stack on mobile
- [ ] Forms: full-width on mobile, adequate touch targets (44px min)
- [ ] Loading states: skeleton screens (not spinners) for API content
- [ ] Error states: inline error cards for API failures
- [ ] Empty states: all pages handle empty data
- [ ] Toast notifications: positioned correctly on mobile
- [ ] Performance: `npm run build` succeeds, bundle size reasonable
- [ ] Verify all colors match DESIGN_DOCUMENT.md
- [ ] Verify all spacing follows the spacing scale
- [ ] Test production build: `npm run build && npx serve dist`
- [ ] Verify SPA routing works (all routes serve index.html)

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

# Test Findings: Astronomical Accuracy and Presentation Safety

## Executive Summary

The app already has one strong accuracy safeguard: a parity suite that compares frontend body positions against a golden fixture generated from the backend's Swiss Ephemeris implementation. That is the most important evidence in the repo that the numerical astronomy is not drifting silently.

That said, the current guarantees are incomplete.

- The test suite is not green right now.
- The strongest parity coverage is for planetary longitudes/latitudes, not for houses, angles, or end-to-end presentation.
- Some screens still render approximate data first and only replace it with precise API data when the backend responds.
- Some transit paths use `lat=0, lon=0`, which means location-sensitive presentation is not trustworthy there.
- There are very few route/component tests proving that the correct numbers are what the user actually sees.

If the goal is "very accurate astronomical data" and high confidence that no mistakes are made in calculation or presentation, the current setup is a good start but not enough on its own.

## What Is Tested Now

### 1. Swiss Ephemeris parity for body positions

The strongest test is:

- `tests/packages/approx-engine/src/swiss-parity.test.ts`

What it does:

- Loads a golden fixture generated from the backend Swiss Ephemeris code.
- Compares frontend `calculateBodyPosition()` output to Swiss Ephemeris output.
- Covers:
  - Sun
  - Moon
  - Mercury
  - Venus
  - Mars
  - Jupiter
  - Saturn
  - Uranus
  - Neptune
  - Pluto
  - Chiron
  - Mean North Node
  - Mean South Node

Coverage characteristics:

- 20 epochs from 1955 to 2050.
- Longitude and latitude are both checked.

Current tolerances:

- Most bodies: `0.01°` longitude and `0.01°` latitude.
- Chiron: `0.1°` longitude and `0.05°` latitude.

Assessment:

- This is meaningful and valuable.
- For the major planets, this is the main reason to trust the frontend position math.
- The Chiron tolerance is intentionally looser because Chiron is computed by approximation.

Important limitation:

- The fixture only samples sparse dates.
- It does not specifically target high-risk moments like:
  - sign cusps
  - stations / retrograde turns
  - eclipses
  - exact aspect windows
  - leap-day and DST-adjacent date handling
  - extreme latitudes

Relevant files:

- `tests/packages/approx-engine/src/swiss-parity.test.ts`
- `packages/approx-engine/fixtures/swiss-ephemeris-golden.json`
- `packages/approx-engine/fixtures/generate.py`

### 2. Internal parity against `astronomy-engine`

There is also:

- `tests/packages/approx-engine/src/parity.test.ts`

This compares `calculateBodyPosition()` to `astronomy-engine`.

Assessment:

- This is useful as a regression guard.
- It is not an independent authority for most bodies, because the production implementation already uses `astronomy-engine` internally for Sun, Moon, and planets.
- In other words: it helps catch accidental wrapping/normalization mistakes, but it does not prove external correctness the way the Swiss parity test does.

### 3. Approx-engine behavior tests

There are general behavior tests in:

- `tests/packages/approx-engine/src/index.test.ts`
- `tests/packages/approx-engine/src/julian.test.ts`

These verify:

- Julian day conversion basics.
- Degree normalization.
- Presence of expected bodies in `calculateApproximate()`.
- Longitudes stay in `[0, 360)`.
- Houses array has 12 cusps.
- Aspects are sorted and respond to orb settings.
- Moon phase naming and phase-date search behavior.

Assessment:

- Good baseline sanity checks.
- These are not enough to guarantee astronomical correctness by themselves.
- They mainly verify invariants and internal behavior, not authoritative accuracy.

### 4. Aspect timeline precision tests

The app has strong utility-level tests for aspect timing in:

- `tests/apps/web/src/components/home/aspects-timeline-utils.test.ts`

These verify:

- Orb calculations.
- Peak refinement.
- Crossing detection.
- Recovery of known Sun-Moon event times.

Notable strength:

- Several known event regressions are checked against published UTC moments with a tolerance of about 5 minutes.

Assessment:

- This is one of the better presentation-adjacent test areas.
- It gives real confidence that the timeline logic is numerically reasonable.

Limitation:

- It is still utility-level coverage.
- It does not prove the rendered component shows the correct labels, times, glyphs, or ordering to the user.

### 5. Formatting and utility tests

There are tests for:

- formatting: `tests/apps/web/src/lib/format.test.ts`
- dignities: `tests/apps/web/src/lib/dignities.test.ts`
- planetary hours: `tests/apps/web/src/lib/planetary-hours.test.ts`
- element/modality distribution: `tests/apps/web/src/lib/astro-distribution.test.ts`
- settings/store behavior: `tests/apps/web/src/hooks/use-settings.test.ts`, `tests/apps/web/src/stores/sky-store.test.ts`

Assessment:

- These help protect presentation logic and derived astrological helpers.
- They do not cover the full path from calculation to rendered UI.

### 6. Renderer tests

There are renderer-level tests in:

- `tests/packages/chart-renderer/src/core/layout.test.ts`
- `tests/packages/chart-renderer/src/core/geometry.test.ts`
- `tests/packages/chart-renderer/src/adapters/svg.test.ts`
- `tests/packages/chart-renderer/src/glyphs/glyphs.test.ts`

These verify:

- layout collision handling
- blocker avoidance
- basic SVG output structure
- geometry helpers

Assessment:

- Good for wheel rendering stability.
- Not enough to prove a user sees the right planet/sign/degree in a given screen state.

## Current Test Status

I ran:

```bash
npm test
```

Current result:

- `approx-engine`: mostly passes, but fails one performance assertion.
- `astro-client`: passes.
- `chart-renderer`: passes.
- `web`: fails 2 formatting assertions.

Current failures:

### 1. Flaky performance test

File:

- `tests/packages/approx-engine/src/index.test.ts`

Failure:

- `calculateApproximate runs in < 1ms`

Observed:

- Measured runtime was slightly above the threshold during the run.

Assessment:

- This is not an astronomical accuracy problem.
- It is a brittle test and makes the suite red for a non-functional reason.

### 2. Stale format expectations

File:

- `tests/apps/web/src/lib/format.test.ts`

Cause:

- `SIGN_GLYPHS` now include variation selector-15 (`U+FE0E`) to force text presentation.
- The test still expects plain glyphs without the selector.

Assessment:

- This is exactly the kind of presentation mismatch tests should catch.
- But until fixed, the suite cannot be treated as a reliable safety gate.

## Where Accuracy Is Strong

### Major planetary positions

Confidence is relatively high for:

- Sun through Pluto longitude/latitude

Reason:

- The frontend uses `astronomy-engine`.
- It is checked against Swiss Ephemeris golden data.
- Tolerances are tight.

### Mean nodes

Confidence is moderate to high for:

- Mean North Node
- Mean South Node

Reason:

- The implementation is simple and explicitly parity-checked against Swiss mean node output.

### Moon phase and aspect timing utilities

Confidence is moderate to high for:

- elongation-based moon phase naming
- nearest phase time search
- aspect timeline utility logic

Reason:

- There are direct tests, including known-event regressions.

## Where Accuracy Is Weaker

### 1. Houses, angles, and house-sensitive presentation

This is the biggest numerical weakness in the frontend path.

`calculateApproximate()` does not compute precise houses. It explicitly uses:

- approximate ascendant
- approximate midheaven
- equal-house cusps derived from ascendant
- rough vertex/east point placeholders

Relevant file:

- `packages/approx-engine/src/index.ts`

Assessment:

- If a screen depends on approximate house cusps, ASC, MC, vertex, or related angles, it is not at the same trust level as the planetary longitudes.
- There is no Swiss parity suite for houses/angles in the frontend.

### 2. Chiron

Chiron is implemented by custom approximation in:

- `packages/approx-engine/src/chiron.ts`

Assessment:

- It is documented honestly.
- It has parity coverage.
- But it is still a weaker guarantee than the major planets.
- Outside the tested range, confidence drops.

### 3. End-to-end presentation correctness

This is the biggest test gap overall.

There are almost no tests that prove:

- the correct chart data is selected
- the precise API response replaces the approximate placeholder
- the user sees the correct sign, degree, retrograde flag, orb, and aspect label
- the correct node type is displayed
- the right chart is shown on each route after async updates

The current web test configuration includes only `tests/apps/web/**/*.test.ts`, and the existing suite is almost entirely utility/store based.

Missing high-value tests:

- `HomePage`
- `TransitsPage`
- `ChartViewPage`
- `useCurrentSky`
- async "approx first, precise later" rendering behavior

## Important Runtime Findings

### 1. Home page uses snap-to-server correctly, but starts approximate

`useCurrentSky()` does the following:

- computes approximate data immediately
- fetches precise data from the backend in the background
- replaces the chart with precise response when available

Relevant file:

- `apps/web/src/hooks/use-current-sky.ts`

Assessment:

- This is a reasonable UX pattern.
- It means the user may briefly see approximate data.
- If the API fails, the approximate result remains.

This should be made explicit in the UI if accuracy matters to the product promise.

### 2. Transits page uses `lat=0, lon=0`

`TransitsPage` calculates both approximate and precise transit data using:

- latitude `0`
- longitude `0`

Relevant file:

- `apps/web/src/routes/transits.tsx`

Assessment:

- Planetary longitudes are mostly location-independent for geocentric astrology output.
- Houses and angle-sensitive output are not.
- If the transit page or related presentation implies location-aware chart structure, this is a trust problem.

### 3. Chart-view transit overlay also uses `lat=0, lon=0`

`ChartViewPage` computes `currentSky` with:

- `calculateApproximate(new Date(), 0, 0)`

Relevant file:

- `apps/web/src/routes/chart-view.tsx`

Assessment:

- Any transit overlay using this as outer data is not location-accurate.
- This is especially concerning if users interpret the overlay as a precise live transit chart.

### 4. The README is outdated about the engine internals

The README says `approx-engine` is:

- "Pure TypeScript implementation of VSOP87 (planetary positions) and ELP2000 (Moon)"
- "No dependencies"

But the package currently depends on `astronomy-engine`, and the code uses it directly.

Relevant files:

- `README.md`
- `packages/approx-engine/package.json`
- `packages/approx-engine/src/bodies.ts`

Assessment:

- This is not a runtime bug.
- It is a documentation trust issue.
- If accuracy is a priority, the documented calculation model needs to match reality.

## What Can Still Go Wrong Today

Even with the existing tests, these failure modes are still possible:

- A route renders approximate data when the product language implies precise data.
- A route swaps to precise data incorrectly or not at all.
- A planet/sign/degree is formatted or mapped incorrectly in the UI.
- A chart uses the wrong location for houses/angles.
- A node-type preference is lost between precise and approximate flows.
- A renderer/layout issue causes a label to be displaced or clipped in a misleading way.
- A sparse parity fixture misses a systematic error that only appears near stations, cusps, or extreme dates.
- Backend and frontend drift apart if the Swiss golden fixture is not regenerated when backend calculation conventions change.

## Confidence Assessment by Area

### High confidence

- Major planet longitude/latitude calculations in the tested date range
- Basic angle normalization and Julian conversions
- Chart renderer geometry/collision helpers

### Moderate confidence

- Moon phase timing utilities
- Mean nodes
- Chiron within the tested date window
- Planetary hours logic

### Low to moderate confidence

- Houses and angles in approximate mode
- Route-level correctness of displayed values
- Precise-vs-approx transition behavior in the UI
- Transit overlays tied to actual user/chart location

## What You Should Do to Make Mistakes Much Less Likely

## Priority 1: Make the test suite trustworthy

1. Fix the currently failing tests.
2. Remove or relax the brittle `< 1ms` performance assertion.
3. Make `npm test` green and keep it green.
4. Add CI so every PR runs the suite automatically.

Without this, the current tests are informative but not a dependable gate.

## Priority 2: Add end-to-end UI correctness tests

Add route/component tests for:

1. `HomePage`
2. `TransitsPage`
3. `ChartViewPage`
4. `useCurrentSky`

These tests should verify:

- exact sign text
- exact degree/minute text
- retrograde marker
- displayed aspect type/orb
- correct fallback when API fails
- correct swap from approximate to precise data
- correct node filtering

This is the missing layer between good calculation tests and real user trust.

## Priority 3: Add authoritative golden cases for presentation

Create a set of fixed reference charts from Swiss Ephemeris/backend and assert that the UI shows the exact expected strings for:

- planets on sign cusps
- retrograde stations
- eclipse dates
- daylight-saving boundary dates
- leap day charts
- polar or near-polar latitudes
- tight aspect windows

Do not only assert internal object shape. Assert the actual rendered text the user sees.

## Priority 4: Improve parity coverage

Expand the Swiss parity dataset beyond the current sparse sample.

Add targeted dates for:

- exact ingresses
- retrograde turnarounds
- eclipses
- solstices/equinoxes
- random dense sampling across several years

If accuracy matters commercially, sparse every-5-years sampling is not enough as the final line of defense.

## Priority 5: Decide what must always come from the backend

If the promise is "very accurate astronomical data", define strict source-of-truth rules.

Recommended:

- Use backend Swiss Ephemeris for any persisted chart, natal chart, or user-facing location-sensitive wheel.
- Use frontend approximation only for:
  - immediate placeholder display
  - transient live dashboards
  - scrubbing where low latency matters more than final precision

And label approximate data clearly if it can remain on screen after API failure.

## Priority 6: Stop using `0,0` where accuracy is expected

Review and fix all places where transit or current-sky overlays use:

- latitude `0`
- longitude `0`

This is especially important anywhere houses, angles, or location-aware chart framing is implied.

## Priority 7: Add visual regression coverage

For a chart-heavy app, screenshot/visual regression tests are worth adding for:

- chart wheel
- biwheel/transit overlay
- planet list/cards
- aspect grid
- key responsive states

These catch presentation mistakes that pure value assertions miss.

## Priority 8: Add coverage thresholds

The repo currently has no visible coverage thresholds enforced.

Add coverage reporting and thresholds for at least:

- `approx-engine`
- `apps/web`
- `chart-renderer`

This will not prove correctness, but it will expose untested surfaces and prevent silent erosion.

## Suggested Accuracy Standard

If you want a practical definition of "safe enough," use something like this:

- Major body longitudes must stay within `0.01°` of backend Swiss Ephemeris in the supported date range.
- Chiron must stay within its documented looser tolerance, or be served only from the backend where needed.
- Any house/angle shown as authoritative must come from backend precise calculation.
- Any user-visible sign/degree text on key routes must be covered by golden UI tests.
- Approximate-only fallback states must be explicitly labeled.
- CI must block merges on any red test.

## Recommended Next Implementation Steps

If this audit is going to turn into code changes, the best order is:

1. Fix the red tests.
2. Add route-level tests for `HomePage`, `TransitsPage`, and `ChartViewPage`.
3. Fix the `0,0` transit-location paths.
4. Add authoritative golden UI cases.
5. Expand Swiss parity sampling.
6. Add CI + coverage thresholds.

## Bottom Line

The app is not "untested" or "hand-wavy." There is real numerical validation already, especially the Swiss Ephemeris parity suite. That is the strongest part of the current setup.

But the app is also not yet in a state where you can say with high confidence that it will not make mistakes in both calculation and presentation.

Right now:

- raw major-planet position math has decent evidence behind it
- house/angle accuracy is much weaker in approximate mode
- route-level presentation correctness is under-tested
- the overall safety net is weakened because the suite is currently red

The highest-value improvement is not more low-level math tests first. It is making the suite green and adding end-to-end UI tests that prove the precise numbers are what the user actually sees.

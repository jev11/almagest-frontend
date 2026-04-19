# Aspect Timeline — Precise In-Orb Windows

**Date:** 2026-04-18
**Status:** Spec
**Area:** `apps/web/src/components/home/aspects-timeline.tsx` + `aspects-timeline-utils.ts`

## Background

The 10-day aspects timeline on the home page samples the sky every 6 hours and
renders each aspect's active window as a horizontal bar with Start / Peak / End
times in a hover tooltip. Bar extents and tooltip timestamps are currently
derived from sample *indices*: `fromSample` = first sample above
`ACTIVE_THRESHOLD`, `toSample` = last such sample, `peakSample` = V-fit
interpolated apex.

This produces a visible bug: when an aspect's true active window is shorter
than the 6-hour sample spacing (common for Moon aspects with a 2° orb —
Sun-Moon semi-sextile's window is ~7.5 h and can collapse to a single sample
hit), `fromSample === toSample === peakSample`. The bar renders as a zero-
length segment and the tooltip shows three identical timestamps. The user
report was Sun semi-sextile Moon on Apr 19 reading `Start / Peak / End` all
as `Apr 19, 18:00`.

The rendering bug is a symptom of a deeper semantic issue: the timeline is
quantizing astronomical events to a 6-hour grid. For users who care about
exact aspect timing (the audience of an astrology app), Start and End should
reflect the true astronomical moments when the bodies cross the maxOrb
boundary.

## Goal

Replace sample-grid-based Start/End/Peak with astronomically accurate times
computed by root-finding against `approx-engine`.

Requirements:

- Sub-minute precision for any aspect — Moon through Pluto pairs.
- Start / Peak / End must satisfy Start < Peak < End by construction.
- Aspects whose orb-boundary crossings fall outside the 10-day window render
  correctly (bar clipped at the window edge, tooltip still shows the real
  crossing time up to a ±6-month search bound; beyond that, labelled as
  "before 〈window start〉" / "after 〈window end〉").
- No noticeable perf regression. Total work stays in the async-yielded
  compute pass already in place.

## Non-goals

- Discovering *new* aspects missed by the 6-hour sample grid (e.g. a brief
  Moon quincunx whose entire active window fits between two samples and so
  never registers above zero in any sample). That is a different bug — the
  current work fixes zero-width bars for aspects *already detected*.
- Changing the set of aspects displayed, sort order, colour scheme, or the
  overall timeline visual language.
- Sampling strategy changes for slow planets (no downstream dependency).

## Approach

The existing sample pass (`computeAspectBarsAsync`) stays as the *discovery*
mechanism — it identifies which `{body1, body2, aspectType}` triples are in
orb at any point during the 10-day window. Per-bar analysis is rewritten:

1. **Peak refinement.** Golden-section minimization of `orbAtTime` in an
   interval bounded by the sample neighbours of the best sample (±6 h around
   the argmax). Converges to sub-minute in ≤20 probe iterations.
2. **Start crossing.** Bisect `orb(t) = maxOrb` on the bracket
   `[lastInactiveBefore, peakTime]`. If the left edge is already in-orb
   (aspect was active at window start), exponentially widen the bracket
   leftward up to 6 months. If still in-orb at the cap, mark
   `startClipped = true` with no recovered timestamp.
3. **End crossing.** Symmetric.
4. **Retrograde safety.** Inside the bracket, probe three interior points
   and verify monotonicity of `orb(t)` with respect to `|t − peakTime|`. If
   non-monotonic (retrograde reversal inside the active window), split into
   sub-brackets at the inflection and bisect each.

`BarRange` is migrated from sample-index fields to absolute `ms`-since-epoch
timestamps, and all rendering keys (`x`-coordinate mapping, tooltip labels,
visibility filters) are driven from those timestamps.

## Data model

```ts
interface BarRange {
  bar: AspectBar;
  startMs: number;           // absolute ms; bisection-converged
  peakMs: number;            // absolute ms; golden-section-converged
  endMs: number;             // absolute ms; bisection-converged
  peakValue: number;         // 1 - (orbAtPeak / maxOrb); kept for sort-key use
  startClipped: boolean;     // start is before window start AND >6mo away
  endClipped: boolean;       // end is after window end AND >6mo away
}
```

`AspectBar` (sample-stage shape) is unchanged.

## Algorithms

### `orbAtTime(ms, body1, body2, aspectAngle)` → degrees

```ts
function orbAtTime(
  ms: number,
  body1: CelestialBody,
  body2: CelestialBody,
  aspectAngle: number,
): number {
  const p1 = calculateBodyPosition(new Date(ms), body1);
  const p2 = calculateBodyPosition(new Date(ms), body2);
  const raw = Math.abs(p1.longitude - p2.longitude);
  const sep = raw > 180 ? 360 - raw : raw;
  return Math.abs(sep - aspectAngle);
}
```

Lives in `aspects-timeline-utils.ts`. Pure in `ms / body / aspectAngle`.

### `refinePeakTime(bracket, body1, body2, aspectAngle)` → `{ ms, orb }`

Golden-section search for the minimum of `orbAtTime` across the bracket.
Iterates until bracket width < `30_000` ms (30 s) or after `30` iterations,
whichever first. Returns the converged ms and the orb value at that time.

### `findOrbCrossing(side, peakMs, probeBracket, maxOrb, body1, body2, aspectAngle)` → `{ ms, clipped: boolean }`

`side = "left" | "right"` determines which sign of the crossing we want.

Pre-conditions: `orbAtTime(peakMs) <= maxOrb`. The bracket provided by the
caller must satisfy `orbAtTime(bracketEdge) >= maxOrb` on the outside end.
If it does not, widen exponentially by doubling the distance from `peakMs`
up to `WINDOW_WIDEN_CAP_MS` (6 months). If still not crossing at the cap,
return `{ ms: peakMs ± CAP, clipped: true }`.

Main loop: bisection until `|orb(mid) − maxOrb| < ARCMIN` (1/60°) or
interval width < 30 s, at most 30 iterations.

### Retrograde safety check

Before the bisection loop, sample three interior points at the 25/50/75%
marks of the bracket. If the orb values do not form a monotonic sequence
along the direction from peak to bracket edge, find the local maximum/
minimum of `orb(t)` in the bracket using golden-section, split the bracket
at that inflection, and bisect each half that straddles `maxOrb`. Take
whichever crossing is nearer to the peak — that is the true window
boundary.

This case is uncommon (requires a retrograde station inside the active
window) but is possible for Mercury, Venus, and the outer planets.

## Rendering changes (`aspects-timeline.tsx`)

### Replace sample-index ↔ x mapping

Remove `sampleToX`. Replace with:

```ts
const msToX = (ms: number) =>
  ((ms - windowStartMs) / windowDurationMs) * VIEWBOX_W;
```

Bars are rendered at `[msToX(startMs), msToX(endMs)]`, clamped to
`[0, VIEWBOX_W]` for the visible `<line>`. The transparent hit-rect uses
the same clamped range, padded ±2 px.

### Tooltip

Format `startMs` / `peakMs` / `endMs` directly via
`toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })` (extracted into a local
`formatMs` helper — replaces the existing `formatSampleTime`).

If `startClipped`, show `"before 〈formatMs(windowStartMs)〉"`. If
`endClipped`, show `"after 〈formatMs(windowEndMs)〉"`. Otherwise show the
converged time.

### Filters

- Drop `ACTIVE_THRESHOLD`. No sample-index thresholding — bars are included
  if the converged `[startMs, endMs]` overlaps `[windowStartMs, windowEndMs]`.
- Major/minor split and current sort keys are preserved, but the sort key
  for `peakSample` becomes `peakMs`.

### Sample pass retains intensity

`computeAspectBarsAsync` still produces `AspectBar.samples[]` (intensity per
6-h sample) — used only to locate the argmax sample that seeds peak
refinement. No other downstream consumer.

## Cleanup

`interpolatePeaks` is superseded by `refinePeakTime`. Delete it and the
associated block of tests in
`apps/web/src/components/home/aspects-timeline-utils.test.ts`. Keep
`orbIntensity` and `catmullRomPath` — both still used elsewhere in the
component.

## Testing

New unit tests in `aspects-timeline-utils.test.ts`:

- `orbAtTime` — picks several known dates (e.g. a Sun-Moon New Moon
  reference), asserts conjunction orb is near zero and semi-sextile orb is
  ~30° away.
- `refinePeakTime` — synthetic scenario: Sun-Moon semi-sextile across a
  2-hour bracket; asserts converged time is within 60 s of the true exact
  moment computed by independent search at 1-second resolution.
- `findOrbCrossing` — same scenario; assert left and right crossings match
  independent fine-grid scan within 60 s.
- `findOrbCrossing` widening — start the bracket with the outer edge still
  in-orb; assert widening kicks in and the returned ms is correct.
- `findOrbCrossing` clipped — force a bracket where the aspect is in orb
  across the full ±6-month cap (synthetic slow-slow scenario); assert
  `clipped: true`.

Regression test for the reported bug: Sun semi-sextile Moon scenario on
Apr 19 2026; assert `endMs − startMs > 5 * 60 * 1000` (5 min). The current
code produces 0.

## Performance

Per bar:

- Peak refinement: ~20 probes × 2 `calculateBodyPosition` calls = 40 calls.
- Two bisections: ~20 probes × 2 calls each = 80 calls.
- Widening / retrograde safety (rare): < 20 extra probes average.

Total ~140 body-position calls per bar. At ~0.05 ms each ≈ 7 ms/bar. A
typical 10-day window has 30-60 bars → 200–400 ms. The existing sample
pass already yields to the main thread after every sample; add equivalent
yields inside the per-bar refinement loop (after each bar).

Shared cache: within a single `computeRange` pass we do many probes at
*nearby* times for the same body pair. An LRU cache keyed by
`(bodyId, Math.round(ms / 1000))` cuts position duplicates to effectively
zero extra cost (bisection revisits the same probe ms region as it
converges). Optional optimisation — defer unless the naive impl shows
jank.

## Rollout

Single PR to `feature/design_improvements` (the current branch). No
feature flag — the existing behaviour is incorrect, not a choice. The
sample pass's external interface (the `AspectBar` shape) is unchanged, so
no spill-over into other consumers.

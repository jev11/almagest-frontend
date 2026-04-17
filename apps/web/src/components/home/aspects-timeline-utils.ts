/**
 * Converts an orb value to an intensity in [0, 1].
 * intensity = 1 at orb = 0 (exact aspect), 0 at orb = maxOrb.
 */
export function orbIntensity(orb: number, maxOrb: number): number {
  if (maxOrb <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - orb / maxOrb));
}

export interface TimelinePoint {
  x: number;
  value: number;
}

/**
 * Augments discrete intensity samples with analytically-derived apex points
 * so each clear local maximum renders as a symmetric triangle peaking at y=1.
 *
 * Why: samples are taken at fixed 6h intervals but the exact-aspect moment
 * rarely lines up with one, producing visibly lopsided triangles when drawn
 * with linear interpolation. For each interior local max with both neighbours
 * active, we fit a V-shape (two linear limbs meeting at y=1) and insert an
 * (tp, 1) point at the fitted crossing time. Originals are kept.
 */
export function interpolatePeaks(samples: number[]): TimelinePoint[] {
  const PEAK_THRESHOLD = 0.5;
  const PLATEAU_TOL = 0.05;
  const EPS = 1e-9;
  const points: TimelinePoint[] = samples.map((value, x) => ({ x, value }));
  const n = samples.length;

  let i = 1;
  while (i < n - 1) {
    const cur = samples[i]!;
    const prev = samples[i - 1]!;

    if (cur < PEAK_THRESHOLD || cur <= prev + EPS) {
      i++;
      continue;
    }

    // Walk right through a near-plateau (samples within PLATEAU_TOL of cur).
    // Catches the case where the true apex lands near a 6h sample midpoint:
    // the two straddling samples end up at near-equal intensity, the strict
    // local-max test fails, and the chart renders a trapezoid without an apex.
    let j = i;
    while (
      j + 1 < n &&
      samples[j + 1]! >= PEAK_THRESHOLD &&
      Math.abs(samples[j + 1]! - cur) <= PLATEAU_TOL
    ) {
      j++;
    }

    // After the plateau the next sample must strictly drop below it.
    if (j + 1 >= n || samples[j + 1]! >= samples[j]! - EPS) {
      i = j + 1;
      continue;
    }

    let tp: number;
    if (i === j) {
      // Single-sample peak — needs active neighbours on both sides.
      const next = samples[j + 1]!;
      if (prev <= 0 || next <= 0) {
        i = j + 1;
        continue;
      }
      let kU: number;
      if (prev >= next) {
        kU = cur - next;
        if (kU <= 0) { i = j + 1; continue; }
        tp = i - (1 - cur) / kU;
      } else {
        kU = cur - prev;
        if (kU <= 0) { i = j + 1; continue; }
        tp = i + (1 - cur) / kU;
      }
    } else {
      // Plateau apex sits at the midpoint of the tied run. Works even when
      // outer samples are clamped to 0 (which is common for fast Moon aspects).
      tp = (i + j) / 2;
    }

    if (tp <= i - 1 || tp >= j + 1) {
      i = j + 1;
      continue;
    }

    points.push({ x: tp, value: 1 });
    i = j + 1;
  }

  points.sort((a, b) => a.x - b.x);
  return points;
}

/**
 * Converts an array of [x, y] points into a smooth SVG cubic Bézier path
 * using Catmull-Rom parameterisation (uniform, tension = 1/6).
 * The path starts with "M" and uses "C" commands. Does NOT close the path.
 */
export function catmullRomPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [x, y] = points[0]!;
    return `M ${x},${y}`;
  }

  // Pad with phantom endpoints so the curve passes through first and last points
  const pts: [number, number][] = [
    points[0]!,
    ...points,
    points[points.length - 1]!,
  ];

  let d = `M ${pts[1]![0]},${pts[1]![1]}`;

  for (let i = 1; i < pts.length - 2; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[i + 1]!;
    const [x3, y3] = pts[i + 2]!;

    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }

  return d;
}

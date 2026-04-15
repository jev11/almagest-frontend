/**
 * Converts an orb value to an intensity in [0, 1].
 * intensity = 1 at orb = 0 (exact aspect), 0 at orb = maxOrb.
 */
export function orbIntensity(orb: number, maxOrb: number): number {
  if (maxOrb <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - orb / maxOrb));
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

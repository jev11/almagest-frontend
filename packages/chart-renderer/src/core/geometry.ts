/**
 * Geometry module — all spatial math for the chart wheel.
 * Pure functions, no side effects.
 */

/**
 * Convert ecliptic longitude to angle on the chart wheel.
 *
 * The chart wheel is oriented with the Ascendant at the 9 o'clock position
 * (π radians). Zodiac degrees increase counter-clockwise.
 *
 * @param longitude - Ecliptic longitude (0-360°)
 * @param ascendant - Ascendant longitude for rotation
 * @returns Angle in radians (0 = 3 o'clock, increases counter-clockwise)
 */
export function longitudeToAngle(longitude: number, ascendant: number): number {
  const adjusted = ((longitude - ascendant) % 360 + 360) % 360;
  const radians = (adjusted * Math.PI) / 180;
  return Math.PI + radians;
}

/**
 * Convert a chart angle + radius to canvas x,y coordinates.
 * @param cx - Center x of the wheel
 * @param cy - Center y of the wheel
 * @param angle - Angle in radians (0 = right, increases counter-clockwise)
 * @param radius - Distance from center
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  angle: number,
  radius: number,
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  };
}

/**
 * Calculate the shortest angular distance between two longitudes.
 * Always returns a value between 0 and 180.
 */
export function angularDistance(lon1: number, lon2: number): number {
  const diff = Math.abs(((lon2 - lon1) % 360 + 360) % 360);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Draw an arc path on a Canvas 2D context.
 * Used for zodiac sign segments and ring outlines.
 */
export function drawArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  counterClockwise = false,
): void {
  ctx.arc(cx, cy, radius, startAngle, endAngle, counterClockwise);
}

/**
 * Normalize a longitude to 0-360 range.
 */
export function normalizeLongitude(lon: number): number {
  return ((lon % 360) + 360) % 360;
}

/**
 * Get the sign index (0-11) from an absolute longitude.
 * 0 = Aries (0-29°), 1 = Taurus (30-59°), ..., 11 = Pisces (330-359°)
 */
export function signIndexFromLongitude(lon: number): number {
  return Math.floor(normalizeLongitude(lon) / 30);
}

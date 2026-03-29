/**
 * Julian Day Number utilities.
 *
 * Julian Day 2451545.0 = J2000.0 = 2000 January 1, 12:00 TT
 */

/** Convert a UTC Date to Julian Day Number. */
export function dateToJulianDay(date: Date): number {
  const ms = date.getTime();
  // Julian Day for Unix epoch (1970-01-01 00:00 UTC) is 2440587.5
  return ms / 86_400_000 + 2440587.5;
}

/**
 * Julian centuries from J2000.0.
 * T = (JD - 2451545.0) / 36525
 */
export function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/** Normalize an angle to [0, 360). */
export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Convert degrees to radians. */
export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert radians to degrees. */
export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

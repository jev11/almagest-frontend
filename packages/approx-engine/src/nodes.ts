import { normalizeDegrees } from "./julian.js";

/**
 * Mean Lunar Node (North Node / Rahu) using the standard formula.
 * Returns ecliptic longitude in degrees [0, 360).
 */
export function meanNorthNode(T: number): number {
  const raw = 125.04452 - 1934.136261 * T + 0.0020708 * T * T;
  return normalizeDegrees(raw);
}

/** Mean South Node — always opposite the North Node. */
export function meanSouthNode(T: number): number {
  return normalizeDegrees(meanNorthNode(T) + 180);
}

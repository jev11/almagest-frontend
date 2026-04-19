import {
  CelestialBody,
  ZodiacSign,
  HouseSystem,
  ZodiacType,
  AspectType,
} from "@astro-app/shared-types";
import type {
  ChartData,
  CelestialPosition,
  ZodiacPosition,
  HouseData,
  ChartMetadata,
  Aspect,
} from "@astro-app/shared-types";
import { dateToJulianDay, julianCenturies, normalizeDegrees, toRad, toDeg } from "./julian.js";
import { calculateSunPosition, calculatePlanetPosition, calculateMoonPosition, PLANET_BODIES } from "./bodies.js";
import { meanNorthNode, meanSouthNode } from "./nodes.js";
import { calculateChironPosition } from "./chiron.js";

export { dateToJulianDay, julianCenturies, normalizeDegrees } from "./julian.js";
export { calculateSunPosition, calculatePlanetPosition, calculateMoonPosition } from "./bodies.js";
export { meanNorthNode, meanSouthNode } from "./nodes.js";
export { calculateChironPosition } from "./chiron.js";
export { nextEclipse, type NextEclipse, type EclipseKind, type EclipseSubtype } from "./eclipses.js";

const SIGN_ORDER: ZodiacSign[] = [
  ZodiacSign.Aries, ZodiacSign.Taurus, ZodiacSign.Gemini,
  ZodiacSign.Cancer, ZodiacSign.Leo, ZodiacSign.Virgo,
  ZodiacSign.Libra, ZodiacSign.Scorpio, ZodiacSign.Sagittarius,
  ZodiacSign.Capricorn, ZodiacSign.Aquarius, ZodiacSign.Pisces,
];

function longitudeToZodiac(longitude: number, isRetrograde: boolean): ZodiacPosition {
  const norm = normalizeDegrees(longitude);
  const signIndex = Math.floor(norm / 30);
  const signDeg = norm - signIndex * 30;
  const degree = Math.floor(signDeg);
  const minuteF = (signDeg - degree) * 60;
  const minute = Math.floor(minuteF);
  const second = Math.floor((minuteF - minute) * 60);

  return {
    sign: SIGN_ORDER[signIndex] ?? ZodiacSign.Aries,
    degree,
    minute,
    second,
    is_retrograde: isRetrograde,
    dignity: null,
  };
}

function toCelestialPosition(
  longitude: number,
  latitude: number,
  distance: number,
  speed: number,
): CelestialPosition {
  return {
    longitude,
    latitude,
    distance,
    speed_longitude: speed,
    speed_latitude: 0,
    speed_distance: 0,
  };
}

/**
 * Approximate equal-house system using the Ascendant.
 * For a full calculation, use the backend API.
 */
function approximateHouses(
  ascendant: number,
  midheaven: number,
): HouseData {
  const cusps: number[] = [];
  for (let i = 0; i < 12; i++) {
    cusps.push(normalizeDegrees(ascendant + i * 30));
  }
  return {
    cusps,
    ascendant,
    midheaven,
    descendant: normalizeDegrees(ascendant + 180),
    imum_coeli: normalizeDegrees(midheaven + 180),
    vertex: normalizeDegrees(ascendant + 210), // rough approximation
    east_point: ascendant,
  };
}

function approximateAscendant(T: number, lat: number, lon: number): number {
  // Sidereal time at Greenwich
  const theta0 = normalizeDegrees(280.46061837 + 360.98564736629 * (T * 36525) + 0.000387933 * T * T);
  // Local sidereal time
  const LST = normalizeDegrees(theta0 + lon);
  // RAMC in radians
  const RAMC = toRad(LST);
  const latR = toRad(lat);
  const eps = toRad(23.4393 - 0.013 * T); // obliquity

  // Ascendant formula
  const y = -Math.cos(RAMC);
  const x = Math.sin(RAMC) * Math.cos(eps) + Math.tan(latR) * Math.sin(eps);
  const asc = normalizeDegrees(toDeg(Math.atan2(y, x)));

  return asc;
}

function approximateMidheaven(T: number, lon: number): number {
  const theta0 = normalizeDegrees(280.46061837 + 360.98564736629 * (T * 36525) + 0.000387933 * T * T);
  const LST = normalizeDegrees(theta0 + lon);
  const eps = toRad(23.4393 - 0.013 * T);
  const MC = normalizeDegrees(toDeg(Math.atan2(Math.tan(toRad(LST)), Math.cos(eps))));
  return MC;
}

// Aspect definitions: type → angle in degrees, default orb
const ASPECT_DEFINITIONS: Array<{ type: AspectType; angle: number; orb: number; key: string }> = [
  { type: AspectType.Conjunction, angle: 0, orb: 8, key: "conjunction" },
  { type: AspectType.Opposition, angle: 180, orb: 8, key: "opposition" },
  { type: AspectType.Trine, angle: 120, orb: 8, key: "trine" },
  { type: AspectType.Square, angle: 90, orb: 8, key: "square" },
  { type: AspectType.Sextile, angle: 60, orb: 4, key: "sextile" },
  { type: AspectType.Quincunx, angle: 150, orb: 2, key: "quincunx" },
];

// Minor aspects not included by default
const MINOR_ASPECT_DEFINITIONS: Array<{ type: AspectType; angle: number; orb: number; key: string }> = [
  { type: "semi_square" as AspectType, angle: 45, orb: 2, key: "semi_square" },
  { type: "sesquiquadrate" as AspectType, angle: 135, orb: 2, key: "sesquiquadrate" },
  { type: "semi_sextile" as AspectType, angle: 30, orb: 2, key: "semi_sextile" },
];

export function calculateAspects(
  positions: Partial<Record<CelestialBody, CelestialPosition>>,
  orbOverrides?: Record<string, number>,
  includeMinor?: boolean,
): Aspect[] {
  const bodies = Object.keys(positions) as CelestialBody[];
  const aspects: Aspect[] = [];
  const defs = includeMinor
    ? [...ASPECT_DEFINITIONS, ...MINOR_ASPECT_DEFINITIONS]
    : ASPECT_DEFINITIONS;

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const b1 = bodies[i]!;
      const b2 = bodies[j]!;
      const p1 = positions[b1];
      const p2 = positions[b2];
      if (!p1 || !p2) continue;

      const rawAngle = Math.abs(p1.longitude - p2.longitude);
      const angle = rawAngle > 180 ? 360 - rawAngle : rawAngle;

      for (const { type, angle: aspectAngle, orb: defaultOrb, key } of defs) {
        const orb = orbOverrides?.[key] ?? defaultOrb;
        if (orb <= 0) continue; // orb of 0 disables this aspect
        const diff = Math.abs(angle - aspectAngle);
        if (diff <= orb) {
          const isApplying = p1.speed_longitude > p2.speed_longitude
            ? angle > aspectAngle
            : angle < aspectAngle;

          aspects.push({
            body1: b1,
            body2: b2,
            type,
            angle: aspectAngle,
            orb: diff,
            is_applying: isApplying,
          });
          break; // only one aspect per pair
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}

/**
 * Calculate approximate planetary positions for a given date and location.
 *
 * Performance: < 1ms for all bodies.
 */
export function calculateApproximate(
  date: Date,
  lat: number,
  lon: number,
  options?: { orbOverrides?: Record<string, number>; includeMinor?: boolean },
): ChartData {
  const jd = dateToJulianDay(date);
  const T = julianCenturies(jd);

  const positions: Partial<Record<CelestialBody, CelestialPosition>> = {};
  const zodiacPositions: Partial<Record<CelestialBody, ZodiacPosition>> = {};

  // Sun
  const sun = calculateSunPosition(T);
  positions[CelestialBody.Sun] = toCelestialPosition(sun.longitude, sun.latitude, sun.distance, sun.speed);
  zodiacPositions[CelestialBody.Sun] = longitudeToZodiac(sun.longitude, false);

  // Moon
  const moon = calculateMoonPosition(T);
  positions[CelestialBody.Moon] = toCelestialPosition(moon.longitude, moon.latitude, moon.distance, moon.speed);
  zodiacPositions[CelestialBody.Moon] = longitudeToZodiac(moon.longitude, false);

  // Planets
  for (const body of PLANET_BODIES) {
    try {
      const planet = calculatePlanetPosition(T, body);
      const isRetro = planet.speed < 0;
      positions[body] = toCelestialPosition(planet.longitude, planet.latitude, planet.distance, planet.speed);
      zodiacPositions[body] = longitudeToZodiac(planet.longitude, isRetro);
    } catch {
      // skip bodies without elements
    }
  }

  // Nodes
  const northNodeLon = meanNorthNode(T);
  const southNodeLon = meanSouthNode(T);
  positions[CelestialBody.MeanNorthNode] = toCelestialPosition(northNodeLon, 0, 0, -0.053);
  zodiacPositions[CelestialBody.MeanNorthNode] = longitudeToZodiac(northNodeLon, true);
  positions[CelestialBody.MeanSouthNode] = toCelestialPosition(southNodeLon, 0, 0, -0.053);
  zodiacPositions[CelestialBody.MeanSouthNode] = longitudeToZodiac(southNodeLon, true);

  // Chiron (Keplerian approximation — see chiron.ts)
  const chiron = calculateChironPosition(T);
  positions[CelestialBody.Chiron] = toCelestialPosition(chiron.longitude, chiron.latitude, chiron.distance, chiron.speed);
  zodiacPositions[CelestialBody.Chiron] = longitudeToZodiac(chiron.longitude, chiron.speed < 0);

  // Houses (approximate equal house)
  const ascendant = approximateAscendant(T, lat, lon);
  const midheaven = approximateMidheaven(T, lon);
  const houses = approximateHouses(ascendant, midheaven);

  const metadata: ChartMetadata = {
    house_system: HouseSystem.Equal,
    zodiac_type: ZodiacType.Tropical,
    ayanamsa: null,
    ayanamsa_value: null,
    julian_day: jd,
    delta_t: 0,
    sidereal_time: normalizeDegrees(280.46061837 + 360.98564736629 * (T * 36525)),
    obliquity: 23.4393 - 0.013 * T,
  };

  const aspects = calculateAspects(positions, options?.orbOverrides, options?.includeMinor);

  return { positions, zodiac_positions: zodiacPositions, houses, aspects, metadata };
}

/**
 * Moon-Sun elongation angle in degrees [0, 360).
 * 0 = New Moon, 180 = Full Moon.
 */
export function moonPhaseAngle(date: Date): number {
  const T = julianCenturies(dateToJulianDay(date));
  const sun = calculateSunPosition(T);
  const moon = calculateMoonPosition(T);
  return normalizeDegrees(moon.longitude - sun.longitude);
}

/** Human-readable moon phase name from elongation angle. */
export function moonPhaseName(elongation: number): string {
  const e = normalizeDegrees(elongation);
  if (e < 22.5 || e >= 337.5) return "New Moon";
  if (e < 67.5) return "Waxing Crescent";
  if (e < 112.5) return "First Quarter";
  if (e < 157.5) return "Waxing Gibbous";
  if (e < 202.5) return "Full Moon";
  if (e < 247.5) return "Waning Gibbous";
  if (e < 292.5) return "Last Quarter";
  return "Waning Crescent";
}

/**
 * Find the nearest date when a specific lunar phase occurs.
 * @param now - Reference date
 * @param targetElongation - Target Moon-Sun elongation: 0 (New), 90 (First Quarter), 180 (Full), 270 (Last Quarter)
 * @param direction - Search direction: "past" or "future"
 * @returns Date of the phase occurrence (accurate to ~3 seconds)
 */
export function findNearestPhaseDate(
  now: Date,
  targetElongation: number,
  direction: "past" | "future",
): Date {
  const msPerDay = 86_400_000;
  const SYNODIC_MONTH = 29.53059; // days
  const RATE = 360 / SYNODIC_MONTH; // ~12.19°/day

  const currentElong = moonPhaseAngle(now);

  // Angular distance from current elongation to target in the desired direction
  let delta: number;
  if (direction === "future") {
    delta = targetElongation - currentElong;
    if (delta <= 0) delta += 360; // wrap forward
  } else {
    delta = currentElong - targetElongation;
    if (delta <= 0) delta += 360; // wrap backward
  }

  // Estimate days to target
  const estDays = delta / RATE;
  const estMs = estDays * msPerDay * (direction === "future" ? 1 : -1);

  // Create a bracket: the estimate ± 2 days should contain the actual crossing
  const estTime = now.getTime() + estMs;
  let lo = estTime - 2 * msPerDay;
  let hi = estTime + 2 * msPerDay;

  // Find the point in [lo, hi] closest to target elongation via bisection.
  // We use a "distance to target" metric that handles the 360° wrap.
  function angleDist(timeMs: number): number {
    const e = moonPhaseAngle(new Date(timeMs));
    // Signed distance: positive means target is still ahead (in increasing elongation direction)
    let d = targetElongation - e;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  // Bisect: find where angleDist crosses zero
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    const dMid = angleDist(mid);
    if (dMid > 0) {
      // Target is still ahead → need to go later in time
      lo = mid;
    } else {
      // Target is behind or at → need to go earlier
      hi = mid;
    }
  }

  return new Date((lo + hi) / 2);
}

/** Calculate a single body's position. */
export function calculateBodyPosition(date: Date, body: CelestialBody): CelestialPosition {
  const T = julianCenturies(dateToJulianDay(date));

  if (body === CelestialBody.Sun) {
    const pos = calculateSunPosition(T);
    return toCelestialPosition(pos.longitude, pos.latitude, pos.distance, pos.speed);
  }
  if (body === CelestialBody.Moon) {
    const pos = calculateMoonPosition(T);
    return toCelestialPosition(pos.longitude, pos.latitude, pos.distance, pos.speed);
  }
  if (body === CelestialBody.MeanNorthNode) {
    return toCelestialPosition(meanNorthNode(T), 0, 0, -0.053);
  }
  if (body === CelestialBody.MeanSouthNode) {
    return toCelestialPosition(meanSouthNode(T), 0, 0, -0.053);
  }
  if (body === CelestialBody.Chiron) {
    const pos = calculateChironPosition(T);
    return toCelestialPosition(pos.longitude, pos.latitude, pos.distance, pos.speed);
  }

  const pos = calculatePlanetPosition(T, body);
  return toCelestialPosition(pos.longitude, pos.latitude, pos.distance, pos.speed);
}

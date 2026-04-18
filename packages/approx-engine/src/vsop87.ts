import { normalizeDegrees, toRad, toDeg } from "./julian.js";
import { CelestialBody } from "@astro-app/shared-types";

export interface PlanetPosition {
  longitude: number;  // ecliptic longitude, degrees [0, 360)
  latitude: number;   // ecliptic latitude, degrees
  distance: number;   // distance in AU
  speed: number;      // approximate speed, degrees/day (negative = retrograde)
}

/**
 * Truncated VSOP87 coefficients for mean longitude (L), eccentricity (e),
 * perihelion argument (w), and mean daily motion (n).
 *
 * These are the Keplerian orbital elements at J2000.0 with secular rates.
 * Accuracy: after the J2000 epoch, geocentric ecliptic longitude agrees with
 * the full-series VSOP87D ephemeris (via astronomy-engine) within:
 *   - Sun, Moon, Jupiter, Saturn: ~0.1°
 *   - Mercury, Venus, Mars, Uranus, Neptune: ~0.3°
 *   - Pluto: ~1° (Keplerian model is especially crude for Pluto)
 * Drift grows to 2-5x these values at ±50 years from J2000. See
 * parity.test.ts for the authoritative tolerance bounds.
 *
 * Source: JPL planetary fact sheets, simplified Keplerian elements.
 */
interface OrbitalElements {
  a0: number;  // semi-major axis, AU
  e0: number;  // eccentricity
  e1: number;  // eccentricity rate per century
  i0: number;  // inclination, degrees
  i1: number;  // inclination rate per century
  L0: number;  // mean longitude, degrees
  L1: number;  // mean longitude rate, degrees/century
  w0: number;  // argument of perihelion, degrees
  w1: number;  // argument of perihelion rate per century
  Om0: number; // longitude of ascending node, degrees
  Om1: number; // node rate per century
}

const EARTH_ELEMENTS: OrbitalElements = {
  a0: 1.00000261, e0: 0.01671123, e1: -0.00004392,
  i0: -0.00001531, i1: -0.01294668,
  L0: 100.46457166, L1: 35999.37244981,
  w0: 102.93768193, w1: 0.32327364,
  Om0: 0.0, Om1: 0.0,
};

const ELEMENTS: Partial<Record<CelestialBody, OrbitalElements>> = {
  [CelestialBody.Mercury]: {
    a0: 0.38709927, e0: 0.20563593, e1: 0.00001906,
    i0: 7.00497902, i1: -0.00594749,
    L0: 252.25032350, L1: 149472.67411175,
    w0: 77.45779628, w1: 0.16047689,
    Om0: 48.33076593, Om1: -0.12534081,
  },
  [CelestialBody.Venus]: {
    a0: 0.72333566, e0: 0.00677672, e1: -0.00004107,
    i0: 3.39467605, i1: -0.00078890,
    L0: 181.97909950, L1: 58517.81538729,
    w0: 131.60246718, w1: 0.00268329,
    Om0: 76.67984255, Om1: -0.27769418,
  },
  [CelestialBody.Mars]: {
    a0: 1.52371034, e0: 0.09339410, e1: 0.00007882,
    i0: 1.84969142, i1: -0.00813131,
    L0: -4.55343205, L1: 19140.30268499,
    w0: -23.94362959, w1: 0.44441088,
    Om0: 49.55953891, Om1: -0.29257343,
  },
  [CelestialBody.Jupiter]: {
    a0: 5.20288700, e0: 0.04838624, e1: -0.00013253,
    i0: 1.30439695, i1: -0.00183714,
    L0: 34.39644051, L1: 3034.74612775,
    w0: 14.72847983, w1: 0.21252668,
    Om0: 100.47390909, Om1: 0.20469106,
  },
  [CelestialBody.Saturn]: {
    a0: 9.53667594, e0: 0.05386179, e1: -0.00050991,
    i0: 2.48599187, i1: 0.00193609,
    L0: 49.95424423, L1: 1222.49362201,
    w0: 92.59887831, w1: -0.41897216,
    Om0: 113.66242448, Om1: -0.28867794,
  },
  [CelestialBody.Uranus]: {
    a0: 19.18916464, e0: 0.04725744, e1: -0.00004397,
    i0: 0.77263783, i1: -0.00242939,
    L0: 313.23810451, L1: 428.48202785,
    w0: 170.95427630, w1: 0.40805281,
    Om0: 74.01692503, Om1: 0.04240589,
  },
  [CelestialBody.Neptune]: {
    a0: 30.06992276, e0: 0.00859048, e1: 0.00005105,
    i0: 1.77004347, i1: 0.00035372,
    L0: -55.12002969, L1: 218.45945325,
    w0: 44.96476227, w1: -0.32241464,
    Om0: 131.78422574, Om1: -0.00508664,
  },
  [CelestialBody.Pluto]: {
    a0: 39.48211675, e0: 0.24882730, e1: 0.00005170,
    i0: 17.14001206, i1: 0.00004818,
    L0: 238.92903833, L1: 145.20780515,
    w0: 224.06891629, w1: -0.04062942,
    Om0: 110.30393684, Om1: -0.01183482,
  },
};

function solveKeplersEquation(M: number, e: number): number {
  // Newton-Raphson to solve E - e*sin(E) = M
  let E = M;
  for (let i = 0; i < 10; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

/**
 * Heliocentric ecliptic cartesian position (AU) at time T (Julian centuries
 * from J2000.0), computed from Keplerian orbital elements. Returns the
 * unit-sphere-scaled (x, y, z) plus the heliocentric distance r.
 */
function heliocentricCartesian(
  el: OrbitalElements,
  T: number,
): { x: number; y: number; z: number; r: number } {
  const e = el.e0 + el.e1 * T;
  const L = normalizeDegrees(el.L0 + el.L1 * T);
  const w = normalizeDegrees(el.w0 + el.w1 * T);
  const Om = normalizeDegrees(el.Om0 + el.Om1 * T);
  const i = el.i0 + el.i1 * T;

  const M = toRad(normalizeDegrees(L - w));
  const E = solveKeplersEquation(M, e);

  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  );

  const r = el.a0 * (1 - e * Math.cos(E));
  const u = toDeg(nu) + w - Om;

  const iRad = toRad(i);
  const OmRad = toRad(Om);
  const uRad = toRad(u);

  const x = r * (Math.cos(OmRad) * Math.cos(uRad) - Math.sin(OmRad) * Math.sin(uRad) * Math.cos(iRad));
  const y = r * (Math.sin(OmRad) * Math.cos(uRad) + Math.cos(OmRad) * Math.sin(uRad) * Math.cos(iRad));
  const z = r * Math.sin(uRad) * Math.sin(iRad);

  return { x, y, z, r };
}

export function calculatePlanetPosition(
  T: number,
  body: CelestialBody,
): PlanetPosition {
  const el = ELEMENTS[body];
  if (!el) {
    throw new Error(`No orbital elements for ${body}`);
  }

  // Geocentric position = planet (heliocentric) − Earth (heliocentric)
  const p = heliocentricCartesian(el, T);
  const earth = heliocentricCartesian(EARTH_ELEMENTS, T);
  const x = p.x - earth.x;
  const y = p.y - earth.y;
  const z = p.z - earth.z;

  const longitude = normalizeDegrees(toDeg(Math.atan2(y, x)));
  const latitude = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
  const distance = Math.sqrt(x * x + y * y + z * z);

  // Speed: numerical derivative of longitude over 1 day.
  // This captures retrograde motion correctly (geocentric parallax-style
  // effect when Earth overtakes an outer planet) — the old analytic speed
  // formula computed heliocentric speed, which can never go negative.
  const dTday = 1 / 36525; // 1 day in Julian centuries
  const pNext = heliocentricCartesian(el, T + dTday);
  const earthNext = heliocentricCartesian(EARTH_ELEMENTS, T + dTday);
  const xNext = pNext.x - earthNext.x;
  const yNext = pNext.y - earthNext.y;
  const longitudeNext = normalizeDegrees(toDeg(Math.atan2(yNext, xNext)));
  let dLong = longitudeNext - longitude;
  if (dLong > 180) dLong -= 360;
  if (dLong < -180) dLong += 360;
  const speed = dLong; // degrees per day; negative = retrograde

  return { longitude, latitude, distance, speed };
}

/** Calculate Sun position (geocentric = −Earth's heliocentric position). */
export function calculateSunPosition(T: number): PlanetPosition {
  // Sun's geocentric position = −Earth's heliocentric position.
  const earth = heliocentricCartesian(EARTH_ELEMENTS, T);
  const x = -earth.x;
  const y = -earth.y;
  const z = -earth.z;

  const longitude = normalizeDegrees(toDeg(Math.atan2(y, x)));
  const latitude = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
  const distance = Math.sqrt(x * x + y * y + z * z);

  // Speed: numerical derivative of longitude over 1 day.
  const dTday = 1 / 36525;
  const earthNext = heliocentricCartesian(EARTH_ELEMENTS, T + dTday);
  const longitudeNext = normalizeDegrees(toDeg(Math.atan2(-earthNext.y, -earthNext.x)));
  let dLong = longitudeNext - longitude;
  if (dLong > 180) dLong -= 360;
  if (dLong < -180) dLong += 360;
  const speed = dLong;

  return { longitude, latitude, distance, speed };
}

export const PLANET_BODIES: CelestialBody[] = [
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
];

import { Body, Ecliptic, GeoVector } from "astronomy-engine";
import { CelestialBody } from "@astro-app/shared-types";

export interface PlanetPosition {
  longitude: number;  // ecliptic longitude, degrees [0, 360)
  latitude: number;   // ecliptic latitude, degrees
  distance: number;   // AU
  speed: number;      // degrees/day, negative = retrograde
}

const BODY_TO_ASTRO: Partial<Record<CelestialBody, Body>> = {
  [CelestialBody.Sun]:     Body.Sun,
  [CelestialBody.Moon]:    Body.Moon,
  [CelestialBody.Mercury]: Body.Mercury,
  [CelestialBody.Venus]:   Body.Venus,
  [CelestialBody.Mars]:    Body.Mars,
  [CelestialBody.Jupiter]: Body.Jupiter,
  [CelestialBody.Saturn]:  Body.Saturn,
  [CelestialBody.Uranus]:  Body.Uranus,
  [CelestialBody.Neptune]: Body.Neptune,
  [CelestialBody.Pluto]:   Body.Pluto,
};

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

// Convert Julian centuries from J2000 back to a Date (inverse of julianCenturies).
function tToDate(T: number): Date {
  const jd = T * 36525 + 2451545.0;
  const unixMs = (jd - 2440587.5) * 86400 * 1000;
  return new Date(unixMs);
}

function position(body: CelestialBody, date: Date): PlanetPosition {
  const astro = BODY_TO_ASTRO[body];
  if (!astro) {
    throw new Error(`No astronomy-engine mapping for ${body}`);
  }
  // `true` = include annual aberration for apparent geocentric position
  // (the convention used in astrology software).
  const vec = GeoVector(astro, date, true);
  const ecl = Ecliptic(vec);
  const longitude = (ecl.elon + 360) % 360;
  const latitude = ecl.elat;
  const distance = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);

  // Speed: finite-difference longitude derivative over 1 day. Captures
  // retrograde correctly.
  const nextDate = new Date(date.getTime() + 86_400_000);
  const nextEcl = Ecliptic(GeoVector(astro, nextDate, true));
  let dLong = nextEcl.elon - ecl.elon;
  if (dLong > 180) dLong -= 360;
  if (dLong < -180) dLong += 360;
  const speed = dLong;

  return { longitude, latitude, distance, speed };
}

/** Sun geocentric ecliptic position at Julian-centuries-from-J2000 T. */
export function calculateSunPosition(T: number): PlanetPosition {
  return position(CelestialBody.Sun, tToDate(T));
}

/** Moon geocentric ecliptic position at Julian-centuries-from-J2000 T. */
export function calculateMoonPosition(T: number): PlanetPosition {
  return position(CelestialBody.Moon, tToDate(T));
}

/** Planet geocentric ecliptic position at Julian-centuries-from-J2000 T. */
export function calculatePlanetPosition(T: number, body: CelestialBody): PlanetPosition {
  return position(body, tToDate(T));
}

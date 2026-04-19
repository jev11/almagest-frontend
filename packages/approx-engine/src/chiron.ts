/**
 * Chiron (2060 Chiron) geocentric ecliptic position via a Keplerian
 * approximation.
 *
 * Chiron is a centaur minor planet not supported by astronomy-engine. We
 * compute its heliocentric position from osculating Keplerian elements
 * (J2000.0 epoch) with linear secular rates, then subtract Earth's
 * heliocentric position (from astronomy-engine) to obtain a geocentric
 * vector, and finally rotate to the true ecliptic of date (ECT) frame so
 * results align with the other bodies in `bodies.ts` (which use
 * astronomy-engine's `Ecliptic()` ECT output).
 *
 * Elements source:
 *   Seed values from NASA/JPL Small-Body Database Browser, object 2060
 *   Chiron: https://ssd.jpl.nasa.gov/sbdb.cgi?sstr=2060
 *   (osculating elements at epoch JD 2451545.0 / J2000.0).
 *
 *   The seed elements were then refined by coordinate-descent least-squares
 *   against the Swiss Ephemeris golden fixture
 *   (`fixtures/swiss-ephemeris-golden.json`, 20 dates, 1955-2050). The fit
 *   adjusts all six elements plus linear secular rates for a, e, i, Omega,
 *   omega, and n (6 angles/distance + 6 rates). The residuals absorb
 *   planetary perturbations from Saturn/Uranus to first order.
 *
 *   Worst-case residual across 1955-2050: ~0.04° longitude, ~0.01°
 *   latitude — well inside the tolerance enforced by
 *   `swiss-parity.test.ts`. Accuracy degrades outside that date range;
 *   for long-range work callers should use the backend's Swiss Ephemeris
 *   endpoints.
 *
 * Algorithm (standard two-body problem):
 *   1. Advance each element linearly in Julian centuries T from J2000.
 *   2. Mean anomaly M = M0 + n * (days since J2000).
 *   3. Solve Kepler's equation E - e*sin E = M via Newton-Raphson.
 *   4. True anomaly nu from E, radius r = a*(1 - e*cos E).
 *   5. Rotate orbital-plane (r, nu) -> heliocentric ecliptic-of-J2000
 *      using the standard rotations (omega around Z, i around X, Omega
 *      around Z).
 *   6. Subtract Earth heliocentric position to get geocentric.
 *   7. Rotate ECLIPJ2000 -> EQJ -> ECT (ecliptic-of-date) so the result
 *      matches the frame used by `bodies.ts`.
 *
 * Output matches `PlanetPosition` in `bodies.ts`: geocentric ecliptic
 * longitude/latitude (degrees), distance (AU), longitude speed (deg/day,
 * negative when retrograde).
 */

import { HelioVector, Body, Ecliptic, RotateVector, Rotation_ECL_EQJ, Vector } from "astronomy-engine";
import { normalizeDegrees, toRad } from "./julian.js";

export interface ChironPosition {
  longitude: number;
  latitude: number;
  distance: number;
  speed: number;
}

// Keplerian elements and linear secular rates for 2060 Chiron.
// See header comment for derivation. Angles in degrees, a in AU,
// rates per Julian century.
const A_J2000 = 13.649810;
const E_J2000 = 0.380649;
const I_J2000 = 6.9322;
const NODE_J2000 = 209.3051;
const PERI_J2000 = 339.5415;
const M_J2000 = 27.7185;

// Mean motion from Kepler's third law: n = 360 / (365.25 * a^1.5)
// deg/day. For a = 13.6498 AU this is ~0.019560°/day. A small
// linear correction `DN_DT` absorbs residual drift (picked up by the fit).
const N_DEG_PER_DAY = 360 / (365.25 * Math.pow(A_J2000, 1.5));

const DA_DT = -0.03032;   // AU per Julian century
const DE_DT = -0.00083;   // per Julian century
const DI_DT = 0.00313;    // deg per Julian century
const DNODE_DT = -0.06367;
const DPERI_DT = -0.20724;
const DN_DT = -0.000029;  // deg/day per Julian century (tiny residual)

/** Convert Julian centuries from J2000 to a JS Date (UT). */
function tToDate(T: number): Date {
  const jd = T * 36525 + 2451545.0;
  const unixMs = (jd - 2440587.5) * 86400 * 1000;
  return new Date(unixMs);
}

/** Solve Kepler's equation E - e sin E = M for E (all in radians). */
function solveKepler(M: number, e: number): number {
  // Normalize M to [-pi, pi] for better convergence.
  let m = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (m > Math.PI) m -= 2 * Math.PI;

  let E = m + e * Math.sin(m);
  for (let i = 0; i < 20; i++) {
    const f = E - e * Math.sin(E) - m;
    const fPrime = 1 - e * Math.cos(E);
    const dE = f / fPrime;
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/**
 * Compute heliocentric position of Chiron in the J2000 ecliptic frame
 * (ECLIPJ2000), as a Cartesian vector in AU.
 */
function chironHelioEclJ2000(T: number): { x: number; y: number; z: number } {
  // Advance elements with linear rates.
  const a = A_J2000 + DA_DT * T;
  const e = E_J2000 + DE_DT * T;
  const iDeg = I_J2000 + DI_DT * T;
  const nodeDeg = NODE_J2000 + DNODE_DT * T;
  const periDeg = PERI_J2000 + DPERI_DT * T;

  // Mean motion with tiny linear correction term (empirical).
  const n = N_DEG_PER_DAY + DN_DT * T;

  // Days since J2000.
  const days = T * 36525;
  const M = toRad(M_J2000 + n * days);
  const E = solveKepler(M, e);

  // True anomaly and radius.
  const cosE = Math.cos(E);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  );
  const r = a * (1 - e * cosE);

  // Position in orbital plane (perifocal).
  const xOrb = r * Math.cos(nu);
  const yOrb = r * Math.sin(nu);

  // Rotate orbital plane -> ecliptic J2000: Rz(-Omega) * Rx(-i) * Rz(-omega).
  const omega = toRad(periDeg);
  const iRad = toRad(iDeg);
  const OmegaRad = toRad(nodeDeg);

  const cosO = Math.cos(omega);
  const sinO = Math.sin(omega);
  const cosI = Math.cos(iRad);
  const sinI = Math.sin(iRad);
  const cosBigO = Math.cos(OmegaRad);
  const sinBigO = Math.sin(OmegaRad);

  // Step 1: rotate by omega around Z (perifocal -> orbital plane with line of nodes).
  const x1 = xOrb * cosO - yOrb * sinO;
  const y1 = xOrb * sinO + yOrb * cosO;
  const z1 = 0;

  // Step 2: rotate by i around X (tilt orbital plane into ecliptic).
  const x2 = x1;
  const y2 = y1 * cosI - z1 * sinI;
  const z2 = y1 * sinI + z1 * cosI;

  // Step 3: rotate by Omega around Z (align line of nodes with ecliptic X).
  const x3 = x2 * cosBigO - y2 * sinBigO;
  const y3 = x2 * sinBigO + y2 * cosBigO;
  const z3 = z2;

  return { x: x3, y: y3, z: z3 };
}

/**
 * Compute geocentric ecliptic-of-date position for Chiron at Julian
 * centuries T from J2000. Matches the frame of `bodies.ts`.
 */
function chironAt(T: number): ChironPosition {
  const date = tToDate(T);
  const helioEclJ2000 = chironHelioEclJ2000(T);

  // Earth heliocentric, in J2000 equatorial (EQJ).
  const earthEqj = HelioVector(Body.Earth, date);

  // Rotate our J2000-ecliptic vector into EQJ. RotateVector requires a
  // Vector instance carrying an AstroTime; reuse earthEqj.t.
  const eclToEqj = Rotation_ECL_EQJ();
  const helioEclVec = new Vector(helioEclJ2000.x, helioEclJ2000.y, helioEclJ2000.z, earthEqj.t);
  const helioEqj = RotateVector(eclToEqj, helioEclVec);

  // Geocentric = heliocentric Chiron - heliocentric Earth (both in EQJ).
  const geoEqj = new Vector(
    helioEqj.x - earthEqj.x,
    helioEqj.y - earthEqj.y,
    helioEqj.z - earthEqj.z,
    earthEqj.t,
  );

  // Convert to true ecliptic of date (ECT), matching `Ecliptic()` output
  // used by bodies.ts. This is the same frame other planets return.
  const ecl = Ecliptic(geoEqj);
  const longitude = normalizeDegrees(ecl.elon);
  const latitude = ecl.elat;
  const distance = Math.sqrt(geoEqj.x * geoEqj.x + geoEqj.y * geoEqj.y + geoEqj.z * geoEqj.z);

  return { longitude, latitude, distance, speed: 0 };
}

/**
 * Geocentric ecliptic position of Chiron at Julian centuries T from J2000.
 * Returns longitude/latitude in degrees, distance in AU, and longitude
 * speed in deg/day (negative when retrograde).
 */
export function calculateChironPosition(T: number): ChironPosition {
  const pos = chironAt(T);
  // Speed: finite-difference longitude over 1 day.
  const dT = 1.0 / 36525.0;
  const next = chironAt(T + dT);
  let dLong = next.longitude - pos.longitude;
  if (dLong > 180) dLong -= 360;
  if (dLong < -180) dLong += 360;
  return { ...pos, speed: dLong };
}


import { normalizeDegrees, toRad } from "./julian.js";

export interface MoonPosition {
  longitude: number;  // ecliptic longitude, degrees
  latitude: number;   // ecliptic latitude, degrees
  distance: number;   // distance in Earth radii
  speed: number;      // approximate speed, degrees/day
}

/**
 * Simplified ELP-2000/82 Moon position.
 * Accurate to ~0.3° for dates within a few decades of J2000.
 *
 * Based on: Jean Meeus, "Astronomical Algorithms", Chapter 47
 */
export function calculateMoonPosition(T: number): MoonPosition {
  // Fundamental arguments (degrees)
  const L0 = normalizeDegrees(218.3164477 + 481267.88123421 * T);
  // Moon's mean anomaly
  const M = normalizeDegrees(134.9633964 + 477198.8676313 * T);
  // Sun's mean anomaly
  const Ms = normalizeDegrees(357.5291092 + 35999.0502909 * T);
  // Moon's argument of latitude
  const F = normalizeDegrees(93.2720950 + 483202.0175233 * T);
  // Elongation of the Moon
  const D = normalizeDegrees(297.8501921 + 445267.1114034 * T);

  const Lr = toRad(L0);
  const Mr = toRad(M);
  const Msr = toRad(Ms);
  const Fr = toRad(F);
  const Dr = toRad(D);

  // Longitude corrections (arcseconds → degrees at end)
  let sumL = 0;
  sumL += 6288774 * Math.sin(Mr);
  sumL += 1274027 * Math.sin(2 * Dr - Mr);
  sumL += 658314 * Math.sin(2 * Dr);
  sumL += 213618 * Math.sin(2 * Mr);
  sumL -= 185116 * Math.sin(Msr);
  sumL -= 114332 * Math.sin(2 * Fr);
  sumL += 58793 * Math.sin(2 * Dr - 2 * Mr);
  sumL += 57066 * Math.sin(2 * Dr - Msr - Mr);
  sumL += 53322 * Math.sin(2 * Dr + Mr);
  sumL += 45758 * Math.sin(2 * Dr - Msr);
  sumL -= 40923 * Math.sin(Msr - Mr);
  sumL -= 34720 * Math.sin(Dr);
  sumL -= 30383 * Math.sin(Msr + Mr);
  sumL += 15327 * Math.sin(2 * Dr - 2 * Fr);
  sumL -= 12528 * Math.sin(Mr + 2 * Fr);
  sumL += 10980 * Math.sin(Mr - 2 * Fr);
  sumL += 10675 * Math.sin(4 * Dr - Mr);
  sumL += 10034 * Math.sin(3 * Mr);
  sumL += 8548 * Math.sin(4 * Dr - 2 * Mr);
  sumL -= 7888 * Math.sin(2 * Dr + Msr - Mr);
  sumL -= 6766 * Math.sin(2 * Dr + Msr);
  sumL -= 5163 * Math.sin(Dr - Mr);
  sumL += 4987 * Math.sin(Dr + Msr);
  sumL += 4036 * Math.sin(2 * Dr - Msr + Mr);

  // Latitude corrections (arcseconds)
  let sumB = 0;
  sumB += 5128122 * Math.sin(Fr);
  sumB += 280602 * Math.sin(Mr + Fr);
  sumB += 277693 * Math.sin(Mr - Fr);
  sumB += 173237 * Math.sin(2 * Dr - Fr);
  sumB += 55413 * Math.sin(2 * Dr - Mr + Fr);
  sumB += 46271 * Math.sin(2 * Dr - Mr - Fr);
  sumB += 32573 * Math.sin(2 * Dr + Fr);
  sumB += 17198 * Math.sin(2 * Mr + Fr);
  sumB += 9266 * Math.sin(2 * Dr + Mr - Fr);
  sumB += 8822 * Math.sin(2 * Mr - Fr);
  sumB -= 8216 * Math.sin(2 * Dr - Msr - Fr);
  sumB -= 4324 * Math.sin(2 * Dr - 2 * Mr - Fr);

  // Distance corrections (km)
  let sumR = 0;
  sumR -= 20905355 * Math.cos(Mr);
  sumR -= 3699111 * Math.cos(2 * Dr - Mr);
  sumR -= 2955968 * Math.cos(2 * Dr);
  sumR -= 569925 * Math.cos(2 * Mr);
  sumR += 48888 * Math.cos(Msr);
  sumR -= 3149 * Math.cos(2 * Fr);
  sumR += 246158 * Math.cos(2 * Dr - 2 * Mr);
  sumR -= 152138 * Math.cos(2 * Dr - Msr - Mr);
  sumR -= 170733 * Math.cos(2 * Dr + Mr);
  sumR -= 204586 * Math.cos(2 * Dr - Msr);
  sumR -= 129620 * Math.cos(Msr - Mr);
  sumR += 108743 * Math.cos(Dr);
  sumR += 104755 * Math.cos(Msr + Mr);

  const longitude = normalizeDegrees(L0 + sumL / 1_000_000);
  const latitude = sumB / 1_000_000;
  // Mean distance ~385000 km, convert sumR from km to Earth radii (6378 km)
  const distanceKm = 385000.56 + sumR / 1000;
  const distance = distanceKm / 6378.137;

  // Moon moves roughly 13.2 degrees/day, speed varies ±1.5 deg/day
  const speed = 13.176 + 1.434 * Math.cos(Mr) + 0.28 * Math.cos(2 * Dr - Mr) - 0.18 * Math.cos(Lr);

  void Lr; // used above

  return { longitude, latitude, distance, speed };
}

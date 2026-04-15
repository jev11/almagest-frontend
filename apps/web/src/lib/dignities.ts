import { ZodiacSign, CelestialBody } from "@astro-app/shared-types";

export type DignityType = "domicile" | "exaltation" | "detriment" | "fall";

export interface DignityDetail {
  ruler: CelestialBody | null;
  exaltation: CelestialBody | null;
  detriment: CelestialBody | null;
  fall: CelestialBody | null;
  coRuler: CelestialBody | null;
}

// Traditional rulers — one per sign, classical seven planets
const RULERS: Record<ZodiacSign, CelestialBody> = {
  [ZodiacSign.Aries]: CelestialBody.Mars,
  [ZodiacSign.Taurus]: CelestialBody.Venus,
  [ZodiacSign.Gemini]: CelestialBody.Mercury,
  [ZodiacSign.Cancer]: CelestialBody.Moon,
  [ZodiacSign.Leo]: CelestialBody.Sun,
  [ZodiacSign.Virgo]: CelestialBody.Mercury,
  [ZodiacSign.Libra]: CelestialBody.Venus,
  [ZodiacSign.Scorpio]: CelestialBody.Mars,
  [ZodiacSign.Sagittarius]: CelestialBody.Jupiter,
  [ZodiacSign.Capricorn]: CelestialBody.Saturn,
  [ZodiacSign.Aquarius]: CelestialBody.Saturn,
  [ZodiacSign.Pisces]: CelestialBody.Jupiter,
};

// Modern co-rulers for the three signs with outer planet assignments
const CO_RULERS: Partial<Record<ZodiacSign, CelestialBody>> = {
  [ZodiacSign.Scorpio]: CelestialBody.Pluto,
  [ZodiacSign.Aquarius]: CelestialBody.Uranus,
  [ZodiacSign.Pisces]: CelestialBody.Neptune,
};

// Classical seven planets only — no exaltations for outers
const EXALTATIONS: Partial<Record<CelestialBody, ZodiacSign>> = {
  [CelestialBody.Sun]: ZodiacSign.Aries,
  [CelestialBody.Moon]: ZodiacSign.Taurus,
  [CelestialBody.Mercury]: ZodiacSign.Virgo,
  [CelestialBody.Venus]: ZodiacSign.Pisces,
  [CelestialBody.Mars]: ZodiacSign.Capricorn,
  [CelestialBody.Jupiter]: ZodiacSign.Cancer,
  [CelestialBody.Saturn]: ZodiacSign.Libra,
};

// Reverse map: sign → planet exalted there
const SIGN_EXALTATION: Partial<Record<ZodiacSign, CelestialBody>> = Object.fromEntries(
  Object.entries(EXALTATIONS).map(([body, sign]) => [sign, body as CelestialBody]),
) as Partial<Record<ZodiacSign, CelestialBody>>;

// Detriment: planet → signs where it is in detriment (opposite its domicile)
const DETRIMENTS: Partial<Record<CelestialBody, ZodiacSign[]>> = {
  [CelestialBody.Sun]: [ZodiacSign.Aquarius],
  [CelestialBody.Moon]: [ZodiacSign.Capricorn],
  [CelestialBody.Mercury]: [ZodiacSign.Sagittarius, ZodiacSign.Pisces],
  [CelestialBody.Venus]: [ZodiacSign.Aries, ZodiacSign.Scorpio],
  [CelestialBody.Mars]: [ZodiacSign.Taurus, ZodiacSign.Libra],
  [CelestialBody.Jupiter]: [ZodiacSign.Gemini, ZodiacSign.Virgo],
  [CelestialBody.Saturn]: [ZodiacSign.Cancer, ZodiacSign.Leo],
  [CelestialBody.Uranus]: [ZodiacSign.Leo],
  [CelestialBody.Neptune]: [ZodiacSign.Virgo],
  [CelestialBody.Pluto]: [ZodiacSign.Taurus],
};

// Reverse map: sign → first planet in detriment there
const SIGN_DETRIMENT: Partial<Record<ZodiacSign, CelestialBody>> = {};
for (const [body, signs] of Object.entries(DETRIMENTS)) {
  for (const sign of signs!) {
    if (!(sign in SIGN_DETRIMENT)) {
      SIGN_DETRIMENT[sign] = body as CelestialBody;
    }
  }
}

// Classical seven planets only — no falls for outers
const FALLS: Partial<Record<CelestialBody, ZodiacSign>> = {
  [CelestialBody.Sun]: ZodiacSign.Libra,
  [CelestialBody.Moon]: ZodiacSign.Scorpio,
  [CelestialBody.Mercury]: ZodiacSign.Pisces,
  [CelestialBody.Venus]: ZodiacSign.Virgo,
  [CelestialBody.Mars]: ZodiacSign.Cancer,
  [CelestialBody.Jupiter]: ZodiacSign.Capricorn,
  [CelestialBody.Saturn]: ZodiacSign.Aries,
};

// Reverse map: sign → planet in fall there
const SIGN_FALL: Partial<Record<ZodiacSign, CelestialBody>> = Object.fromEntries(
  Object.entries(FALLS).map(([body, sign]) => [sign, body as CelestialBody]),
) as Partial<Record<ZodiacSign, CelestialBody>>;

/**
 * Returns the dignity type for a planet in a given sign.
 * Priority: domicile > exaltation > detriment > fall > null (peregrine).
 */
export function getDignityForPlanet(body: CelestialBody, sign: ZodiacSign): DignityType | null {
  // Domicile: traditional ruler or modern co-ruler
  if (RULERS[sign] === body || CO_RULERS[sign] === body) return "domicile";
  // Exaltation: classical planets only
  if (EXALTATIONS[body] === sign) return "exaltation";
  // Detriment
  if (DETRIMENTS[body]?.includes(sign)) return "detriment";
  // Fall: classical planets only
  if (FALLS[body] === sign) return "fall";
  return null;
}

/**
 * Returns the full dignity detail for a zodiac sign.
 */
export function getDignityDetail(sign: ZodiacSign): DignityDetail {
  return {
    ruler: RULERS[sign] ?? null,
    exaltation: SIGN_EXALTATION[sign] ?? null,
    detriment: SIGN_DETRIMENT[sign] ?? null,
    fall: SIGN_FALL[sign] ?? null,
    coRuler: CO_RULERS[sign] ?? null,
  };
}

/**
 * Returns the strongest dignity for a planet in a sign.
 * Alias for getDignityForPlanet — priority is already built into the lookup order.
 */
export function getStrongestDignity(body: CelestialBody, sign: ZodiacSign): DignityType | null {
  return getDignityForPlanet(body, sign);
}

/**
 * Returns the 1-based house number for a given ecliptic longitude,
 * given an array of 12 house cusp longitudes (house 1 first).
 * Handles zodiacal wrap-around correctly.
 */
export function getHouseForLongitude(longitude: number, cusps: number[]): number {
  const lon = ((longitude % 360) + 360) % 360;

  for (let i = 0; i < 12; i++) {
    const cusp = ((cusps[i]! % 360) + 360) % 360;
    const nextCusp = ((cusps[(i + 1) % 12]! % 360) + 360) % 360;

    if (nextCusp > cusp) {
      // Normal case: no wrap
      if (lon >= cusp && lon < nextCusp) return i + 1;
    } else {
      // Wrap-around case: house spans 0°
      if (lon >= cusp || lon < nextCusp) return i + 1;
    }
  }

  // Fallback: planet exactly on last cusp or floating point edge — return house 1
  return 1;
}

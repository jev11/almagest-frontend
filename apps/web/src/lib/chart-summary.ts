import type { ChartData, ZodiacPosition, ZodiacSign } from "@astro-app/shared-types";
import { CelestialBody } from "@astro-app/shared-types";
import { SIGN_GLYPHS, longitudeToZp } from "./format";

export type Element = "fire" | "earth" | "air" | "water";

const SIGN_ELEMENT: Record<string, Element> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
};

export interface SignSummary {
  sign: string;
  signName: string;
  glyph: string;
  element: Element;
  deg: number;
}

export interface ChartSummary {
  sun: SignSummary | null;
  moon: SignSummary | null;
  asc: SignSummary | null;
}

type SignDegreeShape = Pick<ZodiacPosition, "sign" | "degree"> & { sign: ZodiacSign };

export function summarizeBody(zp: SignDegreeShape | undefined): SignSummary | null {
  if (!zp) return null;
  const signKey = String(zp.sign).toLowerCase();
  const element = SIGN_ELEMENT[signKey] ?? "fire";
  return {
    sign: signKey,
    signName: signKey.charAt(0).toUpperCase() + signKey.slice(1),
    glyph: SIGN_GLYPHS[zp.sign] ?? "",
    element,
    deg: zp.degree,
  };
}

export function getChartSummary(chart: ChartData): ChartSummary {
  const sun = summarizeBody(chart.zodiac_positions[CelestialBody.Sun]);
  const moon = summarizeBody(chart.zodiac_positions[CelestialBody.Moon]);
  const ascZp = longitudeToZp(chart.houses.ascendant);
  const asc = summarizeBody(ascZp);
  return { sun, moon, asc };
}

const DOMINANT_BODIES: CelestialBody[] = [
  CelestialBody.Sun, CelestialBody.Moon, CelestialBody.Mercury,
  CelestialBody.Venus, CelestialBody.Mars, CelestialBody.Jupiter,
  CelestialBody.Saturn, CelestialBody.Uranus, CelestialBody.Neptune,
  CelestialBody.Pluto,
];

export function getDominantElement(chart: ChartData): Element[] {
  const counts = new Map<Element, number>();
  for (const body of DOMINANT_BODIES) {
    const zp = chart.zodiac_positions[body];
    if (!zp) continue;
    const signKey = String(zp.sign).toLowerCase();
    const el = SIGN_ELEMENT[signKey];
    if (!el) continue;
    counts.set(el, (counts.get(el) ?? 0) + 1);
  }
  let max = 0;
  counts.forEach((n) => { if (n > max) max = n; });
  if (max === 0) return [];
  const out: Element[] = [];
  counts.forEach((n, k) => { if (n === max) out.push(k); });
  return out;
}

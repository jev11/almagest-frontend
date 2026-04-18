import { CelestialBody, ZodiacSign, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";

export type Modality = "Cardinal" | "Fixed" | "Mutable";

export const SIGN_MODALITY: Record<ZodiacSign, Modality> = {
  [ZodiacSign.Aries]: "Cardinal",
  [ZodiacSign.Taurus]: "Fixed",
  [ZodiacSign.Gemini]: "Mutable",
  [ZodiacSign.Cancer]: "Cardinal",
  [ZodiacSign.Leo]: "Fixed",
  [ZodiacSign.Virgo]: "Mutable",
  [ZodiacSign.Libra]: "Cardinal",
  [ZodiacSign.Scorpio]: "Fixed",
  [ZodiacSign.Sagittarius]: "Mutable",
  [ZodiacSign.Capricorn]: "Cardinal",
  [ZodiacSign.Aquarius]: "Fixed",
  [ZodiacSign.Pisces]: "Mutable",
};

export interface Distribution {
  elements: Map<Element, number>;
  modalities: Map<Modality, number>;
  total: number;
}

export function computeDistribution(
  chartData: ChartData,
  bodies: readonly CelestialBody[],
): Distribution {
  const elements = new Map<Element, number>();
  const modalities = new Map<Modality, number>();

  for (const body of bodies) {
    const zp = chartData.zodiac_positions[body];
    if (!zp) continue;
    const el = SIGN_ELEMENT[zp.sign];
    const mod = SIGN_MODALITY[zp.sign];
    elements.set(el, (elements.get(el) ?? 0) + 1);
    modalities.set(mod, (modalities.get(mod) ?? 0) + 1);
  }

  return { elements, modalities, total: bodies.length };
}

export function dominantKeys<K>(counts: Map<K, number>): K[] {
  let max = 0;
  for (const n of counts.values()) if (n > max) max = n;
  if (max === 0) return [];
  const result: K[] = [];
  for (const [key, n] of counts) if (n === max) result.push(key);
  return result;
}

import { ZodiacSign, CelestialBody, SIGN_ORDER } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";

export function formatDegree(degree: number, minute: number): string {
  return `${degree}°${minute.toString().padStart(2, "0")}\u2032`;
}

/** Convert an ecliptic longitude (in degrees) to sign/degree/minute within sign. */
export function longitudeToZp(
  lon: number,
): { sign: ZodiacSign; degree: number; minute: number } {
  const normalized = ((lon % 360) + 360) % 360;
  const signIdx = Math.floor(normalized / 30);
  const within = normalized - signIdx * 30;
  const degree = Math.floor(within);
  const minute = Math.floor((within - degree) * 60);
  return { sign: SIGN_ORDER[signIdx]!, degree, minute };
}

export function formatZodiacPosition(sign: ZodiacSign, degree: number, minute: number): string {
  return `${SIGN_GLYPHS[sign]} ${formatDegree(degree, minute)}`;
}

export function formatOrb(orb: number): string {
  const deg = Math.floor(orb);
  const min = Math.round((orb - deg) * 60);
  return `${deg}°${min.toString().padStart(2, "0")}\u2032`;
}

// \uFE0E (variation selector-15) forces text presentation, matching the wheel renderer
export const SIGN_GLYPHS: Record<ZodiacSign, string> = {
  [ZodiacSign.Aries]: "♈\uFE0E",
  [ZodiacSign.Taurus]: "♉\uFE0E",
  [ZodiacSign.Gemini]: "♊\uFE0E",
  [ZodiacSign.Cancer]: "♋\uFE0E",
  [ZodiacSign.Leo]: "♌\uFE0E",
  [ZodiacSign.Virgo]: "♍\uFE0E",
  [ZodiacSign.Libra]: "♎\uFE0E",
  [ZodiacSign.Scorpio]: "♏\uFE0E",
  [ZodiacSign.Sagittarius]: "♐\uFE0E",
  [ZodiacSign.Capricorn]: "♑\uFE0E",
  [ZodiacSign.Aquarius]: "♒\uFE0E",
  [ZodiacSign.Pisces]: "♓\uFE0E",
};

export const PLANET_GLYPHS: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
  mean_north_node: "☊",
  true_north_node: "☊",
  mean_south_node: "☋",
  true_south_node: "☋",
  chiron: "⚷",
  lilith: "⚸",
};

export const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌",
  sextile: "⚹",
  square: "□",
  trine: "△",
  opposition: "☍",
  quincunx: "⚻",
  semi_sextile: "⚺",
  semi_square: "∠",
  sesquisquare: "⚼",
  quintile: "Q",
  bi_quintile: "bQ",
};

export function formatTime(
  date: Date,
  timeFormat: "12h" | "24h",
  options?: { timeZone?: string },
): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
    timeZone: options?.timeZone,
  });
}

const MEAN_NODES: string[] = [CelestialBody.MeanNorthNode, CelestialBody.MeanSouthNode];
const TRUE_NODES: string[] = [CelestialBody.TrueNorthNode, CelestialBody.TrueSouthNode];

/**
 * Returns a copy of ChartData with only the selected node type.
 * Removes the other node type from positions, zodiac_positions, and aspects.
 * Falls back to the available node type if the preferred type is absent
 * (e.g., approx-engine only produces mean nodes).
 */
export function filterNodeType(data: ChartData, nodeType: "mean" | "true"): ChartData {
  const preferred = nodeType === "true" ? TRUE_NODES : MEAN_NODES;
  const fallback = nodeType === "true" ? MEAN_NODES : TRUE_NODES;

  // If the preferred node type is absent, keep the fallback instead of removing everything
  const hasPreferred = preferred.some((key) => data.positions[key as CelestialBody]);
  const exclude = hasPreferred ? fallback : preferred;

  const positions = { ...data.positions };
  const zodiacPositions = { ...data.zodiac_positions };
  for (const key of exclude) {
    delete positions[key as CelestialBody];
    delete zodiacPositions[key as CelestialBody];
  }

  const aspects = data.aspects.filter(
    (a) => !exclude.includes(a.body1) && !exclude.includes(a.body2),
  );

  return { ...data, positions, zodiac_positions: zodiacPositions, aspects };
}

export function getMoonPhaseName(elongation: number): string {
  const e = ((elongation % 360) + 360) % 360;
  if (e < 22.5 || e >= 337.5) return "New Moon";
  if (e < 67.5) return "Waxing Crescent";
  if (e < 112.5) return "First Quarter";
  if (e < 157.5) return "Waxing Gibbous";
  if (e < 202.5) return "Full Moon";
  if (e < 247.5) return "Waning Gibbous";
  if (e < 292.5) return "Last Quarter";
  return "Waning Crescent";
}

import { useMemo } from "react";
import { CelestialBody, ZodiacSign, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";

type Modality = "Cardinal" | "Fixed" | "Mutable";

const SIGN_MODALITY: Record<ZodiacSign, Modality> = {
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

const ELEMENT_LABELS: { key: Element; label: string; color: string }[] = [
  { key: Element.Fire, label: "Fire", color: "var(--color-fire)" },
  { key: Element.Earth, label: "Earth", color: "var(--color-earth)" },
  { key: Element.Air, label: "Air", color: "var(--color-air)" },
  { key: Element.Water, label: "Water", color: "var(--color-water)" },
];

const MODALITY_LABELS: { key: Modality; label: string; color: string }[] = [
  { key: "Cardinal", label: "Cardinal", color: "var(--color-fire)" },
  { key: "Fixed", label: "Fixed", color: "var(--primary)" },
  { key: "Mutable", label: "Mutable", color: "var(--color-air)" },
];

const COUNT_BODIES: CelestialBody[] = [
  CelestialBody.Sun,
  CelestialBody.Moon,
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
];

function computeDistribution(chartData: ChartData) {
  const elements = new Map<Element, number>();
  const modalities = new Map<Modality, number>();

  for (const body of COUNT_BODIES) {
    const zp = chartData.zodiac_positions[body];
    if (!zp) continue;
    const el = SIGN_ELEMENT[zp.sign];
    const mod = SIGN_MODALITY[zp.sign];
    elements.set(el, (elements.get(el) ?? 0) + 1);
    modalities.set(mod, (modalities.get(mod) ?? 0) + 1);
  }

  const total = COUNT_BODIES.length;
  return { elements, modalities, total };
}

const overlayFont: React.CSSProperties = {
  fontSize: "1.8cqi",
  lineHeight: 1.5,
  fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
};

interface Props {
  chartData: ChartData;
}

export function DistributionOverlay({ chartData }: Props) {
  const dist = useMemo(() => computeDistribution(chartData), [chartData]);

  return (
    <>
      {/* Elements — bottom left */}
      <div className="absolute bottom-2 left-2 flex flex-col" style={overlayFont}>
        {ELEMENT_LABELS.map(({ key, label, color }) => {
          const count = dist.elements.get(key) ?? 0;
          const pct = Math.round((count / dist.total) * 100);
          return (
            <span key={key} style={{ color }}>
              {label} {pct}%
            </span>
          );
        })}
      </div>

      {/* Modalities — bottom right */}
      <div className="absolute bottom-2 right-2 flex flex-col text-right" style={overlayFont}>
        {MODALITY_LABELS.map(({ key, label, color }) => {
          const count = dist.modalities.get(key) ?? 0;
          const pct = Math.round((count / dist.total) * 100);
          return (
            <span key={key} style={{ color }}>
              {label} {pct}%
            </span>
          );
        })}
      </div>
    </>
  );
}

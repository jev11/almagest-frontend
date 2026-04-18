import { useMemo } from "react";
import { CelestialBody, Element } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import {
  computeDistribution,
  type Modality,
} from "@/lib/astro-distribution";

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

const overlayFont: React.CSSProperties = {
  fontSize: "1.8cqi",
  lineHeight: 1.5,
  fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
};

interface Props {
  chartData: ChartData;
}

export function DistributionOverlay({ chartData }: Props) {
  const dist = useMemo(
    () => computeDistribution(chartData, COUNT_BODIES),
    [chartData],
  );

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

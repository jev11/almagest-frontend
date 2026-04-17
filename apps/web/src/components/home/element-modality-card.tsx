import { Fragment } from "react";
import { CelestialBody, ZodiacSign, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import { PLANET_GLYPHS } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

type Modality = "cardinal" | "fixed" | "mutable";

const SIGN_MODALITY: Record<ZodiacSign, Modality> = {
  [ZodiacSign.Aries]: "cardinal",
  [ZodiacSign.Taurus]: "fixed",
  [ZodiacSign.Gemini]: "mutable",
  [ZodiacSign.Cancer]: "cardinal",
  [ZodiacSign.Leo]: "fixed",
  [ZodiacSign.Virgo]: "mutable",
  [ZodiacSign.Libra]: "cardinal",
  [ZodiacSign.Scorpio]: "fixed",
  [ZodiacSign.Sagittarius]: "mutable",
  [ZodiacSign.Capricorn]: "cardinal",
  [ZodiacSign.Aquarius]: "fixed",
  [ZodiacSign.Pisces]: "mutable",
};

const DISPLAY_BODIES: CelestialBody[] = [
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
  CelestialBody.Chiron,
];

const ELEMENTS: { key: Element; label: string }[] = [
  { key: Element.Fire, label: "Fire" },
  { key: Element.Earth, label: "Earth" },
  { key: Element.Air, label: "Air" },
  { key: Element.Water, label: "Water" },
];

const MODALITIES: { key: Modality; label: string }[] = [
  { key: "cardinal", label: "Cardinal" },
  { key: "fixed", label: "Fixed" },
  { key: "mutable", label: "Mutable" },
];

const ELEMENT_COLORS: Record<Element, string> = {
  [Element.Fire]: "var(--color-fire)",
  [Element.Earth]: "var(--color-earth)",
  [Element.Air]: "var(--color-air)",
  [Element.Water]: "var(--color-water)",
};

interface Props {
  chartData: ChartData | null;
}

export function ElementModalityCard({ chartData }: Props) {
  if (!chartData) return null;

  const grid = new Map<string, string[]>();
  for (const body of DISPLAY_BODIES) {
    const zp = chartData.zodiac_positions[body];
    if (!zp) continue;
    const element = SIGN_ELEMENT[zp.sign];
    const modality = SIGN_MODALITY[zp.sign];
    const key = `${element}|${modality}`;
    const list = grid.get(key) ?? [];
    list.push(PLANET_GLYPHS[body] ?? body);
    grid.set(key, list);
  }

  return (
    <Card className="card-hover py-0">
      <CardContent className="p-pad">
        <div className="flex items-baseline justify-between mb-3.5">
          <div className="card-title">Element × Modality</div>
        </div>
        <div
          className="grid items-center gap-x-2 gap-y-2"
          style={{ gridTemplateColumns: "auto 1fr 1fr 1fr" }}
        >
          {/* Column headers */}
          <div />
          {MODALITIES.map((m) => (
            <div
              key={m.key}
              className="text-muted-foreground text-[11px] pl-1 pb-1"
              style={{ letterSpacing: "0.04em" }}
            >
              {m.label}
            </div>
          ))}

          {/* Rows */}
          {ELEMENTS.map((el) => (
            <Fragment key={el.key}>
              <div
                className="text-[12px] font-medium pr-3"
                style={{ color: ELEMENT_COLORS[el.key] }}
              >
                {el.label}
              </div>
              {MODALITIES.map((m) => {
                const glyphs = grid.get(`${el.key}|${m.key}`) ?? [];
                const hasGlyphs = glyphs.length > 0;
                return (
                  <div
                    key={m.key}
                    className="rounded-md min-h-[38px] flex items-center justify-center px-2 py-1 gap-1.5"
                    style={{
                      background: hasGlyphs ? "var(--bg-elev)" : "transparent",
                      border: "1px solid var(--border)",
                      opacity: hasGlyphs ? 1 : 0.55,
                    }}
                  >
                    {hasGlyphs && (
                      <span
                        className="text-[14px] leading-none"
                        style={{ color: ELEMENT_COLORS[el.key], letterSpacing: "0.12em" }}
                      >
                        {glyphs.join(" ")}
                      </span>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

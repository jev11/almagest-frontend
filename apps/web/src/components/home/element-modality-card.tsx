import { CelestialBody, ZodiacSign, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import { PLANET_GLYPHS } from "@/lib/format";

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
  { key: Element.Fire, label: "F" },
  { key: Element.Earth, label: "E" },
  { key: Element.Air, label: "A" },
  { key: Element.Water, label: "W" },
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

  // Build grid: element × modality → planet glyphs
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
    <div
      className="bg-card border border-border rounded-lg p-phi-4 card-hover"
      style={{ containerType: "inline-size" }}
    >
      <table className="w-full border-collapse text-center table-fixed" style={{ fontSize: "3.5cqi" }}>
        <thead>
          <tr>
            <th className="w-8" />
            {MODALITIES.map((m) => (
              <th key={m.key} className="text-muted-foreground font-medium pb-phi-1">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ELEMENTS.map((el) => (
            <tr key={el.key}>
              <td
                className="font-medium py-phi-1 pr-phi-1"
                style={{ color: ELEMENT_COLORS[el.key] }}
              >
                {el.label}
              </td>
              {MODALITIES.map((m) => {
                const glyphs = grid.get(`${el.key}|${m.key}`) ?? [];
                return (
                  <td
                    key={m.key}
                    className="border border-border py-phi-1 px-phi-1 text-primary"
                  >
                    {glyphs.join(" ")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

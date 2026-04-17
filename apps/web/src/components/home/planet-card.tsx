import { useMemo, useState } from "react";
import { CelestialBody, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData, HouseData } from "@astro-app/shared-types";
import { PLANET_GLYPHS, SIGN_GLYPHS, formatDegree, longitudeToZp } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import {
  getHouseForLongitude,
  getDignityDetail,
} from "@/lib/dignities";

const ELEMENT_COLORS: Record<Element, string> = {
  [Element.Fire]: "var(--color-fire)",
  [Element.Earth]: "var(--color-earth)",
  [Element.Air]: "var(--color-air)",
  [Element.Water]: "var(--color-water)",
};
import { ErrorCard } from "@/components/ui/error-card";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const BASE_BODIES = [
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

type AngleKey = "asc" | "mc" | "desc" | "ic";

const ANGLES: {
  key: AngleKey;
  glyph: string;
  name: string;
  getLon: (h: HouseData) => number;
}[] = [
  { key: "asc", glyph: "Ac", name: "Ascendant", getLon: (h) => h.ascendant },
  { key: "mc", glyph: "Mc", name: "Midheaven", getLon: (h) => h.midheaven },
  { key: "desc", glyph: "Dc", name: "Descendant", getLon: (h) => h.descendant },
  { key: "ic", glyph: "Ic", name: "Imum Coeli", getLon: (h) => h.imum_coeli },
];

const DIGNITY_BODIES = [
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

function getNodeBodies(nodeType: "mean" | "true"): CelestialBody[] {
  return nodeType === "mean"
    ? [CelestialBody.MeanNorthNode, CelestialBody.MeanSouthNode]
    : [CelestialBody.TrueNorthNode, CelestialBody.TrueSouthNode];
}

interface Props {
  chartData: ChartData | null;
  apiError?: boolean;
  retry?: () => void;
  nodeType?: "mean" | "true";
}

export function PlanetCard({
  chartData,
  apiError,
  retry,
  nodeType: nodeTypeProp,
}: Props) {
  const globalNodeType = useSettings((s) => s.defaults.nodeType);
  const nodeType = nodeTypeProp ?? globalNodeType;
  const displayBodies = useMemo(
    () => [...BASE_BODIES, ...getNodeBodies(nodeType)],
    [nodeType],
  );
  const [expanded, setExpanded] = useState(false);

  if (!chartData) return null;

  const visibleBodyCount = displayBodies.filter(
    (b) => chartData.zodiac_positions[b],
  ).length;

  const bodyNames: Partial<Record<CelestialBody, string>> = {
    [CelestialBody.Sun]: "Sun",
    [CelestialBody.Moon]: "Moon",
    [CelestialBody.Mercury]: "Mercury",
    [CelestialBody.Venus]: "Venus",
    [CelestialBody.Mars]: "Mars",
    [CelestialBody.Jupiter]: "Jupiter",
    [CelestialBody.Saturn]: "Saturn",
    [CelestialBody.Uranus]: "Uranus",
    [CelestialBody.Neptune]: "Neptune",
    [CelestialBody.Pluto]: "Pluto",
    [CelestialBody.Chiron]: "Chiron",
    [CelestialBody.MeanNorthNode]: "N. Node",
    [CelestialBody.MeanSouthNode]: "S. Node",
    [CelestialBody.TrueNorthNode]: "N. Node",
    [CelestialBody.TrueSouthNode]: "S. Node",
  };

  return (
    <Card
      className="card-hover cursor-pointer py-0"
      onClick={() => setExpanded((v) => !v)}
    >
      <CardContent className="p-pad-sm">
      <div className="flex items-baseline justify-between mb-3.5">
        <div className="card-title">Positions</div>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {visibleBodyCount} bodies · {ANGLES.length} angles
        </span>
      </div>
      {apiError && retry && (
        <ErrorCard
          message="Showing approximation."
          onRetry={retry}
          className="text-xs mb-3"
        />
      )}

      {/* Always-visible position table */}
      <table className="w-full text-[13px]">
        <tbody>
          {displayBodies.map((body) => {
            const zp = chartData.zodiac_positions[body];
            if (!zp) return null;
            const pos = chartData.positions[body];
            const house = pos
              ? getHouseForLongitude(pos.longitude, chartData.houses.cusps)
              : null;
            const glyph = PLANET_GLYPHS[body] ?? body;
            const signGlyph = SIGN_GLYPHS[zp.sign];
            return (
              <tr
                key={body}
                className="border-b border-border last:border-0 hover:bg-secondary transition-[background-color] duration-120 ease-out"
              >
                <td className="py-1 w-[28px]">
                  <span className="text-primary text-[15px]">{glyph}</span>
                </td>
                <td className="py-1 text-muted-foreground text-[12px]">
                  {bodyNames[body] ?? body}
                </td>
                <td
                  className="py-1 pl-1 text-[13px]"
                  style={{ color: ELEMENT_COLORS[SIGN_ELEMENT[zp.sign]] }}
                >
                  {signGlyph}
                </td>
                <td className="py-1 text-foreground tabular-nums">
                  {formatDegree(zp.degree, zp.minute)}
                  {zp.is_retrograde && (
                    <span className="text-destructive text-[10px] font-semibold ml-1">
                      ℞
                    </span>
                  )}
                </td>
                <td className="py-1 text-muted-foreground text-[11px] text-right w-[32px] mono tabular-nums">
                  {house ? `H${house}` : ""}
                </td>
              </tr>
            );
          })}
          <tr aria-hidden>
            <td colSpan={5} className="h-3" />
          </tr>
          {ANGLES.map((angle) => {
            const lon = angle.getLon(chartData.houses);
            const zp = longitudeToZp(lon);
            const signGlyph = SIGN_GLYPHS[zp.sign];
            return (
              <tr
                key={angle.key}
                className="border-b border-border last:border-0 hover:bg-secondary transition-[background-color] duration-120 ease-out"
              >
                <td className="py-1 w-[28px]">
                  <span className="text-primary text-[13px] font-semibold">
                    {angle.glyph}
                  </span>
                </td>
                <td className="py-1 text-muted-foreground text-[12px]">
                  {angle.name}
                </td>
                <td
                  className="py-1 pl-1 text-[13px]"
                  style={{ color: ELEMENT_COLORS[SIGN_ELEMENT[zp.sign]] }}
                >
                  {signGlyph}
                </td>
                <td className="py-1 text-foreground tabular-nums">
                  {formatDegree(zp.degree, zp.minute)}
                </td>
                <td className="py-1" />
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Collapsible dignity-detail addendum */}
      <Collapsible open={expanded}>
        <CollapsibleContent>
          <Separator className="my-3.5" />
          <div className="text-muted-foreground text-[11px] uppercase tracking-wider mb-2">
            Dignity Detail
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs">
                <th className="text-left py-1 w-[40px]" />
                <th className="text-left py-1" />
                <th className="text-center py-1 w-[36px]">Rul</th>
                <th className="text-center py-1 w-[36px]">Exalt</th>
                <th className="text-center py-1 w-[36px]">Detr</th>
                <th className="text-center py-1 w-[36px]">Fall</th>
              </tr>
            </thead>
            <tbody>
              {DIGNITY_BODIES.map((body) => {
                const zp = chartData.zodiac_positions[body];
                if (!zp) return null;
                const glyph = PLANET_GLYPHS[body] ?? body;
                const signGlyph = SIGN_GLYPHS[zp.sign];
                const detail = getDignityDetail(zp.sign);

                const rulerGlyph = detail.ruler
                  ? PLANET_GLYPHS[detail.ruler]
                  : "—";
                const coRulerGlyph = detail.coRuler
                  ? PLANET_GLYPHS[detail.coRuler]
                  : null;
                const exaltGlyph = detail.exaltation
                  ? PLANET_GLYPHS[detail.exaltation]
                  : "—";
                const detrGlyph = detail.detriment
                  ? PLANET_GLYPHS[detail.detriment]
                  : "—";
                const fallGlyph = detail.fall
                  ? PLANET_GLYPHS[detail.fall]
                  : "—";

                const isRuler =
                  detail.ruler === body || detail.coRuler === body;
                const isExalt = detail.exaltation === body;
                const isDetr = detail.detriment === body;
                const isFall = detail.fall === body;

                return (
                  <tr
                    key={body}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-1 w-[40px]">
                      <span className="text-primary text-base">{glyph}</span>
                    </td>
                    <td
                      className="py-1"
                      style={{ color: ELEMENT_COLORS[SIGN_ELEMENT[zp.sign]] }}
                    >
                      {signGlyph}
                    </td>
                    <td
                      className={`py-1 text-center ${
                        isRuler
                          ? "text-success font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {coRulerGlyph
                        ? `${rulerGlyph}/${coRulerGlyph}`
                        : rulerGlyph}
                    </td>
                    <td
                      className={`py-1 text-center ${
                        isExalt
                          ? "text-success font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {exaltGlyph}
                    </td>
                    <td
                      className={`py-1 text-center ${
                        isDetr
                          ? "text-destructive font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {detrGlyph}
                    </td>
                    <td
                      className={`py-1 text-center ${
                        isFall
                          ? "text-destructive font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {fallGlyph}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CollapsibleContent>
      </Collapsible>
      </CardContent>
    </Card>
  );
}

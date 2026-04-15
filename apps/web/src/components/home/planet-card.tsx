import { useMemo, useState } from "react";
import { CelestialBody, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import { PLANET_GLYPHS, SIGN_GLYPHS, formatDegree } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import {
  getHouseForLongitude,
  getStrongestDignity,
  getDignityDetail,
  type DignityType,
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

const DIGNITY_LABELS: Record<DignityType, string> = {
  domicile: "Domicile",
  exaltation: "Exaltation",
  detriment: "Detriment",
  fall: "Fall",
};

function DignityBadge({ dignity }: { dignity: DignityType }) {
  const isPositive = dignity === "domicile" || dignity === "exaltation";
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] leading-none font-medium ${
        isPositive
          ? "bg-green-900/30 text-success"
          : "bg-red-900/30 text-destructive"
      }`}
    >
      {DIGNITY_LABELS[dignity]}
    </span>
  );
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

  const isDignityBody = (body: CelestialBody) =>
    (DIGNITY_BODIES as CelestialBody[]).includes(body);

  return (
    <Card
      className="card-hover cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      <CardContent className="p-phi-3">
      {apiError && retry && (
        <ErrorCard
          message="Showing approximation."
          onRetry={retry}
          className="text-xs mb-3"
        />
      )}

      {!expanded ? (
        /* Compact view */
        <table className="w-full text-sm">
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
                  <td className="py-1 w-[40px]">
                    <span className="text-primary text-base">{glyph}</span>
                  </td>
                  <td
                    className="py-1"
                    style={{ color: ELEMENT_COLORS[SIGN_ELEMENT[zp.sign]] }}
                  >
                    {signGlyph}
                  </td>
                  <td className="py-1 text-foreground tabular-nums">
                    {formatDegree(zp.degree, zp.minute)}
                    {zp.is_retrograde && (
                      <span className="text-destructive text-xs font-semibold ml-1">
                        ℞
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-muted-foreground text-xs text-right w-[24px]">
                    {house}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        /* Expanded view */
        <>
          <div className="flex items-start justify-between mb-phi-3">
            <h3 className="text-foreground font-semibold text-sm font-display">
              Positions & Dignities
            </h3>
            <span className="text-muted-foreground text-xs shrink-0 ml-2">
              click to collapse
            </span>
          </div>

          {/* Position table with dignity badge */}
          <table className="w-full text-sm">
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
                const dignity = isDignityBody(body)
                  ? getStrongestDignity(body, zp.sign)
                  : null;
                return (
                  <tr
                    key={body}
                    className="border-b border-border last:border-0 hover:bg-secondary transition-[background-color] duration-120 ease-out"
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
                    <td className="py-1 text-foreground tabular-nums">
                      {formatDegree(zp.degree, zp.minute)}
                      {zp.is_retrograde && (
                        <span className="text-destructive text-xs font-semibold ml-1">
                          ℞
                        </span>
                      )}
                    </td>
                    <td className="py-1 text-muted-foreground text-xs text-right w-[24px]">
                      {house}
                    </td>
                    <td className="py-1 text-right">
                      {isDignityBody(body) ? (
                        dignity ? (
                          <DignityBadge dignity={dignity} />
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Divider */}
          <Separator className="my-phi-3" />

          {/* Dignity Detail */}
          <div className="text-muted-foreground text-[11px] uppercase tracking-wider mb-phi-2">
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
        </>
      )}
      </CardContent>
    </Card>
  );
}

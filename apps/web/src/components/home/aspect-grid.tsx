import { useMemo, memo, useState } from "react";
import { CelestialBody, AspectType, Element, SIGN_ELEMENT, SIGN_ORDER } from "@astro-app/shared-types";
import type { CurrentSkyState } from "@/hooks/use-current-sky";
import { ASPECT_GLYPHS } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent } from "@/components/ui/card";

const ELEMENT_VAR: Record<Element, string> = {
  [Element.Fire]: "var(--color-fire)",
  [Element.Earth]: "var(--color-earth)",
  [Element.Air]: "var(--color-air)",
  [Element.Water]: "var(--color-water)",
};

function longitudeToElement(lon: number): Element {
  const normalized = ((lon % 360) + 360) % 360;
  const sign = SIGN_ORDER[Math.floor(normalized / 30)]!;
  return SIGN_ELEMENT[sign];
}


type AspectEntry = { type: AspectType; orb: number; isApplying: boolean };

const ASPECT_COLORS: Record<AspectType, string> = {
  [AspectType.Conjunction]: "var(--aspect-conjunction)",
  [AspectType.Sextile]: "var(--primary)",
  [AspectType.Square]: "var(--destructive)",
  [AspectType.Trine]: "var(--aspect-trine)",
  [AspectType.Opposition]: "var(--destructive)",
  [AspectType.Quincunx]: "var(--aspect-quincunx)",
  [AspectType.SemiSextile]: "var(--muted-foreground)",
  [AspectType.SemiSquare]: "var(--muted-foreground)",
  [AspectType.Sesquisquare]: "var(--muted-foreground)",
  [AspectType.Quintile]: "var(--muted-foreground)",
  [AspectType.BiQuintile]: "var(--muted-foreground)",
};

const DEFAULT_ASPECT_ORBS: Record<AspectType, number> = {
  [AspectType.Conjunction]: 8,
  [AspectType.Opposition]: 8,
  [AspectType.Square]: 8,
  [AspectType.Trine]: 8,
  [AspectType.Sextile]: 4,
  [AspectType.Quincunx]: 2,
  [AspectType.SemiSextile]: 2,
  [AspectType.SemiSquare]: 2,
  [AspectType.Sesquisquare]: 2,
  [AspectType.Quintile]: 2,
  [AspectType.BiQuintile]: 2,
};

// Map settings keys to AspectType
const SETTINGS_KEY_TO_ASPECT: Record<string, AspectType> = {
  conjunction: AspectType.Conjunction,
  opposition: AspectType.Opposition,
  trine: AspectType.Trine,
  square: AspectType.Square,
  sextile: AspectType.Sextile,
  quincunx: AspectType.Quincunx,
  semi_sextile: AspectType.SemiSextile,
  semi_square: AspectType.SemiSquare,
  sesquiquadrate: AspectType.Sesquisquare,
};

const ASPECT_TARGETS: [AspectType, number][] = [
  [AspectType.Conjunction, 0],
  [AspectType.SemiSextile, 30],
  [AspectType.SemiSquare, 45],
  [AspectType.Sextile, 60],
  [AspectType.Quintile, 72],
  [AspectType.Square, 90],
  [AspectType.Trine, 120],
  [AspectType.Sesquisquare, 135],
  [AspectType.BiQuintile, 144],
  [AspectType.Quincunx, 150],
  [AspectType.Opposition, 180],
];

function detectAspect(
  lon1: number, lon2: number,
  orbMap: Record<AspectType, number>,
  speed1 = 0, speed2 = 0,
): AspectEntry | null {
  let rawDiff = (lon1 - lon2) % 360;
  if (rawDiff < 0) rawDiff += 360;
  const diff = rawDiff > 180 ? 360 - rawDiff : rawDiff;
  const sign = rawDiff > 180 ? -1 : 1; // sign of (lon1 - lon2) after normalization

  let best: AspectEntry | null = null;
  for (const [type, target] of ASPECT_TARGETS) {
    const maxOrb = orbMap[type] ?? 0;
    if (maxOrb <= 0) continue;
    const orb = Math.abs(diff - target);
    if (orb <= maxOrb && (!best || orb < best.orb)) {
      // Relative speed of the angular separation
      const relativeSpeed = (speed1 - speed2) * sign;
      // If diff > target, the aspect is applying when the gap is closing (relativeSpeed < 0)
      // If diff < target, the aspect is applying when the gap is growing (relativeSpeed > 0)
      const isApplying = diff > target ? relativeSpeed < 0 : relativeSpeed > 0;
      best = { type, orb, isApplying };
    }
  }
  return best;
}

type PlanetEntry = { kind: "planet"; key: CelestialBody; glyph: string };
type AngleEntry = { kind: "angle"; key: string; glyph: string };
type BodyEntry = PlanetEntry | AngleEntry;

const BASE_GRID_BODIES: BodyEntry[] = [
  { kind: "planet", key: CelestialBody.Sun, glyph: "☉" },
  { kind: "planet", key: CelestialBody.Moon, glyph: "☽" },
  { kind: "planet", key: CelestialBody.Mercury, glyph: "☿" },
  { kind: "planet", key: CelestialBody.Venus, glyph: "♀\uFE0E" },
  { kind: "planet", key: CelestialBody.Mars, glyph: "♂\uFE0E" },
  { kind: "planet", key: CelestialBody.Jupiter, glyph: "♃" },
  { kind: "planet", key: CelestialBody.Saturn, glyph: "♄" },
  { kind: "planet", key: CelestialBody.Uranus, glyph: "♅" },
  { kind: "planet", key: CelestialBody.Neptune, glyph: "♆" },
  { kind: "planet", key: CelestialBody.Pluto, glyph: "♇" },
  { kind: "planet", key: CelestialBody.Chiron, glyph: "⚷" },
];

const NODE_ENTRIES: Record<string, BodyEntry[]> = {
  mean: [
    { kind: "planet", key: CelestialBody.MeanNorthNode, glyph: "☊" },
    { kind: "planet", key: CelestialBody.MeanSouthNode, glyph: "☋" },
  ],
  true: [
    { kind: "planet", key: CelestialBody.TrueNorthNode, glyph: "☊" },
    { kind: "planet", key: CelestialBody.TrueSouthNode, glyph: "☋" },
  ],
};

const ANGLE_ENTRIES: BodyEntry[] = [
  { kind: "angle", key: "asc", glyph: "Ac" },
  { kind: "angle", key: "mc", glyph: "Mc" },
  { kind: "angle", key: "desc", glyph: "Dc" },
  { kind: "angle", key: "ic", glyph: "Ic" },
];

const ANGLE_KEYS = ["asc", "mc", "desc", "ic"] as const;

interface Props {
  chartData: CurrentSkyState["chartData"];
  nodeType?: "mean" | "true";
}

export const AspectGrid = memo(function AspectGrid({ chartData, nodeType: nodeTypeProp }: Props) {
  const globalNodeType = useSettings((s) => s.defaults.nodeType);
  const nodeType = nodeTypeProp ?? globalNodeType;
  const gridBodies = useMemo(
    () => [...BASE_GRID_BODIES, ...(NODE_ENTRIES[nodeType] ?? NODE_ENTRIES.mean), ...ANGLE_ENTRIES],
    [nodeType],
  );
  const settingsOrbs = useSettings((s) => s.aspects.orbs);

  // Build orb map from settings, falling back to defaults
  const orbMap = useMemo(() => {
    const map = { ...DEFAULT_ASPECT_ORBS };
    for (const [key, value] of Object.entries(settingsOrbs)) {
      const aspectType = SETTINGS_KEY_TO_ASPECT[key];
      if (aspectType) map[aspectType] = value;
    }
    return map;
  }, [settingsOrbs]);

  const aspectMap = useMemo(() => {
    if (!chartData) return new Map<string, AspectEntry>();

    const map = new Map<string, AspectEntry>();

    // Planet–planet aspects from chart data (already filtered by orb settings)
    for (const aspect of chartData.aspects) {
      const entry: AspectEntry = { type: aspect.type, orb: aspect.orb, isApplying: aspect.is_applying };
      map.set(`${aspect.body1}|${aspect.body2}`, entry);
      map.set(`${aspect.body2}|${aspect.body1}`, entry);
    }

    // Angle longitudes
    const angleLon: Record<string, number> = {
      asc: chartData.houses.ascendant,
      mc: chartData.houses.midheaven,
      desc: chartData.houses.descendant,
      ic: chartData.houses.imum_coeli,
    };

    // Angle–planet aspects (calculated client-side with settings orbs)
    for (const angleKey of ANGLE_KEYS) {
      const lon1 = angleLon[angleKey];
      for (const body of gridBodies) {
        if (body.kind !== "planet") continue;
        const pos = chartData.positions[body.key];
        if (!pos) continue;
        const entry = detectAspect(lon1, pos.longitude, orbMap, 0, pos.speed_longitude);
        if (entry) {
          map.set(`${angleKey}|${body.key}`, entry);
          map.set(`${body.key}|${angleKey}`, entry);
        }
      }
      // Angle–angle aspects
      for (const angleKey2 of ANGLE_KEYS) {
        if (angleKey2 <= angleKey) continue;
        const entry = detectAspect(lon1, angleLon[angleKey2], orbMap);
        if (entry) {
          map.set(`${angleKey}|${angleKey2}`, entry);
          map.set(`${angleKey2}|${angleKey}`, entry);
        }
      }
    }

    return map;
  }, [chartData, orbMap, gridBodies]);

  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);

  if (!chartData) return null;

  const N = gridBodies.length;
  const aspectHits = Math.floor(aspectMap.size / 2);

  return (
    <Card className="card-hover py-0">
      <CardContent className="p-card-pad">
        <div className="flex items-baseline justify-between mb-3.5">
          <div className="card-title">Aspects</div>
          <span className="text-[12px] text-muted-foreground tabular-nums">
            {aspectHits} hits
          </span>
        </div>
        <div className="w-full" style={{ containerType: "inline-size" }}>
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
            fontSize: `calc(100cqi / ${N})`,
          }}
          onMouseLeave={() => setHover(null)}
        >
        {gridBodies.flatMap((rowBody, i) => {
          const isAngle = rowBody.kind === "angle";

          return gridBodies.map((colBody, j) => {
            const key = `${i}-${j}`;

            // Upper triangle – invisible spacer (no border)
            if (j > i) return <div key={key} aria-hidden />;

            // Border class:
            // Diagonal cells where i > 0 need explicit border-t since the cell
            // above ([i-1][j]) is upper triangle with no border.
            // Leftmost column needs explicit border-l for the outer edge.
            const leftBorder = j === 0 ? " border-l" : "";
            const borderClass =
              j === i
                ? `border-t border-r border-b border-border${leftBorder}`
                : `border-r border-b border-border${leftBorder}`;

            const isHighlighted =
              hover !== null &&
              (hover.row === hover.col
                ? (i === hover.row && j <= hover.row) ||
                  (j === hover.col && i >= hover.col)
                : (i === hover.row && j >= hover.col && j <= hover.row) ||
                  (j === hover.col && i >= hover.col && i <= hover.row));

            // Diagonal – body label glyph, coloured by the body's element,
            // elevated with --bg-elev (matches design bundle)
            if (j === i) {
              let elementColor: string | undefined;
              if (rowBody.kind === "planet") {
                const zp = chartData.zodiac_positions[rowBody.key];
                if (zp) elementColor = ELEMENT_VAR[SIGN_ELEMENT[zp.sign]];
              } else {
                const lon =
                  rowBody.key === "asc" ? chartData.houses.ascendant
                  : rowBody.key === "mc" ? chartData.houses.midheaven
                  : rowBody.key === "desc" ? chartData.houses.descendant
                  : chartData.houses.imum_coeli;
                elementColor = ELEMENT_VAR[longitudeToElement(lon)];
              }
              return (
                <div
                  key={key}
                  className={`${borderClass} ${isHighlighted ? "bg-primary/15" : "bg-bg-elev"} flex items-center justify-center aspect-square`}
                  onMouseEnter={() => setHover({ row: i, col: i })}
                >
                  <span
                    className="leading-none select-none"
                    style={{
                      fontSize: isAngle ? "0.65em" : "0.85em",
                      fontWeight: isAngle ? 600 : undefined,
                      color: isAngle ? "var(--muted-foreground)" : elementColor,
                    }}
                  >
                    {rowBody.glyph}
                  </span>
                </div>
              );
            }

            // Lower triangle – aspect cell
            const aspect = aspectMap.get(`${rowBody.key}|${colBody.key}`);

            if (!aspect) {
              return (
                <div
                  key={key}
                  className={`${borderClass} ${isHighlighted ? "bg-primary/15" : ""} aspect-square`}
                  onMouseEnter={() => setHover(null)}
                />
              );
            }

            const color = ASPECT_COLORS[aspect.type];
            const glyph = ASPECT_GLYPHS[aspect.type];
            const orbDeg = Math.floor(aspect.orb);
            const orbMin = Math.round((aspect.orb - orbDeg) * 60);
            const apSep = aspect.isApplying ? "A" : "S";

            return (
              <div
                key={key}
                className={`${borderClass} aspect-cell ${isHighlighted ? "bg-primary/15" : ""} flex flex-col items-center justify-center aspect-square leading-none select-none`}
                title={`${rowBody.glyph} ${glyph} ${colBody.glyph}  ${orbDeg}°${orbMin.toString().padStart(2, "0")}'`}
                style={{ color }}
                onMouseEnter={() => setHover({ row: i, col: j })}
              >
                <span className="text-[0.52em]">
                  {glyph}
                </span>
                <span className="mono text-[0.4em] tracking-tight tabular-nums opacity-70">
                  {orbDeg}{apSep}{orbMin.toString().padStart(2, "0")}
                </span>
              </div>
            );
          });
        })}
        </div>
        </div>
      </CardContent>
    </Card>
  );
});

import { Fragment, useMemo } from "react";
import { Label, Pie, PieChart } from "recharts";
import { CelestialBody, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import { PLANET_GLYPHS } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  SIGN_MODALITY,
  computeDistribution,
  dominantKeys,
  type Distribution,
  type Modality,
} from "@/lib/astro-distribution";

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
  { key: "Cardinal", label: "Cardinal" },
  { key: "Fixed", label: "Fixed" },
  { key: "Mutable", label: "Mutable" },
];

const ELEMENT_COLORS: Record<Element, string> = {
  [Element.Fire]: "var(--color-fire)",
  [Element.Earth]: "var(--color-earth)",
  [Element.Air]: "var(--color-air)",
  [Element.Water]: "var(--color-water)",
};

const MODALITY_COLORS: Record<Modality, string> = {
  Cardinal: "var(--primary)",
  Fixed: "color-mix(in oklch, var(--primary) 70%, var(--background))",
  Mutable: "color-mix(in oklch, var(--primary) 45%, var(--background))",
};

const elementChartConfig = {
  count: { label: "Bodies" },
  [Element.Fire]: { label: "Fire", color: "var(--color-fire)" },
  [Element.Earth]: { label: "Earth", color: "var(--color-earth)" },
  [Element.Air]: { label: "Air", color: "var(--color-air)" },
  [Element.Water]: { label: "Water", color: "var(--color-water)" },
} satisfies ChartConfig;

const modalityChartConfig = {
  count: { label: "Bodies" },
  Cardinal: { label: "Cardinal", color: MODALITY_COLORS.Cardinal },
  Fixed: { label: "Fixed", color: MODALITY_COLORS.Fixed },
  Mutable: { label: "Mutable", color: MODALITY_COLORS.Mutable },
} satisfies ChartConfig;

interface Props {
  chartData: ChartData | null;
}

export function ElementModalityCard({ chartData }: Props) {
  const dist = useMemo<Distribution | null>(
    () => (chartData ? computeDistribution(chartData, DISPLAY_BODIES) : null),
    [chartData],
  );

  if (!chartData || !dist) return null;

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

        <ElementModalityPies dist={dist} />
      </CardContent>
    </Card>
  );
}

interface DonutSlice {
  key: string;
  label: string;
  count: number;
  fill: string;
}

function ElementModalityPies({ dist }: { dist: Distribution }) {
  const elementData: DonutSlice[] = ELEMENTS.map((el) => ({
    key: el.key,
    label: el.label,
    count: dist.elements.get(el.key) ?? 0,
    fill: ELEMENT_COLORS[el.key],
  })).filter((d) => d.count > 0);

  const modalityData: DonutSlice[] = MODALITIES.map((m) => ({
    key: m.key,
    label: m.label,
    count: dist.modalities.get(m.key) ?? 0,
    fill: MODALITY_COLORS[m.key],
  })).filter((d) => d.count > 0);

  const dominantElements = dominantKeys(dist.elements).map(
    (k) => ELEMENTS.find((e) => e.key === k)?.label ?? String(k),
  );
  const dominantModalities = dominantKeys(dist.modalities).map(
    (k) => MODALITIES.find((m) => m.key === k)?.label ?? String(k),
  );

  return (
    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2">
      <DonutBlock
        title="ELEMENTS"
        data={elementData}
        dominant={dominantElements}
        config={elementChartConfig}
      />
      <DonutBlock
        title="MODALITIES"
        data={modalityData}
        dominant={dominantModalities}
        config={modalityChartConfig}
      />
    </div>
  );
}

interface DonutBlockProps {
  title: string;
  data: DonutSlice[];
  dominant: string[];
  config: ChartConfig;
}

function DonutBlock({ title, data, dominant, config }: DonutBlockProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="text-muted-foreground text-[11px] pb-1"
        style={{ letterSpacing: "0.08em" }}
      >
        {title}
      </div>
      <ChartContainer
        config={config}
        className="mx-auto aspect-square w-full max-w-[180px]"
      >
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="key"
            innerRadius={50}
            strokeWidth={2}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
              const r = ((innerRadius ?? 0) + (outerRadius ?? 0)) / 2;
              const rad = -(midAngle ?? 0) * (Math.PI / 180);
              const lx = (cx ?? 0) + r * Math.cos(rad);
              const ly = (cy ?? 0) + r * Math.sin(rad);
              return (
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white text-[11px] font-semibold"
                >
                  {value}
                </text>
              );
            }}
            labelLine={false}
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                const cx = viewBox.cx ?? 0;
                const cy = viewBox.cy ?? 0;
                const n = dominant.length;
                if (n === 0) return null;
                const lineHeight = 16;
                const startY = cy - ((n - 1) * lineHeight) / 2;
                return (
                  <text textAnchor="middle" dominantBaseline="middle">
                    {dominant.map((label, i) => (
                      <tspan
                        key={label}
                        x={cx}
                        y={startY + i * lineHeight}
                        className="fill-foreground text-[13px] font-semibold"
                      >
                        {label}
                      </tspan>
                    ))}
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}

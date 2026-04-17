import { useEffect, useMemo, useRef, useState, memo } from "react";
import { Area, AreaChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";
import { CelestialBody } from "@astro-app/shared-types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";

import { PLANET_GLYPHS, ASPECT_GLYPHS } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import { interpolatePeaks } from "./aspects-timeline-utils";
import {
  ASPECT_COLORS,
  DAY_COUNT,
  DAY_OFFSET,
  GROUP_PLANETS,
  GROUP_PLANET_NAMES,
  SAMPLES_PER_DAY,
  TOTAL_SAMPLES,
  buildMaxOrbMap,
  computeAspectBarsAsync,
  type AspectBar,
} from "./aspects-timeline";

const ROW_HEIGHT = 40;

function DayHeader({ days, todayIdx }: { days: Date[]; todayIdx: number }) {
  return (
    <div className="flex mb-2">
      <div className="w-[70px] shrink-0" />
      {days.map((date, i) => {
        const label = date.toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
        });
        const isToday = i === todayIdx;
        return (
          <div
            key={i}
            className={`flex-1 text-center text-xs tabular-nums py-1 rounded-sm ${
              isToday
                ? "text-primary font-semibold bg-primary/[0.06]"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

interface RowChartProps {
  bar: AspectBar;
  todayIdx: number;
}

function RowChart({ bar, todayIdx }: RowChartProps) {
  const color = ASPECT_COLORS[bar.aspectType] ?? "var(--muted-foreground)";
  const data = useMemo(() => interpolatePeaks(bar.samples), [bar.samples]);

  const config = {
    value: { label: "Intensity", color },
  } satisfies ChartConfig;

  const todayX1 = todayIdx * SAMPLES_PER_DAY;
  const todayX2 = (todayIdx + 1) * SAMPLES_PER_DAY - 1;
  const todayCenterX = todayX1 + SAMPLES_PER_DAY / 2 - 0.5;

  return (
    <ChartContainer
      config={config}
      className="!aspect-auto w-full"
      style={{ height: ROW_HEIGHT }}
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ left: 0, right: 0, top: 2, bottom: 0 }}
      >
        <XAxis
          dataKey="x"
          type="number"
          domain={[0, TOTAL_SAMPLES - 1]}
          hide
        />
        <YAxis domain={[0, 1]} hide />
        <ReferenceArea
          x1={todayX1}
          x2={todayX2}
          fill="var(--primary)"
          fillOpacity={0.07}
          stroke="none"
          ifOverflow="visible"
        />
        <ReferenceLine
          x={todayCenterX}
          stroke="var(--primary)"
          strokeDasharray="3 4"
          strokeOpacity={0.35}
          ifOverflow="visible"
        />
        <Area
          dataKey="value"
          type="linear"
          fill={color}
          fillOpacity={0.4}
          stroke={color}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export const AspectsTimelineShadcn = memo(function AspectsTimelineShadcn() {
  const aspectSettings = useSettings((s) => s.aspects);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxOrbMap = useMemo(
    () => buildMaxOrbMap(aspectSettings.orbs),
    [aspectSettings.orbs],
  );

  const days = useMemo(
    () =>
      Array.from({ length: DAY_COUNT }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + DAY_OFFSET + i);
        return d;
      }),
    [today],
  );

  const [bars, setBars] = useState<AspectBar[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const id = requestAnimationFrame(() => {
      void computeAspectBarsAsync(
        today,
        aspectSettings.orbs,
        aspectSettings.showMinor,
        maxOrbMap,
        controller.signal,
      ).then((result) => {
        if (!controller.signal.aborted) setBars(result);
      });
    });
    return () => {
      cancelAnimationFrame(id);
      controller.abort();
    };
  }, [today, aspectSettings, maxOrbMap]);

  const groups = useMemo(() => {
    const map = new Map<CelestialBody, AspectBar[]>();
    for (const bar of bars) {
      const existing = map.get(bar.groupPlanet) ?? [];
      existing.push(bar);
      map.set(bar.groupPlanet, existing);
    }
    return GROUP_PLANETS.filter((p) => map.has(p)).map((p) => ({
      planet: p,
      bars: map.get(p)!,
    }));
  }, [bars]);

  const todayIdx = -DAY_OFFSET;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aspects Timeline (shadcn)</CardTitle>
        <CardDescription>
          Same data, rendered via shadcn Chart / Recharts AreaChart — linear area
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DayHeader days={days} todayIdx={todayIdx} />

        {bars.length === 0 ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((g) => (
              <div key={g}>
                <div className="w-16 h-4 rounded bg-muted animate-pulse mb-1.5" />
                <div className="flex flex-col gap-1">
                  {[0, 1].map((r) => (
                    <div key={r} className="flex items-center" style={{ height: ROW_HEIGHT }}>
                      <div className="w-[70px] shrink-0" />
                      <div className="flex-1 h-full rounded bg-muted/50 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(({ planet, bars: groupBars }) => (
              <div key={planet}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-primary text-sm">{PLANET_GLYPHS[planet]}</span>
                  <span className="text-foreground text-sm font-medium">
                    {GROUP_PLANET_NAMES[planet]}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {groupBars.map((bar) => {
                    const color = ASPECT_COLORS[bar.aspectType] ?? "var(--muted-foreground)";
                    const uid = `${bar.groupPlanet}-${bar.aspectType}-${bar.otherPlanet}`;
                    const groupName = GROUP_PLANET_NAMES[bar.groupPlanet] ?? bar.groupPlanet;
                    const otherGlyph = PLANET_GLYPHS[bar.otherPlanet] ?? bar.otherPlanet;
                    const aspectGlyph = ASPECT_GLYPHS[bar.aspectType] ?? bar.aspectType;
                    return (
                      <div
                        key={uid}
                        className="flex items-center"
                        style={{ height: ROW_HEIGHT }}
                        title={`${groupName} ${aspectGlyph} ${otherGlyph}`}
                      >
                        <div className="w-[70px] shrink-0 flex items-center gap-0.5">
                          <span className="text-primary text-sm w-5 text-center">
                            {PLANET_GLYPHS[bar.groupPlanet]}
                          </span>
                          <span className="text-sm w-5 text-center" style={{ color }}>
                            {ASPECT_GLYPHS[bar.aspectType] ?? bar.aspectType}
                          </span>
                          <span className="text-muted-foreground text-sm w-5 text-center">
                            {PLANET_GLYPHS[bar.otherPlanet] ?? bar.otherPlanet}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <RowChart bar={bar} todayIdx={todayIdx} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

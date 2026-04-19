import { useMemo } from "react";
import { calculateBodyPosition, nextEclipse } from "@astro-app/approx-engine";
import { CelestialBody, SIGN_ELEMENT, SIGN_ORDER } from "@astro-app/shared-types";
import type { ChartData, ZodiacPosition } from "@astro-app/shared-types";
import { ChartWheel } from "@/components/home/chart-wheel";
import { PlanetCard } from "@/components/home/planet-card";
import { AspectGrid } from "@/components/home/aspect-grid";
import { MoonCard } from "@/components/home/moon-card";
import { RetrogradeTracker } from "@/components/home/retrograde-tracker";
import { PlanetaryHours } from "@/components/home/planetary-hours";
import { ElementModalityCard } from "@/components/home/element-modality-card";
import { AspectsTimeline } from "@/components/home/aspects-timeline";
import { HeroStat } from "@/components/home/hero-stat";
import { useCurrentSky } from "@/hooks/use-current-sky";
import { useSettings } from "@/hooks/use-settings";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { PLANET_GLYPHS, SIGN_GLYPHS, longitudeToZp } from "@/lib/format";

const PLANET_NAME: Record<string, string> = {
  mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter",
  saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
};

const INGRESS_BODIES = [
  CelestialBody.Mercury, CelestialBody.Venus, CelestialBody.Mars,
  CelestialBody.Jupiter, CelestialBody.Saturn,
];

/** Find the soonest sign-change event among the inner+social planets. */
function computeNextIngress(chart: ChartData): { body: CelestialBody; targetSign: ZodiacPosition["sign"]; daysUntil: number } | null {
  let best: { body: CelestialBody; targetSign: ZodiacPosition["sign"]; daysUntil: number } | null = null;
  for (const body of INGRESS_BODIES) {
    const pos = chart.positions[body];
    const zp = chart.zodiac_positions[body];
    if (!pos || !zp || pos.speed_longitude <= 0) continue;
    const degreesLeftInSign = 30 - (zp.degree + zp.minute / 60 + zp.second / 3600);
    const daysUntil = degreesLeftInSign / pos.speed_longitude;
    if (daysUntil < 0 || daysUntil > 60) continue;
    if (!best || daysUntil < best.daysUntil) {
      const currentIdx = SIGN_ORDER.indexOf(zp.sign);
      const nextSign = SIGN_ORDER[(currentIdx + 1) % 12]!;
      best = { body, targetSign: nextSign, daysUntil };
    }
  }
  return best;
}

function formatDateEyebrow(now: Date): string {
  return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(now: Date, tf: "12h" | "24h"): string {
  return now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: tf === "12h",
  });
}

const DAY_RULERS = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
];

export function HomePage() {
  const sky = useCurrentSky();
  const timeFormat = useSettings((s) => s.appearance.timeFormat);
  const locationName = useReverseGeocode(sky.location.lat, sky.location.lon);

  const now = useMemo(() => new Date(), []);
  const chart = sky.chartData;

  const sunZp = chart?.zodiac_positions[CelestialBody.Sun];
  const moonZp = chart?.zodiac_positions[CelestialBody.Moon];
  const ascZp = useMemo(
    () => (chart ? longitudeToZp(chart.houses.ascendant) : null),
    [chart],
  );
  const nextIngress = useMemo(() => (chart ? computeNextIngress(chart) : null), [chart]);

  const eclipse = useMemo(() => {
    const nowDate = new Date();
    const e = nextEclipse(nowDate);
    const body = e.kind === "solar" ? CelestialBody.Sun : CelestialBody.Moon;
    const pos = calculateBodyPosition(e.peak, body);
    const zp = longitudeToZp(pos.longitude);
    const daysUntil = Math.max(
      0,
      Math.round((e.peak.getTime() - nowDate.getTime()) / 86_400_000),
    );
    return { kind: e.kind, peak: e.peak, zp, daysUntil };
  }, []);

  return (
    <div className="flex flex-col gap-gap-lg py-pad px-pad tablet:py-pad-lg tablet:px-pad-lg">
      {/* Editorial page head */}
      <header className="flex flex-wrap items-end justify-between gap-gap animate-fade-in">
        <div className="min-w-0">
          <div className="eyebrow">
            {formatDateEyebrow(now)} · {formatTime(now, timeFormat)}
            {locationName ? ` · ${locationName}` : ""}
          </div>
          <h1 className="font-display text-foreground mt-2 text-[32px] tablet:text-[44px] desktop:text-[52px] leading-[1.05]">
            The sky <em className="italic text-muted-foreground">today</em>
          </h1>
          {moonZp && (
            <div className="text-[length:var(--text-sm)] text-muted-foreground mt-2">
              Day of {DAY_RULERS[now.getDay()]}
            </div>
          )}
        </div>
      </header>

      {/* Stat row — 4 hero stats */}
      <div className="grid grid-cols-2 tablet:grid-cols-4 gap-gap wide:gap-gap-lg">
        <HeroStat
          eyebrow="Sun"
          value={
            sunZp ? (
              <>
                <span style={{ color: `var(--color-${SIGN_ELEMENT[sunZp.sign]})` }}>
                  {SIGN_GLYPHS[sunZp.sign]}
                </span>{" "}
                {sunZp.degree}°
              </>
            ) : (
              "—"
            )
          }
          meta={sunZp ? `${sunZp.sign}${sunZp.is_retrograde ? " · ℞" : ""}` : "Loading"}
        />
        <HeroStat
          eyebrow="Ascending"
          value={
            ascZp ? (
              <>
                <span style={{ color: `var(--color-${SIGN_ELEMENT[ascZp.sign]})` }}>
                  {SIGN_GLYPHS[ascZp.sign]}
                </span>{" "}
                {ascZp.degree}°
              </>
            ) : (
              "—"
            )
          }
          meta={ascZp ? `${ascZp.sign} rising` : "Loading"}
        />
        <HeroStat
          eyebrow="Next Ingress"
          tone="accent"
          value={
            nextIngress ? (
              <>
                <span>{PLANET_GLYPHS[nextIngress.body] ?? "·"}</span>
                {" → "}
                <span style={{ color: `var(--color-${SIGN_ELEMENT[nextIngress.targetSign]})` }}>
                  {SIGN_GLYPHS[nextIngress.targetSign]}
                </span>
              </>
            ) : (
              "—"
            )
          }
          meta={
            nextIngress
              ? `${PLANET_NAME[nextIngress.body] ?? nextIngress.body} enters ${nextIngress.targetSign} · in ${Math.round(nextIngress.daysUntil)}d`
              : "No ingress in 60d"
          }
        />
        <HeroStat
          eyebrow="Next Eclipse"
          value={
            <>
              <span className="mr-1" aria-hidden>{eclipse.kind === "solar" ? "☀️" : "🌑"}</span>
              {eclipse.kind === "solar" ? "Solar" : "Lunar"}
            </>
          }
          meta={
            <>
              <span>{eclipse.peak.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <span className="text-dim-foreground mx-1">·</span>
              <span style={{ color: `var(--color-${SIGN_ELEMENT[eclipse.zp.sign].toLowerCase()})` }}>
                {SIGN_GLYPHS[eclipse.zp.sign]}
              </span>
              <span className="ml-0.5 tabular-nums">
                {eclipse.zp.degree}°{eclipse.zp.minute.toString().padStart(2, "0")}′
              </span>
              <span className="text-dim-foreground mx-1">·</span>
              <span>in {eclipse.daysUntil}d</span>
            </>
          }
        />
      </div>

      {/* Hero row: chart wheel (1.3fr) + right rail (1fr) — stacks on phone+tablet; side-by-side on desktop */}
      <div className="flex flex-col desktop:flex-row gap-gap items-start">
        <div
          className="flex flex-col gap-gap min-w-0 w-full animate-fade-in"
          style={{ flex: "1.3", animationDelay: "0.05s" }}
        >
          <ChartWheel sky={sky} locationName={locationName} />
        </div>
        <div
          className="flex flex-col gap-gap min-w-0 w-full animate-fade-in"
          style={{ flex: "1", animationDelay: "0.1s" }}
        >
          <MoonCard />
          <PlanetaryHours lat={sky.location.lat} lon={sky.location.lon} />
          <RetrogradeTracker />
        </div>
      </div>

      {/* Detail row: phone stacks; tablet pairs Positions + ElementModality with Aspects full-width;
          desktop+ goes to the classic 3-column layout. */}
      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-[1fr_1.6fr_1fr] gap-gap items-start animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <PlanetCard chartData={chart} apiError={sky.apiError} retry={sky.retry} />
        <div className="tablet:col-span-2 desktop:col-span-1 min-w-0">
          <AspectGrid chartData={chart} />
        </div>
        <ElementModalityCard chartData={chart} />
      </div>

      {/* Aspects Timeline — full-width, major + minor stacked */}
      <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <AspectsTimeline variant="major" />
      </div>
      <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
        <AspectsTimeline variant="minor" />
      </div>
    </div>
  );
}

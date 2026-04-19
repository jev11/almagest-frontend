import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { calculateApproximate } from "@astro-app/approx-engine";
import { useAstroClient } from "@astro-app/astro-client";
import { CelestialBody } from "@astro-app/shared-types";
import type { ChartData, HouseSystem, ZodiacType } from "@astro-app/shared-types";
import { ChartCanvas } from "@/components/chart/chart-canvas";
import { PLANET_GLYPHS, SIGN_GLYPHS, formatDegree } from "@/lib/format";
import { ErrorCard } from "@/components/ui/error-card";
import { useSettings } from "@/hooks/use-settings";

const DISPLAY_BODIES: CelestialBody[] = [
  CelestialBody.Sun, CelestialBody.Moon, CelestialBody.Mercury,
  CelestialBody.Venus, CelestialBody.Mars, CelestialBody.Jupiter,
  CelestialBody.Saturn, CelestialBody.Uranus, CelestialBody.Neptune,
  CelestialBody.Pluto, CelestialBody.MeanNorthNode,
];

const PLANET_NAMES: Record<string, string> = {
  sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus",
  mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus",
  neptune: "Neptune", pluto: "Pluto", mean_north_node: "N.Node",
};

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return toDateInput(d);
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function TransitsPage() {
  const client = useAstroClient();
  const aspectSettings = useSettings((s) => s.aspects);
  const today = toDateInput(new Date());
  const [dateStr, setDateStr] = useState(today);
  const [chartData, setChartData] = useState<ChartData>(() =>
    calculateApproximate(new Date(), 0, 0, {
      orbOverrides: useSettings.getState().aspects.orbs,
      includeMinor: useSettings.getState().aspects.showMinor,
    }),
  );
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recalcApprox = useCallback((d: string) => {
    const dt = new Date(d + "T12:00:00Z");
    try {
      setChartData(calculateApproximate(dt, 0, 0, {
        orbOverrides: aspectSettings.orbs,
        includeMinor: aspectSettings.showMinor,
      }));
    } catch {
      // keep previous
    }
  }, [aspectSettings]);

  const fetchPrecise = useCallback(async (d: string) => {
    setFetching(true);
    setFetchError(false);
    try {
      const dt = new Date(d + "T12:00:00Z");
      const currentDefaults = useSettings.getState().defaults;
      const res = await client.calculateNatal({
        datetime: dt.toISOString(),
        latitude: 0,
        longitude: 0,
        house_system: currentDefaults.houseSystem as HouseSystem,
        zodiac_type: currentDefaults.zodiacType as ZodiacType,
      });
      setChartData(res);
    } catch {
      setFetchError(true);
    } finally {
      setFetching(false);
    }
  }, [client]);

  // On date change: instant approx, debounced precise
  useEffect(() => {
    recalcApprox(dateStr);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchPrecise(dateStr), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [dateStr, recalcApprox, fetchPrecise]);

  function navigate(delta: number) {
    setDateStr((d) => shiftDays(d, delta));
  }

  const isToday = dateStr === today;

  return (
    <div className="flex flex-col h-full py-8 px-6 tablet:px-12 gap-6 overflow-hidden">
      <h1 className="text-2xl font-semibold text-foreground shrink-0">Transits</h1>

      <div className="flex flex-col tablet:flex-row gap-6 flex-1 min-h-0 overflow-y-auto items-start">
        {/* Left: chart + date controls */}
        <div className="flex flex-col gap-4 min-w-0 items-center" style={{ flex: "1.618" }}>
          {/* Date navigation */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-secondary hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <label className="relative cursor-pointer">
              <span className="bg-secondary border border-border hover:border-primary rounded-lg px-4 py-1.5 text-sm text-foreground transition-colors select-none">
                {formatDisplayDate(dateStr)}
              </span>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => e.target.value && setDateStr(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </label>

            <button
              type="button"
              onClick={() => navigate(1)}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-secondary hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight size={16} />
            </button>

            {!isToday && (
              <button
                type="button"
                onClick={() => setDateStr(today)}
                className="text-primary text-sm hover:underline"
              >
                Today
              </button>
            )}
            {fetching && (
              <Loader2 size={14} className="text-primary animate-spin shrink-0" />
            )}
          </div>

          {/* API error notice */}
          {fetchError && (
            <ErrorCard
              message="Could not load precise positions. Showing approximation."
              onRetry={() => void fetchPrecise(dateStr)}
              className="w-full"
            />
          )}

          {/* Chart wheel */}
          <div className="w-full aspect-square rounded-lg overflow-hidden">
            <ChartCanvas data={chartData} className="w-full h-full" />
          </div>

          <p className="text-dim-foreground text-xs shrink-0">Current Transits</p>
        </div>

        {/* Right: planet positions */}
        <div className="w-full overflow-y-auto" style={{ flex: "1" }}>
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-foreground font-semibold text-sm mb-3">
              Planets · {formatDisplayDate(dateStr)}
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {DISPLAY_BODIES.map((body) => {
                  const zp = chartData.zodiac_positions[body];
                  if (!zp) return null;
                  return (
                    <tr key={body} className="border-b border-border last:border-0">
                      <td className="py-1.5 pr-2 w-5 text-primary text-base">
                        {PLANET_GLYPHS[body] ?? body}
                      </td>
                      <td className="py-1.5 pr-3 text-muted-foreground w-[60px] text-xs">
                        {PLANET_NAMES[body] ?? body}
                      </td>
                      <td className="py-1.5 text-foreground text-xs">
                        {SIGN_GLYPHS[zp.sign]} {formatDegree(zp.degree, zp.minute)}
                        {zp.is_retrograde && (
                          <span className="ml-1 text-destructive text-[10px] font-bold">℞</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

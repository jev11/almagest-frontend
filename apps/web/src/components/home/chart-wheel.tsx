import { ChartCanvas } from "@/components/chart/chart-canvas";
import { DistributionOverlay } from "@/components/chart/distribution-overlay";
import { ChartSkeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";
import type { CurrentSkyState } from "@/hooks/use-current-sky";

interface Props {
  sky: CurrentSkyState;
  locationName?: string | null;
}

function formatLatLon(value: number, kind: "lat" | "lon"): string {
  const hemi =
    kind === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(2)}°${hemi}`;
}

function titleCase(s: string) {
  return s
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function ChartWheel({ sky, locationName }: Props) {
  const { chartData, location, ready } = sky;
  const houseSystem = useSettings((s) => s.defaults.houseSystem);
  const zodiacType = useSettings((s) => s.defaults.zodiacType);

  if (!ready || !chartData) {
    return (
      <div className="w-full aspect-square bg-card rounded-lg">
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-square rounded-lg overflow-hidden bg-card"
      style={{
        containerType: "inline-size",
        boxShadow: "0 0 80px -20px oklch(62% 0.15 265 / 0.15)",
      }}
    >
      {/* Chart canvas — info labels suppressed; we overlay HTML chips below */}
      <ChartCanvas data={chartData} className="w-full h-full" />
      <DistributionOverlay chartData={chartData} />

      {/* Top-left: Natal Sky · Now eyebrow + mono location */}
      <div className="absolute top-4 left-4 pointer-events-none select-none">
        <div className="card-title">Natal Sky · Now</div>
        <div className="mt-1 mono text-[11px] text-dim-foreground leading-snug">
          {locationName ?? "Current location"}
          {" · "}
          {formatLatLon(location.lat, "lat")}
          {", "}
          {formatLatLon(location.lon, "lon")}
        </div>
      </div>

      {/* Top-right: system chips (Placidus · Tropical) */}
      <div className="absolute top-4 right-4 flex gap-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 border border-border text-[11px] text-muted-foreground">
          {titleCase(houseSystem)}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 border border-border text-[11px] text-muted-foreground">
          {titleCase(zodiacType)}
        </span>
      </div>
    </div>
  );
}

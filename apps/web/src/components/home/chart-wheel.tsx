import { ChartCanvas } from "@/components/chart/chart-canvas";
import { DistributionOverlay } from "@/components/chart/distribution-overlay";
import { ChartSkeleton } from "@/components/ui/skeleton";
import type { CurrentSkyState } from "@/hooks/use-current-sky";

interface Props {
  sky: CurrentSkyState;
  locationName?: string | null;
  timezone?: string;
}

export function ChartWheel({ sky, locationName, timezone }: Props) {
  const { chartData, location, ready } = sky;

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
      style={{ containerType: "inline-size", boxShadow: "0 0 80px -20px oklch(62% 0.15 265 / 0.15)" }}
    >
      <ChartCanvas data={chartData} chartInfo={{ location: locationName ?? undefined, latitude: location.lat, longitude: location.lon, timezone }} className="w-full h-full" />
      <DistributionOverlay chartData={chartData} />
    </div>
  );
}

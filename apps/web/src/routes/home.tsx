import { ChartWheel } from "@/components/home/chart-wheel";
import { PlanetCard } from "@/components/home/planet-card";
import { AspectGrid } from "@/components/home/aspect-grid";
import { MoonCard } from "@/components/home/moon-card";
import { RetrogradeTracker } from "@/components/home/retrograde-tracker";
import { PlanetaryHours } from "@/components/home/planetary-hours";
import { ElementModalityCard } from "@/components/home/element-modality-card";
import { AspectsTimeline } from "@/components/home/aspects-timeline";
import { useCurrentSky } from "@/hooks/use-current-sky";
import { useSettings } from "@/hooks/use-settings";
import { useReverseGeocode } from "@/hooks/use-reverse-geocode";
import { useTimezone } from "@/hooks/use-timezone";
import { formatDateTime } from "@/lib/format";

export function HomePage() {
  const sky = useCurrentSky();
  const timeFormat = useSettings((s) => s.appearance.timeFormat);
  const locationName = useReverseGeocode(sky.location.lat, sky.location.lon);
  const { display: timezone } = useTimezone(sky.location.lat, sky.location.lon);

  return (
    <div className="flex flex-col gap-phi-5 py-phi-5 px-phi-6">
      {/* Header row */}
      <div className="flex items-baseline gap-phi-3 animate-fade-in">
        <h1 className="text-2xl font-semibold text-foreground font-display">Today</h1>
        <span className="text-[15px] text-muted-foreground">{formatDateTime(new Date(), timeFormat)}</span>
        {locationName && (
          <span className="text-[15px] text-muted-foreground">· {locationName}</span>
        )}
      </div>

      {/* Top row: φ split — 61.8% left / 38.2% right */}
      <div className="flex gap-phi-5 items-start">
        <div className="flex flex-col gap-phi-4 min-w-0 animate-fade-in" style={{ flex: "1.618", animationDelay: "0.05s" }}>
          <ChartWheel sky={sky} locationName={locationName} timezone={timezone} />
          <AspectGrid chartData={sky.chartData} />
        </div>
        <div className="flex flex-col gap-phi-4 animate-fade-in" style={{ flex: "1", animationDelay: "0.1s" }}>
          <MoonCard />
          <PlanetaryHours lat={sky.location.lat} lon={sky.location.lon} />
          <PlanetCard chartData={sky.chartData} apiError={sky.apiError} retry={sky.retry} />
          <RetrogradeTracker />
          <ElementModalityCard chartData={sky.chartData} />
        </div>
      </div>

      {/* Aspects Timeline — full-width below */}
      <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <AspectsTimeline />
      </div>
    </div>
  );
}

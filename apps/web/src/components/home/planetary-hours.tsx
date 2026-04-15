import { useMemo, useState } from "react";
import { calculatePlanetaryHours } from "@/lib/planetary-hours";
import { PLANET_GLYPHS, formatTime } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const PLANET_NAMES: Record<string, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
};

const DAY_NAMES: Record<string, string> = {
  sun: "Sunday",
  moon: "Monday",
  mars: "Tuesday",
  mercury: "Wednesday",
  jupiter: "Thursday",
  venus: "Friday",
  saturn: "Saturday",
};

interface PlanetaryHoursProps {
  lat: number;
  lon: number;
}

export function PlanetaryHours({ lat, lon }: PlanetaryHoursProps) {
  const [expanded, setExpanded] = useState(false);
  const timeFormat = useSettings((s) => s.appearance.timeFormat);

  const result = useMemo(
    () => calculatePlanetaryHours(new Date(), lat, lon),
    [lat, lon],
  );

  if (!result) {
    return (
      <Card className="py-0">
        <CardContent className="px-0 p-phi-4">
        <h3 className="text-foreground font-semibold text-sm mb-phi-3 font-display">
          Planetary Hours
        </h3>
        <p className="text-muted-foreground text-sm">
          Planetary hours unavailable at this latitude.
        </p>
        </CardContent>
      </Card>
    );
  }

  const { dayRuler, currentHour, nextHour, allHours, sunrise, sunset } = result;

  const progress =
    (Date.now() - currentHour.start.getTime()) /
    (currentHour.end.getTime() - currentHour.start.getTime());

  const dayHours = allHours.filter((h) => h.isDay);
  const nightHours = allHours.filter((h) => !h.isDay);

  return (
    <Card
      className="card-hover cursor-pointer py-0"
      onClick={() => setExpanded((v) => !v)}
    >
      <CardContent className="px-0 p-phi-4">
      {!expanded ? (
        /* Compact view */
        <>
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <span className="text-primary">{PLANET_GLYPHS[dayRuler]}</span>
            <span className="text-foreground">Day of {PLANET_NAMES[dayRuler] ?? dayRuler}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-primary">{PLANET_GLYPHS[currentHour.planet]}</span>
            <span className="text-foreground">
              Hour of {PLANET_NAMES[currentHour.planet] ?? currentHour.planet}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-xs">
              until {formatTime(currentHour.end, timeFormat)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-phi-3 h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>

          {/* Next hour */}
          <div className="mt-phi-2 text-muted-foreground text-xs">
            next hour:{" "}
            <span className="text-primary">{PLANET_GLYPHS[nextHour.planet]}</span>{" "}
            {PLANET_NAMES[nextHour.planet] ?? nextHour.planet}
          </div>
        </>
      ) : (
        /* Expanded view */
        <>
          <div className="flex items-start justify-between mb-phi-3">
            <h3 className="text-foreground font-semibold text-sm font-display">
              Today's Planetary Hours
            </h3>
            <div className="text-muted-foreground text-xs shrink-0 ml-2">
              <span className="text-primary">{PLANET_GLYPHS[dayRuler]}</span>{" "}
              {DAY_NAMES[dayRuler] ?? ""}
            </div>
          </div>

          {/* Day hours section */}
          <div className="mb-phi-3">
            <p className="text-muted-foreground text-xs mb-phi-2">
              Day Hours (sunrise {formatTime(sunrise, timeFormat)} — sunset{" "}
              {formatTime(sunset, timeFormat)})
            </p>
            <div className="flex flex-col">
              {dayHours.map((hour) => {
                const isCurrent =
                  hour.planet === currentHour.planet &&
                  hour.start.getTime() === currentHour.start.getTime();
                return (
                  <div
                    key={`day-${hour.hourNumber}`}
                    className={`flex items-center gap-2 py-1 px-1 rounded text-sm ${
                      isCurrent ? "bg-muted" : ""
                    }`}
                  >
                    <span className="text-muted-foreground text-xs w-4 text-right shrink-0">
                      {hour.hourNumber}.
                    </span>
                    <span className="text-primary w-5 shrink-0">
                      {PLANET_GLYPHS[hour.planet]}
                    </span>
                    <span className="text-foreground flex-1">
                      {PLANET_NAMES[hour.planet] ?? hour.planet}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatTime(hour.start, timeFormat)} –{" "}
                      {formatTime(hour.end, timeFormat)}
                    </span>
                    {isCurrent && (
                      <span className="text-primary text-xs ml-1">current</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <Separator className="my-phi-3" />

          {/* Night hours section */}
          <div>
            <p className="text-muted-foreground text-xs mb-phi-2">
              Night Hours (sunset {formatTime(sunset, timeFormat)} — sunrise{" "}
              {formatTime(result.nextSunrise, timeFormat)})
            </p>
            <div className="flex flex-col">
              {nightHours.map((hour) => {
                const isCurrent =
                  hour.planet === currentHour.planet &&
                  hour.start.getTime() === currentHour.start.getTime();
                return (
                  <div
                    key={`night-${hour.hourNumber}`}
                    className={`flex items-center gap-2 py-1 px-1 rounded text-sm ${
                      isCurrent ? "bg-muted" : ""
                    }`}
                  >
                    <span className="text-muted-foreground text-xs w-4 text-right shrink-0">
                      {hour.hourNumber}.
                    </span>
                    <span className="text-primary w-5 shrink-0">
                      {PLANET_GLYPHS[hour.planet]}
                    </span>
                    <span className="text-foreground flex-1">
                      {PLANET_NAMES[hour.planet] ?? hour.planet}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatTime(hour.start, timeFormat)} –{" "}
                      {formatTime(hour.end, timeFormat)}
                    </span>
                    {isCurrent && (
                      <span className="text-primary text-xs ml-1">current</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      </CardContent>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { calculatePlanetaryHours } from "@/lib/planetary-hours";
import { PLANET_GLYPHS, formatTime } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

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
        <CardContent className="p-pad">
        <div className="card-title mb-3.5">Planetary Hours</div>
        <p className="text-muted-foreground text-[13px]">
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
      <CardContent className="p-pad">
        <div className="flex items-baseline justify-between mb-3.5">
          <div className="card-title">Planetary Hours</div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 border border-border text-[11px] text-muted-foreground">
            {DAY_NAMES[dayRuler] ?? ""}
          </span>
        </div>
        {/* Main row: big accent glyph · "Hour of {Planet}" · mono meta */}
        <div className="flex items-center gap-2">
          <span
            className="text-primary leading-none shrink-0"
            style={{ fontSize: "24px" }}
          >
            {PLANET_GLYPHS[currentHour.planet]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-foreground text-[14px] font-medium">
              Hour of {PLANET_NAMES[currentHour.planet] ?? currentHour.planet}
            </div>
            <div className="mono text-dim-foreground text-[11.5px] mt-0.5">
              until {formatTime(currentHour.end, timeFormat)} · next{" "}
              <span className="text-muted-foreground">
                {PLANET_GLYPHS[nextHour.planet]}
              </span>
            </div>
          </div>
        </div>

        {/* Thin progress bar (4px) */}
        <div className="h-1 bg-muted rounded-full mt-3.5 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>

        {/* Sunrise / sunset split */}
        <div className="mono text-dim-foreground text-[11px] mt-2 flex justify-between">
          <span>sunrise {formatTime(sunrise, timeFormat)}</span>
          <span>sunset {formatTime(sunset, timeFormat)}</span>
        </div>

        {/* Collapsible: full day/night hour list */}
        <Collapsible open={expanded}>
          <CollapsibleContent>
            <div className="flex items-start justify-between mt-3.5 mb-3.5">
              <div className="card-title">Today's Planetary Hours</div>
              <div className="text-muted-foreground text-[11px] shrink-0 ml-2">
                <span className="text-primary">{PLANET_GLYPHS[dayRuler]}</span>{" "}
                {DAY_NAMES[dayRuler] ?? ""}
              </div>
            </div>

            {/* Day hours section */}
            <div className="mb-3.5">
              <p className="text-muted-foreground text-[11px] mb-2">
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
                      className={`flex items-center gap-2 py-1 px-1 rounded text-[13px] ${
                        isCurrent ? "bg-muted" : ""
                      }`}
                    >
                      <span className="text-muted-foreground text-[11px] w-4 text-right shrink-0">
                        {hour.hourNumber}.
                      </span>
                      <span className="text-primary w-5 shrink-0">
                        {PLANET_GLYPHS[hour.planet]}
                      </span>
                      <span className="text-foreground flex-1">
                        {PLANET_NAMES[hour.planet] ?? hour.planet}
                      </span>
                      <span className="mono text-muted-foreground text-[11px]">
                        {formatTime(hour.start, timeFormat)} –{" "}
                        {formatTime(hour.end, timeFormat)}
                      </span>
                      {isCurrent && (
                        <span className="text-primary text-[11px] ml-1">current</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <Separator className="my-3.5" />

            {/* Night hours section */}
            <div>
              <p className="text-muted-foreground text-[11px] mb-2">
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
                      className={`flex items-center gap-2 py-1 px-1 rounded text-[13px] ${
                        isCurrent ? "bg-muted" : ""
                      }`}
                    >
                      <span className="text-muted-foreground text-[11px] w-4 text-right shrink-0">
                        {hour.hourNumber}.
                      </span>
                      <span className="text-primary w-5 shrink-0">
                        {PLANET_GLYPHS[hour.planet]}
                      </span>
                      <span className="text-foreground flex-1">
                        {PLANET_NAMES[hour.planet] ?? hour.planet}
                      </span>
                      <span className="mono text-muted-foreground text-[11px]">
                        {formatTime(hour.start, timeFormat)} –{" "}
                        {formatTime(hour.end, timeFormat)}
                      </span>
                      {isCurrent && (
                        <span className="text-primary text-[11px] ml-1">current</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

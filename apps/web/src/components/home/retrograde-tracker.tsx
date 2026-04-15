import { useMemo } from "react";
import { calculateApproximate } from "@astro-app/approx-engine";
import { CelestialBody } from "@astro-app/shared-types";
import { PLANET_GLYPHS } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

const PLANET_NAMES: Record<string, string> = {
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};

// Approximate station-direct dates for currently retrograde planets.
// These are rough estimates; precise dates come from the API.
const STATION_DIRECT_APPROX: Partial<Record<CelestialBody, string>> = {
  [CelestialBody.Mercury]: "Apr 7",
  [CelestialBody.Venus]: "Apr 12",
  [CelestialBody.Mars]: "Jun 2",
  [CelestialBody.Jupiter]: "Jun 12",
  [CelestialBody.Saturn]: "Nov 28",
  [CelestialBody.Uranus]: "Jan 30",
  [CelestialBody.Neptune]: "Dec 10",
  [CelestialBody.Pluto]: "Oct 12",
};

const RETROGRADE_BODIES = [
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
];

export function RetrogradeTracker() {
  const retroBodies = useMemo(() => {
    const chart = calculateApproximate(new Date(), 0, 0);
    return RETROGRADE_BODIES.filter((body) => {
      const pos = chart.positions[body];
      return pos && pos.speed_longitude < 0;
    });
  }, []);

  return (
    <Card className="card-hover">
      <CardContent className="p-phi-4">
      <h3 className="text-foreground font-semibold text-sm mb-phi-3 font-display">Retrograde Tracker</h3>
      {retroBodies.length === 0 ? (
        <p className="text-success text-sm">All planets direct ✓</p>
      ) : (
        <div className="flex flex-col gap-0">
          {retroBodies.map((body) => (
            <div
              key={body}
              className="flex items-center gap-2 py-2 border-b border-border last:border-0"
            >
              <span className="text-primary text-base w-5 shrink-0">
                {PLANET_GLYPHS[body]}
              </span>
              <span className="text-foreground text-sm">{PLANET_NAMES[body] ?? body}</span>
              <span className="text-destructive text-sm font-semibold">℞</span>
              <div className="flex-1" />
              {STATION_DIRECT_APPROX[body] && (
                <span className="text-muted-foreground text-xs">
                  direct {STATION_DIRECT_APPROX[body]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      </CardContent>
    </Card>
  );
}

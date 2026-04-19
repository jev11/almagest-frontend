import { useMemo } from "react";
import {
  calculateBodyPosition,
  nextEclipse,
} from "@astro-app/approx-engine";
import { CelestialBody, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import { SIGN_GLYPHS, longitudeToZp } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

const ELEMENT_COLORS: Record<Element, string> = {
  [Element.Fire]: "var(--color-fire)",
  [Element.Earth]: "var(--color-earth)",
  [Element.Air]: "var(--color-air)",
  [Element.Water]: "var(--color-water)",
};

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function EclipseCard() {
  const { kind, peak, zp, daysUntil } = useMemo(() => {
    const now = new Date();
    const e = nextEclipse(now);
    const body =
      e.kind === "solar" ? CelestialBody.Sun : CelestialBody.Moon;
    const pos = calculateBodyPosition(e.peak, body);
    const z = longitudeToZp(pos.longitude);
    const days = Math.round(
      (e.peak.getTime() - now.getTime()) / 86_400_000,
    );
    return { kind: e.kind, peak: e.peak, zp: z, daysUntil: days };
  }, []);

  const signColor = ELEMENT_COLORS[SIGN_ELEMENT[zp.sign]];

  return (
    <Card className="card-hover animate-fade-in py-0">
      <CardContent className="p-pad">
        <div className="card-title mb-3.5">Next Eclipse</div>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-[28px] leading-none" aria-hidden>
            🌍
          </span>
          <div className="font-display text-foreground text-[28px] leading-none">
            {kind === "solar" ? "Solar" : "Lunar"}
          </div>
        </div>

        <div className="mono text-xs text-muted-foreground flex items-center gap-1.5">
          <span>{formatShortDate(peak)}</span>
          <span className="text-dim-foreground">·</span>
          <span className="flex items-center gap-1">
            <span style={{ color: signColor }}>{SIGN_GLYPHS[zp.sign]}</span>
            <span className="tabular-nums">
              {zp.degree}°{zp.minute.toString().padStart(2, "0")}
              {"\u2032"}
            </span>
          </span>
          <span className="text-dim-foreground">·</span>
          <span>in {daysUntil}d</span>
        </div>
      </CardContent>
    </Card>
  );
}

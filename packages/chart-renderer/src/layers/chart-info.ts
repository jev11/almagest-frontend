import { CelestialBody } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "./types.js";

export interface ChartInfo {
  /** City / place name, e.g. "Ekaterinburg, Russia" */
  location?: string;
  /** Decimal degrees, positive = North */
  latitude?: number;
  /** Decimal degrees, positive = East */
  longitude?: number;
  /** IANA timezone name, e.g. "Europe/Amsterdam" */
  timezone?: string;
}

const HOUSE_SYSTEM_LABELS: Record<string, string> = {
  placidus:       "Placidus",
  koch:           "Koch",
  whole_sign:     "Whole Sign",
  equal:          "Equal",
  campanus:       "Campanus",
  regiomontanus:  "Regiomontanus",
  porphyry:       "Porphyry",
  morinus:        "Morinus",
  alcabitius:     "Alcabitius",
  topocentric:    "Topocentric",
};

function formatLat(lat: number): string {
  const abs = Math.abs(lat);
  const deg = Math.floor(abs);
  const min = Math.round((abs - deg) * 60);
  return `${deg}°${lat >= 0 ? "N" : "S"}${String(min).padStart(2, "0")}'`;
}

function formatLon(lon: number): string {
  const abs = Math.abs(lon);
  const deg = Math.floor(abs);
  const min = Math.round((abs - deg) * 60);
  return `${String(deg).padStart(3, "0")}°${lon >= 0 ? "E" : "W"}${String(min).padStart(2, "0")}'`;
}

export function drawChartInfo(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
  info: ChartInfo,
): void {
  const { cx, radius } = dim;

  const fontSize = Math.round(radius * 0.036);
  if (fontSize < 4) return; // too small to read — skip rendering
  const lineHeight = Math.round(fontSize * 1.5);
  const margin = Math.round(radius * 0.04);

  const { zodiac_type, house_system, ayanamsa } = data.metadata;
  const hasTrueNode = CelestialBody.TrueNorthNode in data.positions;
  const hasMeanNode = CelestialBody.MeanNorthNode in data.positions;

  const leftLines: string[] = [];
  if (info.location) leftLines.push(info.location);
  if (info.latitude !== undefined && info.longitude !== undefined) {
    leftLines.push(`${formatLat(info.latitude)}  ${formatLon(info.longitude)}`);
  }
  if (info.timezone) leftLines.push(info.timezone);

  const rightLines: string[] = [
    zodiac_type === "sidereal" ? (ayanamsa ? `Sidereal · ${ayanamsa}` : "Sidereal") : "Tropical",
    HOUSE_SYSTEM_LABELS[house_system] ?? house_system,
    hasTrueNode && !hasMeanNode ? "True Node" : "Mean Node",
  ];

  ctx.save();
  ctx.textBaseline = "top";
  ctx.font = `${fontSize}px ${theme.fontFamily}`;
  ctx.fillStyle = theme.degreeLabelColor;

  // Upper-left: location + coordinates
  if (leftLines.length > 0) {
    ctx.textAlign = "left";
    let y = margin + fontSize * 0.5;
    for (const line of leftLines) {
      ctx.fillText(line, margin, y);
      y += lineHeight;
    }
  }

  // Upper-right: chart settings
  ctx.textAlign = "right";
  const rightX = cx * 2 - margin;
  let y = margin + fontSize * 0.5;
  for (const line of rightLines) {
    ctx.fillText(line, rightX, y);
    y += lineHeight;
  }

  ctx.restore();
}

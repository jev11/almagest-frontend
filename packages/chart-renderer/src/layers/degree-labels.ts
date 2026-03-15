import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "./types.js";

// Degree labels are now drawn in planet-ring.ts alongside each planet glyph.
export function drawDegreeLabels(
  _ctx: CanvasRenderingContext2D,
  _data: ChartData,
  _theme: ChartTheme,
  _dim: RenderDimensions,
): void {}

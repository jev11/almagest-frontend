import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "./types.js";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  _data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void {
  // After high-DPI setup, the context is scaled by dpr.
  // Use CSS dimensions (canvas physical size / dpr) for correct fill.
  const canvas = ctx.canvas;
  const cssWidth = canvas.width / dim.dpr;
  const cssHeight = canvas.height / dim.dpr;
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, cssWidth, cssHeight);
}

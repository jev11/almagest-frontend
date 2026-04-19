import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";

/**
 * Per-render density parameters. Omit to use each layer's built-in defaults
 * (preserves behavior for non-web consumers). The web app supplies this by
 * reading --chart-* CSS vars from the chart container.
 */
export interface ChartDensity {
  /** Multiplier on stroke/line weights. Default: 1. */
  stroke: number;
  /** Multiplier on glyph size (planets, signs, aspect symbols). Default: 1. */
  glyphScale: number;
  /** Label font size in CSS pixels (used for degree labels, angle labels). Default: 12. */
  labelSize: number;
}

export const DEFAULT_CHART_DENSITY: ChartDensity = {
  stroke: 1,
  glyphScale: 1,
  labelSize: 12,
};

export interface RenderDimensions {
  /** Center x of the wheel */
  cx: number;
  /** Center y of the wheel */
  cy: number;
  /** Total radius of the wheel */
  radius: number;
  /** Device pixel ratio for high-DPI rendering */
  dpr: number;
  /**
   * Density parameters (stroke multiplier, glyph scale, label size in px).
   * Defaults to `DEFAULT_CHART_DENSITY` when the caller does not supply one,
   * so layer functions can always rely on `dim.density` without null checks.
   */
  density: ChartDensity;
}

export type LayerFunction = (
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
) => void;

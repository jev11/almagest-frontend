import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import {
  DEFAULT_CHART_DENSITY,
  type ChartDensity,
  type RenderDimensions,
} from "../layers/types.js";
import { drawBackground } from "../layers/background.js";
import { drawZodiacRing } from "../layers/zodiac-ring.js";
import { drawHouseOverlay } from "../layers/house-overlay.js";
import { drawPlanetRing } from "../layers/planet-ring.js";
import { drawAspectWeb } from "../layers/aspect-web.js";
import { drawTransitRing, drawInterChartAspects } from "../charts/biwheel.js";
import { drawChartInfo, type ChartInfo } from "../layers/chart-info.js";
import { RING_PROPORTIONS } from "./constants.js";

export interface RenderOptions {
  /** Chart data from the API */
  data: ChartData;
  /** Visual theme */
  theme: ChartTheme;
  /** Canvas element to render on */
  canvas: HTMLCanvasElement;
  /** Which layers to render (default: all enabled) */
  layers?: {
    background?: boolean;
    zodiacRing?: boolean;
    houseOverlay?: boolean;
    planetRing?: boolean;
    aspectWeb?: boolean;
  };
  /** Padding around the wheel in CSS pixels */
  padding?: number;
  /** Optional metadata shown in the upper-right corner */
  chartInfo?: ChartInfo;
  /**
   * Adaptive density knobs (stroke multiplier, glyph scale, label px size).
   * Omitted keys fall back to `DEFAULT_CHART_DENSITY` — pre-existing
   * consumers see no behavioral change.
   */
  density?: Partial<ChartDensity>;
}

/** Merge a partial density with defaults. Shared by renderRadix / renderBiwheel. */
function resolveDensity(partial: Partial<ChartDensity> | undefined): ChartDensity {
  if (!partial) return { ...DEFAULT_CHART_DENSITY };
  return {
    stroke: partial.stroke ?? DEFAULT_CHART_DENSITY.stroke,
    glyphScale: partial.glyphScale ?? DEFAULT_CHART_DENSITY.glyphScale,
    labelSize: partial.labelSize ?? DEFAULT_CHART_DENSITY.labelSize,
  };
}

export type { ChartInfo };

/**
 * Render a natal chart wheel on the given canvas.
 *
 * Steps:
 * 1. Calculate dimensions from canvas CSS size and padding
 * 2. Set up high-DPI rendering (multiply by devicePixelRatio)
 * 3. Call each enabled layer function in order
 * 4. Return the render dimensions for hit-testing
 */
export function renderRadix(options: RenderOptions): RenderDimensions {
  const { data, theme, canvas, padding = 20 } = options;
  const layers = {
    background: true,
    zodiacRing: true,
    houseOverlay: true,
    planetRing: true,
    aspectWeb: true,
    ...options.layers,
  };

  // High-DPI setup
  const dpr =
    (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  const cssWidth = canvas.clientWidth || canvas.width;
  const cssHeight = canvas.clientHeight || canvas.height;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context");

  ctx.scale(dpr, dpr);

  // Wheel dimensions (in CSS pixels)
  const cx = cssWidth / 2;
  const cy = cssHeight / 2;
  const radius = Math.min(cssWidth, cssHeight) / 2 - padding;

  const density = resolveDensity(options.density);
  const dim: RenderDimensions = { cx, cy, radius, dpr, density };

  // Render layers in order (back to front)
  if (layers.background) drawBackground(ctx, data, theme, dim);
  if (layers.zodiacRing) drawZodiacRing(ctx, data, theme, dim);
  if (layers.houseOverlay) drawHouseOverlay(ctx, data, theme, dim);
  if (layers.aspectWeb) drawAspectWeb(ctx, data, theme, dim);
  if (layers.planetRing) drawPlanetRing(ctx, data, theme, dim);
  if (options.chartInfo) drawChartInfo(ctx, data, theme, dim, options.chartInfo);

  return dim;
}

/**
 * Render a bi-wheel (inner natal + outer transit/synastry).
 *
 * Layout (from outside in):
 *   - Outer zodiac ring            (full radius, natal ascendant orientation)
 *   - Transit planet ring          (annular zone between separator and zodiac inner edge)
 *   - Separator ring               (at innerRadius × zodiacInner fraction)
 *   - Inner natal chart            (house overlay, natal aspects, inter-chart aspects, planets)
 *
 * Transit planets are positioned using the natal ascendant so both rings share
 * the same zodiac orientation. Inter-chart aspects are drawn as dashed lines
 * within the inner aspect circle to distinguish them from natal-natal aspects.
 */
export function renderBiwheel(
  options: RenderOptions & { outerData: ChartData },
): RenderDimensions {
  const { data, theme, canvas, outerData, padding = 20 } = options;

  const dpr =
    (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  const cssWidth = canvas.clientWidth || canvas.width;
  const cssHeight = canvas.clientHeight || canvas.height;

  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context");

  ctx.scale(dpr, dpr);

  const cx = cssWidth / 2;
  const cy = cssHeight / 2;
  const totalRadius = Math.min(cssWidth, cssHeight) / 2 - padding;

  // Inner natal chart occupies 65% of total radius
  const innerRadius = totalRadius * 0.65;

  // The separator ring sits at the inner chart's zodiac inner edge.
  // This is where inner planet tick marks naturally land, so the separator
  // doubles as their reference circle — no extra visual circle needed.
  const separatorR = innerRadius * RING_PROPORTIONS.zodiacInner;

  const density = resolveDensity(options.density);
  const innerDim: RenderDimensions = { cx, cy, radius: innerRadius, dpr, density };
  const outerDim: RenderDimensions = { cx, cy, radius: totalRadius, dpr, density };

  // 1. Background at full size
  drawBackground(ctx, data, theme, outerDim);

  // 2. Outer zodiac ring oriented to the natal chart's ascendant
  drawZodiacRing(ctx, data, theme, outerDim);

  // 3. Transit planets in the annular zone [separatorR, zodiacInnerR]
  drawTransitRing(ctx, outerData, data.houses.ascendant, theme, outerDim, separatorR);

  // 4. Separator ring — slightly bolder than regular ring lines
  ctx.beginPath();
  ctx.arc(cx, cy, separatorR, 0, Math.PI * 2);
  ctx.strokeStyle = theme.ringStroke;
  ctx.lineWidth = theme.ringStrokeWidth * 2 * density.stroke;
  ctx.stroke();

  // 5. Inner natal chart — clipped to the separator so no elements leak outward
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, separatorR, 0, Math.PI * 2);
  ctx.clip();

  drawHouseOverlay(ctx, data, theme, innerDim);
  drawAspectWeb(ctx, data, theme, innerDim);
  drawInterChartAspects(ctx, data, outerData, theme, innerDim);
  drawPlanetRing(ctx, data, theme, innerDim);

  ctx.restore();

  if (options.chartInfo) drawChartInfo(ctx, data, theme, outerDim, options.chartInfo);

  return outerDim;
}

/**
 * Utility: re-render only the aspect layer on an existing context.
 * Useful for interactive toggling without a full redraw.
 */
export function renderAspectLayer(
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
): void {
  drawAspectWeb(ctx, data, theme, dim);
}

import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "../layers/types.js";
import { drawBackground } from "../layers/background.js";
import { drawZodiacRing } from "../layers/zodiac-ring.js";
import { drawHouseOverlay } from "../layers/house-overlay.js";
import { drawPlanetRing } from "../layers/planet-ring.js";
import { drawAspectWeb } from "../layers/aspect-web.js";
import { drawDegreeLabels } from "../layers/degree-labels.js";

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
    degreeLabels?: boolean;
  };
  /** Padding around the wheel in CSS pixels */
  padding?: number;
}

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
    degreeLabels: true,
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

  const dim: RenderDimensions = { cx, cy, radius, dpr };

  // Render layers in order (back to front)
  if (layers.background) drawBackground(ctx, data, theme, dim);
  if (layers.zodiacRing) drawZodiacRing(ctx, data, theme, dim);
  if (layers.houseOverlay) drawHouseOverlay(ctx, data, theme, dim);
  if (layers.aspectWeb) drawAspectWeb(ctx, data, theme, dim);
  if (layers.planetRing) drawPlanetRing(ctx, data, theme, dim);
  if (layers.degreeLabels) drawDegreeLabels(ctx, data, theme, dim);

  return dim;
}

/**
 * Render a bi-wheel (inner natal + outer transit/synastry).
 * The inner wheel is rendered at a reduced radius.
 * The outer ring shows the second chart's planet positions.
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

  // Inner chart at 65% of total radius
  const innerRadius = totalRadius * 0.65;

  const innerDim: RenderDimensions = { cx, cy, radius: innerRadius, dpr };
  const outerDim: RenderDimensions = { cx, cy, radius: totalRadius, dpr };

  // Draw background and zodiac ring at full radius
  drawBackground(ctx, data, theme, outerDim);
  drawZodiacRing(ctx, data, theme, outerDim);

  // Draw inner (natal) chart elements at reduced radius
  drawHouseOverlay(ctx, data, theme, innerDim);
  drawAspectWeb(ctx, data, theme, innerDim);
  drawPlanetRing(ctx, data, theme, innerDim);

  // Draw outer (transit) planet ring at ~80% of total radius
  // Scale the outer planet ring to sit between the inner chart and the zodiac ring
  const transitScale = 0.80 / RING_PROPORTIONS_ZODIAC_INNER_FRACTION;
  const transitDim: RenderDimensions = {
    cx,
    cy,
    radius: totalRadius * transitScale,
    dpr,
  };
  drawPlanetRing(ctx, outerData, theme, transitDim);

  return outerDim;
}

// The zodiac inner ring is at 0.783 of radius; we want transit planets at ~0.80
const RING_PROPORTIONS_ZODIAC_INNER_FRACTION = 0.783;

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

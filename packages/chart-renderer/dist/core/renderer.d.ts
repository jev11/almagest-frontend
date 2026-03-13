import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";
import type { RenderDimensions } from "../layers/types.js";
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
export declare function renderRadix(options: RenderOptions): RenderDimensions;
/**
 * Render a bi-wheel (inner natal + outer transit/synastry).
 * The inner wheel is rendered at a reduced radius.
 * The outer ring shows the second chart's planet positions.
 */
export declare function renderBiwheel(options: RenderOptions & {
    outerData: ChartData;
}): RenderDimensions;
/**
 * Utility: re-render only the aspect layer on an existing context.
 * Useful for interactive toggling without a full redraw.
 */
export declare function renderAspectLayer(ctx: CanvasRenderingContext2D, data: ChartData, theme: ChartTheme, dim: RenderDimensions): void;
//# sourceMappingURL=renderer.d.ts.map
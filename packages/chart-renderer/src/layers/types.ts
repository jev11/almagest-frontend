import type { ChartData } from "@astro-app/shared-types";
import type { ChartTheme } from "../themes/types.js";

export interface RenderDimensions {
  /** Center x of the wheel */
  cx: number;
  /** Center y of the wheel */
  cy: number;
  /** Total radius of the wheel */
  radius: number;
  /** Device pixel ratio for high-DPI rendering */
  dpr: number;
}

export type LayerFunction = (
  ctx: CanvasRenderingContext2D,
  data: ChartData,
  theme: ChartTheme,
  dim: RenderDimensions,
) => void;

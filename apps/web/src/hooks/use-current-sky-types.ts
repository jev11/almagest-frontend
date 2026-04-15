import type { ChartData } from "@astro-app/shared-types";

export interface CurrentSkyState {
  chartData: ChartData | null;
  location: { lat: number; lon: number };
  ready: boolean;
  apiError: boolean;
  retry: () => void;
}

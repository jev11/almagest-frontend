import { create } from "zustand";
import type { ChartData } from "@astro-app/shared-types";

const LOCATION_CACHE_KEY = "astro-cached-location";
const DEFAULT_LAT = 51.5074; // London
const DEFAULT_LON = -0.1278;
const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface CachedLocation {
  lat: number;
  lon: number;
}

function readCachedLocation(): CachedLocation {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedLocation;
      if (typeof parsed.lat === "number" && typeof parsed.lon === "number") {
        return parsed;
      }
    }
  } catch {
    // Corrupted cache — ignore
  }
  return { lat: DEFAULT_LAT, lon: DEFAULT_LON };
}

interface SkyStore {
  chartData: ChartData | null;
  location: CachedLocation;
  ready: boolean;
  apiError: boolean;
  updatedAt: number | null;

  setChartData: (data: ChartData) => void;
  setLocation: (lat: number, lon: number) => void;
  setApiError: (error: boolean) => void;
  reset: () => void;
  isStale: () => boolean;
}

function buildInitialState() {
  return {
    chartData: null as ChartData | null,
    location: readCachedLocation(),
    ready: false,
    apiError: false,
    updatedAt: null as number | null,
  };
}

export const useSkyStore = create<SkyStore>()((set, get) => ({
  ...buildInitialState(),

  setChartData: (data) => set({ chartData: data, ready: true, updatedAt: Date.now() }),

  setLocation: (lat, lon) => {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ lat, lon }));
    set({ location: { lat, lon } });
  },

  setApiError: (error) => set({ apiError: error, ready: true }),

  reset: () => set({ chartData: null, ready: false, apiError: false, updatedAt: null }),

  isStale: () => {
    const { updatedAt } = get();
    if (updatedAt === null) return true;
    return Date.now() - updatedAt > STALE_MS;
  },
}));

// Override getInitialState so tests can reset the store and re-read localStorage
useSkyStore.getInitialState = buildInitialState as typeof useSkyStore.getInitialState;

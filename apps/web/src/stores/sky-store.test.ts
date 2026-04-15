import { describe, it, expect, beforeEach } from "vitest";
import { useSkyStore } from "./sky-store";
import type { ChartData } from "@astro-app/shared-types";

// Minimal stub satisfying the ChartData shape for testing
const STUB_CHART = { positions: {}, zodiac_positions: {}, aspects: [], houses: {} } as unknown as ChartData;

describe("sky-store", () => {
  beforeEach(() => {
    useSkyStore.setState(useSkyStore.getInitialState());
    localStorage.clear();
  });

  it("starts with no chart data and not ready", () => {
    const state = useSkyStore.getState();
    expect(state.chartData).toBeNull();
    expect(state.ready).toBe(false);
  });

  it("setChartData marks store as ready", () => {
    useSkyStore.getState().setChartData(STUB_CHART);
    const state = useSkyStore.getState();
    expect(state.chartData).toBe(STUB_CHART);
    expect(state.ready).toBe(true);
  });

  it("preserves existing data when setLocation is called", () => {
    useSkyStore.getState().setChartData(STUB_CHART);
    useSkyStore.getState().setLocation(40.7, -74.0);
    expect(useSkyStore.getState().chartData).toBe(STUB_CHART);
  });

  it("setLocation persists to localStorage", () => {
    useSkyStore.getState().setLocation(40.7, -74.0);
    const cached = JSON.parse(localStorage.getItem("astro-cached-location") ?? "null");
    expect(cached).toEqual({ lat: 40.7, lon: -74.0 });
  });

  it("reads cached location from localStorage on creation", () => {
    localStorage.setItem("astro-cached-location", JSON.stringify({ lat: 48.8, lon: 2.3 }));
    // Re-create store state from initial
    useSkyStore.setState(useSkyStore.getInitialState());
    const state = useSkyStore.getState();
    expect(state.location.lat).toBe(48.8);
    expect(state.location.lon).toBe(2.3);
  });

  it("isStale returns true when no data", () => {
    expect(useSkyStore.getState().isStale()).toBe(true);
  });

  it("isStale returns false right after setting chart data", () => {
    useSkyStore.getState().setChartData(STUB_CHART);
    expect(useSkyStore.getState().isStale()).toBe(false);
  });
});

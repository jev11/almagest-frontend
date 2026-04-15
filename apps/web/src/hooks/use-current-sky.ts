import { useEffect, useCallback, useRef } from "react";
import { calculateApproximate, calculateAspects } from "@astro-app/approx-engine";
import { useAstroClient } from "@astro-app/astro-client";
import type { HouseSystem, ZodiacType } from "@astro-app/shared-types";
import { useSkyStore } from "@/stores/sky-store";
import { useSettings } from "@/hooks/use-settings";

export type { CurrentSkyState } from "./use-current-sky-types";

export function useCurrentSky() {
  const client = useAstroClient();
  const chartData = useSkyStore((s) => s.chartData);
  const location = useSkyStore((s) => s.location);
  const ready = useSkyStore((s) => s.ready);
  const apiError = useSkyStore((s) => s.apiError);
  const aspectSettings = useSettings((s) => s.aspects);
  const defaults = useSettings((s) => s.defaults);
  const aspectRef = useRef(aspectSettings);
  aspectRef.current = aspectSettings;

  // 1. If store already has fresh data, skip everything
  // 2. Otherwise, calculate approximate immediately with cached/default location
  useEffect(() => {
    const state = useSkyStore.getState();
    if (!state.isStale()) return;

    try {
      const settings = aspectRef.current;
      const approx = calculateApproximate(
        new Date(),
        state.location.lat,
        state.location.lon,
        { orbOverrides: settings.orbs, includeMinor: settings.showMinor },
      );
      state.setChartData(approx);
    } catch {
      // approx failure; precise fetch may still succeed
    }
  }, []); // Run once on mount — location is already in store

  // Resolve geolocation in background, update store if it differs
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const state = useSkyStore.getState();
        if (
          Math.abs(state.location.lat - latitude) > 0.01 ||
          Math.abs(state.location.lon - longitude) > 0.01
        ) {
          state.setLocation(latitude, longitude);
          try {
            const settings = aspectRef.current;
            const approx = calculateApproximate(new Date(), latitude, longitude, {
              orbOverrides: settings.orbs,
              includeMinor: settings.showMinor,
            });
            state.setChartData(approx);
          } catch {
            // ignore
          }
        }
      },
      () => {
        // Permission denied or error — keep cached/default location
      },
      { timeout: 5000 },
    );
  }, []); // Run once on mount

  // Recalculate aspects when settings change
  useEffect(() => {
    const state = useSkyStore.getState();
    try {
      const approx = calculateApproximate(new Date(), state.location.lat, state.location.lon, {
        orbOverrides: aspectSettings.orbs,
        includeMinor: aspectSettings.showMinor,
      });
      state.setChartData(approx);
    } catch {
      // ignore
    }
  }, [aspectSettings]); // Only re-run when aspect settings actually change

  // Fetch precise data from API in background
  const fetchPrecise = useCallback(async () => {
    const now = new Date();
    const state = useSkyStore.getState();
    const { lat, lon } = state.location;
    const currentDefaults = useSettings.getState().defaults;
    state.setApiError(false);
    try {
      const response = await client.calculateNatal({
        datetime: now.toISOString(),
        latitude: lat,
        longitude: lon,
        house_system: currentDefaults.houseSystem as HouseSystem,
        zodiac_type: currentDefaults.zodiacType as ZodiacType,
      });
      // Re-apply user's aspect settings to the precise API data.
      // The API returns aspects with server defaults — recalculate from
      // the precise positions returned by the API to honor orb overrides.
      const settings = aspectRef.current;
      const recalculatedAspects = calculateAspects(
        response.positions,
        settings.orbs,
        settings.showMinor,
      );
      useSkyStore.getState().setChartData({
        ...response,
        aspects: recalculatedAspects,
      });
    } catch {
      useSkyStore.getState().setApiError(true);
    }
  }, [client]);

  // Always fetch precise on mount — the approx effect above sets updatedAt
  // before this effect runs, so isStale() would return false and skip the
  // fetch. A ref ensures we attempt the API call exactly once per mount.
  const preciseFetchedRef = useRef(false);
  useEffect(() => {
    if (preciseFetchedRef.current) return;
    preciseFetchedRef.current = true;
    void fetchPrecise();
  }, [fetchPrecise]);

  // Re-fetch precise data when geolocation updates the location
  const prevLocationRef = useRef(location);
  useEffect(() => {
    if (prevLocationRef.current === location) return;
    prevLocationRef.current = location;
    void fetchPrecise();
  }, [location, fetchPrecise]);

  // Re-fetch when chart defaults (house system, zodiac type, node type) change.
  // Reset the sky store so stale data with old settings is not briefly shown.
  const prevDefaultsRef = useRef(defaults);
  useEffect(() => {
    if (prevDefaultsRef.current === defaults) return; // skip initial mount
    prevDefaultsRef.current = defaults;
    useSkyStore.getState().reset();
    // Recalculate approx immediately with current location
    const { lat, lon } = useSkyStore.getState().location;
    try {
      const settings = aspectRef.current;
      const approx = calculateApproximate(new Date(), lat, lon, {
        orbOverrides: settings.orbs,
        includeMinor: settings.showMinor,
      });
      useSkyStore.getState().setChartData(approx);
    } catch { /* ignore */ }
    void fetchPrecise();
  }, [defaults, fetchPrecise]);

  return {
    chartData,
    location,
    ready,
    apiError,
    retry: () => void fetchPrecise(),
  };
}

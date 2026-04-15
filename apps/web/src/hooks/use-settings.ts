import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppSettings {
  defaults: {
    houseSystem: string;
    zodiacType: string;
    nodeType: "mean" | "true";
    ayanamsa: string | null;
  };
  appearance: {
    theme: "dark" | "light" | "system";
    chartStyle: "modern" | "classic";
    timeFormat: "12h" | "24h";
  };
  aspects: {
    showMinor: boolean;
    orbs: Record<string, number>;
  };
}

export interface SettingsStore extends AppSettings {
  setDefaults: (defaults: Partial<AppSettings["defaults"]>) => void;
  setTheme: (theme: AppSettings["appearance"]["theme"]) => void;
  setChartStyle: (chartStyle: AppSettings["appearance"]["chartStyle"]) => void;
  setTimeFormat: (timeFormat: AppSettings["appearance"]["timeFormat"]) => void;
  setAspectOrb: (aspect: string, orb: number) => void;
  toggleMinorAspects: () => void;
  resetAll: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      defaults: {
        houseSystem: "placidus",
        zodiacType: "tropical",
        nodeType: "mean",
        ayanamsa: null,
      },
      appearance: {
        theme: "dark",
        chartStyle: "modern",
        timeFormat: "24h",
      },
      aspects: {
        showMinor: false,
        orbs: {
          conjunction: 8,
          opposition: 8,
          trine: 8,
          square: 8,
          sextile: 4,
          semi_square: 2,
          sesquiquadrate: 2,
          semi_sextile: 2,
          quincunx: 2,
        },
      },
      setDefaults: (defaults) =>
        set((s) => ({ defaults: { ...s.defaults, ...defaults } })),
      setTheme: (theme) =>
        set((s) => ({ appearance: { ...s.appearance, theme } })),
      setChartStyle: (chartStyle) =>
        set((s) => ({ appearance: { ...s.appearance, chartStyle } })),
      setTimeFormat: (timeFormat) =>
        set((s) => ({ appearance: { ...s.appearance, timeFormat } })),
      setAspectOrb: (aspect, orb) =>
        set((s) => ({
          aspects: { ...s.aspects, orbs: { ...s.aspects.orbs, [aspect]: orb } },
        })),
      toggleMinorAspects: () =>
        set((s) => ({
          aspects: { ...s.aspects, showMinor: !s.aspects.showMinor },
        })),
      resetAll: () =>
        set({
          defaults: { houseSystem: "placidus", zodiacType: "tropical", nodeType: "mean", ayanamsa: null },
          appearance: { theme: "dark", chartStyle: "modern", timeFormat: "24h" },
          aspects: {
            showMinor: false,
            orbs: {
              conjunction: 8, opposition: 8, trine: 8, square: 8,
              sextile: 4, semi_square: 2, sesquiquadrate: 2, semi_sextile: 2, quincunx: 2,
            },
          },
        }),
    }),
    {
      name: "astro-settings",
      version: 4,
      migrate(persisted, version) {
        if (version === 0) {
          const state = persisted as Record<string, unknown>;
          const aspects = state.aspects as { showMinor: boolean; orbs: Record<string, number> } | undefined;
          const defaultOrbs: Record<string, number> = {
            conjunction: 8, opposition: 8, trine: 8, square: 8,
            sextile: 4, semi_square: 2, sesquiquadrate: 2, semi_sextile: 2, quincunx: 2,
          };
          return {
            ...state,
            aspects: {
              showMinor: aspects?.showMinor ?? false,
              orbs: { ...defaultOrbs, ...aspects?.orbs },
            },
          };
        }
        if (version === 1 || version === 2) {
          const state = persisted as Record<string, unknown>;
          const appearance = state.appearance as Record<string, unknown> | undefined;
          const defaults = state.defaults as Record<string, unknown> | undefined;
          const aspects = state.aspects as { showMinor?: boolean; orbs?: Record<string, number> } | undefined;
          const defaultOrbs: Record<string, number> = {
            conjunction: 8, opposition: 8, trine: 8, square: 8,
            sextile: 4, semi_square: 2, sesquiquadrate: 2, semi_sextile: 2, quincunx: 2,
          };
          return {
            ...state,
            defaults: {
              ...defaults,
              nodeType: (defaults?.nodeType as string) ?? "mean",
            },
            appearance: {
              ...appearance,
              timeFormat: (appearance?.timeFormat as string) ?? "24h",
            },
            aspects: {
              showMinor: aspects?.showMinor ?? false,
              orbs: { ...defaultOrbs, ...aspects?.orbs },
            },
          };
        }
        if (version === 3) {
          const state = persisted as Record<string, unknown>;
          const aspects = state.aspects as { showMinor?: boolean; orbs?: Record<string, number> } | undefined;
          const defaultOrbs: Record<string, number> = {
            conjunction: 8, opposition: 8, trine: 8, square: 8,
            sextile: 4, semi_square: 2, sesquiquadrate: 2, semi_sextile: 2, quincunx: 2,
          };
          return {
            ...state,
            aspects: {
              showMinor: aspects?.showMinor ?? false,
              orbs: { ...defaultOrbs, ...aspects?.orbs },
            },
          };
        }
        return persisted;
      },
    },
  ),
);

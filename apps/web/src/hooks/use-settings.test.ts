import { describe, it, expect, beforeEach } from "vitest";
import { useSettings } from "./use-settings";

const DEFAULT_ORBS = {
  conjunction: 8, opposition: 8, trine: 8, square: 8,
  sextile: 4, semi_square: 2, sesquiquadrate: 2, semi_sextile: 2, quincunx: 2,
};

describe("use-settings store", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset to initial state
    useSettings.setState({
      defaults: { houseSystem: "placidus", zodiacType: "tropical", nodeType: "mean" as const, ayanamsa: null },
      appearance: { theme: "dark", chartStyle: "modern", timeFormat: "24h" as const },
      aspects: { showMinor: false, orbs: { ...DEFAULT_ORBS } },
    });
  });

  describe("defaults", () => {
    it("has correct initial values", () => {
      const { defaults } = useSettings.getState();
      expect(defaults.houseSystem).toBe("placidus");
      expect(defaults.zodiacType).toBe("tropical");
      expect(defaults.ayanamsa).toBeNull();
    });

    it("setDefaults updates partial values", () => {
      useSettings.getState().setDefaults({ houseSystem: "koch" });
      const { defaults } = useSettings.getState();
      expect(defaults.houseSystem).toBe("koch");
      expect(defaults.zodiacType).toBe("tropical"); // unchanged
    });
  });

  describe("appearance", () => {
    it("setTheme updates theme", () => {
      useSettings.getState().setTheme("light");
      expect(useSettings.getState().appearance.theme).toBe("light");
    });

    it("setChartStyle updates chart style", () => {
      useSettings.getState().setChartStyle("classic");
      expect(useSettings.getState().appearance.chartStyle).toBe("classic");
    });
  });

  describe("aspects", () => {
    it("has all 9 default orbs", () => {
      const { orbs } = useSettings.getState().aspects;
      expect(Object.keys(orbs)).toHaveLength(9);
      expect(orbs).toEqual(DEFAULT_ORBS);
    });

    it("setAspectOrb updates a single orb", () => {
      useSettings.getState().setAspectOrb("conjunction", 12);
      expect(useSettings.getState().aspects.orbs.conjunction).toBe(12);
      expect(useSettings.getState().aspects.orbs.opposition).toBe(8); // unchanged
    });

    it("toggleMinorAspects flips the flag", () => {
      expect(useSettings.getState().aspects.showMinor).toBe(false);
      useSettings.getState().toggleMinorAspects();
      expect(useSettings.getState().aspects.showMinor).toBe(true);
      useSettings.getState().toggleMinorAspects();
      expect(useSettings.getState().aspects.showMinor).toBe(false);
    });
  });

  describe("resetAll", () => {
    it("restores all settings to defaults", () => {
      // Change everything
      useSettings.getState().setDefaults({ houseSystem: "koch", zodiacType: "sidereal" });
      useSettings.getState().setTheme("light");
      useSettings.getState().setChartStyle("classic");
      useSettings.getState().setAspectOrb("conjunction", 15);
      useSettings.getState().toggleMinorAspects();

      // Reset
      useSettings.getState().resetAll();

      const state = useSettings.getState();
      expect(state.defaults.houseSystem).toBe("placidus");
      expect(state.defaults.zodiacType).toBe("tropical");
      expect(state.appearance.theme).toBe("dark");
      expect(state.appearance.chartStyle).toBe("modern");
      expect(state.aspects.showMinor).toBe(false);
      expect(state.aspects.orbs).toEqual(DEFAULT_ORBS);
    });
  });

  describe("persistence", () => {
    it("persists to localStorage under astro-settings", () => {
      useSettings.getState().setAspectOrb("trine", 10);
      const stored = JSON.parse(localStorage.getItem("astro-settings") ?? "{}");
      expect(stored.state.aspects.orbs.trine).toBe(10);
    });
  });
});

import { describe, it, expect } from "vitest";
import { calculatePlanetaryHours, CHALDEAN_ORDER, DAY_RULERS } from "../../../../../apps/web/src/lib/planetary-hours";

// Sunday April 5, 2026, 14:00 UTC — Moscow (55.75°N, 37.61°E)
const MOSCOW_LAT = 55.75;
const MOSCOW_LON = 37.61;
const SUNDAY_AFTERNOON = new Date("2026-04-05T14:00:00Z");

describe("calculatePlanetaryHours", () => {
  it("returns 24 hours (12 day + 12 night)", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON)!;
    expect(result.allHours).toHaveLength(24);
    expect(result.allHours.filter((h) => h.isDay)).toHaveLength(12);
    expect(result.allHours.filter((h) => !h.isDay)).toHaveLength(12);
  });

  it("first day hour starts at sunrise and is ruled by the day ruler", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON)!;
    expect(result.dayRuler).toBe("sun");
    expect(result.allHours[0]!.planet).toBe("sun");
    expect(result.allHours[0]!.start.getTime()).toBe(result.sunrise.getTime());
  });

  it("hours follow Chaldean order from the day ruler", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON)!;
    const startIdx = CHALDEAN_ORDER.indexOf("sun");
    for (let i = 0; i < 24; i++) {
      const expectedPlanet = CHALDEAN_ORDER[(startIdx + i) % 7]!;
      expect(result.allHours[i]!.planet).toBe(expectedPlanet);
    }
  });

  it("day hours evenly divide sunrise-to-sunset", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON)!;
    const dayDuration = result.sunset.getTime() - result.sunrise.getTime();
    const expectedHourMs = dayDuration / 12;
    for (let i = 0; i < 12; i++) {
      const hour = result.allHours[i]!;
      const duration = hour.end.getTime() - hour.start.getTime();
      expect(Math.abs(duration - expectedHourMs)).toBeLessThan(10);
    }
  });

  it("night hours evenly divide sunset-to-next-sunrise", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON)!;
    const nightDuration = result.nextSunrise.getTime() - result.sunset.getTime();
    const expectedHourMs = nightDuration / 12;
    for (let i = 12; i < 24; i++) {
      const hour = result.allHours[i]!;
      const duration = hour.end.getTime() - hour.start.getTime();
      expect(Math.abs(duration - expectedHourMs)).toBeLessThan(10);
    }
  });

  it("hours are contiguous (each end === next start)", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON)!;
    for (let i = 0; i < 23; i++) {
      expect(result.allHours[i]!.end.getTime()).toBe(result.allHours[i + 1]!.start.getTime());
    }
  });

  it("identifies the current hour correctly", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON)!;
    expect(result.currentHour.start.getTime()).toBeLessThanOrEqual(SUNDAY_AFTERNOON.getTime());
    expect(result.currentHour.end.getTime()).toBeGreaterThan(SUNDAY_AFTERNOON.getTime());
  });

  it("nextHour is the hour immediately after currentHour", () => {
    const result = calculatePlanetaryHours(SUNDAY_AFTERNOON, MOSCOW_LAT, MOSCOW_LON)!;
    expect(result.nextHour.start.getTime()).toBe(result.currentHour.end.getTime());
  });

  it("returns null result for polar regions where sunrise/sunset is NaN", () => {
    const midsummer = new Date("2026-06-21T12:00:00Z");
    const result = calculatePlanetaryHours(midsummer, 78.0, 16.0);
    expect(result).toBeNull();
  });

  it("handles time before sunrise (previous day's night hours)", () => {
    const beforeSunrise = new Date("2026-04-05T02:00:00Z");
    const result = calculatePlanetaryHours(beforeSunrise, MOSCOW_LAT, MOSCOW_LON);
    expect(result).not.toBeNull();
    expect(result!.currentHour.isDay).toBe(false);
  });
});

describe("DAY_RULERS", () => {
  it("maps all 7 weekdays", () => {
    expect(Object.keys(DAY_RULERS)).toHaveLength(7);
    expect(DAY_RULERS[0]).toBe("sun");
    expect(DAY_RULERS[1]).toBe("moon");
    expect(DAY_RULERS[6]).toBe("saturn");
  });
});

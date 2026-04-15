import { describe, it, expect } from "vitest";
import { localTimeToUtc } from "./utils";

describe("localTimeToUtc", () => {
  it("converts NYC noon to UTC correctly (UTC-5 in winter)", () => {
    const utc = localTimeToUtc("2000-01-01", "12:00", "America/New_York");
    expect(utc.toISOString()).toBe("2000-01-01T17:00:00.000Z");
  });

  it("handles daylight saving time (UTC-4 in summer)", () => {
    const utc = localTimeToUtc("2000-07-01", "12:00", "America/New_York");
    expect(utc.toISOString()).toBe("2000-07-01T16:00:00.000Z");
  });

  it("converts UTC+2 timezone", () => {
    const utc = localTimeToUtc("2000-01-01", "12:00", "Europe/Berlin");
    expect(utc.toISOString()).toBe("2000-01-01T11:00:00.000Z");
  });

  it("handles midnight", () => {
    const utc = localTimeToUtc("2000-03-15", "00:00", "UTC");
    expect(utc.toISOString()).toBe("2000-03-15T00:00:00.000Z");
  });

  it("returns a Date object", () => {
    const result = localTimeToUtc("2000-01-01", "12:00", "UTC");
    expect(result).toBeInstanceOf(Date);
  });
});

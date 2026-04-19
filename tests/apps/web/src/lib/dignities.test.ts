import { describe, it, expect } from "vitest";
import { ZodiacSign, CelestialBody } from "@astro-app/shared-types";
import {
  getDignityForPlanet,
  getDignityDetail,
  getStrongestDignity,
  getHouseForLongitude,
} from "../../../../../apps/web/src/lib/dignities";

describe("getDignityForPlanet", () => {
  // Domicile
  it("Sun in Leo → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Leo)).toBe("domicile");
  });
  it("Moon in Cancer → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Moon, ZodiacSign.Cancer)).toBe("domicile");
  });
  it("Mercury in Gemini → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Mercury, ZodiacSign.Gemini)).toBe("domicile");
  });
  it("Mercury in Virgo → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Mercury, ZodiacSign.Virgo)).toBe("domicile");
  });
  it("Venus in Taurus → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Venus, ZodiacSign.Taurus)).toBe("domicile");
  });
  it("Mars in Aries → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Aries)).toBe("domicile");
  });
  it("Mars in Scorpio → domicile (traditional co-ruler)", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Scorpio)).toBe("domicile");
  });
  it("Pluto in Scorpio → domicile (modern ruler)", () => {
    expect(getDignityForPlanet(CelestialBody.Pluto, ZodiacSign.Scorpio)).toBe("domicile");
  });
  it("Uranus in Aquarius → domicile (modern ruler)", () => {
    expect(getDignityForPlanet(CelestialBody.Uranus, ZodiacSign.Aquarius)).toBe("domicile");
  });
  it("Neptune in Pisces → domicile (modern ruler)", () => {
    expect(getDignityForPlanet(CelestialBody.Neptune, ZodiacSign.Pisces)).toBe("domicile");
  });

  // Exaltation
  it("Sun in Aries → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Aries)).toBe("exaltation");
  });
  it("Moon in Taurus → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Moon, ZodiacSign.Taurus)).toBe("exaltation");
  });
  it("Jupiter in Cancer → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Jupiter, ZodiacSign.Cancer)).toBe("exaltation");
  });
  it("Saturn in Libra → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Saturn, ZodiacSign.Libra)).toBe("exaltation");
  });
  it("Venus in Pisces → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Venus, ZodiacSign.Pisces)).toBe("exaltation");
  });
  it("Mars in Capricorn → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Capricorn)).toBe("exaltation");
  });
  it("Mercury in Virgo → domicile (domicile takes priority over exaltation)", () => {
    expect(getDignityForPlanet(CelestialBody.Mercury, ZodiacSign.Virgo)).toBe("domicile");
  });

  // Detriment
  it("Sun in Aquarius → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Aquarius)).toBe("detriment");
  });
  it("Moon in Capricorn → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Moon, ZodiacSign.Capricorn)).toBe("detriment");
  });
  it("Venus in Aries → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Venus, ZodiacSign.Aries)).toBe("detriment");
  });
  it("Saturn in Cancer → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Saturn, ZodiacSign.Cancer)).toBe("detriment");
  });
  it("Uranus in Leo → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Uranus, ZodiacSign.Leo)).toBe("detriment");
  });
  it("Neptune in Virgo → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Neptune, ZodiacSign.Virgo)).toBe("detriment");
  });
  it("Pluto in Taurus → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Pluto, ZodiacSign.Taurus)).toBe("detriment");
  });

  // Fall
  it("Sun in Libra → fall", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Libra)).toBe("fall");
  });
  it("Moon in Scorpio → fall", () => {
    expect(getDignityForPlanet(CelestialBody.Moon, ZodiacSign.Scorpio)).toBe("fall");
  });
  it("Mars in Cancer → fall", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Cancer)).toBe("fall");
  });
  it("Saturn in Aries → fall", () => {
    expect(getDignityForPlanet(CelestialBody.Saturn, ZodiacSign.Aries)).toBe("fall");
  });

  // Peregrine
  it("Sun in Gemini → null (peregrine)", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Gemini)).toBeNull();
  });
  it("Mars in Gemini → null (peregrine)", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Gemini)).toBeNull();
  });
  it("Uranus in Aries → null (no exaltation for outers)", () => {
    expect(getDignityForPlanet(CelestialBody.Uranus, ZodiacSign.Aries)).toBeNull();
  });
});

describe("getDignityDetail", () => {
  it("Aries → ruler Mars, exaltation Sun, detriment Venus, fall Saturn", () => {
    const detail = getDignityDetail(ZodiacSign.Aries);
    expect(detail.ruler).toBe(CelestialBody.Mars);
    expect(detail.exaltation).toBe(CelestialBody.Sun);
    expect(detail.detriment).toBe(CelestialBody.Venus);
    expect(detail.fall).toBe(CelestialBody.Saturn);
    expect(detail.coRuler).toBeNull();
  });

  it("Cancer → ruler Moon, exaltation Jupiter, detriment Saturn, fall Mars", () => {
    const detail = getDignityDetail(ZodiacSign.Cancer);
    expect(detail.ruler).toBe(CelestialBody.Moon);
    expect(detail.exaltation).toBe(CelestialBody.Jupiter);
    expect(detail.detriment).toBe(CelestialBody.Saturn);
    expect(detail.fall).toBe(CelestialBody.Mars);
  });

  it("Scorpio → traditional ruler Mars, coRuler Pluto", () => {
    const detail = getDignityDetail(ZodiacSign.Scorpio);
    expect(detail.ruler).toBe(CelestialBody.Mars);
    expect(detail.coRuler).toBe(CelestialBody.Pluto);
  });

  it("Aquarius → traditional ruler Saturn, coRuler Uranus", () => {
    const detail = getDignityDetail(ZodiacSign.Aquarius);
    expect(detail.ruler).toBe(CelestialBody.Saturn);
    expect(detail.coRuler).toBe(CelestialBody.Uranus);
  });

  it("Pisces → traditional ruler Jupiter, coRuler Neptune", () => {
    const detail = getDignityDetail(ZodiacSign.Pisces);
    expect(detail.ruler).toBe(CelestialBody.Jupiter);
    expect(detail.coRuler).toBe(CelestialBody.Neptune);
  });

  it("Gemini → no exaltation, no fall", () => {
    const detail = getDignityDetail(ZodiacSign.Gemini);
    expect(detail.ruler).toBe(CelestialBody.Mercury);
    expect(detail.exaltation).toBeNull();
    expect(detail.detriment).toBe(CelestialBody.Jupiter);
    expect(detail.fall).toBeNull();
  });
});

describe("getStrongestDignity", () => {
  it("returns domicile over exaltation when both apply (Mercury in Virgo)", () => {
    expect(getStrongestDignity(CelestialBody.Mercury, ZodiacSign.Virgo)).toBe("domicile");
  });
  it("returns exaltation when no domicile", () => {
    expect(getStrongestDignity(CelestialBody.Sun, ZodiacSign.Aries)).toBe("exaltation");
  });
  it("returns detriment", () => {
    expect(getStrongestDignity(CelestialBody.Sun, ZodiacSign.Aquarius)).toBe("detriment");
  });
  it("returns fall", () => {
    expect(getStrongestDignity(CelestialBody.Mars, ZodiacSign.Cancer)).toBe("fall");
  });
  it("returns null when peregrine", () => {
    expect(getStrongestDignity(CelestialBody.Sun, ZodiacSign.Gemini)).toBeNull();
  });
});

describe("getHouseForLongitude", () => {
  const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  it("planet at 15° → house 1", () => {
    expect(getHouseForLongitude(15, cusps)).toBe(1);
  });
  it("planet at 45° → house 2", () => {
    expect(getHouseForLongitude(45, cusps)).toBe(2);
  });
  it("planet at 350° → house 12", () => {
    expect(getHouseForLongitude(350, cusps)).toBe(12);
  });
  it("planet exactly on cusp 1 → house 1", () => {
    expect(getHouseForLongitude(0, cusps)).toBe(1);
  });
  it("planet exactly on cusp 4 → house 4", () => {
    expect(getHouseForLongitude(90, cusps)).toBe(4);
  });

  const unevenCusps = [280, 310, 350, 15, 45, 75, 100, 130, 170, 195, 225, 255];

  it("handles uneven cusps: planet at 300° → house 1", () => {
    expect(getHouseForLongitude(300, unevenCusps)).toBe(1);
  });
  it("handles uneven cusps: planet at 0° → house 3", () => {
    expect(getHouseForLongitude(0, unevenCusps)).toBe(3);
  });
  it("handles uneven cusps: planet at 200° → house 10", () => {
    expect(getHouseForLongitude(200, unevenCusps)).toBe(10);
  });
});

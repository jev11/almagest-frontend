import { describe, it, expect } from "vitest";
import { PLANET_GLYPHS, SIGN_GLYPHS } from "./index.js";
describe("PLANET_GLYPHS", () => {
    it("has entries for all major planets", () => {
        const required = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
        for (const planet of required) {
            expect(PLANET_GLYPHS).toHaveProperty(planet);
            expect(typeof PLANET_GLYPHS[planet]).toBe("string");
            expect(PLANET_GLYPHS[planet].length).toBeGreaterThan(0);
        }
    });
    it("has valid Unicode glyph characters (non-ASCII)", () => {
        for (const [_name, glyph] of Object.entries(PLANET_GLYPHS)) {
            if (glyph) {
                expect(glyph.codePointAt(0)).toBeGreaterThan(127);
            }
        }
    });
});
describe("SIGN_GLYPHS", () => {
    it("has entries for all 12 zodiac signs", () => {
        const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
        for (const sign of signs) {
            expect(SIGN_GLYPHS).toHaveProperty(sign);
            expect(typeof SIGN_GLYPHS[sign]).toBe("string");
            expect(SIGN_GLYPHS[sign].length).toBeGreaterThan(0);
        }
    });
});
//# sourceMappingURL=glyphs.test.js.map
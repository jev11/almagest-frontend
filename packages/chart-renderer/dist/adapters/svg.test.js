import { describe, it, expect } from "vitest";
import { renderRadixToSvg } from "./svg.js";
import { darkTheme } from "../themes/dark.js";
import { lightTheme } from "../themes/light.js";
import { STELLIUM_CHART } from "../test-data/stellium-chart.js";
describe("renderRadixToSvg", () => {
    it("returns a string", () => {
        const result = renderRadixToSvg(STELLIUM_CHART, darkTheme, 600, 600);
        expect(typeof result).toBe("string");
    });
    it("produces valid SVG", () => {
        const result = renderRadixToSvg(STELLIUM_CHART, darkTheme, 600, 600);
        expect(result).toContain("<svg");
        expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(result).toContain("</svg>");
    });
    it("includes the correct dimensions", () => {
        const result = renderRadixToSvg(STELLIUM_CHART, darkTheme, 800, 800);
        expect(result).toContain('width="800"');
        expect(result).toContain('height="800"');
    });
    it("contains background rect with theme color", () => {
        const result = renderRadixToSvg(STELLIUM_CHART, darkTheme, 600, 600);
        expect(result).toContain("<rect");
        expect(result).toContain(darkTheme.background);
    });
    it("contains ring circle elements", () => {
        const result = renderRadixToSvg(STELLIUM_CHART, darkTheme, 600, 600);
        expect(result).toContain("<circle");
    });
    it("contains many line elements (ticks + house cusps + aspect lines)", () => {
        const result = renderRadixToSvg(STELLIUM_CHART, darkTheme, 600, 600);
        const lineCount = (result.match(/<line/g) ?? []).length;
        expect(lineCount).toBeGreaterThan(50);
    });
    it("uses light theme background for light theme", () => {
        const result = renderRadixToSvg(STELLIUM_CHART, lightTheme, 600, 600);
        expect(result).toContain(lightTheme.background);
        expect(result).not.toContain(darkTheme.background);
    });
    it("XML declaration is present", () => {
        const result = renderRadixToSvg(STELLIUM_CHART, darkTheme, 600, 600);
        expect(result).toContain('<?xml version="1.0"');
    });
});
//# sourceMappingURL=svg.test.js.map
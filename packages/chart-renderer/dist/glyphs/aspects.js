/**
 * Aspect symbol SVG path data.
 * These are small indicator symbols, used in tables or legends (not on the wheel itself).
 * The wheel uses colored lines; these are for UI components.
 */
export const ASPECT_SYMBOLS = {
    // Conjunction — circle
    conjunction: "M12 4a8 8 0 1 0 0 16A8 8 0 0 0 12 4z",
    // Semi-sextile — two lines at 30°
    semi_sextile: "M12 4v16M4 12h16",
    // Sextile — star of david / asterisk-like
    sextile: "M12 4l-7 12h14L12 4zM12 20l7-12H5l7 12z",
    // Square — square
    square: "M5 5h14v14H5z",
    // Trine — triangle
    trine: "M12 4L4 20h16L12 4z",
    // Quincunx — triangle with extra line
    quincunx: "M12 4L4 20h16L12 4zM12 14v6",
    // Opposition — two circles
    opposition: "M6 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0zm6 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0z",
    // Semi-square — 45° angle
    semi_square: "M12 4v8h8",
    // Sesquisquare — 135° angle
    sesquisquare: "M4 4v8h8M12 12l8 8",
    // Quintile — Q letter shape
    quintile: "M8 8h8v8H8zM14 16l4 4",
    // Bi-quintile — double Q
    bi_quintile: "M6 8h6v6H6zM12 14l6-6v6",
};
//# sourceMappingURL=aspects.js.map
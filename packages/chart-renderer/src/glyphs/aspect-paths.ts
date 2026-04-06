/**
 * SVG path data for aspect glyphs, designed on a 100×100 grid.
 * Style: calligraphic / traditional astrological manuscript.
 */
export const ASPECT_PATHS: Record<string, string> = {
  conjunction:   "M 50 8 C 38 8 28 18 28 30 C 28 42 38 52 50 52 C 62 52 72 42 72 30 C 72 18 62 8 50 8 Z M 50 52 L 50 92",
  opposition:    "M 50 8 C 38 8 28 16 28 26 C 28 36 38 44 50 44 C 62 44 72 36 72 26 C 72 16 62 8 50 8 Z M 50 44 L 50 56 M 50 56 C 38 56 28 64 28 74 C 28 84 38 92 50 92 C 62 92 72 84 72 74 C 72 64 62 56 50 56 Z",
  trine:         "M 50 8 L 10 85 L 90 85 Z M 50 18 L 20 80 L 80 80 Z",
  square:        "M 15 15 L 85 15 L 85 85 L 15 85 Z M 22 22 L 78 22 L 78 78 L 22 78 Z",
  sextile:       "M 50 5 L 93 30 L 93 70 L 50 95 L 7 70 L 7 30 Z",
  quincunx:      "M 50 8 L 50 55 M 35 55 L 65 55 M 25 75 L 50 55 L 75 75",
  semi_sextile:  "M 50 45 L 50 92 M 35 45 L 65 45 M 50 8 C 62 8 72 18 72 30 C 72 38 65 45 50 45 C 35 45 28 38 28 30 C 28 18 38 8 50 8 Z",
  semi_square:   "M 15 85 L 85 85 L 85 15 M 15 85 L 85 15",
  sesquisquare:  "M 15 15 L 85 15 L 85 85 L 15 85 Z M 15 85 L 85 15 M 15 15 L 85 85",
  quintile:      "M 50 5 L 97 38 L 79 92 L 21 92 L 3 38 Z",
  bi_quintile:   "M 50 5 L 97 38 L 79 92 L 21 92 L 3 38 Z M 50 25 L 80 48 L 68 80 L 32 80 L 20 48 Z",
};

export const ASPECT_WIDTHS: Record<string, number> = {
  conjunction: 0.55,
  opposition: 0.55,
  trine: 1.0,
  square: 1.0,
  sextile: 1.0,
  quincunx: 0.6,
  semi_sextile: 0.55,
  semi_square: 0.85,
  sesquisquare: 1.0,
  quintile: 1.0,
  bi_quintile: 1.0,
};

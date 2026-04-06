/**
 * SVG path data for aspect glyphs, designed on a 100×100 grid.
 * Style: calligraphic / traditional astrological manuscript.
 */
export const ASPECT_PATHS: Record<string, string> = {
  conjunction:   "M 50 8 C 38 8 28 18 28 30 C 28 42 38 52 50 52 C 62 52 72 42 72 30 C 72 18 62 8 50 8 Z M 48 52 L 52 52 L 52 92 L 48 92 Z",
  opposition:    "M 50 8 C 38 8 28 16 28 26 C 28 36 38 44 50 44 C 62 44 72 36 72 26 C 72 16 62 8 50 8 Z M 48 44 L 52 44 L 52 56 L 48 56 Z M 50 56 C 38 56 28 64 28 74 C 28 84 38 92 50 92 C 62 92 72 84 72 74 C 72 64 62 56 50 56 Z",
  trine:         "M 50 8 L 10 85 L 90 85 Z M 50 18 L 20 80 L 80 80 Z",
  square:        "M 15 15 L 85 15 L 85 85 L 15 85 Z M 22 22 L 78 22 L 78 78 L 22 78 Z",
  sextile:       "M 50 5 L 93 30 L 93 70 L 50 95 L 7 70 L 7 30 Z",
  quincunx:      "M 48 8 L 52 8 L 52 55 L 48 55 Z M 35 53 L 65 53 L 65 57 L 35 57 Z M 23 73 L 26 77 L 52 57 L 48 53 Z M 48 53 L 52 57 L 77 77 L 74 73 Z",
  semi_sextile:  "M 48 45 L 52 45 L 52 92 L 48 92 Z M 35 43 L 65 43 L 65 47 L 35 47 Z M 50 8 C 62 8 72 18 72 30 C 72 38 65 45 50 45 C 35 45 28 38 28 30 C 28 18 38 8 50 8 Z",
  semi_square:   "M 15 83 L 87 83 L 87 87 L 15 87 Z M 83 15 L 87 15 L 87 87 L 83 87 Z M 12 82 L 18 88 L 88 18 L 82 12 Z",
  sesquisquare:  "M 15 15 L 85 15 L 85 85 L 15 85 Z M 13 83 L 17 87 L 87 17 L 83 13 Z M 17 13 L 13 17 L 83 87 L 87 83 Z",
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

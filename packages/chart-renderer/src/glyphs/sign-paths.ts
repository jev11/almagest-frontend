/**
 * SVG path data for zodiac sign glyphs, designed on a 100×100 grid.
 * Style: calligraphic / traditional astrological manuscript.
 */
export const SIGN_PATHS: Record<string, string> = {
  aries:       "M 20 85 C 20 50 35 20 50 15 C 65 20 80 50 80 85 M 50 15 L 50 90",
  taurus:      "M 15 25 C 15 10 35 5 50 20 C 65 5 85 10 85 25 M 50 30 C 30 30 18 45 18 62 C 18 78 30 92 50 92 C 70 92 82 78 82 62 C 82 45 70 30 50 30 Z",
  gemini:      "M 20 12 L 80 12 M 20 88 L 80 88 M 35 12 L 35 88 M 65 12 L 65 88",
  cancer:      "M 80 35 C 80 20 65 10 50 10 C 30 10 15 25 15 35 C 15 42 20 48 28 48 C 36 48 42 42 42 35 C 42 28 36 22 28 22 M 20 65 C 20 80 35 90 50 90 C 70 90 85 75 85 65 C 85 58 80 52 72 52 C 64 52 58 58 58 65 C 58 72 64 78 72 78",
  leo:         "M 25 75 C 25 85 35 92 45 92 C 55 92 62 85 62 75 C 62 65 55 55 45 55 C 35 55 25 48 25 35 C 25 22 35 12 48 12 C 58 12 65 18 65 28 M 65 28 C 75 28 85 22 85 12 M 85 12 C 85 22 92 32 92 42",
  virgo:       "M 15 15 L 15 70 C 15 82 22 90 32 90 M 35 15 L 35 70 C 35 82 42 90 52 90 M 55 15 L 55 70 C 55 82 65 90 75 80 C 85 70 85 55 75 50 L 90 90",
  libra:       "M 10 70 L 90 70 M 50 70 L 50 45 C 35 45 22 38 22 28 C 22 18 35 10 50 10 C 65 10 78 18 78 28 C 78 38 65 45 50 45 M 10 80 C 10 85 30 92 50 92 C 70 92 90 85 90 80",
  scorpio:     "M 15 15 L 15 70 C 15 82 22 90 32 90 M 35 15 L 35 70 C 35 82 42 90 52 90 M 55 15 L 55 70 C 55 82 65 90 75 80 L 85 70 L 78 76 M 85 70 L 78 64",
  sagittarius: "M 15 85 L 85 15 M 85 15 L 60 15 M 85 15 L 85 40 M 30 55 L 55 80",
  capricorn:   "M 15 15 L 15 60 C 15 75 25 85 40 85 C 55 85 60 75 60 65 L 60 40 C 60 30 65 22 75 22 C 85 22 90 30 90 45 C 90 60 80 75 65 85",
  aquarius:    "M 8 35 L 22 20 L 36 35 L 50 20 L 64 35 L 78 20 L 92 35 M 8 60 L 22 45 L 36 60 L 50 45 L 64 60 L 78 45 L 92 60",
  pisces:      "M 25 10 C 15 10 10 25 10 50 C 10 75 15 90 25 90 M 75 10 C 85 10 90 25 90 50 C 90 75 85 90 75 90 M 5 50 L 95 50",
};

export const SIGN_WIDTHS: Record<string, number> = {
  aries: 0.75,
  taurus: 0.85,
  gemini: 0.75,
  cancer: 0.85,
  leo: 0.85,
  virgo: 0.9,
  libra: 1.0,
  scorpio: 0.9,
  sagittarius: 0.85,
  capricorn: 0.95,
  aquarius: 1.0,
  pisces: 1.0,
};

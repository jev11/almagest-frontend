/**
 * Transit chart test data: approximate planetary positions for early 2025.
 * Planets are spread around the zodiac with no major stelliums — contrasts
 * with STELLIUM_CHART for visual comparison and bi-wheel testing.
 * ASC at 150° (Virgo rising).
 */
import {
  CelestialBody,
  ZodiacSign,
  HouseSystem,
  ZodiacType,
  AspectType,
} from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";

export const TRANSIT_CHART: ChartData = {
  positions: {
    [CelestialBody.Sun]: { longitude: 280.5, latitude: 0, distance: 0.98, speed_longitude: 1.02, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.Moon]: { longitude: 52.3, latitude: 3.2, distance: 0.0025, speed_longitude: 12.8, speed_latitude: 0.2, speed_distance: 0 },
    [CelestialBody.Mercury]: { longitude: 265.7, latitude: -1.5, distance: 0.95, speed_longitude: -0.5, speed_latitude: 0.1, speed_distance: 0 },
    [CelestialBody.Venus]: { longitude: 305.1, latitude: 1.1, distance: 0.73, speed_longitude: 1.15, speed_latitude: 0.1, speed_distance: 0 },
    [CelestialBody.Mars]: { longitude: 135.8, latitude: 0.3, distance: 1.55, speed_longitude: 0.65, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.Jupiter]: { longitude: 50.4, latitude: 0.1, distance: 5.15, speed_longitude: 0.08, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.Saturn]: { longitude: 350.2, latitude: 0.8, distance: 9.5, speed_longitude: 0.09, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.Uranus]: { longitude: 55.3, latitude: -0.1, distance: 19.8, speed_longitude: 0.04, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.Neptune]: { longitude: 357.8, latitude: 0.6, distance: 30.5, speed_longitude: 0.02, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.Pluto]: { longitude: 301.9, latitude: 11.2, distance: 35.1, speed_longitude: 0.02, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.MeanNorthNode]: { longitude: 5.4, latitude: 0, distance: 0, speed_longitude: -0.05, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.TrueNorthNode]: { longitude: 4.8, latitude: 0, distance: 0, speed_longitude: -0.05, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.MeanSouthNode]: { longitude: 185.4, latitude: 0, distance: 0, speed_longitude: -0.05, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.TrueSouthNode]: { longitude: 184.8, latitude: 0, distance: 0, speed_longitude: -0.05, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.Chiron]: { longitude: 20.6, latitude: -4.2, distance: 8.8, speed_longitude: 0.04, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.Lilith]: { longitude: 180.3, latitude: 0, distance: 0, speed_longitude: 0.11, speed_latitude: 0, speed_distance: 0 },
    [CelestialBody.PartOfFortune]: { longitude: 242.1, latitude: 0, distance: 0, speed_longitude: 0, speed_latitude: 0, speed_distance: 0 },
  },
  zodiac_positions: {
    [CelestialBody.Sun]:     { sign: ZodiacSign.Capricorn,   degree: 10, minute: 30, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.Moon]:    { sign: ZodiacSign.Taurus,      degree: 22, minute: 18, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.Mercury]: { sign: ZodiacSign.Sagittarius, degree: 25, minute: 42, second: 0, is_retrograde: true,  dignity: null },
    [CelestialBody.Venus]:   { sign: ZodiacSign.Aquarius,    degree: 5,  minute:  6, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.Mars]:    { sign: ZodiacSign.Leo,         degree: 15, minute: 48, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.Jupiter]: { sign: ZodiacSign.Taurus,      degree: 20, minute: 24, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.Saturn]:  { sign: ZodiacSign.Pisces,      degree: 20, minute: 12, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.Uranus]:  { sign: ZodiacSign.Taurus,      degree: 25, minute: 18, second: 0, is_retrograde: true,  dignity: null },
    [CelestialBody.Neptune]: { sign: ZodiacSign.Pisces,      degree: 27, minute: 48, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.Pluto]:   { sign: ZodiacSign.Capricorn,   degree: 1,  minute: 54, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.MeanNorthNode]: { sign: ZodiacSign.Aries,  degree: 5,  minute: 24, second: 0, is_retrograde: true, dignity: null },
    [CelestialBody.TrueNorthNode]: { sign: ZodiacSign.Aries,  degree: 4,  minute: 48, second: 0, is_retrograde: true, dignity: null },
    [CelestialBody.MeanSouthNode]: { sign: ZodiacSign.Libra,  degree: 5,  minute: 24, second: 0, is_retrograde: true, dignity: null },
    [CelestialBody.TrueSouthNode]: { sign: ZodiacSign.Libra,  degree: 4,  minute: 48, second: 0, is_retrograde: true, dignity: null },
    [CelestialBody.Chiron]:  { sign: ZodiacSign.Aries,       degree: 20, minute:  36, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.Lilith]:  { sign: ZodiacSign.Libra,       degree: 0,  minute: 18, second: 0, is_retrograde: false, dignity: null },
    [CelestialBody.PartOfFortune]: { sign: ZodiacSign.Sagittarius, degree: 2, minute: 6, second: 0, is_retrograde: false, dignity: null },
  },
  houses: {
    cusps: [
      150.0, // House 1 (ASC) — Virgo
      178.3, // House 2
      210.8, // House 3
      240.0, // House 4 (IC) — Sagittarius
      272.5, // House 5
      308.7, // House 6
      330.0, // House 7 (DSC) — Pisces
      358.3, // House 8
       30.8, // House 9
       60.0, // House 10 (MC) — Gemini
       92.5, // House 11
      128.7, // House 12
    ],
    ascendant:  150.0,
    midheaven:   60.0,
    descendant: 330.0,
    imum_coeli: 240.0,
    vertex:     210.5,
    east_point: 150.0,
  },
  aspects: [
    { body1: CelestialBody.Sun,     body2: CelestialBody.Neptune, type: AspectType.Square,       angle: 97.3,  orb: 2.7,  is_applying: false },
    { body1: CelestialBody.Sun,     body2: CelestialBody.Saturn,  type: AspectType.Opposition,   angle: 69.7,  orb: 0.3,  is_applying: true  },
    { body1: CelestialBody.Moon,    body2: CelestialBody.Jupiter, type: AspectType.Conjunction,  angle:  1.9,  orb: 1.9,  is_applying: true  },
    { body1: CelestialBody.Moon,    body2: CelestialBody.Uranus,  type: AspectType.Conjunction,  angle:  3.0,  orb: 3.0,  is_applying: false },
    { body1: CelestialBody.Mercury, body2: CelestialBody.Venus,   type: AspectType.Sextile,      angle: 39.4,  orb: 0.6,  is_applying: false },
    { body1: CelestialBody.Mars,    body2: CelestialBody.Pluto,   type: AspectType.Square,       angle: 166.1, orb: 3.9,  is_applying: false },
    { body1: CelestialBody.Jupiter, body2: CelestialBody.Saturn,  type: AspectType.Trine,        angle: 120.2, orb: 0.2,  is_applying: false },
    { body1: CelestialBody.Saturn,  body2: CelestialBody.Neptune, type: AspectType.Conjunction,  angle:   7.6, orb: 2.4,  is_applying: true  },
  ],
  metadata: {
    house_system:    HouseSystem.Placidus,
    zodiac_type:     ZodiacType.Tropical,
    ayanamsa:        null,
    ayanamsa_value:  null,
    julian_day:      2460676.5,
    delta_t:         69.2,
    sidereal_time:   6.8433,
    obliquity:       23.4362,
  },
};

/**
 * All-retrograde test chart: same positions as STELLIUM_CHART but every planet
 * marked retrograde. Used for visual testing of the retrograde indicator rendering.
 */
import { STELLIUM_CHART } from "./stellium-chart.js";

const retroZodiacPositions = Object.fromEntries(
  Object.entries(STELLIUM_CHART.zodiac_positions as Record<string, { is_retrograde: boolean }>)
    .map(([k, v]) => [k, { ...v, is_retrograde: true }]),
) as ChartData["zodiac_positions"];

export const ALL_RETROGRADE_CHART: ChartData = {
  ...STELLIUM_CHART,
  zodiac_positions: retroZodiacPositions,
};

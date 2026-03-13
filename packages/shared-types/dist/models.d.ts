import { CelestialBody, ZodiacSign, AspectType, HouseSystem, ZodiacType } from "./enums.js";
export interface CelestialPosition {
    longitude: number;
    latitude: number;
    distance: number;
    speed_longitude: number;
    speed_latitude: number;
    speed_distance: number;
}
export interface ZodiacPosition {
    sign: ZodiacSign;
    degree: number;
    minute: number;
    second: number;
    is_retrograde: boolean;
    dignity: string | null;
}
export interface Aspect {
    body1: CelestialBody;
    body2: CelestialBody;
    type: AspectType;
    angle: number;
    orb: number;
    is_applying: boolean;
}
export interface HouseData {
    cusps: number[];
    ascendant: number;
    midheaven: number;
    descendant: number;
    imum_coeli: number;
    vertex: number;
    east_point: number;
}
export interface ChartMetadata {
    house_system: HouseSystem;
    zodiac_type: ZodiacType;
    ayanamsa: string | null;
    ayanamsa_value: number | null;
    julian_day: number;
    delta_t: number;
    sidereal_time: number;
    obliquity: number;
}
export interface ChartData {
    positions: Record<CelestialBody, CelestialPosition>;
    zodiac_positions: Record<CelestialBody, ZodiacPosition>;
    houses: HouseData;
    aspects: Aspect[];
    metadata: ChartMetadata;
}
//# sourceMappingURL=models.d.ts.map
import { Element, AspectType } from "@astro-app/shared-types";
export interface ChartTheme {
    name: string;
    background: string;
    ringStroke: string;
    ringStrokeWidth: number;
    signDividerStroke: string;
    signDividerWidth: number;
    elementColors: Record<Element, string>;
    elementBgOpacity: number;
    planetGlyph: string;
    planetGlyphRetrograde: string;
    houseStroke: string;
    houseStrokeWidth: number;
    angleStroke: string;
    angleStrokeWidth: number;
    houseNumberColor: string;
    aspectColors: Record<AspectType, string>;
    aspectMajorWidth: number;
    aspectMinorWidth: number;
    aspectMinorDash: [number, number];
    degreeLabelColor: string;
    leaderLineColor: string;
    fontFamily: string;
    signGlyphColor: string;
}
//# sourceMappingURL=types.d.ts.map
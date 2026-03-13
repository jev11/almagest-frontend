import { CelestialBody } from "@astro-app/shared-types";
import { longitudeToAngle, polarToCartesian } from "../core/geometry.js";
import { RING_PROPORTIONS, GLYPH_SIZES } from "../core/constants.js";
import { PLANET_GLYPHS, drawGlyph } from "../glyphs/planets.js";
import { resolveCollisions } from "../core/layout.js";
// Bodies to render on the planet ring
const RENDERED_BODIES = [
    CelestialBody.Sun,
    CelestialBody.Moon,
    CelestialBody.Mercury,
    CelestialBody.Venus,
    CelestialBody.Mars,
    CelestialBody.Jupiter,
    CelestialBody.Saturn,
    CelestialBody.Uranus,
    CelestialBody.Neptune,
    CelestialBody.Pluto,
    CelestialBody.NorthNode,
    CelestialBody.Chiron,
];
export function drawPlanetRing(ctx, data, theme, dim) {
    const { cx, cy, radius } = dim;
    const ascendant = data.houses.ascendant;
    const zodiacInnerR = radius * RING_PROPORTIONS.zodiacInner;
    const planetInnerR = radius * RING_PROPORTIONS.planetInner;
    const planetRingR = (zodiacInnerR + planetInnerR) / 2;
    // Build glyph positions for all present bodies
    const glyphPositions = [];
    for (const body of RENDERED_BODIES) {
        const position = data.positions[body];
        if (!position)
            continue;
        const angle = longitudeToAngle(position.longitude, ascendant);
        glyphPositions.push({
            body: body,
            originalAngle: angle,
            displayAngle: angle,
            displaced: false,
        });
    }
    // Resolve collisions
    const resolved = resolveCollisions(glyphPositions, planetRingR);
    // Draw planets
    for (const pos of resolved) {
        const body = pos.body;
        const zodiacPos = data.zodiac_positions[body];
        const isRetrograde = zodiacPos?.is_retrograde ?? false;
        const glyphPos = polarToCartesian(cx, cy, pos.displayAngle, planetRingR);
        const color = isRetrograde
            ? theme.planetGlyphRetrograde
            : theme.planetGlyph;
        const glyphPath = PLANET_GLYPHS[pos.body] ?? "";
        drawGlyph(ctx, glyphPath, glyphPos.x, glyphPos.y, GLYPH_SIZES.planet, color);
        // Draw leader line from displayed position to exact position on zodiac inner edge
        if (pos.displaced) {
            const exactPos = polarToCartesian(cx, cy, pos.originalAngle, zodiacInnerR - 2);
            ctx.beginPath();
            ctx.moveTo(glyphPos.x, glyphPos.y);
            ctx.lineTo(exactPos.x, exactPos.y);
            ctx.strokeStyle = theme.leaderLineColor;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }
}
//# sourceMappingURL=planet-ring.js.map
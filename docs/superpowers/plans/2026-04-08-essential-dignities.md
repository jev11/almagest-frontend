# Essential Dignities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add essential dignity information (domicile, exaltation, detriment, fall) to the PlanetCard with an expand/collapse interaction, plus a house column in compact view.

**Architecture:** A pure lookup module (`dignities.ts`) provides all dignity data and a house-from-longitude utility. The PlanetCard gains expand/collapse state: compact shows positions + house; expanded adds a dignity summary badge per planet and a full dignity detail grid.

**Tech Stack:** TypeScript, React, Vitest, Tailwind CSS

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/web/src/lib/dignities.ts` | Create | Dignity lookup tables, `getDignityForPlanet()`, `getDignityDetail()`, `getStrongestDignity()`, `getHouseForLongitude()` |
| `apps/web/src/lib/dignities.test.ts` | Create | Unit tests for all dignity functions |
| `apps/web/src/components/home/planet-card.tsx` | Modify | Add expand/collapse, house column, dignity badge, dignity detail grid |

---

### Task 1: Dignity Lookup Module — Tests

**Files:**
- Create: `apps/web/src/lib/dignities.test.ts`
- Create: `apps/web/src/lib/dignities.ts` (empty exports to satisfy imports)

- [ ] **Step 1: Create the dignities module with type signatures and empty implementations**

Create `apps/web/src/lib/dignities.ts`:

```typescript
import { ZodiacSign, CelestialBody } from "@astro-app/shared-types";

export type DignityType = "domicile" | "exaltation" | "detriment" | "fall";

export interface DignityDetail {
  ruler: CelestialBody | null;
  exaltation: CelestialBody | null;
  detriment: CelestialBody | null;
  fall: CelestialBody | null;
  /** Modern co-ruler, if different from traditional ruler */
  coRuler: CelestialBody | null;
}

export function getDignityForPlanet(
  _body: CelestialBody,
  _sign: ZodiacSign,
): DignityType | null {
  return null;
}

export function getDignityDetail(_sign: ZodiacSign): DignityDetail {
  return { ruler: null, exaltation: null, detriment: null, fall: null, coRuler: null };
}

export function getStrongestDignity(
  _body: CelestialBody,
  _sign: ZodiacSign,
): DignityType | null {
  return null;
}

export function getHouseForLongitude(_longitude: number, _cusps: number[]): number {
  return 1;
}
```

- [ ] **Step 2: Write tests for dignity lookups**

Create `apps/web/src/lib/dignities.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ZodiacSign, CelestialBody } from "@astro-app/shared-types";
import {
  getDignityForPlanet,
  getDignityDetail,
  getStrongestDignity,
  getHouseForLongitude,
} from "./dignities";

describe("getDignityForPlanet", () => {
  // Domicile
  it("Sun in Leo → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Leo)).toBe("domicile");
  });
  it("Moon in Cancer → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Moon, ZodiacSign.Cancer)).toBe("domicile");
  });
  it("Mercury in Gemini → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Mercury, ZodiacSign.Gemini)).toBe("domicile");
  });
  it("Mercury in Virgo → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Mercury, ZodiacSign.Virgo)).toBe("domicile");
  });
  it("Venus in Taurus → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Venus, ZodiacSign.Taurus)).toBe("domicile");
  });
  it("Mars in Aries → domicile", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Aries)).toBe("domicile");
  });
  it("Mars in Scorpio → domicile (traditional co-ruler)", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Scorpio)).toBe("domicile");
  });
  it("Pluto in Scorpio → domicile (modern ruler)", () => {
    expect(getDignityForPlanet(CelestialBody.Pluto, ZodiacSign.Scorpio)).toBe("domicile");
  });
  it("Uranus in Aquarius → domicile (modern ruler)", () => {
    expect(getDignityForPlanet(CelestialBody.Uranus, ZodiacSign.Aquarius)).toBe("domicile");
  });
  it("Neptune in Pisces → domicile (modern ruler)", () => {
    expect(getDignityForPlanet(CelestialBody.Neptune, ZodiacSign.Pisces)).toBe("domicile");
  });

  // Exaltation
  it("Sun in Aries → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Aries)).toBe("exaltation");
  });
  it("Moon in Taurus → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Moon, ZodiacSign.Taurus)).toBe("exaltation");
  });
  it("Jupiter in Cancer → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Jupiter, ZodiacSign.Cancer)).toBe("exaltation");
  });
  it("Saturn in Libra → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Saturn, ZodiacSign.Libra)).toBe("exaltation");
  });
  it("Venus in Pisces → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Venus, ZodiacSign.Pisces)).toBe("exaltation");
  });
  it("Mars in Capricorn → exaltation", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Capricorn)).toBe("exaltation");
  });
  it("Mercury in Virgo → domicile (domicile takes priority over exaltation)", () => {
    // Mercury has both domicile and exaltation in Virgo; domicile wins
    expect(getDignityForPlanet(CelestialBody.Mercury, ZodiacSign.Virgo)).toBe("domicile");
  });

  // Detriment
  it("Sun in Aquarius → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Aquarius)).toBe("detriment");
  });
  it("Moon in Capricorn → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Moon, ZodiacSign.Capricorn)).toBe("detriment");
  });
  it("Venus in Aries → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Venus, ZodiacSign.Aries)).toBe("detriment");
  });
  it("Saturn in Cancer → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Saturn, ZodiacSign.Cancer)).toBe("detriment");
  });
  it("Uranus in Leo → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Uranus, ZodiacSign.Leo)).toBe("detriment");
  });
  it("Neptune in Virgo → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Neptune, ZodiacSign.Virgo)).toBe("detriment");
  });
  it("Pluto in Taurus → detriment", () => {
    expect(getDignityForPlanet(CelestialBody.Pluto, ZodiacSign.Taurus)).toBe("detriment");
  });

  // Fall
  it("Sun in Libra → fall", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Libra)).toBe("fall");
  });
  it("Moon in Scorpio → fall", () => {
    expect(getDignityForPlanet(CelestialBody.Moon, ZodiacSign.Scorpio)).toBe("fall");
  });
  it("Mars in Cancer → fall", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Cancer)).toBe("fall");
  });
  it("Saturn in Aries → fall", () => {
    expect(getDignityForPlanet(CelestialBody.Saturn, ZodiacSign.Aries)).toBe("fall");
  });

  // Peregrine (no dignity)
  it("Sun in Gemini → null (peregrine)", () => {
    expect(getDignityForPlanet(CelestialBody.Sun, ZodiacSign.Gemini)).toBeNull();
  });
  it("Mars in Gemini → null (peregrine)", () => {
    expect(getDignityForPlanet(CelestialBody.Mars, ZodiacSign.Gemini)).toBeNull();
  });

  // Uranus/Neptune/Pluto have no exaltation or fall
  it("Uranus in Aries → null (no exaltation for outers)", () => {
    expect(getDignityForPlanet(CelestialBody.Uranus, ZodiacSign.Aries)).toBeNull();
  });
});

describe("getDignityDetail", () => {
  it("Aries → ruler Mars, exaltation Sun, detriment Venus, fall Saturn", () => {
    const detail = getDignityDetail(ZodiacSign.Aries);
    expect(detail.ruler).toBe(CelestialBody.Mars);
    expect(detail.exaltation).toBe(CelestialBody.Sun);
    expect(detail.detriment).toBe(CelestialBody.Venus);
    expect(detail.fall).toBe(CelestialBody.Saturn);
    expect(detail.coRuler).toBeNull();
  });

  it("Cancer → ruler Moon, exaltation Jupiter, detriment Saturn, fall Mars", () => {
    const detail = getDignityDetail(ZodiacSign.Cancer);
    expect(detail.ruler).toBe(CelestialBody.Moon);
    expect(detail.exaltation).toBe(CelestialBody.Jupiter);
    expect(detail.detriment).toBe(CelestialBody.Saturn);
    expect(detail.fall).toBe(CelestialBody.Mars);
  });

  it("Scorpio → traditional ruler Mars, coRuler Pluto", () => {
    const detail = getDignityDetail(ZodiacSign.Scorpio);
    expect(detail.ruler).toBe(CelestialBody.Mars);
    expect(detail.coRuler).toBe(CelestialBody.Pluto);
  });

  it("Aquarius → traditional ruler Saturn, coRuler Uranus", () => {
    const detail = getDignityDetail(ZodiacSign.Aquarius);
    expect(detail.ruler).toBe(CelestialBody.Saturn);
    expect(detail.coRuler).toBe(CelestialBody.Uranus);
  });

  it("Pisces → traditional ruler Jupiter, coRuler Neptune", () => {
    const detail = getDignityDetail(ZodiacSign.Pisces);
    expect(detail.ruler).toBe(CelestialBody.Jupiter);
    expect(detail.coRuler).toBe(CelestialBody.Neptune);
  });

  it("Gemini → no exaltation, no fall", () => {
    const detail = getDignityDetail(ZodiacSign.Gemini);
    expect(detail.ruler).toBe(CelestialBody.Mercury);
    expect(detail.exaltation).toBeNull();
    expect(detail.detriment).toBe(CelestialBody.Jupiter);
    expect(detail.fall).toBeNull();
  });
});

describe("getStrongestDignity", () => {
  it("returns domicile over exaltation when both apply (Mercury in Virgo)", () => {
    expect(getStrongestDignity(CelestialBody.Mercury, ZodiacSign.Virgo)).toBe("domicile");
  });

  it("returns exaltation when no domicile", () => {
    expect(getStrongestDignity(CelestialBody.Sun, ZodiacSign.Aries)).toBe("exaltation");
  });

  it("returns detriment", () => {
    expect(getStrongestDignity(CelestialBody.Sun, ZodiacSign.Aquarius)).toBe("detriment");
  });

  it("returns fall", () => {
    expect(getStrongestDignity(CelestialBody.Mars, ZodiacSign.Cancer)).toBe("fall");
  });

  it("returns null when peregrine", () => {
    expect(getStrongestDignity(CelestialBody.Sun, ZodiacSign.Gemini)).toBeNull();
  });
});

describe("getHouseForLongitude", () => {
  // Standard Placidus cusps (12 cusps, 0-indexed: cusp[0] = house 1 start)
  const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  it("planet at 15° → house 1", () => {
    expect(getHouseForLongitude(15, cusps)).toBe(1);
  });

  it("planet at 45° → house 2", () => {
    expect(getHouseForLongitude(45, cusps)).toBe(2);
  });

  it("planet at 350° → house 12", () => {
    expect(getHouseForLongitude(350, cusps)).toBe(12);
  });

  it("planet exactly on cusp 1 → house 1", () => {
    expect(getHouseForLongitude(0, cusps)).toBe(1);
  });

  it("planet exactly on cusp 4 → house 4", () => {
    expect(getHouseForLongitude(90, cusps)).toBe(4);
  });

  // Non-equal cusps (wrap-around case: house 12 cusp > house 1 cusp)
  const unevenCusps = [280, 310, 350, 15, 45, 75, 100, 130, 170, 195, 225, 255];

  it("handles uneven cusps: planet at 300° → house 2 (between cusp 280 and 310... actually house 1)", () => {
    // 300 is between cusp[0]=280 and cusp[1]=310 → house 1
    expect(getHouseForLongitude(300, unevenCusps)).toBe(1);
  });

  it("handles uneven cusps: planet at 0° → house 3 (between cusp[2]=350 and cusp[3]=15)", () => {
    expect(getHouseForLongitude(0, unevenCusps)).toBe(3);
  });

  it("handles uneven cusps: planet at 200° → house 10", () => {
    // Between cusp[9]=195 and cusp[10]=225 → house 10
    expect(getHouseForLongitude(200, unevenCusps)).toBe(10);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd apps/web && npx vitest run src/lib/dignities.test.ts`
Expected: All tests FAIL (stub implementations return wrong values)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/dignities.ts apps/web/src/lib/dignities.test.ts
git commit -m "test: add failing tests for essential dignity lookups"
```

---

### Task 2: Dignity Lookup Module — Implementation

**Files:**
- Modify: `apps/web/src/lib/dignities.ts`

- [ ] **Step 1: Implement the full dignity module**

Replace the contents of `apps/web/src/lib/dignities.ts` with:

```typescript
import { ZodiacSign, CelestialBody } from "@astro-app/shared-types";

export type DignityType = "domicile" | "exaltation" | "detriment" | "fall";

export interface DignityDetail {
  ruler: CelestialBody | null;
  exaltation: CelestialBody | null;
  detriment: CelestialBody | null;
  fall: CelestialBody | null;
  /** Modern co-ruler, if different from traditional ruler */
  coRuler: CelestialBody | null;
}

// Traditional rulers for each sign
const RULERS: Record<ZodiacSign, CelestialBody> = {
  [ZodiacSign.Aries]: CelestialBody.Mars,
  [ZodiacSign.Taurus]: CelestialBody.Venus,
  [ZodiacSign.Gemini]: CelestialBody.Mercury,
  [ZodiacSign.Cancer]: CelestialBody.Moon,
  [ZodiacSign.Leo]: CelestialBody.Sun,
  [ZodiacSign.Virgo]: CelestialBody.Mercury,
  [ZodiacSign.Libra]: CelestialBody.Venus,
  [ZodiacSign.Scorpio]: CelestialBody.Mars,
  [ZodiacSign.Sagittarius]: CelestialBody.Jupiter,
  [ZodiacSign.Capricorn]: CelestialBody.Saturn,
  [ZodiacSign.Aquarius]: CelestialBody.Saturn,
  [ZodiacSign.Pisces]: CelestialBody.Jupiter,
};

// Modern co-rulers (only for signs with dual rulership)
const CO_RULERS: Partial<Record<ZodiacSign, CelestialBody>> = {
  [ZodiacSign.Scorpio]: CelestialBody.Pluto,
  [ZodiacSign.Aquarius]: CelestialBody.Uranus,
  [ZodiacSign.Pisces]: CelestialBody.Neptune,
};

// Exaltation: planet → sign where it is exalted
const EXALTATIONS: Partial<Record<CelestialBody, ZodiacSign>> = {
  [CelestialBody.Sun]: ZodiacSign.Aries,
  [CelestialBody.Moon]: ZodiacSign.Taurus,
  [CelestialBody.Mercury]: ZodiacSign.Virgo,
  [CelestialBody.Venus]: ZodiacSign.Pisces,
  [CelestialBody.Mars]: ZodiacSign.Capricorn,
  [CelestialBody.Jupiter]: ZodiacSign.Cancer,
  [CelestialBody.Saturn]: ZodiacSign.Libra,
};

// Reverse lookup: sign → planet exalted there
const SIGN_EXALTATION: Partial<Record<ZodiacSign, CelestialBody>> = {};
for (const [body, sign] of Object.entries(EXALTATIONS)) {
  SIGN_EXALTATION[sign as ZodiacSign] = body as CelestialBody;
}

// Detriment: planet → signs where it is in detriment (opposite of domicile)
const DETRIMENTS: Partial<Record<CelestialBody, ZodiacSign[]>> = {
  [CelestialBody.Sun]: [ZodiacSign.Aquarius],
  [CelestialBody.Moon]: [ZodiacSign.Capricorn],
  [CelestialBody.Mercury]: [ZodiacSign.Sagittarius, ZodiacSign.Pisces],
  [CelestialBody.Venus]: [ZodiacSign.Aries, ZodiacSign.Scorpio],
  [CelestialBody.Mars]: [ZodiacSign.Taurus, ZodiacSign.Libra],
  [CelestialBody.Jupiter]: [ZodiacSign.Gemini, ZodiacSign.Virgo],
  [CelestialBody.Saturn]: [ZodiacSign.Cancer, ZodiacSign.Leo],
  [CelestialBody.Uranus]: [ZodiacSign.Leo],
  [CelestialBody.Neptune]: [ZodiacSign.Virgo],
  [CelestialBody.Pluto]: [ZodiacSign.Taurus],
};

// Reverse lookup: sign → planet(s) in detriment there
const SIGN_DETRIMENT: Partial<Record<ZodiacSign, CelestialBody>> = {};
for (const [body, signs] of Object.entries(DETRIMENTS)) {
  for (const sign of signs as ZodiacSign[]) {
    // Store the traditional planet (first one assigned wins for the detail view)
    if (!SIGN_DETRIMENT[sign]) {
      SIGN_DETRIMENT[sign] = body as CelestialBody;
    }
  }
}

// Fall: planet → sign where it falls (opposite of exaltation)
const FALLS: Partial<Record<CelestialBody, ZodiacSign>> = {
  [CelestialBody.Sun]: ZodiacSign.Libra,
  [CelestialBody.Moon]: ZodiacSign.Scorpio,
  [CelestialBody.Mercury]: ZodiacSign.Pisces,
  [CelestialBody.Venus]: ZodiacSign.Virgo,
  [CelestialBody.Mars]: ZodiacSign.Cancer,
  [CelestialBody.Jupiter]: ZodiacSign.Capricorn,
  [CelestialBody.Saturn]: ZodiacSign.Aries,
};

// Reverse lookup: sign → planet in fall there
const SIGN_FALL: Partial<Record<ZodiacSign, CelestialBody>> = {};
for (const [body, sign] of Object.entries(FALLS)) {
  SIGN_FALL[sign as ZodiacSign] = body as CelestialBody;
}

/**
 * Returns the dignity type a planet has in the given sign, using priority:
 * domicile > exaltation > detriment > fall.
 * Returns null if the planet is peregrine (no essential dignity).
 */
export function getDignityForPlanet(
  body: CelestialBody,
  sign: ZodiacSign,
): DignityType | null {
  // Domicile: planet is the traditional ruler or modern co-ruler of this sign
  if (RULERS[sign] === body || CO_RULERS[sign] === body) {
    return "domicile";
  }

  // Exaltation
  if (EXALTATIONS[body] === sign) {
    return "exaltation";
  }

  // Detriment
  if (DETRIMENTS[body]?.includes(sign)) {
    return "detriment";
  }

  // Fall
  if (FALLS[body] === sign) {
    return "fall";
  }

  return null;
}

/**
 * Returns all four dignity holders for a given sign.
 */
export function getDignityDetail(sign: ZodiacSign): DignityDetail {
  return {
    ruler: RULERS[sign] ?? null,
    exaltation: SIGN_EXALTATION[sign] ?? null,
    detriment: SIGN_DETRIMENT[sign] ?? null,
    fall: SIGN_FALL[sign] ?? null,
    coRuler: CO_RULERS[sign] ?? null,
  };
}

/**
 * Alias for getDignityForPlanet — returns the single strongest dignity/debility.
 */
export function getStrongestDignity(
  body: CelestialBody,
  sign: ZodiacSign,
): DignityType | null {
  return getDignityForPlanet(body, sign);
}

/**
 * Determines which house (1-12) a planet falls in based on its longitude
 * and the array of 12 house cusps.
 * Cusps are ecliptic longitudes (0-360) for houses 1-12.
 */
export function getHouseForLongitude(longitude: number, cusps: number[]): number {
  const lon = ((longitude % 360) + 360) % 360;

  for (let i = 0; i < 12; i++) {
    const cusp = cusps[i];
    const nextCusp = cusps[(i + 1) % 12];

    if (nextCusp > cusp) {
      // Normal case: no wrap-around
      if (lon >= cusp && lon < nextCusp) return i + 1;
    } else {
      // Wrap-around case: cusp crosses 0°
      if (lon >= cusp || lon < nextCusp) return i + 1;
    }
  }

  return 1; // Fallback (should not happen with valid cusps)
}
```

- [ ] **Step 2: Run the tests**

Run: `cd apps/web && npx vitest run src/lib/dignities.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/dignities.ts
git commit -m "feat: implement essential dignity lookups and house calculation"
```

---

### Task 3: PlanetCard — Add House Column and Expand/Collapse

**Files:**
- Modify: `apps/web/src/components/home/planet-card.tsx`

- [ ] **Step 1: Update PlanetCard with house column and expand/collapse state**

Replace the contents of `apps/web/src/components/home/planet-card.tsx` with:

```tsx
import { useMemo, useState } from "react";
import { CelestialBody, Element, SIGN_ELEMENT } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import { PLANET_GLYPHS, SIGN_GLYPHS, formatDegree } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import {
  getHouseForLongitude,
  getStrongestDignity,
  getDignityDetail,
  type DignityType,
} from "@/lib/dignities";

const ELEMENT_COLORS: Record<Element, string> = {
  [Element.Fire]: "var(--color-fire)",
  [Element.Earth]: "var(--color-earth)",
  [Element.Air]: "var(--color-air)",
  [Element.Water]: "var(--color-water)",
};
import { ErrorCard } from "@/components/ui/error-card";

const BASE_BODIES = [
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
  CelestialBody.Chiron,
];

/** Bodies that have essential dignities (classical 7 + modern outers) */
const DIGNITY_BODIES = [
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
];

function getNodeBodies(nodeType: "mean" | "true"): CelestialBody[] {
  return nodeType === "mean"
    ? [CelestialBody.MeanNorthNode, CelestialBody.MeanSouthNode]
    : [CelestialBody.TrueNorthNode, CelestialBody.TrueSouthNode];
}

const DIGNITY_LABELS: Record<DignityType, string> = {
  domicile: "Domicile",
  exaltation: "Exaltation",
  detriment: "Detriment",
  fall: "Fall",
};

function DignityBadge({ dignity }: { dignity: DignityType }) {
  const isPositive = dignity === "domicile" || dignity === "exaltation";
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] leading-none font-medium ${
        isPositive
          ? "bg-green-900/30 text-success"
          : "bg-red-900/30 text-destructive"
      }`}
    >
      {DIGNITY_LABELS[dignity]}
    </span>
  );
}

interface Props {
  chartData: ChartData | null;
  apiError?: boolean;
  retry?: () => void;
  nodeType?: "mean" | "true";
}

export function PlanetCard({ chartData, apiError, retry, nodeType: nodeTypeProp }: Props) {
  const globalNodeType = useSettings((s) => s.defaults.nodeType);
  const nodeType = nodeTypeProp ?? globalNodeType;
  const displayBodies = useMemo(() => [...BASE_BODIES, ...getNodeBodies(nodeType)], [nodeType]);
  const [expanded, setExpanded] = useState(false);

  if (!chartData) return null;

  return (
    <div
      className="bg-card border border-border rounded-lg p-phi-3 card-hover cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      {apiError && retry && (
        <ErrorCard
          message="Showing approximation."
          onRetry={retry}
          className="text-xs mb-3"
        />
      )}

      {!expanded ? (
        /* ── Compact view ── */
        <table className="w-full text-sm">
          <tbody>
            {displayBodies.map((body) => {
              const zp = chartData.zodiac_positions[body];
              const pos = chartData.positions[body];
              if (!zp) return null;
              const glyph = PLANET_GLYPHS[body] ?? body;
              const signGlyph = SIGN_GLYPHS[zp.sign];
              const house = pos
                ? getHouseForLongitude(pos.longitude, chartData.houses.cusps)
                : null;
              return (
                <tr
                  key={body}
                  className="border-b border-border last:border-0 hover:bg-secondary transition-[background-color] duration-120 ease-out"
                >
                  <td className="py-1 w-[40px]">
                    <span className="text-primary text-base">{glyph}</span>
                  </td>
                  <td className="py-1" style={{ color: ELEMENT_COLORS[SIGN_ELEMENT[zp.sign]] }}>{signGlyph}</td>
                  <td className="py-1 text-foreground tabular-nums">
                    {formatDegree(zp.degree, zp.minute)}
                    {zp.is_retrograde && (
                      <span className="text-destructive text-xs font-semibold ml-1">℞</span>
                    )}
                  </td>
                  <td className="py-1 text-muted-foreground text-xs text-right w-[24px]">
                    {house}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        /* ── Expanded view ── */
        <>
          <div className="flex items-center justify-between mb-phi-2">
            <span className="text-foreground font-semibold text-sm font-display">
              Positions &amp; Dignities
            </span>
            <span className="text-muted-foreground text-xs">click to collapse</span>
          </div>

          {/* Position table + dignity badge */}
          <table className="w-full text-sm">
            <tbody>
              {displayBodies.map((body) => {
                const zp = chartData.zodiac_positions[body];
                const pos = chartData.positions[body];
                if (!zp) return null;
                const glyph = PLANET_GLYPHS[body] ?? body;
                const signGlyph = SIGN_GLYPHS[zp.sign];
                const house = pos
                  ? getHouseForLongitude(pos.longitude, chartData.houses.cusps)
                  : null;
                const dignity = DIGNITY_BODIES.includes(body)
                  ? getStrongestDignity(body, zp.sign)
                  : null;
                return (
                  <tr
                    key={body}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-1 w-[40px]">
                      <span className="text-primary text-base">{glyph}</span>
                    </td>
                    <td className="py-1" style={{ color: ELEMENT_COLORS[SIGN_ELEMENT[zp.sign]] }}>{signGlyph}</td>
                    <td className="py-1 text-foreground tabular-nums">
                      {formatDegree(zp.degree, zp.minute)}
                      {zp.is_retrograde && (
                        <span className="text-destructive text-xs font-semibold ml-1">℞</span>
                      )}
                    </td>
                    <td className="py-1 text-muted-foreground text-xs text-center w-[24px]">
                      {house}
                    </td>
                    <td className="py-1 text-right">
                      {dignity ? (
                        <DignityBadge dignity={dignity} />
                      ) : DIGNITY_BODIES.includes(body) ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Divider */}
          <div className="border-t border-border my-phi-3" />

          {/* Dignity detail grid */}
          <div className="text-muted-foreground text-[11px] uppercase tracking-wider mb-phi-2">
            Dignity Detail
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground text-[10px]">
                <th className="py-1 text-left w-[30px]" />
                <th className="py-1 text-left w-[24px]" />
                <th className="py-1 text-center px-1">Rul</th>
                <th className="py-1 text-center px-1">Exalt</th>
                <th className="py-1 text-center px-1">Detr</th>
                <th className="py-1 text-center px-1">Fall</th>
              </tr>
            </thead>
            <tbody>
              {DIGNITY_BODIES.map((body) => {
                const zp = chartData.zodiac_positions[body];
                if (!zp) return null;
                const glyph = PLANET_GLYPHS[body] ?? body;
                const signGlyph = SIGN_GLYPHS[zp.sign];
                const detail = getDignityDetail(zp.sign);

                const cellClass = (holder: CelestialBody | null, type: "dignity" | "debility") => {
                  if (!holder) return "text-muted-foreground";
                  if (holder === body) {
                    return type === "dignity"
                      ? "text-success font-semibold"
                      : "text-destructive font-semibold";
                  }
                  return "text-muted-foreground";
                };

                const rulerGlyph = detail.ruler ? PLANET_GLYPHS[detail.ruler] ?? "—" : "—";
                const coRulerGlyph = detail.coRuler ? PLANET_GLYPHS[detail.coRuler] : null;
                const exaltGlyph = detail.exaltation ? PLANET_GLYPHS[detail.exaltation] ?? "—" : "—";
                const detrGlyph = detail.detriment ? PLANET_GLYPHS[detail.detriment] ?? "—" : "—";
                const fallGlyph = detail.fall ? PLANET_GLYPHS[detail.fall] ?? "—" : "—";

                // For ruler column, check both traditional and co-ruler
                const isRuler = detail.ruler === body || detail.coRuler === body;
                const rulerClass = isRuler
                  ? "text-success font-semibold"
                  : "text-muted-foreground";

                return (
                  <tr key={body} className="border-b border-border last:border-0">
                    <td className="py-1">
                      <span className="text-primary">{glyph}</span>
                    </td>
                    <td className="py-1" style={{ color: ELEMENT_COLORS[SIGN_ELEMENT[zp.sign]] }}>
                      {signGlyph}
                    </td>
                    <td className={`py-1 text-center px-1 ${rulerClass}`}>
                      {coRulerGlyph ? `${rulerGlyph}/${coRulerGlyph}` : rulerGlyph}
                    </td>
                    <td className={`py-1 text-center px-1 ${cellClass(detail.exaltation, "dignity")}`}>
                      {exaltGlyph}
                    </td>
                    <td className={`py-1 text-center px-1 ${cellClass(detail.detriment, "debility")}`}>
                      {detrGlyph}
                    </td>
                    <td className={`py-1 text-center px-1 ${cellClass(detail.fall, "debility")}`}>
                      {fallGlyph}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run the dev server and verify visually**

Run: `cd apps/web && npm run dev`

Check:
- Compact view: planets show glyph, sign, degree, retrograde, house number
- Click card: expands to show positions + badge + dignity detail grid
- Click again: collapses back to compact

- [ ] **Step 3: Run all existing tests to ensure no regressions**

Run: `cd apps/web && npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/planet-card.tsx
git commit -m "feat: add essential dignities and house column to PlanetCard"
```

---

### Task 4: Update Changelog

**Files:**
- Modify: `AGENT_CHANGELOG.md`

- [ ] **Step 1: Add changelog entry**

Add entry at the top of `AGENT_CHANGELOG.md`:

```markdown
## Essential Dignities on PlanetCard

- Added expand/collapse interaction to PlanetCard (click to toggle, same pattern as PlanetaryHoursCard)
- Compact view now shows house number column
- Expanded view shows:
  - Dignity badge per planet (Domicile/Exaltation green, Detriment/Fall red)
  - "Dignity Detail" grid showing ruler, exaltation, detriment, fall for each planet's current sign
- Includes traditional + modern rulerships (Uranus→Aquarius, Neptune→Pisces, Pluto→Scorpio)
- All dignity data is client-side lookup — no backend changes
- Full dignity table (triplicity, term, face, scoring) deferred to future
```

- [ ] **Step 2: Commit**

```bash
git add AGENT_CHANGELOG.md
git commit -m "docs: add essential dignities changelog entry"
```

import { SearchGlobalSolarEclipse, SearchLunarEclipse } from "astronomy-engine";

export type EclipseKind = "solar" | "lunar";
export type EclipseSubtype = "partial" | "total" | "annular" | "penumbral";

export interface NextEclipse {
  /** solar or lunar */
  kind: EclipseKind;
  /** total | partial | annular | penumbral */
  subtype: EclipseSubtype;
  /** UT peak of the eclipse */
  peak: Date;
  /** Peak obscuration [0, 1], or null when not reported */
  obscuration: number | null;
}

/**
 * Returns the earliest solar OR lunar eclipse at/after `from`.
 *
 * Pure, deterministic, no network. Uses astronomy-engine's
 * `SearchGlobalSolarEclipse` / `SearchLunarEclipse` and picks whichever
 * one peaks first.
 */
export function nextEclipse(from: Date): NextEclipse {
  const solar = SearchGlobalSolarEclipse(from);
  const lunar = SearchLunarEclipse(from);
  const pickSolar =
    solar.peak.date.getTime() <= lunar.peak.date.getTime();

  if (pickSolar) {
    return {
      kind: "solar",
      subtype: solar.kind as EclipseSubtype,
      peak: solar.peak.date,
      obscuration: solar.obscuration ?? null,
    };
  }
  return {
    kind: "lunar",
    subtype: lunar.kind as EclipseSubtype,
    peak: lunar.peak.date,
    obscuration: lunar.obscuration,
  };
}

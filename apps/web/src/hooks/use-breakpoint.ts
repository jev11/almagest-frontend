import { useSyncExternalStore } from "react";

/**
 * Four-tier semantic breakpoint — matches the `--breakpoint-*` vars in
 * `index.css` and the Tailwind `tablet:` / `desktop:` / `wide:` variants.
 */
export type BreakpointTier = "phone" | "tablet" | "desktop" | "wide";

export interface BreakpointState {
  /** The current tier, derived from `window.innerWidth`. */
  tier: BreakpointTier;
  /** `true` when below the `tablet` threshold (< 640 px). */
  isPhone: boolean;
  /** `true` for phone or tablet tiers (< 1024 px). */
  isTabletOrSmaller: boolean;
  /** `true` for desktop or wide tiers (≥ 1024 px). */
  isDesktopOrLarger: boolean;
  /** `true` when at or above the `wide` threshold (≥ 1440 px). */
  isWide: boolean;
}

const TABLET_QUERY = "(min-width: 640px)";
const DESKTOP_QUERY = "(min-width: 1024px)";
const WIDE_QUERY = "(min-width: 1440px)";

function deriveTier(
  isTablet: boolean,
  isDesktop: boolean,
  isWide: boolean,
): BreakpointTier {
  if (isWide) return "wide";
  if (isDesktop) return "desktop";
  if (isTablet) return "tablet";
  return "phone";
}

function tierToState(tier: BreakpointTier): BreakpointState {
  return {
    tier,
    isPhone: tier === "phone",
    isTabletOrSmaller: tier === "phone" || tier === "tablet",
    isDesktopOrLarger: tier === "desktop" || tier === "wide",
    isWide: tier === "wide",
  };
}

// Cache the last-computed state so `getSnapshot` returns a stable reference
// between resize-unrelated renders — required by `useSyncExternalStore` to
// avoid infinite re-render loops.
let cachedTier: BreakpointTier | null = null;
let cachedState: BreakpointState | null = null;

function getSnapshot(): BreakpointState {
  if (typeof window === "undefined") {
    // This branch is unreachable under normal runtime — React calls
    // `getSnapshot` only on the client — but kept for symmetry with
    // `getServerSnapshot`.
    return tierToState("desktop");
  }
  const isTablet = window.matchMedia(TABLET_QUERY).matches;
  const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
  const isWide = window.matchMedia(WIDE_QUERY).matches;
  const tier = deriveTier(isTablet, isDesktop, isWide);
  if (tier !== cachedTier || cachedState === null) {
    cachedTier = tier;
    cachedState = tierToState(tier);
  }
  return cachedState;
}

function getServerSnapshot(): BreakpointState {
  // SSR-safe default — matches the "persisted Zustand assumes desktop on
  // first paint" pattern in `use-settings.ts` / `use-sidebar.ts`. Hydration
  // on the client re-runs `getSnapshot` once `window` is available, so any
  // non-desktop viewport corrects on first commit.
  return tierToState("desktop");
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const tabletMql = window.matchMedia(TABLET_QUERY);
  const desktopMql = window.matchMedia(DESKTOP_QUERY);
  const wideMql = window.matchMedia(WIDE_QUERY);
  tabletMql.addEventListener("change", onChange);
  desktopMql.addEventListener("change", onChange);
  wideMql.addEventListener("change", onChange);
  return () => {
    tabletMql.removeEventListener("change", onChange);
    desktopMql.removeEventListener("change", onChange);
    wideMql.removeEventListener("change", onChange);
  };
}

/**
 * Tracks the current semantic breakpoint tier via `window.matchMedia`.
 *
 * Returns a `BreakpointState` with the current tier plus commonly-needed
 * boolean helpers. Re-renders only when the tier changes — not on every
 * pixel resize. The underlying listener is registered once per subscriber
 * and cleaned up on unmount.
 *
 * SSR behavior: returns `'desktop'` when `window` is undefined, mirroring
 * the existing Zustand-persisted hooks (`use-settings.ts`, `use-sidebar.ts`)
 * which default to desktop-shaped state until client hydration completes.
 *
 * @example
 * const { isPhone, isDesktopOrLarger } = useBreakpoint();
 * return isPhone ? <TabbedLayout /> : <ColumnsLayout />;
 */
export function useBreakpoint(): BreakpointState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

import { useState, useEffect } from "react";

const CACHE_KEY = "astro-timezone-cache";

type TzCache = Record<string, string>;

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(1)},${lon.toFixed(1)}`;
}

function readCache(): TzCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as TzCache;
  } catch { /* ignore */ }
  return {};
}

function writeCache(cache: TzCache): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

async function fetchTimezone(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { timeZone?: string };
    return data.timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * Format an IANA timezone into "ABBR ±HH:MM" notation.
 * e.g. "Europe/Moscow" → "MSK +3:00", "Asia/Yekaterinburg" → "YEKT +5:00"
 */
function formatTimezone(iana: string, date: Date = new Date()): string {
  try {
    // Get abbreviation (e.g. "CET", "MSK", "GMT+5")
    const abbr = new Intl.DateTimeFormat("en-US", {
      timeZone: iana,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? iana;

    // Compute UTC offset in minutes
    // Create a date string in the target timezone and compare with UTC
    const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = date.toLocaleString("en-US", { timeZone: iana });
    const diffMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
    const totalMinutes = Math.round(diffMs / 60000);
    const sign = totalMinutes >= 0 ? "+" : "-";
    const absMin = Math.abs(totalMinutes);
    const hours = Math.floor(absMin / 60);
    const minutes = absMin % 60;
    const offset = minutes > 0 ? `${sign}${hours}:${String(minutes).padStart(2, "0")}` : `${sign}${hours}:00`;

    // If the abbreviation already encodes the offset (e.g. "GMT+2"), just return it with proper formatting
    if (/^(GMT|UTC)[+-]/.test(abbr)) {
      return `UTC ${offset}`;
    }
    return `${abbr} ${offset}`;
  } catch {
    return iana;
  }
}

/**
 * Resolves lat/lon to a formatted timezone string (e.g. "CET +1:00").
 * Falls back to the browser's local timezone if lookup fails.
 * Results are cached in localStorage.
 */
export function useTimezone(lat: number, lon: number): { iana: string; display: string } {
  const key = cacheKey(lat, lon);
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [tz, setTz] = useState<string>(() => {
    const cached = readCache()[key];
    return cached ?? browserTz;
  });

  useEffect(() => {
    const cached = readCache()[key];
    if (cached) {
      setTz(cached);
      return;
    }

    let cancelled = false;
    fetchTimezone(lat, lon).then((result) => {
      if (cancelled) return;
      const resolved = result ?? browserTz;
      setTz(resolved);
      const cache = readCache();
      cache[key] = resolved;
      writeCache(cache);
    }).catch(() => { /* ignore */ });

    return () => { cancelled = true; };
  }, [key, lat, lon, browserTz]);

  return { iana: tz, display: formatTimezone(tz) };
}

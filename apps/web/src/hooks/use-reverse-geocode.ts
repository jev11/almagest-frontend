import { useState, useEffect } from "react";

const CACHE_KEY = "astro-geocode-cache";
const CACHE_MAX_ENTRIES = 50;

interface CacheEntry {
  name: string;
  ts: number;
}

type GeoCache = Record<string, CacheEntry>;

function cacheKey(lat: number, lon: number): string {
  // Round to ~1km precision to avoid cache misses from tiny GPS drift
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function readCache(): GeoCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as GeoCache;
  } catch { /* ignore */ }
  return {};
}

function writeCache(cache: GeoCache): void {
  // Evict oldest entries if over limit
  const entries = Object.entries(cache);
  if (entries.length > CACHE_MAX_ENTRIES) {
    entries.sort((a, b) => a[1].ts - b[1].ts);
    const trimmed = Object.fromEntries(entries.slice(-CACHE_MAX_ENTRIES));
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } else {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }
}

async function fetchLocationName(lat: number, lon: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=en`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Almagest/1.0" },
  });
  if (!res.ok) return null;

  const data = await res.json() as {
    address?: {
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      country?: string;
    };
  };

  const addr = data.address;
  if (!addr) return null;

  const city = addr.city ?? addr.town ?? addr.village;
  const country = addr.country;
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return null;
}

/**
 * Resolves lat/lon to a human-readable location name via Nominatim.
 * Results are cached in localStorage to avoid repeated API calls.
 */
export function useReverseGeocode(lat: number, lon: number): string | null {
  const key = cacheKey(lat, lon);
  const [name, setName] = useState<string | null>(() => {
    const cached = readCache()[key];
    return cached?.name ?? null;
  });

  useEffect(() => {
    const cached = readCache()[key];
    if (cached) {
      setName(cached.name);
      return;
    }

    let cancelled = false;
    fetchLocationName(lat, lon).then((result) => {
      if (cancelled || !result) return;
      setName(result);
      const cache = readCache();
      cache[key] = { name: result, ts: Date.now() };
      writeCache(cache);
    }).catch(() => { /* ignore */ });

    return () => { cancelled = true; };
  }, [key, lat, lon]);

  return name;
}

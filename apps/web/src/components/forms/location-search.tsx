import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationResult {
  displayName: string;
  lat: number;
  lon: number;
}

interface LocationValue {
  name: string;
  lat: number;
  lon: number;
  timezone: string;
}

interface LocationSearchProps {
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
  className?: string;
}

async function searchLocations(query: string): Promise<LocationResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
  const data = await res.json() as { display_name: string; lat: string; lon: string }[];
  return data.map((item) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  }));
}

async function getTimezone(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("tz lookup failed");
    const data = await res.json() as { timeZone?: string };
    return data.timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

function formatTimezoneDisplay(iana: string): string {
  if (iana === "UTC") return "UTC";
  try {
    const now = new Date();
    const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = now.toLocaleString("en-US", { timeZone: iana });
    const diffMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
    const totalMin = Math.round(diffMs / 60000);
    const sign = totalMin >= 0 ? "+" : "-";
    const h = Math.floor(Math.abs(totalMin) / 60);
    const m = Math.abs(totalMin) % 60;
    const offset = m > 0 ? `${sign}${h}:${String(m).padStart(2, "0")}` : `${sign}${h}:00`;
    return `UTC ${offset}`;
  } catch {
    return iana;
  }
}

export function LocationSearch({ value, onChange, className }: LocationSearchProps) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input when value cleared externally
  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(null); // clear selection on edit

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchError(false);
      try {
        const res = await searchLocations(q);
        setResults(res);
        setOpen(res.length > 0);
      } catch {
        setSearchError(true);
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  async function handleSelect(result: LocationResult) {
    setOpen(false);
    setQuery(result.displayName.split(",")[0].trim());
    setLoading(true);
    try {
      const timezone = await getTimezone(result.lat, result.lon);
      onChange({
        name: result.displayName.split(",")[0].trim(),
        lat: result.lat,
        lon: result.lon,
        timezone,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search city..."
          className="w-full bg-input border border-border rounded-lg pl-9 pr-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors min-h-[44px]"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-secondary border border-border rounded-lg overflow-hidden shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-3 py-3 text-sm text-foreground hover:bg-border transition-colors truncate min-h-[44px]"
                onClick={() => handleSelect(r)}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}

      {searchError && (
        <p className="mt-1.5 text-xs text-destructive">Location search unavailable. Try again.</p>
      )}
      {value && (
        <p className="mt-1.5 text-xs text-primary">
          {value.lat.toFixed(4)}°{value.lat >= 0 ? "N" : "S"},{" "}
          {Math.abs(value.lon).toFixed(4)}°{value.lon >= 0 ? "E" : "W"} · {formatTimezoneDisplay(value.timezone)}
        </p>
      )}
    </div>
  );
}

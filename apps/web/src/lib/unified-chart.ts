import type { StoredChart, CloudChart } from "@astro-app/astro-client";
import type { ChartData } from "@astro-app/shared-types";

export interface UnifiedChart {
  id: string;
  source: "local" | "cloud";
  name: string;
  chart: ChartData;
  birthDatetime: string;
  latitude: number;
  longitude: number;
  location?: string;
  tags: string[];
  notes: string;
  pinned: boolean;
  lastViewedAt: number | null;
  createdAt: number;
}

export function fromStored(s: StoredChart): UnifiedChart {
  return {
    id: s.id,
    source: "local",
    name: s.name,
    chart: s.chart,
    birthDatetime: s.request.datetime,
    latitude: s.request.latitude,
    longitude: s.request.longitude,
    location: s.location,
    tags: s.tags ?? [],
    notes: s.notes ?? "",
    pinned: s.pinned ?? false,
    lastViewedAt: s.lastViewedAt ?? null,
    createdAt: s.createdAt,
  };
}

export function fromCloud(c: CloudChart): UnifiedChart {
  return {
    id: c.id,
    source: "cloud",
    name: c.name,
    chart: c.chart_data as ChartData,
    birthDatetime: c.birth_datetime,
    latitude: c.latitude,
    longitude: c.longitude,
    location: undefined,
    tags: c.tags ?? [],
    notes: c.notes ?? "",
    pinned: c.pinned ?? false,
    lastViewedAt: c.last_viewed_at ? new Date(c.last_viewed_at).getTime() : null,
    createdAt: new Date(c.created_at).getTime(),
  };
}

export function chartHref(c: UnifiedChart): string {
  return c.source === "cloud" ? `/chart/${c.id}?source=cloud` : `/chart/${c.id}`;
}

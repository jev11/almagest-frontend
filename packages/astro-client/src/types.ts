import type { ChartData, HouseSystem, ZodiacType } from "@astro-app/shared-types";

export interface NatalRequest {
  datetime: string; // ISO 8601 UTC
  latitude: number;
  longitude: number;
  house_system?: HouseSystem;
  zodiac_type?: ZodiacType;
  ayanamsa?: string;
}

export interface TransitRequest {
  datetime: string; // ISO 8601 UTC
  latitude: number;
  longitude: number;
  natal_datetime?: string;
  natal_latitude?: number;
  natal_longitude?: number;
  house_system?: HouseSystem;
  zodiac_type?: ZodiacType;
}

export interface BatchRequest {
  calculations: Array<{
    type: "natal";
    id: string;
    params: NatalRequest;
  }>;
}

// NatalResponse matches the backend directly — chart fields are at the top level.
export interface NatalResponse extends ChartData {
  warnings?: string[];
}

export interface TransitResponse {
  transit_chart: ChartData;
  natal_chart?: ChartData;
}

export interface BatchResultItem {
  id: string;
  type: string;
  status: "success" | "error";
  data?: NatalResponse | null;
  error?: string | null;
}

export interface BatchResponse {
  results: BatchResultItem[];
  metadata: {
    total: number;
    succeeded: number;
    failed: number;
    calculation_time_ms: number;
  };
}

export interface HealthResponse {
  status: string;
  version?: string;
}

export interface StoredChart {
  id: string;
  name: string;
  chart: ChartData;
  request: NatalRequest;
  location?: string;
  createdAt: number;
  updatedAt: number;
}

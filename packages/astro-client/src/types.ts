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
  requests: NatalRequest[];
}

export interface NatalResponse {
  chart: ChartData;
}

export interface TransitResponse {
  transit_chart: ChartData;
  natal_chart?: ChartData;
}

export interface BatchResponse {
  charts: ChartData[];
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
  createdAt: number;
  updatedAt: number;
}

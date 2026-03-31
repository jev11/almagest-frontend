/** Auth API types matching ALM-27 backend spec */

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  tier: "free" | "premium";
  created_at: string;
}

export interface AuthUser extends UserProfile {
  access_token: string;
  refresh_token: string;
}

/** Cloud chart types matching ALM-28 backend spec */

export interface CloudChart {
  id: string;
  user_id: string;
  name: string;
  birth_datetime: string;
  latitude: number;
  longitude: number;
  house_system: string;
  chart_data: unknown;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SaveChartRequest {
  name: string;
  birth_datetime: string;
  latitude: number;
  longitude: number;
  house_system: string;
  chart_data: unknown;
  tags?: string[];
  notes?: string;
}

export interface UpdateChartRequest {
  name?: string;
  tags?: string[];
  notes?: string;
}

export interface ListChartsParams {
  q?: string;
  tags?: string[];
  sort?: "created_at" | "name";
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export interface PaginatedCharts {
  items: CloudChart[];
  total: number;
  page: number;
  page_size: number;
}

export interface TierLimits {
  charts_used: number;
  charts_limit: number | null; // null = unlimited (premium)
  calcs_today: number;
  calcs_limit: number | null;
}

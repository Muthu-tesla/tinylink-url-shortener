export interface User {
  id: number;
  name: string;
  email: string;
}

export interface URLItem {
  id: number;
  short_code: string;
  short_url?: string;
  long_url: string;
  created_at: string;
  expires_at?: string | null;
  is_active: boolean;
  clicks: number;
  user_id?: number | null;
}

export interface URLListResponse {
  items: URLItem[];
  total: number;
  page: number;
  limit: number;
}

export interface URLStatsResponse {
  short_code: string;
  short_url?: string;
  long_url: string;
  created_at: string;
  expires_at?: string | null;
  clicks: number;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface HealthResponse {
  status: string;
  database: string;
  redis: string;
}

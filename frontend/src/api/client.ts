import type {
  User,
  URLItem,
  URLListResponse,
  URLStatsResponse,
  TokenResponse,
  HealthResponse,
} from "../types/api";

const RAW_API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

const TOKEN_KEY = "tinylink_auth_token";

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // LocalStorage might be disabled or full
  }
};

export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
};

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let message = "An error occurred";
    if (data && typeof data === "object") {
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        message = data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(", ");
      } else if (data.message) {
        message = data.message;
      }
    } else if (typeof data === "string" && data.length > 0) {
      message = data;
    } else {
      message = `Request failed with status ${response.status}`;
    }

    if (response.status === 401 && token) {
      removeToken();
      window.dispatchEvent(new Event("auth:logout"));
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const api = {
  async shortenUrl(
    longUrl: string,
    customAlias?: string,
    expiresAt?: string
  ): Promise<URLItem> {
    return apiFetch<URLItem>("/api/urls", {
      method: "POST",
      body: JSON.stringify({
        long_url: longUrl,
        custom_alias: customAlias && customAlias.trim() ? customAlias.trim() : null,
        expires_at: expiresAt || null,
      }),
    });
  },

  async register(name: string, email: string, password: string): Promise<User> {
    return apiFetch<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await apiFetch<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.access_token) {
      setToken(res.access_token);
    }
    return res;
  },

  async getMe(): Promise<User> {
    return apiFetch<User>("/api/auth/me");
  },

  async getUserUrls(
    search?: string,
    page = 1,
    limit = 20
  ): Promise<URLListResponse> {
    const params = new URLSearchParams();
    if (search && search.trim()) params.set("search", search.trim());
    params.set("page", String(page));
    params.set("limit", String(limit));

    return apiFetch<URLListResponse>(`/api/urls?${params.toString()}`);
  },

  async deleteUrl(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/api/urls/${id}`, {
      method: "DELETE",
    });
  },

  async getUrlStats(shortCode: string): Promise<URLStatsResponse> {
    return apiFetch<URLStatsResponse>(`/api/urls/${encodeURIComponent(shortCode)}/stats`);
  },

  async getHealth(): Promise<HealthResponse> {
    return apiFetch<HealthResponse>("/api/health");
  },
};

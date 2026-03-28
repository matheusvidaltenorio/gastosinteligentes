import axios, { type AxiosError } from "axios";
import type { ApiErrorBody } from "@/types/api";

const TOKEN_KEY = "cgi_token";
const USER_ID_KEY = "cgi_user_id";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getStoredUserId = () => localStorage.getItem(USER_ID_KEY);

export function setSession(token: string, userId: number) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, String(userId));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

/** Base URL vazia = mesmo host (Vite proxy em dev). Produção: VITE_API_URL */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    if (status === 401 && getToken()) {
      clearSession();
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const loginPath = base ? `${base}/login` : "/login";
      if (!window.location.pathname.endsWith("/login")) {
        window.location.assign(loginPath);
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const d = error.response?.data;
    if (d && typeof d === "object") {
      if ("error" in d && typeof d.error === "string") return d.error;
      if ("detail" in d && d.detail != null) return String(d.detail);
    }
    return error.message || "Erro de rede";
  }
  if (error instanceof Error) return error.message;
  return "Algo deu errado";
}

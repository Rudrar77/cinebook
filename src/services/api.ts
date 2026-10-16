import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("cinebook_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.data && typeof error.response.data === "object") {
      const data = error.response.data as { message?: string; error?: string };
      if (data.message || data.error) return data.message ?? data.error ?? "The request could not be completed.";
    }
    if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
      return "The movie service is unavailable. Your selections are safe; please try again later.";
    }
  }
  return "The request could not be completed. Please try again.";
}

export default api;
import api from "./api";

export interface AuthUser { id: string; name: string; email: string; role: "customer" | "admin" }
export interface AuthResponse { token: string; user: AuthUser }
export interface AuthRequest { name?: string; email: string; password: string }

export const authService = {
  async login(payload: AuthRequest) {
    const response = await api.post<AuthResponse>("/api/auth/login", payload);
    if (typeof window !== "undefined") window.localStorage.setItem("cinebook_token", response.data.token);
    return response.data;
  },
  async register(payload: AuthRequest) {
    const response = await api.post<AuthResponse>("/api/auth/register", payload);
    if (typeof window !== "undefined") window.localStorage.setItem("cinebook_token", response.data.token);
    return response.data;
  },
  async me() {
    const response = await api.get<AuthUser>("/api/auth/me");
    return response.data;
  },
  logout() {
    if (typeof window !== "undefined") window.localStorage.removeItem("cinebook_token");
  },
};
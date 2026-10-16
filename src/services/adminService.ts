import api from "./api";
import type { Booking, Movie, Showtime } from "./types";

export interface AdminDashboardData { totalMovies: number; totalBookings: number; revenue: number; upcomingShowtimes: Showtime[]; recentBookings: Booking[] }

export const adminService = {
  async dashboard() { return (await api.get<AdminDashboardData>("/api/admin/dashboard")).data; },
  async bookings() { return (await api.get<Booking[]>("/api/admin/bookings")).data; },
  async createMovie(payload: Omit<Movie, "id">) { return (await api.post<Movie>("/api/admin/movies", payload)).data; },
  async updateMovie(id: string, payload: Partial<Movie>) { return (await api.put<Movie>(`/api/admin/movies/${encodeURIComponent(id)}`, payload)).data; },
  async deleteMovie(id: string) { await api.delete(`/api/admin/movies/${encodeURIComponent(id)}`); },
  async createShowtime(payload: Omit<Showtime, "id">) { return (await api.post<Showtime>("/api/admin/showtimes", payload)).data; },
  async updateShowtime(id: string, payload: Partial<Showtime>) { return (await api.put<Showtime>(`/api/admin/showtimes/${encodeURIComponent(id)}`, payload)).data; },
  async deleteShowtime(id: string) { await api.delete(`/api/admin/showtimes/${encodeURIComponent(id)}`); },
};
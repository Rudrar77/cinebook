import api from "./api";
import type { Showtime } from "./types";

export const showtimeService = {
  async forMovie(movieId: string) {
    const response = await api.get<Showtime[]>(`/api/movies/${encodeURIComponent(movieId)}/showtimes`);
    return response.data;
  },
};
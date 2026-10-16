import api from "./api";
import type { Movie } from "./types";

export const movieService = {
  async list() {
    const response = await api.get<Movie[]>('/api/movies');
    return response.data;
  },
  async get(id: string) {
    const response = await api.get<Movie>(`/api/movies/${encodeURIComponent(id)}`);
    return response.data;
  },
};
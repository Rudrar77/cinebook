import api from "./api";
import type { Seat } from "./types";

export const seatService = {
  async forShowtime(showtimeId: string) {
    const response = await api.get<Seat[]>(`/api/showtimes/${encodeURIComponent(showtimeId)}/seats`);
    return response.data;
  },
};
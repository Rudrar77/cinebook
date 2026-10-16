import api from "./api";
import type { Booking, CreateBookingRequest, PaymentSimulationRequest } from "./types";

export const bookingService = {
  async create(payload: CreateBookingRequest) {
    const response = await api.post<Booking>("/api/bookings", payload);
    return response.data;
  },
  async mine() {
    const response = await api.get<Booking[]>("/api/bookings/my");
    return response.data;
  },
  async get(id: string) {
    const response = await api.get<Booking>(`/api/bookings/${encodeURIComponent(id)}`);
    return response.data;
  },
  async simulatePayment(id: string, payload: PaymentSimulationRequest) {
    const response = await api.post<Booking>(`/api/bookings/${encodeURIComponent(id)}/payment-simulation`, payload);
    return response.data;
  },
  async ticket(id: string) {
    const response = await api.get<Booking>(`/api/bookings/${encodeURIComponent(id)}/ticket`);
    return response.data;
  },
};
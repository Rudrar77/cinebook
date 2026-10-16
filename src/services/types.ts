export type MovieStatus = "now-showing" | "coming-soon";
export type BookingStatus = "pending" | "confirmed" | "failed" | "cancelled" | "expired";
export type PaymentStatus = "pending" | "success" | "failed";
export type PaymentMethod = "upi" | "card" | "cash";

export interface Movie {
  id: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  genre: string[];
  language: string;
  rating: number;
  durationMinutes: number;
  certification: string;
  releaseDate: string;
  status: MovieStatus;
  cast: string[];
  featured?: boolean;
}

export interface Showtime {
  id: string;
  movieId: string;
  cinema: string;
  screen: string;
  date: string;
  time: string;
  standardPrice: number;
  premiumPrice: number;
  language: string;
  format: string;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  category: "standard" | "premium";
  status: "available" | "booked";
}

export interface CreateBookingRequest {
  showtimeId: string;
  seats: string[];
}

export interface Booking {
  id: string;
  movie: Movie;
  showtime: Showtime;
  seats: string[];
  amount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface PaymentSimulationRequest {
  method: PaymentMethod;
}

export interface ApiErrorResponse {
  message?: string;
  error?: string;
}
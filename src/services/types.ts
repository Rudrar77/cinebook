export type MovieStatus = "now-showing" | "coming-soon";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "expired";
export type PaymentStatus = "pending" | "success" | "failed";
export type PaymentMethod = "upi" | "card";
export type UserRole = "customer" | "admin";
export type StoredUserRole = "CUSTOMER" | "ADMIN";
export type SeatCategory = "standard" | "premium";
export type StoredSeatCategory = "REGULAR" | "PREMIUM";
export type SeatAvailability = "available" | "selected" | "booked";
export type BookingSeatState = "HELD" | "CONFIRMED" | "RELEASED";
export type StoredBookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
export type StoredPaymentStatus = "PENDING" | "SUCCESS" | "FAILED";
export type StoredPaymentMethod = "UPI" | "CARD" | "CASH";

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
  featured?: boolean | undefined;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredMovie extends Movie {
  createdAt: string;
  updatedAt: string;
}

export interface Cinema {
  id: string;
  name: string;
  city: string;
  address: string;
}

export interface Screen {
  id: string;
  cinemaId: string;
  name: string;
  format: string;
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
  cinemaId?: string | undefined;
  screenId?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface StoredShowtime extends Showtime {
  cinemaId: string;
  screenId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  category: SeatCategory;
  status: "available" | "booked";
}

export interface StoredSeat {
  id: string;
  screenId: string;
  row: string;
  number: number;
  label: string;
  category: StoredSeatCategory;
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: StoredUserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface DemoSession {
  token: string;
  userId: string;
  createdAt: string;
}

export interface StoredBooking {
  id: string;
  code: string;
  userId: string;
  showtimeId: string;
  amount: number;
  status: StoredBookingStatus;
  paymentStatus: StoredPaymentStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface StoredBookingSeat {
  id: string;
  bookingId: string;
  showtimeId: string;
  seatId: string;
  seatLabel: string;
  state: BookingSeatState;
}

export interface StoredPayment {
  id: string;
  bookingId: string;
  method: StoredPaymentMethod;
  amount: number;
  status: StoredPaymentStatus;
  reference: string;
  simulated: true;
  createdAt: string;
  note: string;
}

export interface AdminSettings {
  demoMode: true;
  pendingBookingMinutes: number;
  notice: string;
}

export interface SchemaMeta {
  schemaVersion: number;
  migratedAt: string;
  seededAt?: string | undefined;
}

export interface CreateBookingRequest {
  showtimeId: string;
  seats: string[];
}

export interface CreateShowtimeRequest extends Omit<Showtime, "id"> {
  cinemaId?: string | undefined;
  screenId?: string | undefined;
}

export interface CreateMovieRequest extends Omit<Movie, "id"> {}

export interface Booking {
  id: string;
  code: string;
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
  forceFail?: boolean;
  qrScanned?: boolean;
  demoCardNumber?: string;
}

export interface MovieFilters {
  query?: string;
  genre?: string;
  language?: string;
  minRating?: number;
  status?: MovieStatus | "all";
  sort?: "title" | "rating" | "releaseDate";
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BookingFilters {
  query?: string;
  status?: BookingStatus | "all";
  paymentStatus?: PaymentStatus | "all";
}

export interface SeatPriceBreakdown {
  seatId: string;
  seatLabel: string;
  category: StoredSeatCategory;
  price: number;
}

export interface TicketView {
  demoLabel: string;
  bookingId: string;
  bookingCode: string;
  movieTitle: string;
  cinema: string;
  screen: string;
  date: string;
  time: string;
  seats: string[];
  customerName: string;
  amount: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  verificationRef: string;
  qrDataUrl: string;
}

export interface AdminDashboardData {
  totalMovies: number;
  totalBookings: number;
  revenue: number;
  upcomingShowtimes: Showtime[];
  recentBookings: Booking[];
}

export interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export const STORAGE_KEYS = {
  meta: "cinebook_v1_meta",
  users: "cinebook_v1_users",
  movies: "cinebook_v1_movies",
  cinemas: "cinebook_v1_cinemas",
  screens: "cinebook_v1_screens",
  seats: "cinebook_v1_seats",
  showtimes: "cinebook_v1_showtimes",
  bookings: "cinebook_v1_bookings",
  bookingSeats: "cinebook_v1_booking_seats",
  payments: "cinebook_v1_simulated_payments",
  session: "cinebook_v1_session",
  adminSettings: "cinebook_v1_admin_settings",
} as const;

export const SCHEMA_VERSION = 1;

export const RESET_CONFIRMATION = "RESET_CINEBOOK_DEMO";

export const DEMO_NOTICE =
  "CineBook LocalStorage demo: simulated authentication, simulated payments, and local tickets only. Not production-safe and not synchronized across browsers or devices.";

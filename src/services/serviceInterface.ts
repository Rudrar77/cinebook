import type { Result } from "./result";
import type {
  AdminDashboardData,
  AuthUser,
  Booking,
  BookingFilters,
  BookingStatus,
  CreateBookingRequest,
  CreateMovieRequest,
  CreateShowtimeRequest,
  Movie,
  MovieFilters,
  Paginated,
  PaymentMethod,
  PaymentStatus,
  Seat,
  SeatPriceBreakdown,
  Showtime,
  StoredPayment,
  TicketView,
  UserRole,
} from "./types";

export interface CinebookService {
  auth: {
    register(input: { name: string; email: string; password: string; role?: "customer" | "admin" }): Promise<Result<AuthUser>>;
    login(input: { email: string; password: string }): Promise<Result<AuthUser>>;
    logout(): Result<true>;
    currentUser(): Result<AuthUser | null>;
    updateProfile(input: { name?: string; email?: string }): Result<AuthUser>;
    checkRole(role: UserRole): Result<boolean>;
  };
  movies: {
    getMovies(): Result<Movie[]>;
    getMovieById(id: string): Result<Movie>;
    searchMovies(query: string): Result<Movie[]>;
    filterMovies(filters?: MovieFilters): Result<Paginated<Movie>>;
  };
  showtimes: {
    getShowtimesByMovie(movieId: string): Result<Showtime[]>;
  };
  seats: {
    getSeatsByShowtime(showtimeId: string): Result<Seat[]>;
    getAvailableSeats(showtimeId: string): Result<Seat[]>;
    getSeatPrice(showtimeId: string, seatId: string): Result<number>;
    calculateBookingTotal(showtimeId: string, seatIds: string[]): Result<{ total: number; seats: SeatPriceBreakdown[] }>;
  };
  bookings: {
    createBooking(input: CreateBookingRequest): Result<Booking>;
    getBookingById(id: string): Result<Booking>;
    getMyBookings(userId: string): Result<Booking[]>;
    cancelBooking(id: string): Result<Booking>;
    expirePendingBookings(): Result<number>;
  };
  payments: {
    simulatePayment(id: string, method: PaymentMethod, confirmation?: { qrScanned?: boolean; demoCardNumber?: string }): Promise<Result<StoredPayment>>;
    getPaymentByBookingId(id: string): Result<StoredPayment>;
  };
  tickets: {
    getTicketByBookingId(id: string): Promise<Result<TicketView>>;
    generateTicketQR(id: string): Promise<Result<string>>;
  };
  admin: {
    getDashboardStats(): Result<AdminDashboardData>;
    addMovie(movie: CreateMovieRequest): Result<Movie>;
    updateMovie(id: string, movie: Partial<Movie>): Result<Movie>;
    deleteMovie(id: string): Result<true>;
    addShowtime(showtime: CreateShowtimeRequest): Result<Showtime>;
    updateShowtime(id: string, showtime: Partial<Showtime>): Result<Showtime>;
    deleteShowtime(id: string): Result<true>;
    getAllBookings(filters?: BookingFilters): Result<Booking[]>;
    filterBookings(filters?: { status?: BookingStatus | "all"; paymentStatus?: PaymentStatus | "all" }): Result<Booking[]>;
  };
}

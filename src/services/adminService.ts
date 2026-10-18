import { fail, ok, unwrap, type Result } from "./result";
import { checkUserRole } from "./authService";
import { expirePendingBookings } from "./bookingLifecycle";
import { getAllBookings } from "./bookingService";
import { cinemas, movies, bookings, newId, screens, showtimes } from "./storageService";
import { ready, records } from "./serviceUtils";
import { addShowtime, deleteShowtime, getShowtimeById, updateShowtime } from "./showtimeService";
import {
  movieInputSchema,
  movieRecordSchema,
  cinemaSchema,
  screenSchema,
  storedBookingSchema,
  storedShowtimeSchema,
  zodMessage,
} from "./validation";
import type {
  AdminDashboardData,
  Booking,
  BookingFilters,
  CreateMovieRequest,
  CreateShowtimeRequest,
  Movie,
  Showtime,
  StoredMovie,
  StoredShowtime,
} from "./types";

function requireAdmin(): Result<true> {
  const role = checkUserRole("admin");
  if (!role.success) return role;
  return role.data ? ok(true) : fail("ADMIN_DEMO_ONLY", "This demo-only operation requires a signed-in ADMIN demo account.");
}

export function getAdminDashboardStats(): Result<AdminDashboardData> {
  const authorized = requireAdmin();
  if (!authorized.success) return authorized;
  const initialized = ready();
  if (!initialized.success) return initialized;
  const expired = expirePendingBookings();
  if (!expired.success) return expired;
  const movieRecords = records(movies, movieRecordSchema);
  if (!movieRecords.success) return movieRecords;
  const bookingRecords = records(bookings, storedBookingSchema);
  if (!bookingRecords.success) return bookingRecords;
  const showtimeRecords = records(showtimes, storedShowtimeSchema);
  if (!showtimeRecords.success) return showtimeRecords;
  const bookingViews = getAllBookings();
  if (!bookingViews.success) return bookingViews;
  const now = new Date();
  const upcomingShowtimes = showtimeRecords.data
    .filter((showtime) => {
      const minutes = timeToMinutesForDashboard(showtime.time);
      if (minutes == null) return false;
      const start = new Date(`${showtime.date}T00:00:00`);
      start.setMinutes(minutes);
      return start.getTime() >= now.getTime();
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 10);
  return ok({
    totalMovies: movieRecords.data.length,
    totalBookings: bookingRecords.data.length,
    revenue: bookingRecords.data
      .filter((booking) => booking.status === "CONFIRMED" && booking.paymentStatus === "SUCCESS")
      .reduce((sum, booking) => sum + booking.amount, 0),
    upcomingShowtimes,
    recentBookings: bookingViews.data.slice(0, 8),
  });
}

function timeToMinutesForDashboard(time: string): number | undefined {
  const match = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)?$/i.exec(time.trim());
  if (!match) return undefined;
  let hours = Number(match[1]);
  if (match[3]) hours = (hours % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  if (hours > 23) return undefined;
  return hours * 60 + Number(match[2]);
}

export function addMovie(input: CreateMovieRequest): Result<Movie> {
  const authorized = requireAdmin();
  if (!authorized.success) return authorized;
  const initialized = ready();
  if (!initialized.success) return initialized;
  const parsed = movieInputSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", zodMessage(parsed.error));
  const stamp = new Date().toISOString();
  const record: StoredMovie = { ...parsed.data, id: newId(), createdAt: stamp, updatedAt: stamp };
  const saved = movies.add(record);
  return saved.success ? ok(saved.data) : saved;
}

export function updateMovie(id: string, patch: Partial<Movie>): Result<Movie> {
  const authorized = requireAdmin();
  if (!authorized.success) return authorized;
  const loaded = records(movies, movieRecordSchema);
  if (!loaded.success) return loaded;
  const current = loaded.data.find((movie) => movie.id === id);
  if (!current) return fail("MOVIE_NOT_FOUND", "The requested movie was not found.");
  const parsed = movieInputSchema.safeParse({ ...current, ...patch });
  if (!parsed.success) return fail("VALIDATION_ERROR", zodMessage(parsed.error));
  const updated = movies.update(id, { ...parsed.data, updatedAt: new Date().toISOString() });
  return updated.success ? ok(updated.data) : updated;
}

export function deleteMovie(id: string): Result<true> {
  const authorized = requireAdmin();
  if (!authorized.success) return authorized;
  const loadedMovies = records(movies, movieRecordSchema);
  if (!loadedMovies.success) return loadedMovies;
  if (!loadedMovies.data.some((movie) => movie.id === id)) return fail("MOVIE_NOT_FOUND", "The requested movie was not found.");
  const loadedShowtimes = records(showtimes, storedShowtimeSchema);
  if (!loadedShowtimes.success) return loadedShowtimes;
  const movieShowtimes = new Set(loadedShowtimes.data.filter((item) => item.movieId === id).map((item) => item.id));
  const loadedBookings = records(bookings, storedBookingSchema);
  if (!loadedBookings.success) return loadedBookings;
  if (loadedBookings.data.some((booking) => movieShowtimes.has(booking.showtimeId) && booking.status === "CONFIRMED")) {
    return fail("RECORD_IN_USE", "A movie referenced by a confirmed booking cannot be deleted.");
  }
  if (movieShowtimes.size) return fail("RECORD_IN_USE", "Delete this movie's showtimes before deleting the movie.");
  return movies.remove(id);
}

export function addAdminShowtime(input: CreateShowtimeRequest): Result<Showtime> {
  const authorized = requireAdmin();
  if (!authorized.success) return authorized;
  return addShowtime(input);
}

export function updateAdminShowtime(id: string, patch: Partial<Showtime>): Result<Showtime> {
  const authorized = requireAdmin();
  if (!authorized.success) return authorized;
  const loadedBookings = records(bookings, storedBookingSchema);
  if (!loadedBookings.success) return loadedBookings;
  if (loadedBookings.data.some((booking) => booking.showtimeId === id && booking.status === "CONFIRMED")) {
    return fail("RECORD_IN_USE", "A showtime referenced by a confirmed booking cannot be changed.");
  }
  return updateShowtime(id, patch);
}

export function deleteAdminShowtime(id: string): Result<true> {
  const authorized = requireAdmin();
  if (!authorized.success) return authorized;
  const found = getShowtimeById(id);
  if (!found.success) return found;
  const loadedBookings = records(bookings, storedBookingSchema);
  if (!loadedBookings.success) return loadedBookings;
  if (loadedBookings.data.some((booking) => booking.showtimeId === id)) {
    return fail("RECORD_IN_USE", "A showtime referenced by a booking cannot be deleted.");
  }
  return deleteShowtime(id);
}

export function getAdminBookings(filters: BookingFilters = {}): Result<Booking[]> {
  const authorized = requireAdmin();
  if (!authorized.success) return authorized;
  return getAllBookings(filters);
}

export function getAdminCatalog() {
  const authorized = requireAdmin();
  if (!authorized.success) return authorized;
  const initialized = ready();
  if (!initialized.success) return initialized;
  const movieRecords = records(movies, movieRecordSchema);
  if (!movieRecords.success) return movieRecords;
  const cinemaRecords = records(cinemas, cinemaSchema);
  if (!cinemaRecords.success) return cinemaRecords;
  const screenRecords = records(screens, screenSchema);
  if (!screenRecords.success) return screenRecords;
  const showtimeRecords = records(showtimes, storedShowtimeSchema);
  if (!showtimeRecords.success) return showtimeRecords;
  return ok({
    movies: movieRecords.data,
    cinemas: cinemaRecords.data,
    screens: screenRecords.data,
    showtimes: showtimeRecords.data,
  });
}

export const adminService = {
  async dashboard() {
    return unwrap(getAdminDashboardStats());
  },
  async bookings(filters: BookingFilters = {}) {
    return unwrap(getAdminBookings(filters));
  },
  async catalog() {
    return unwrap(getAdminCatalog());
  },
  async createMovie(payload: CreateMovieRequest) {
    return unwrap(addMovie(payload));
  },
  async updateMovie(id: string, payload: Partial<Movie>) {
    return unwrap(updateMovie(id, payload));
  },
  async deleteMovie(id: string) {
    unwrap(deleteMovie(id));
  },
  async createShowtime(payload: CreateShowtimeRequest) {
    return unwrap(addAdminShowtime(payload));
  },
  async updateShowtime(id: string, payload: Partial<Showtime>) {
    return unwrap(updateAdminShowtime(id, payload));
  },
  async deleteShowtime(id: string) {
    unwrap(deleteAdminShowtime(id));
  },
};

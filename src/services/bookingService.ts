import { fail, ok, unwrap, type Result } from "./result";
import { getCurrentUser } from "./authService";
import { expirePendingBookings } from "./bookingLifecycle";
import { calculateBookingTotal } from "./seatService";
import { getMovieById } from "./movieService";
import { getShowtimeById } from "./showtimeService";
import { bookingSeats, bookings, newId, readAdminSettings } from "./storageService";
import { ready, records } from "./serviceUtils";
import {
  createBookingInputSchema,
  storedBookingSchema,
  storedBookingSeatSchema,
  zodMessage,
} from "./validation";
import type {
  Booking,
  BookingFilters,
  CreateBookingRequest,
  StoredBooking,
  StoredBookingSeat,
} from "./types";

function toBooking(booking: StoredBooking): Result<Booking> {
  const showtime = getShowtimeById(booking.showtimeId);
  if (!showtime.success) return showtime;
  const movie = getMovieById(showtime.data.movieId);
  if (!movie.success) return movie;
  const allocations = records(bookingSeats, storedBookingSeatSchema);
  if (!allocations.success) return allocations;
  return ok({
    id: booking.id,
    code: booking.code,
    movie: movie.data,
    showtime: showtime.data,
    seats: allocations.data
      .filter((allocation) => allocation.bookingId === booking.id)
      .map((allocation) => allocation.seatLabel),
    amount: booking.amount,
    status: booking.status.toLowerCase() as Booking["status"],
    paymentStatus: booking.paymentStatus.toLowerCase() as Booking["paymentStatus"],
    createdAt: booking.createdAt,
  });
}

function currentUserId(): Result<string> {
  const current = getCurrentUser();
  if (!current.success) return current;
  if (!current.data) return fail("AUTH_REQUIRED", "Sign in before creating or viewing bookings.");
  return ok(current.data.id);
}

export function createBooking(input: CreateBookingRequest): Result<Booking> {
  const initialized = ready();
  if (!initialized.success) return initialized;
  const parsed = createBookingInputSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", zodMessage(parsed.error));
  const userId = currentUserId();
  if (!userId.success) return userId;
  const showtime = getShowtimeById(parsed.data.showtimeId);
  if (!showtime.success) return showtime;
  const amount = calculateBookingTotal(showtime.data.id, parsed.data.seats);
  if (!amount.success) return amount;
  const settings = readAdminSettings();
  if (!settings.success) return settings;

  // Recheck inventory immediately before writing; browser storage is not atomic across tabs/devices.
  const refreshedAmount = calculateBookingTotal(showtime.data.id, parsed.data.seats);
  if (!refreshedAmount.success) return refreshedAmount;
  const currentBookings = records(bookings, storedBookingSchema);
  if (!currentBookings.success) return currentBookings;
  const currentAllocations = records(bookingSeats, storedBookingSeatSchema);
  if (!currentAllocations.success) return currentAllocations;

  const stamp = new Date();
  const createdAt = stamp.toISOString();
  const id = newId();
  let code: string;
  do {
    code = `CB-${newId().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  } while (currentBookings.data.some((booking) => booking.code === code));
  const booking: StoredBooking = {
    id,
    code,
    userId: userId.data,
    showtimeId: showtime.data.id,
    amount: refreshedAmount.data.total,
    status: "PENDING",
    paymentStatus: "PENDING",
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(stamp.getTime() + settings.data.pendingBookingMinutes * 60_000).toISOString(),
  };
  const allocations: StoredBookingSeat[] = refreshedAmount.data.seats.map((seat) => ({
    id: newId(),
    bookingId: id,
    showtimeId: showtime.data.id,
    seatId: seat.seatId,
    seatLabel: seat.seatLabel,
    state: "HELD",
  }));
  const savedBooking = bookings.add(booking);
  if (!savedBooking.success) return savedBooking;
  const savedAllocations = bookingSeats.setAll([...currentAllocations.data, ...allocations]);
  if (!savedAllocations.success) {
    const rollback = bookings.remove(id);
    if (!rollback.success) return fail("BOOKING_ROLLBACK_FAILED", "Seat allocation failed and the pending booking could not be rolled back.");
    return savedAllocations;
  }
  return toBooking(booking);
}

export function getBookingById(id: string): Result<Booking> {
  const expired = expirePendingBookings();
  if (!expired.success) return expired;
  const userId = currentUserId();
  if (!userId.success) return userId;
  const loaded = records(bookings, storedBookingSchema);
  if (!loaded.success) return loaded;
  const booking = loaded.data.find((item) => item.id === id);
  if (!booking) return fail("BOOKING_NOT_FOUND", "The requested booking was not found.");
  const current = getCurrentUser();
  if (!current.success) return current;
  if (booking.userId !== userId.data && current.data?.role !== "admin") {
    return fail("BOOKING_FORBIDDEN", "You can only view your own bookings.");
  }
  return toBooking(booking);
}

export function getMyBookings(userId: string): Result<Booking[]> {
  const expired = expirePendingBookings();
  if (!expired.success) return expired;
  const currentId = currentUserId();
  if (!currentId.success) return currentId;
  if (userId !== currentId.data) return fail("BOOKING_FORBIDDEN", "You can only view bookings for the signed-in demo account.");
  const loaded = records(bookings, storedBookingSchema);
  if (!loaded.success) return loaded;
  const mine = loaded.data.filter((booking) => booking.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const views: Booking[] = [];
  for (const booking of mine) {
    const view = toBooking(booking);
    if (!view.success) return view;
    views.push(view.data);
  }
  return ok(views);
}

export function cancelBooking(id: string): Result<Booking> {
  const expired = expirePendingBookings();
  if (!expired.success) return expired;
  const currentId = currentUserId();
  if (!currentId.success) return currentId;
  const loaded = records(bookings, storedBookingSchema);
  if (!loaded.success) return loaded;
  const booking = loaded.data.find((item) => item.id === id);
  if (!booking) return fail("BOOKING_NOT_FOUND", "The requested booking was not found.");
  if (booking.userId !== currentId.data) return fail("BOOKING_FORBIDDEN", "You can only cancel your own bookings.");
  if (booking.status === "CANCELLED") return fail("DUPLICATE_OPERATION", "This booking is already cancelled.");
  if (booking.status === "EXPIRED") return fail("BOOKING_EXPIRED", "An expired booking cannot be cancelled.");
  const allocations = records(bookingSeats, storedBookingSeatSchema);
  if (!allocations.success) return allocations;
  const changedBooking = { ...booking, status: "CANCELLED" as const, updatedAt: new Date().toISOString() };
  const changedAllocations = allocations.data.map((allocation) =>
    allocation.bookingId === id && allocation.state !== "RELEASED" ? { ...allocation, state: "RELEASED" as const } : allocation,
  );
  const savedBooking = bookings.update(id, changedBooking);
  if (!savedBooking.success) return savedBooking;
  const savedSeats = bookingSeats.setAll(changedAllocations);
  if (!savedSeats.success) {
    const rollback = bookings.update(id, booking);
    if (!rollback.success) return fail("BOOKING_ROLLBACK_FAILED", "Seat release failed and the original booking could not be restored.");
    return savedSeats;
  }
  return toBooking(changedBooking);
}

export function getAllBookings(filters: BookingFilters = {}): Result<Booking[]> {
  const expired = expirePendingBookings();
  if (!expired.success) return expired;
  const loaded = records(bookings, storedBookingSchema);
  if (!loaded.success) return loaded;
  const query = filters.query?.trim().toLocaleLowerCase();
  const filtered = loaded.data
    .filter((booking) =>
      (!filters.status || filters.status === "all" || booking.status.toLowerCase() === filters.status) &&
      (!filters.paymentStatus || filters.paymentStatus === "all" || booking.paymentStatus.toLowerCase() === filters.paymentStatus) &&
      (!query || booking.code.toLocaleLowerCase().includes(query) || booking.userId.toLocaleLowerCase().includes(query)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const result: Booking[] = [];
  for (const booking of filtered) {
    const view = toBooking(booking);
    if (!view.success) return view;
    result.push(view.data);
  }
  return ok(result);
}

export { expirePendingBookings };

export const bookingService = {
  async create(input: CreateBookingRequest) {
    return unwrap(createBooking(input));
  },
  async mine() {
    const current = getCurrentUser();
    if (!current.success) throw new Error(current.error.message);
    if (!current.data) throw new Error("Sign in to view your bookings.");
    return unwrap(getMyBookings(current.data.id));
  },
  async get(id: string) {
    return unwrap(getBookingById(id));
  },
  async cancel(id: string) {
    return unwrap(cancelBooking(id));
  },
  async simulatePayment(id: string, request: { method: "upi" | "card"; forceFail?: boolean; qrScanned?: boolean; demoCardNumber?: string }) {
    const { simulatePayment } = await import("./paymentService");
    const payment = unwrap(await simulatePayment(id, request));
    const booking = getBookingById(payment.bookingId);
    return unwrap(booking);
  },
  async ticket(id: string) {
    return unwrap(getBookingById(id));
  },
};

import { fail, ok, unwrap, type Result } from "./result";
import { bookingSeats, bookings, seats } from "./storageService";
import { expirePendingBookings } from "./bookingLifecycle";
import { getShowtimeById } from "./showtimeService";
import { records } from "./serviceUtils";
import { storedBookingSchema, storedBookingSeatSchema, storedSeatSchema } from "./validation";
import type { Seat, SeatPriceBreakdown, StoredSeat, StoredShowtime } from "./types";

function availableInventory(showtimeId: string): Result<{ showtime: StoredShowtime; inventory: StoredSeat[]; bookedSeatIds: Set<string> }> {
  const expired = expirePendingBookings();
  if (!expired.success) return expired;
  const showtimeResult = getShowtimeById(showtimeId);
  if (!showtimeResult.success) return showtimeResult;
  const allSeats = records(seats, storedSeatSchema);
  if (!allSeats.success) return allSeats;
  const allocations = records(bookingSeats, storedBookingSeatSchema);
  if (!allocations.success) return allocations;
  const activeBookings = records(bookings, storedBookingSchema);
  if (!activeBookings.success) return activeBookings;
  const activeBookingIds = new Set(
    activeBookings.data
      .filter((booking) => booking.status === "PENDING" || booking.status === "CONFIRMED")
      .map((booking) => booking.id),
  );
  return ok({
    showtime: showtimeResult.data,
    inventory: allSeats.data.filter((seat) => seat.screenId === showtimeResult.data.screenId),
    bookedSeatIds: new Set(
      allocations.data
        .filter((allocation) =>
          allocation.showtimeId === showtimeId &&
          (allocation.state === "HELD" || allocation.state === "CONFIRMED") &&
          activeBookingIds.has(allocation.bookingId),
        )
        .map((allocation) => allocation.seatId),
    ),
  });
}

function findSeat(inventory: StoredSeat[], seatIdOrLabel: string) {
  return inventory.find((seat) => seat.id === seatIdOrLabel || seat.label.toLocaleLowerCase() === seatIdOrLabel.toLocaleLowerCase());
}

function viewSeat(seat: StoredSeat, booked: boolean): Seat {
  return {
    id: seat.label,
    row: seat.row,
    number: seat.number,
    category: seat.category === "PREMIUM" ? "premium" : "standard",
    status: booked ? "booked" : "available",
  };
}

export function getSeatsByShowtime(showtimeId: string): Result<Seat[]> {
  const loaded = availableInventory(showtimeId);
  if (!loaded.success) return loaded;
  return ok(loaded.data.inventory
    .sort((left, right) => left.row.localeCompare(right.row) || left.number - right.number)
    .map((seat) => viewSeat(seat, loaded.data.bookedSeatIds.has(seat.id))));
}

export function getAvailableSeats(showtimeId: string): Result<Seat[]> {
  const all = getSeatsByShowtime(showtimeId);
  return all.success ? ok(all.data.filter((seat) => seat.status === "available")) : all;
}

export function getSeatPrice(showtimeId: string, seatId: string): Result<number> {
  const loaded = availableInventory(showtimeId);
  if (!loaded.success) return loaded;
  const seat = findSeat(loaded.data.inventory, seatId);
  if (!seat) return fail("SEAT_NOT_ON_SCREEN", "The selected seat does not belong to this showtime's screen.");
  return ok(seat.category === "PREMIUM" ? loaded.data.showtime.premiumPrice : loaded.data.showtime.standardPrice);
}

export function calculateBookingTotal(showtimeId: string, seatIds: string[]): Result<{ total: number; seats: SeatPriceBreakdown[] }> {
  if (!Array.isArray(seatIds) || seatIds.length < 1 || seatIds.length > 8 || seatIds.some((id) => typeof id !== "string" || !id.trim())) {
    return fail("VALIDATION_ERROR", "Select between 1 and 8 valid seats.");
  }
  const normalized = seatIds.map((seatId) => seatId.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) return fail("DUPLICATE_SEAT", "A seat can only be selected once.");
  const loaded = availableInventory(showtimeId);
  if (!loaded.success) return loaded;
  const selected: SeatPriceBreakdown[] = [];
  for (const seatId of seatIds) {
    const seat = findSeat(loaded.data.inventory, seatId);
    if (!seat) return fail("SEAT_NOT_ON_SCREEN", "One or more selected seats do not belong to this showtime's screen.");
    if (loaded.data.bookedSeatIds.has(seat.id)) {
      return fail("SEAT_UNAVAILABLE", "The selected seat is no longer available.");
    }
    selected.push({
      seatId: seat.id,
      seatLabel: seat.label,
      category: seat.category,
      price: seat.category === "PREMIUM" ? loaded.data.showtime.premiumPrice : loaded.data.showtime.standardPrice,
    });
  }
  return ok({ total: selected.reduce((sum, seat) => sum + seat.price, 0), seats: selected });
}

export const seatService = {
  async forShowtime(showtimeId: string) {
    return unwrap(getSeatsByShowtime(showtimeId));
  },
  async available(showtimeId: string) {
    return unwrap(getAvailableSeats(showtimeId));
  },
  async price(showtimeId: string, seatId: string) {
    return unwrap(getSeatPrice(showtimeId, seatId));
  },
  async total(showtimeId: string, seatIds: string[]) {
    return unwrap(calculateBookingTotal(showtimeId, seatIds));
  },
};

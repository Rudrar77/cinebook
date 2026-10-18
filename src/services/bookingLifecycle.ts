import { fail, ok, type Result } from "./result";
import { bookingSeats, bookings, readAdminSettings } from "./storageService";
import { records } from "./serviceUtils";
import { storedBookingSchema, storedBookingSeatSchema } from "./validation";

export function expirePendingBookings(at = new Date()): Result<number> {
  const loadedBookings = records(bookings, storedBookingSchema);
  if (!loadedBookings.success) return loadedBookings;
  const loadedSeats = records(bookingSeats, storedBookingSeatSchema);
  if (!loadedSeats.success) return loadedSeats;
  const timestamp = at.toISOString();
  const expired = loadedBookings.data.filter(
    (booking) => booking.status === "PENDING" && Date.parse(booking.expiresAt) <= at.getTime(),
  );
  if (!expired.length) return ok(0);

  const ids = new Set(expired.map((booking) => booking.id));
  const updatedBookings = loadedBookings.data.map((booking) =>
    ids.has(booking.id) ? { ...booking, status: "EXPIRED" as const, updatedAt: timestamp } : booking,
  );
  const updatedSeats = loadedSeats.data.map((seat) =>
    ids.has(seat.bookingId) && seat.state === "HELD" ? { ...seat, state: "RELEASED" as const } : seat,
  );
  const savedBookings = bookings.setAll(updatedBookings);
  if (!savedBookings.success) return savedBookings;
  const savedSeats = bookingSeats.setAll(updatedSeats);
  if (!savedSeats.success) {
    const rollback = bookings.setAll(loadedBookings.data);
    if (!rollback.success) return fail("STORAGE_WRITE_FAILED", "Expiry update failed and the original bookings could not be restored.");
    return savedSeats;
  }
  return ok(expired.length);
}

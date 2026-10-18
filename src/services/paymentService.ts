import QRCode from "qrcode";
import { fail, ok, unwrap, type Result } from "./result";
import { getCurrentUser } from "./authService";
import { expirePendingBookings } from "./bookingLifecycle";
import { bookingSeats, bookings, newId, payments } from "./storageService";
import { ready, records } from "./serviceUtils";
import {
  paymentMethodSchema,
  storedBookingSchema,
  storedBookingSeatSchema,
  storedPaymentSchema,
  zodMessage,
} from "./validation";
import type { PaymentMethod, PaymentSimulationRequest, StoredPayment } from "./types";

const demoPaymentNote = "SIMULATED PAYMENT ONLY. No money was collected and no payment credentials were requested.";

export async function generateDemoUPIQRCode(bookingCode: string, amount: number): Promise<Result<string>> {
  if (!bookingCode.trim() || !Number.isFinite(amount) || amount <= 0) {
    return fail("VALIDATION_ERROR", "Valid demo booking details are required to generate the UPI QR code.");
  }
  try {
    return ok(await QRCode.toDataURL(`CINEBOOK-DEMO-UPI:${bookingCode}:${amount}`, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
    }));
  } catch {
    return fail("QR_GENERATION_FAILED", "The local UPI demonstration QR code could not be generated.");
  }
}

export async function simulatePayment(
  bookingId: string,
  request: PaymentSimulationRequest | PaymentMethod,
): Promise<Result<StoredPayment>> {
  const initialized = ready();
  if (!initialized.success) return initialized;
  const method = typeof request === "string" ? request : request.method;
  const forceFail = typeof request === "string" ? false : request.forceFail === true;
  if (method === "upi" && (typeof request === "string" || request.qrScanned !== true)) {
    return fail("DEMO_QR_NOT_SCANNED", "Confirm that you scanned the UPI demo QR before completing this simulated payment.");
  }
  if (method === "card" && (typeof request === "string" || request.demoCardNumber !== "12345678")) {
    return fail("INVALID_DEMO_CARD", "Enter the demo card number 12345678 to complete this simulated card payment.");
  }
  const parsedMethod = paymentMethodSchema.safeParse(method);
  if (!parsedMethod.success) return fail("VALIDATION_ERROR", zodMessage(parsedMethod.error));

  const expired = expirePendingBookings();
  if (!expired.success) return expired;
  const current = getCurrentUser();
  if (!current.success) return current;
  if (!current.data) return fail("AUTH_REQUIRED", "Sign in before paying for a booking.");

  const loadedBookings = records(bookings, storedBookingSchema);
  if (!loadedBookings.success) return loadedBookings;
  const booking = loadedBookings.data.find((item) => item.id === bookingId);
  if (!booking) return fail("BOOKING_NOT_FOUND", "The requested booking was not found.");
  if (booking.userId !== current.data.id && current.data.role !== "admin") {
    return fail("BOOKING_FORBIDDEN", "You can only pay for your own bookings.");
  }
  if (booking.status === "CANCELLED") return fail("BOOKING_CANCELLED", "Payment is not allowed for a cancelled booking.");
  if (booking.status === "EXPIRED") return fail("BOOKING_EXPIRED", "Payment is not allowed for an expired booking.");
  if (booking.status === "CONFIRMED" || booking.paymentStatus === "SUCCESS") {
    const existing = getPaymentByBookingId(bookingId);
    if (existing.success && existing.data.status === "SUCCESS") return existing;
    return fail("PAYMENT_STATE_INVALID", "The booking is marked paid but its successful payment record is missing.");
  }
  if (!Number.isFinite(booking.amount) || booking.amount < 0) {
    return fail("BOOKING_AMOUNT_INVALID", "The stored booking amount is invalid.");
  }

  const existingPayments = records(payments, storedPaymentSchema);
  if (!existingPayments.success) return existingPayments;
  const successful = existingPayments.data.find((payment) => payment.bookingId === bookingId && payment.status === "SUCCESS");
  if (successful) return ok(successful);
  if (existingPayments.data.some((payment) => payment.bookingId === bookingId && payment.status === "PENDING")) {
    return fail("PAYMENT_IN_PROGRESS", "A simulated payment is already being processed for this booking.");
  }

  const allocations = records(bookingSeats, storedBookingSeatSchema);
  if (!allocations.success) return allocations;
  const activeAllocations = allocations.data.filter((allocation) => allocation.bookingId === bookingId && allocation.state === "HELD");
  if (!activeAllocations.length) return fail("SEATS_NOT_HELD", "This booking no longer holds any seats.");

  const createdAt = new Date().toISOString();
  const payment: StoredPayment = {
    id: newId(),
    bookingId,
    method: parsedMethod.data.toUpperCase() as StoredPayment["method"],
    amount: booking.amount,
    status: forceFail ? "FAILED" : "SUCCESS",
    reference: `PAY-${newId().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
    simulated: true,
    createdAt,
    note: forceFail ? `${demoPaymentNote} This attempt was simulated as failed.` : demoPaymentNote,
  };
  const updatedBooking = {
    ...booking,
    status: forceFail ? booking.status : "CONFIRMED" as const,
    paymentStatus: forceFail ? "FAILED" as const : "SUCCESS" as const,
    updatedAt: createdAt,
  };
  const updatedAllocations = allocations.data.map((allocation) =>
    allocation.bookingId === bookingId && allocation.state === "HELD" && !forceFail
      ? { ...allocation, state: "CONFIRMED" as const }
      : allocation,
  );

  const saveBooking = bookings.update(bookingId, updatedBooking);
  if (!saveBooking.success) return saveBooking;
  if (!forceFail) {
    const saveSeats = bookingSeats.setAll(updatedAllocations);
    if (!saveSeats.success) {
      const rollback = bookings.update(bookingId, booking);
      if (!rollback.success) return fail("PAYMENT_ROLLBACK_FAILED", "Seat confirmation failed and the original booking state could not be restored.");
      return saveSeats;
    }
  }
  const savePayment = payments.setAll([...existingPayments.data, payment]);
  if (!savePayment.success) {
    const rollbackBooking = bookings.update(bookingId, booking);
    const rollbackSeats = forceFail ? ok(true) : bookingSeats.setAll(allocations.data);
    if (!rollbackBooking.success || !rollbackSeats.success) {
      return fail("PAYMENT_ROLLBACK_FAILED", "The simulated payment could not be saved and the booking state could not be fully restored.");
    }
    return savePayment;
  }
  return ok(payment);
}

export function getPaymentByBookingId(bookingId: string): Result<StoredPayment> {
  const initialized = ready();
  if (!initialized.success) return initialized;
  const expired = expirePendingBookings();
  if (!expired.success) return expired;
  const loaded = records(payments, storedPaymentSchema);
  if (!loaded.success) return loaded;
  const payment = loaded.data
    .filter((item) => item.bookingId === bookingId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return payment ? ok(payment) : fail("PAYMENT_NOT_FOUND", "No payment record exists for this booking.");
}

export const paymentService = {
  async simulate(bookingId: string, method: PaymentMethod, forceFail = false) {
    return unwrap(await simulatePayment(bookingId, { method, forceFail }));
  },
  async forBooking(bookingId: string) {
    return unwrap(getPaymentByBookingId(bookingId));
  },
};

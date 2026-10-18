import QRCode from "qrcode";
import { fail, ok, unwrap, type Result } from "./result";
import { getCurrentUser } from "./authService";
import { getBookingById } from "./bookingService";
import type { TicketView } from "./types";

const ticketNotice = "LOCAL DEMONSTRATION TICKET — NOT VALID FOR SECURE OR SERVER-SIDE VERIFICATION";

export async function generateTicketQR(bookingId: string): Promise<Result<string>> {
  if (typeof bookingId !== "string" || !bookingId.trim()) {
    return fail("VALIDATION_ERROR", "A booking identifier is required to generate a local QR code.");
  }
  const booking = getBookingById(bookingId);
  if (!booking.success) return booking;
  try {
    const dataUrl = await QRCode.toDataURL(`CINEBOOK-DEMO:${booking.data.id}`, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
    });
    return ok(dataUrl);
  } catch {
    return fail("QR_GENERATION_FAILED", "The local demonstration QR code could not be generated.");
  }
}

export async function getTicketByBookingId(bookingId: string): Promise<Result<TicketView>> {
  const booking = getBookingById(bookingId);
  if (!booking.success) return booking;
  const customer = getCurrentUser();
  if (!customer.success) return customer;
  if (!customer.data) return fail("AUTH_REQUIRED", "Sign in to view your local demonstration ticket.");
  const qr = await generateTicketQR(bookingId);
  if (!qr.success) return qr;
  return ok({
    demoLabel: ticketNotice,
    bookingId: booking.data.id,
    bookingCode: booking.data.code,
    movieTitle: booking.data.movie.title,
    cinema: booking.data.showtime.cinema,
    screen: booking.data.showtime.screen,
    date: booking.data.showtime.date,
    time: booking.data.showtime.time,
    seats: booking.data.seats,
    customerName: customer.data.name,
    amount: booking.data.amount,
    bookingStatus: booking.data.status,
    paymentStatus: booking.data.paymentStatus,
    verificationRef: `LOCAL-${booking.data.code}`,
    qrDataUrl: qr.data,
  });
}

export const ticketService = {
  async getByBookingId(bookingId: string) {
    return unwrap(await getTicketByBookingId(bookingId));
  },
  async qr(bookingId: string) {
    return unwrap(await generateTicketQR(bookingId));
  },
};

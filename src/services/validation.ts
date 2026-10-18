import { z } from "zod";

export const movieStatusSchema = z.enum(["now-showing", "coming-soon"]);
export const storedUserRoleSchema = z.enum(["CUSTOMER", "ADMIN"]);
export const storedSeatCategorySchema = z.enum(["REGULAR", "PREMIUM"]);
export const storedBookingStatusSchema = z.enum(["PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"]);
export const storedPaymentStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED"]);
export const storedPaymentMethodSchema = z.enum(["UPI", "CARD", "CASH"]);
export const bookingSeatStateSchema = z.enum(["HELD", "CONFIRMED", "RELEASED"]);
export const paymentMethodSchema = z.enum(["upi", "card"]);

export const movieRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  synopsis: z.string().min(1),
  posterUrl: z.string(),
  genre: z.array(z.string().min(1)).min(1),
  language: z.string().min(1),
  rating: z.number().min(0).max(10),
  durationMinutes: z.number().int().positive(),
  certification: z.string().min(1),
  releaseDate: z.string().min(8),
  status: movieStatusSchema,
  cast: z.array(z.string()),
  featured: z.boolean().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const cinemaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
});

export const screenSchema = z.object({
  id: z.string().min(1),
  cinemaId: z.string().min(1),
  name: z.string().min(1),
  format: z.string().min(1),
});

export const storedSeatSchema = z.object({
  id: z.string().min(1),
  screenId: z.string().min(1),
  row: z.string().min(1),
  number: z.number().int().positive(),
  label: z.string().min(1),
  category: storedSeatCategorySchema,
});

export const storedShowtimeSchema = z.object({
  id: z.string().min(1),
  movieId: z.string().min(1),
  cinemaId: z.string().min(1),
  screenId: z.string().min(1),
  cinema: z.string().min(1),
  screen: z.string().min(1),
  date: z.string().min(8),
  time: z.string().min(1),
  standardPrice: z.number().nonnegative(),
  premiumPrice: z.number().nonnegative(),
  language: z.string().min(1),
  format: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const storedUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().min(10),
  role: storedUserRoleSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const demoSessionSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.string().min(1),
});

export const storedBookingSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  userId: z.string().min(1),
  showtimeId: z.string().min(1),
  amount: z.number().nonnegative(),
  status: storedBookingStatusSchema,
  paymentStatus: storedPaymentStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  expiresAt: z.string().min(1),
});

export const storedBookingSeatSchema = z.object({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  showtimeId: z.string().min(1),
  seatId: z.string().min(1),
  seatLabel: z.string().min(1),
  state: bookingSeatStateSchema,
});

export const storedPaymentSchema = z.object({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  method: storedPaymentMethodSchema,
  amount: z.number().nonnegative(),
  status: storedPaymentStatusSchema,
  reference: z.string().min(1),
  simulated: z.literal(true),
  createdAt: z.string().min(1),
  note: z.string().min(1),
});

export const adminSettingsSchema = z.object({
  demoMode: z.literal(true),
  pendingBookingMinutes: z.number().int().positive(),
  notice: z.string().min(1),
});

export const schemaMetaSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  migratedAt: z.string().min(1),
  seededAt: z.string().min(1).optional(),
});

export const emailSchema = z.string().trim().email("Enter a valid email address.");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");
export const nameSchema = z.string().trim().min(1, "Name is required.");

export const registerInputSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: storedUserRoleSchema.optional(),
});

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const movieInputSchema = z.object({
  title: z.string().min(1),
  synopsis: z.string().min(1),
  posterUrl: z.string(),
  genre: z.array(z.string().min(1)).min(1),
  language: z.string().min(1),
  rating: z.number().min(0).max(10),
  durationMinutes: z.number().int().positive(),
  certification: z.string().min(1),
  releaseDate: z.string().min(8),
  status: movieStatusSchema,
  cast: z.array(z.string()),
  featured: z.boolean().optional(),
});

export const showtimeInputSchema = z.object({
  movieId: z.string().min(1),
  cinema: z.string().min(1),
  screen: z.string().min(1),
  date: z.string().min(8),
  time: z.string().min(1),
  standardPrice: z.number().nonnegative(),
  premiumPrice: z.number().nonnegative(),
  language: z.string().min(1),
  format: z.string().min(1),
  cinemaId: z.string().min(1).optional(),
  screenId: z.string().min(1).optional(),
});

export const createBookingInputSchema = z.object({
  showtimeId: z.string().min(1),
  seats: z.array(z.string().min(1)).min(1).max(8),
});

export function zodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}

import bcrypt from "bcryptjs";
import lastLightPoster from "@/assets/last-light.jpg";
import quietForestPoster from "@/assets/quiet-forest.jpg";
import redPlanetPoster from "@/assets/red-planet.jpg";
import velvetHourPoster from "@/assets/velvet-hour.jpg";
import type {
  AdminSettings,
  Cinema,
  Movie,
  Screen,
  Showtime,
  StoredBooking,
  StoredBookingSeat,
  StoredMovie,
  StoredPayment,
  StoredSeat,
  StoredShowtime,
  StoredUser,
} from "./types";

const demoPasswordHash = bcrypt.hashSync("Demo123!", 10);

const posterSet = [
  lastLightPoster,
  redPlanetPoster,
  velvetHourPoster,
  quietForestPoster,
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=85",
];

const movieSamples: Omit<Movie, "createdAt" | "updatedAt">[] = [
  { id: "last-light", title: "The Last Light", synopsis: "When the sun begins to fade, one signal from the edge of the city could change everything.", posterUrl: posterSet[0]!, genre: ["Sci-Fi", "Thriller"], language: "English", rating: 8.7, durationMinutes: 128, certification: "UA 13+", releaseDate: "2026-10-09", status: "now-showing", cast: ["Maya Sterling", "Elias North", "Dev Patel"], featured: true },
  { id: "red-planet", title: "Red Planet Rising", synopsis: "A mission to a distant red world finds something no one expected—and a choice no one trained for.", posterUrl: posterSet[1]!, genre: ["Sci-Fi", "Adventure"], language: "English", rating: 8.2, durationMinutes: 141, certification: "UA 13+", releaseDate: "2026-10-02", status: "now-showing", cast: ["Ari Chen", "Sofia Reyes", "Julian Park"] },
  { id: "velvet-hour", title: "The Velvet Hour", synopsis: "One night. One impossible job. And a city where nothing stays hidden for long.", posterUrl: posterSet[2]!, genre: ["Thriller", "Crime"], language: "English", rating: 7.9, durationMinutes: 116, certification: "A", releaseDate: "2026-10-02", status: "now-showing", cast: ["Nina Vale", "Oscar Reid", "Amira Khan"] },
  { id: "quiet-forest", title: "The Quiet Forest", synopsis: "A tiny traveler follows the light through an enchanted forest—and finds a place to call home.", posterUrl: posterSet[3]!, genre: ["Animation", "Fantasy"], language: "English", rating: 8.9, durationMinutes: 102, certification: "U", releaseDate: "2026-10-23", status: "coming-soon", cast: ["Lena Brooks", "Avery Cole", "Noah Wells"] },
  { id: "midnight-echo", title: "Midnight Echo", synopsis: "A radio host receives a message from a caller who disappeared twenty years ago.", posterUrl: posterSet[4]!, genre: ["Mystery", "Thriller"], language: "Hindi", rating: 8.1, durationMinutes: 122, certification: "UA 13+", releaseDate: "2026-10-24", status: "coming-soon", cast: ["Rhea Kapoor", "Kabir Mehta"] },
  { id: "paper-moons", title: "Paper Moons", synopsis: "Two strangers map the night sky while deciding what home means to them.", posterUrl: posterSet[5]!, genre: ["Romance", "Drama"], language: "English", rating: 7.6, durationMinutes: 109, certification: "U", releaseDate: "2026-10-30", status: "coming-soon", cast: ["Anya Bose", "Theo James"] },
  { id: "monsoon-road", title: "Monsoon Road", synopsis: "A family road trip through the Western Ghats uncovers a long-kept secret.", posterUrl: posterSet[6]!, genre: ["Drama", "Adventure"], language: "Hindi", rating: 8.4, durationMinutes: 135, certification: "UA 13+", releaseDate: "2026-10-29", status: "coming-soon", cast: ["Ishaan Rao", "Meera Nair"] },
  { id: "the-clockmaker", title: "The Clockmaker", synopsis: "A young apprentice discovers that one antique clock can rewind a single day.", posterUrl: posterSet[7]!, genre: ["Fantasy", "Adventure"], language: "English", rating: 7.8, durationMinutes: 114, certification: "U", releaseDate: "2026-11-06", status: "coming-soon", cast: ["Milo Grant", "Zara Wells"] },
  { id: "blue-hour", title: "Blue Hour", synopsis: "A photojournalist returns to the coast where her family's story began.", posterUrl: posterSet[8]!, genre: ["Drama", "Romance"], language: "Tamil", rating: 8.0, durationMinutes: 126, certification: "UA 13+", releaseDate: "2026-11-13", status: "coming-soon", cast: ["Nila Arjun", "Karthik Dev"] },
  { id: "orbit-nine", title: "Orbit Nine", synopsis: "A stranded crew has one orbit to find the source of a silent distress signal.", posterUrl: posterSet[9]!, genre: ["Sci-Fi", "Action"], language: "English", rating: 8.3, durationMinutes: 132, certification: "UA 13+", releaseDate: "2026-11-20", status: "coming-soon", cast: ["Ava Lin", "Marcus Cole"] },
];

const dateInDays = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

function buildShowtime(
  id: string,
  movieId: string,
  cinema: Cinema,
  screen: Screen,
  dayOffset: number,
  time: string,
  price: number,
): StoredShowtime {
  const stamp = new Date().toISOString();
  return {
    id,
    movieId,
    cinemaId: cinema.id,
    screenId: screen.id,
    cinema: `${cinema.name} · ${cinema.address}`,
    screen: screen.name,
    date: dateInDays(dayOffset),
    time,
    standardPrice: price,
    premiumPrice: price + 140,
    language: "English",
    format: screen.format,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export interface DemoSeedData {
  users: StoredUser[];
  movies: StoredMovie[];
  cinemas: Cinema[];
  screens: Screen[];
  seats: StoredSeat[];
  showtimes: StoredShowtime[];
  bookings: StoredBooking[];
  bookingSeats: StoredBookingSeat[];
  payments: StoredPayment[];
  adminSettings: AdminSettings;
}

export function createDemoSeedData(): DemoSeedData {
  const stamp = new Date().toISOString();
  const users: StoredUser[] = [
    { id: "demo-admin", name: "CineBook Admin", email: "admin@cinebook.demo", passwordHash: demoPasswordHash, role: "ADMIN", createdAt: stamp, updatedAt: stamp },
    { id: "demo-customer", name: "Aarav Sharma", email: "customer@cinebook.demo", passwordHash: demoPasswordHash, role: "CUSTOMER", createdAt: stamp, updatedAt: stamp },
  ];
  const movies: StoredMovie[] = movieSamples.map((movie) => ({ ...movie, createdAt: stamp, updatedAt: stamp }));
  const cinemas: Cinema[] = [
    { id: "cinema-phoenix", name: "PVR Icon", city: "Mumbai", address: "Phoenix Palladium" },
    { id: "cinema-inox", name: "INOX Megaplex", city: "Mumbai", address: "Malad" },
    { id: "cinema-regal", name: "Regal Cinemas", city: "Pune", address: "Koregaon Park" },
  ];
  const screens: Screen[] = [
    { id: "screen-phoenix-1", cinemaId: "cinema-phoenix", name: "Screen 1 · 4DX", format: "4DX" },
    { id: "screen-phoenix-4", cinemaId: "cinema-phoenix", name: "Screen 4 · IMAX", format: "IMAX" },
    { id: "screen-inox-2", cinemaId: "cinema-inox", name: "Screen 2 · Dolby Atmos", format: "Dolby Atmos" },
    { id: "screen-inox-6", cinemaId: "cinema-inox", name: "Screen 6", format: "2D" },
    { id: "screen-regal-1", cinemaId: "cinema-regal", name: "Screen 1", format: "2D" },
    { id: "screen-regal-2", cinemaId: "cinema-regal", name: "Screen 2 · IMAX", format: "IMAX" },
  ];
  const seats: StoredSeat[] = screens.flatMap((screen) =>
    Array.from({ length: 8 }, (_, rowIndex) =>
      Array.from({ length: 12 }, (_, seatIndex) => {
        const row = String.fromCharCode(65 + rowIndex);
        const number = seatIndex + 1;
        return {
          id: `${screen.id}-${row}-${number}`,
          screenId: screen.id,
          row,
          number,
          label: `${row}-${number}`,
          category: rowIndex < 2 ? "PREMIUM" as const : "REGULAR" as const,
        };
      }),
    ).flat(),
  );
  const cinemaById = new Map(cinemas.map((cinema) => [cinema.id, cinema]));
  const screenById = new Map(screens.map((screen) => [screen.id, screen]));
  const showtimes: StoredShowtime[] = [
    buildShowtime("show-1", "last-light", cinemaById.get("cinema-phoenix")!, screenById.get("screen-phoenix-4")!, 0, "6:30 PM", 280),
    buildShowtime("show-2", "last-light", cinemaById.get("cinema-phoenix")!, screenById.get("screen-phoenix-4")!, 0, "9:45 PM", 280),
    buildShowtime("show-3", "last-light", cinemaById.get("cinema-inox")!, screenById.get("screen-inox-2")!, 0, "7:15 PM", 230),
    buildShowtime("show-4", "red-planet", cinemaById.get("cinema-phoenix")!, screenById.get("screen-phoenix-1")!, 0, "5:50 PM", 320),
    buildShowtime("show-5", "velvet-hour", cinemaById.get("cinema-inox")!, screenById.get("screen-inox-6")!, 0, "8:00 PM", 200),
    ...movies.slice(3).map((movie, index) => {
      const cinema = cinemas[index % cinemas.length]!;
      const screen = screens.find((item) => item.cinemaId === cinema.id)!;
      return buildShowtime(`show-seed-${index + 6}`, movie.id, cinema, screen, index + 1, index % 2 === 0 ? "6:30 PM" : "8:15 PM", 220 + index * 15);
    }),
    ...movies.slice(0, 3).map((movie, index) => {
      const cinema = cinemas[(index + 1) % cinemas.length]!;
      const screen = screens.find((item) => item.cinemaId === cinema.id)!;
      return buildShowtime(`show-seed-${index + 16}`, movie.id, cinema, screen, index + 2, "7:00 PM", 240 + index * 20);
    }),
  ];
  const bookingCreated = new Date().toISOString();
  const bookingSeats: StoredBookingSeat[] = [
    { id: "seed-booking-seat-1", bookingId: "seed-booking-confirmed", showtimeId: "show-1", seatId: "screen-phoenix-4-A-1", seatLabel: "A-1", state: "CONFIRMED" },
    { id: "seed-booking-seat-2", bookingId: "seed-booking-confirmed", showtimeId: "show-1", seatId: "screen-phoenix-4-A-2", seatLabel: "A-2", state: "CONFIRMED" },
  ];
  const bookings: StoredBooking[] = [
    {
      id: "seed-booking-confirmed",
      code: "CB-DEMO001",
      userId: "demo-customer",
      showtimeId: "show-1",
      amount: 840,
      status: "CONFIRMED",
      paymentStatus: "SUCCESS",
      createdAt: bookingCreated,
      updatedAt: bookingCreated,
      expiresAt: bookingCreated,
    },
  ];
  const payments: StoredPayment[] = [
    {
      id: "seed-payment-confirmed",
      bookingId: "seed-booking-confirmed",
      method: "UPI",
      amount: 840,
      status: "SUCCESS",
      reference: "PAY-DEMO001",
      simulated: true,
      createdAt: bookingCreated,
      note: "Demo payment only; no money was collected.",
    },
  ];
  return {
    users,
    movies,
    cinemas,
    screens,
    seats,
    showtimes,
    bookings,
    bookingSeats,
    payments,
    adminSettings: {
      demoMode: true,
      pendingBookingMinutes: 15,
      notice: "Development-only LocalStorage data. Authentication, administration, payments, and ticket verification are simulated.",
    },
  };
}

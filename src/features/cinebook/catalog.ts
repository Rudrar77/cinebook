import lastLight from "@/assets/last-light.jpg";
import redPlanet from "@/assets/red-planet.jpg";
import velvetHour from "@/assets/velvet-hour.jpg";
import quietForest from "@/assets/quiet-forest.jpg";
import type { Movie, Seat, Showtime } from "@/services/types";

export const movies: Movie[] = [
  { id: "last-light", title: "The Last Light", synopsis: "When the sun begins to fade, one signal from the edge of the city could change everything. A luminous, edge-of-your-seat journey into a future worth fighting for.", posterUrl: lastLight, genre: ["Sci-Fi", "Thriller"], language: "English", rating: 8.7, durationMinutes: 128, certification: "UA 13+", releaseDate: "2026-10-09", status: "now-showing", cast: ["Maya Sterling", "Elias North", "Dev Patel"], featured: true },
  { id: "red-planet", title: "Red Planet Rising", synopsis: "A mission to a distant red world finds something no one expected—and a choice no one trained for.", posterUrl: redPlanet, genre: ["Sci-Fi", "Adventure"], language: "English", rating: 8.2, durationMinutes: 141, certification: "UA 13+", releaseDate: "2026-10-02", status: "now-showing", cast: ["Ari Chen", "Sofia Reyes", "Julian Park"] },
  { id: "velvet-hour", title: "The Velvet Hour", synopsis: "One night. One impossible job. And a city where nothing stays hidden for long.", posterUrl: velvetHour, genre: ["Thriller", "Crime"], language: "English", rating: 7.9, durationMinutes: 116, certification: "A", releaseDate: "2026-10-02", status: "now-showing", cast: ["Nina Vale", "Oscar Reid", "Amira Khan"] },
  { id: "quiet-forest", title: "The Quiet Forest", synopsis: "A tiny traveler follows the light through an enchanted forest—and finds a place to call home.", posterUrl: quietForest, genre: ["Animation", "Fantasy"], language: "English", rating: 8.9, durationMinutes: 102, certification: "U", releaseDate: "2026-10-23", status: "coming-soon", cast: ["Lena Brooks", "Avery Cole", "Noah Wells"] },
];

export const showtimes: Showtime[] = [
  { id: "show-1", movieId: "last-light", cinema: "PVR Icon · Phoenix Palladium", screen: "Screen 4 · IMAX", date: "2026-10-16", time: "6:30 PM", standardPrice: 280, premiumPrice: 420, language: "English", format: "IMAX" },
  { id: "show-2", movieId: "last-light", cinema: "PVR Icon · Phoenix Palladium", screen: "Screen 4 · IMAX", date: "2026-10-16", time: "9:45 PM", standardPrice: 280, premiumPrice: 420, language: "English", format: "IMAX" },
  { id: "show-3", movieId: "last-light", cinema: "INOX Megaplex · Malad", screen: "Screen 2 · Dolby Atmos", date: "2026-10-16", time: "7:15 PM", standardPrice: 230, premiumPrice: 360, language: "English", format: "Dolby Atmos" },
  { id: "show-4", movieId: "red-planet", cinema: "PVR Icon · Phoenix Palladium", screen: "Screen 1 · 4DX", date: "2026-10-16", time: "5:50 PM", standardPrice: 320, premiumPrice: 480, language: "English", format: "4DX" },
  { id: "show-5", movieId: "velvet-hour", cinema: "INOX Megaplex · Malad", screen: "Screen 6", date: "2026-10-16", time: "8:00 PM", standardPrice: 200, premiumPrice: 320, language: "English", format: "2D" },
];

const bookedIds = new Set(["A-4", "A-5", "B-8", "C-2", "C-3", "D-9", "E-5", "F-7", "G-1", "G-2", "H-10"]);

export const seats: Seat[] = Array.from({ length: 8 }, (_, rowIndex) =>
  Array.from({ length: 12 }, (_, seatIndex) => {
    const row = String.fromCharCode(65 + rowIndex);
    const id = `${row}-${seatIndex + 1}`;
    return { id, row, number: seatIndex + 1, category: rowIndex < 2 ? "premium" : "standard", status: bookedIds.has(id) ? "booked" : "available" } satisfies Seat;
  }),
).flat();

export const getMovie = (id: string) => movies.find((movie) => movie.id === id);
export const getShowtime = (id: string) => showtimes.find((showtime) => showtime.id === id);
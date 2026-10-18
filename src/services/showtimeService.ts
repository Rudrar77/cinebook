import { fail, ok, unwrap, type Result } from "./result";
import { cinemas, movies, newId, screens, showtimes } from "./storageService";
import { ready, records } from "./serviceUtils";
import {
  cinemaSchema,
  movieRecordSchema,
  screenSchema,
  showtimeInputSchema,
  storedShowtimeSchema,
  zodMessage,
} from "./validation";
import type { CreateShowtimeRequest, Showtime, StoredShowtime } from "./types";

export function timeToMinutes(value: string): number | undefined {
  const normalized = value.trim().toUpperCase();
  const match = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)?$/.exec(normalized);
  if (!match) return undefined;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];
  if (meridiem) {
    if (hours < 1 || hours > 12) return undefined;
    hours = (hours % 12) + (meridiem === "PM" ? 12 : 0);
  } else if (hours > 23) {
    return undefined;
  }
  return hours * 60 + minutes;
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function loadShowtimes() {
  const initialized = ready();
  if (!initialized.success) return initialized;
  return records(showtimes, storedShowtimeSchema);
}

export function getShowtimesByMovie(movieId: string): Result<Showtime[]> {
  const initialized = ready();
  if (!initialized.success) return initialized;
  const movieRecords = records(movies, movieRecordSchema);
  if (!movieRecords.success) return movieRecords;
  if (!movieRecords.data.some((movie) => movie.id === movieId)) {
    return fail("MOVIE_NOT_FOUND", "The requested movie was not found.");
  }
  const loaded = loadShowtimes();
  if (!loaded.success) return loaded;
  return ok(loaded.data
    .filter((showtime) => showtime.movieId === movieId)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
}

export function getAllShowtimes(): Result<Showtime[]> {
  const loaded = loadShowtimes();
  if (!loaded.success) return loaded;
  return ok(loaded.data.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
}

export function getShowtimeById(id: string): Result<StoredShowtime> {
  const loaded = loadShowtimes();
  if (!loaded.success) return loaded;
  const showtime = loaded.data.find((item) => item.id === id);
  return showtime ? ok(showtime) : fail("SHOWTIME_NOT_FOUND", "The requested showtime was not found.");
}

function resolveCinemaAndScreen(input: CreateShowtimeRequest): Result<{ cinemaId: string; screenId: string }> {
  const cinemaRecords = records(cinemas, cinemaSchema);
  if (!cinemaRecords.success) return cinemaRecords;
  const screenRecords = records(screens, screenSchema);
  if (!screenRecords.success) return screenRecords;
  const cinema = input.cinemaId
    ? cinemaRecords.data.find((item) => item.id === input.cinemaId)
    : cinemaRecords.data.find((item) =>
        input.cinema === item.name ||
        input.cinema === `${item.name} · ${item.address}` ||
        input.cinema.includes(item.name) && input.cinema.includes(item.address),
      );
  if (!cinema) return fail("CINEMA_NOT_FOUND", "Choose a cinema that exists in the stored demo data.");
  const screen = input.screenId
    ? screenRecords.data.find((item) => item.id === input.screenId)
    : screenRecords.data.find((item) => item.cinemaId === cinema.id && (input.screen === item.name || item.name.startsWith(input.screen)));
  if (!screen || screen.cinemaId !== cinema.id) {
    return fail("SCREEN_NOT_FOUND", "Choose a screen that belongs to the selected cinema.");
  }
  return ok({ cinemaId: cinema.id, screenId: screen.id });
}

function scheduleWindow(showtime: Showtime, durationMinutes: number) {
  const startMinute = timeToMinutes(showtime.time);
  if (!startMinute || !validDate(showtime.date)) return undefined;
  const start = new Date(`${showtime.date}T00:00:00`).getTime() + startMinute * 60_000;
  return { start, end: start + (durationMinutes + 15) * 60_000 };
}

function hasOverlap(candidate: StoredShowtime, exceptId?: string): Result<boolean> {
  const movieRecords = records(movies, movieRecordSchema);
  if (!movieRecords.success) return movieRecords;
  const movie = movieRecords.data.find((entry) => entry.id === candidate.movieId);
  if (!movie) return fail("MOVIE_NOT_FOUND", "The selected movie does not exist.");
  const candidateWindow = scheduleWindow(candidate, movie.durationMinutes);
  if (!candidateWindow) return fail("VALIDATION_ERROR", "Enter a valid showtime date and time.");
  const loaded = loadShowtimes();
  if (!loaded.success) return loaded;
  for (const existing of loaded.data) {
    if (existing.id === exceptId || existing.screenId !== candidate.screenId || existing.date !== candidate.date) continue;
    const existingMovie = movieRecords.data.find((entry) => entry.id === existing.movieId);
    if (!existingMovie) continue;
    const existingWindow = scheduleWindow(existing, existingMovie.durationMinutes);
    if (!existingWindow) continue;
    if (candidateWindow.start < existingWindow.end && existingWindow.start < candidateWindow.end) return ok(true);
  }
  return ok(false);
}

function normalizeShowtime(input: CreateShowtimeRequest, id: string, existing?: StoredShowtime): Result<StoredShowtime> {
  const parsed = showtimeInputSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", zodMessage(parsed.error));
  if (!validDate(parsed.data.date) || timeToMinutes(parsed.data.time) === undefined) {
    return fail("VALIDATION_ERROR", "Enter a valid showtime date and time.");
  }
  const movieRecords = records(movies, movieRecordSchema);
  if (!movieRecords.success) return movieRecords;
  if (!movieRecords.data.some((movie) => movie.id === parsed.data.movieId)) {
    return fail("MOVIE_NOT_FOUND", "The selected movie does not exist.");
  }
  const resolved = resolveCinemaAndScreen(parsed.data);
  if (!resolved.success) return resolved;
  const screenRecords = records(screens, screenSchema);
  if (!screenRecords.success) return screenRecords;
  const screen = screenRecords.data.find((item) => item.id === resolved.data.screenId)!;
  const cinemaRecords = records(cinemas, cinemaSchema);
  if (!cinemaRecords.success) return cinemaRecords;
  const cinema = cinemaRecords.data.find((item) => item.id === resolved.data.cinemaId)!;
  const stamp = new Date().toISOString();
  const candidate: StoredShowtime = {
    ...parsed.data,
    id,
    cinemaId: resolved.data.cinemaId,
    screenId: resolved.data.screenId,
    cinema: `${cinema.name} · ${cinema.address}`,
    screen: screen.name,
    format: screen.format,
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  };
  const overlap = hasOverlap(candidate, existing?.id);
  if (!overlap.success) return overlap;
  if (overlap.data) return fail("SHOWTIME_OVERLAP", "This screen already has a showtime during that time window.");
  return ok(candidate);
}

export function addShowtime(input: CreateShowtimeRequest): Result<Showtime> {
  const initialized = ready();
  if (!initialized.success) return initialized;
  const candidate = normalizeShowtime(input, newId());
  if (!candidate.success) return candidate;
  const saved = showtimes.add(candidate.data);
  return saved.success ? ok(saved.data) : saved;
}

export function updateShowtime(id: string, patch: Partial<Showtime>): Result<Showtime> {
  const found = getShowtimeById(id);
  if (!found.success) return found;
  const candidate = normalizeShowtime({ ...found.data, ...patch }, id, found.data);
  if (!candidate.success) return candidate;
  const saved = showtimes.update(id, candidate.data);
  return saved.success ? ok(saved.data) : saved;
}

export function deleteShowtime(id: string): Result<true> {
  const found = getShowtimeById(id);
  if (!found.success) return found;
  return showtimes.remove(id);
}

export const showtimeService = {
  async list() {
    return unwrap(getAllShowtimes());
  },
  async forMovie(movieId: string) {
    return unwrap(getShowtimesByMovie(movieId));
  },
  async get(id: string) {
    return unwrap(getShowtimeById(id));
  },
};

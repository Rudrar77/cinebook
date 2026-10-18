import { fail, ok, unwrap, type Result } from "./result";
import { movies } from "./storageService";
import { ready, records } from "./serviceUtils";
import { movieRecordSchema } from "./validation";
import type { Movie, MovieFilters, Paginated, StoredMovie } from "./types";
import { getShowtimesByMovie } from "./showtimeService";

export function getMovies(): Result<Movie[]> {
  const initialized = ready();
  if (!initialized.success) return initialized;
  const loaded = records(movies, movieRecordSchema);
  return loaded.success ? ok(loaded.data) : loaded;
}

export function getMovieById(id: string): Result<Movie> {
  const loaded = getMovies();
  if (!loaded.success) return loaded;
  const movie = loaded.data.find((entry) => entry.id === id);
  return movie ? ok(movie) : fail("MOVIE_NOT_FOUND", "The requested movie was not found.");
}

export function searchMovies(query: string): Result<Movie[]> {
  if (typeof query !== "string") return fail("VALIDATION_ERROR", "Search query must be text.");
  const loaded = getMovies();
  if (!loaded.success) return loaded;
  const normalized = query.trim().toLocaleLowerCase();
  return ok(normalized ? loaded.data.filter((movie) => movie.title.toLocaleLowerCase().includes(normalized)) : loaded.data);
}

export function filterMovies(filters: MovieFilters = {}): Result<Paginated<Movie>> {
  const loaded = getMovies();
  if (!loaded.success) return loaded;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? (loaded.data.length || 1);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return fail("VALIDATION_ERROR", "Page must be positive and page size must be between 1 and 100.");
  }
  if (filters.minRating != null && (!Number.isFinite(filters.minRating) || filters.minRating < 0 || filters.minRating > 10)) {
    return fail("VALIDATION_ERROR", "Minimum rating must be between 0 and 10.");
  }
  const query = filters.query?.trim().toLocaleLowerCase();
  const filtered = loaded.data.filter((movie) =>
    (!query || movie.title.toLocaleLowerCase().includes(query)) &&
    (!filters.genre || filters.genre === "all" || movie.genre.some((genre) => genre.toLocaleLowerCase() === filters.genre?.toLocaleLowerCase())) &&
    (!filters.language || filters.language === "all" || movie.language.toLocaleLowerCase() === filters.language.toLocaleLowerCase()) &&
    (filters.minRating == null || movie.rating >= filters.minRating) &&
    (!filters.status || filters.status === "all" || movie.status === filters.status),
  );
  const sort = filters.sort ?? "title";
  filtered.sort((left, right) => {
    if (sort === "rating") return right.rating - left.rating;
    if (sort === "releaseDate") return left.releaseDate.localeCompare(right.releaseDate);
    return left.title.localeCompare(right.title);
  });
  const start = (page - 1) * pageSize;
  return ok({ items: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize });
}

export function getShowtimesForMovie(movieId: string) {
  return getShowtimesByMovie(movieId);
}

export const movieService = {
  async list() {
    return unwrap(getMovies());
  },
  async get(id: string) {
    return unwrap(getMovieById(id));
  },
  async search(query: string) {
    return unwrap(searchMovies(query));
  },
  async filter(filters: MovieFilters) {
    return unwrap(filterMovies(filters));
  },
  async showtimes(movieId: string) {
    return unwrap(getShowtimesForMovie(movieId));
  },
};

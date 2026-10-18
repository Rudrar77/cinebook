import type { ZodType } from "zod";
import { fail, ok, type Result } from "./result";
import { SCHEMA_VERSION, STORAGE_KEYS, type SchemaMeta } from "./types";
import {
  adminSettingsSchema,
  cinemaSchema,
  demoSessionSchema,
  movieRecordSchema,
  schemaMetaSchema,
  screenSchema,
  storedBookingSchema,
  storedBookingSeatSchema,
  storedPaymentSchema,
  storedSeatSchema,
  storedShowtimeSchema,
  storedUserSchema,
} from "./validation";
import { createDemoSeedData } from "./seedData";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key?(index: number): string | null;
  readonly length?: number;
}

const memoryFallback = new Map<string, string>();

const memoryStore: KeyValueStore = {
  getItem: (key) => memoryFallback.get(key) ?? null,
  setItem: (key, value) => {
    memoryFallback.set(key, value);
  },
  removeItem: (key) => {
    memoryFallback.delete(key);
  },
};

let injectedStore: KeyValueStore | undefined;

function browserStore(): KeyValueStore | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const storage = window.localStorage;
    const probe = "__cinebook_storage_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return undefined;
  }
}

export function getStore(): KeyValueStore {
  if (injectedStore) return injectedStore;
  return browserStore() ?? memoryStore;
}

export function setStoreForTests(store?: KeyValueStore) {
  injectedStore = store;
}

export function newId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

function backupCorrupt(key: string, raw: string) {
  const stamp = Date.now();
  try {
    getStore().setItem(`${key}__corrupt_${stamp}`, raw.slice(0, 50_000));
  } catch {
    /* ignore backup failures */
  }
}

export function readRaw(key: string): { state: "missing" | "ok" | "corrupt"; value?: unknown } {
  const raw = getStore().getItem(key);
  if (raw == null) return { state: "missing" };
  const parsed = parseJson(raw);
  if (!parsed.ok) {
    backupCorrupt(key, raw);
    return { state: "corrupt" };
  }
  return { state: "ok", value: parsed.value };
}

export function writeJson(key: string, value: unknown): Result<true> {
  try {
    getStore().setItem(key, JSON.stringify(value));
    return ok(true);
  } catch {
    return fail("STORAGE_UNAVAILABLE", "Browser storage is unavailable or full. Demo data could not be saved.");
  }
}

export function hasKey(key: string) {
  return getStore().getItem(key) != null;
}

export function readValidated<T>(key: string, schema: ZodType<T>, fallback: T): { items: T; missing: boolean; corrupt: boolean } {
  const snapshot = readRaw(key);
  if (snapshot.state === "missing") return { items: fallback, missing: true, corrupt: false };
  if (snapshot.state === "corrupt") {
    return { items: fallback, missing: false, corrupt: true };
  }
  const parsed = schema.safeParse(snapshot.value);
  if (!parsed.success) {
    backupCorrupt(key, JSON.stringify(snapshot.value));
    return { items: fallback, missing: false, corrupt: true };
  }
  return { items: parsed.data, missing: false, corrupt: false };
}

export function readCollection<T>(key: string, itemSchema: ZodType<T>): { items: T[]; missing: boolean; corrupt: boolean } {
  const snapshot = readRaw(key);
  if (snapshot.state === "missing") return { items: [], missing: true, corrupt: false };
  if (snapshot.state === "corrupt") {
    return { items: [], missing: false, corrupt: true };
  }
  if (!Array.isArray(snapshot.value)) {
    backupCorrupt(key, JSON.stringify(snapshot.value));
    return { items: [], missing: false, corrupt: true };
  }
  const items: T[] = [];
  let corrupt = false;
  for (const entry of snapshot.value) {
    const parsed = itemSchema.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
    else corrupt = true;
  }
  if (corrupt) backupCorrupt(key, JSON.stringify(snapshot.value));
  return { items, missing: false, corrupt };
}

export function readCollectionResult<T>(key: string, itemSchema: ZodType<T>): Result<T[]> {
  const collection = readCollection(key, itemSchema);
  if (collection.corrupt) {
    return fail("STORAGE_CORRUPT", `Stored CineBook data for ${key} is invalid. A backup was retained; review or reset demo data to continue.`);
  }
  return ok(collection.items);
}

export function collection<T extends { id: string }>(key: string, itemSchema: ZodType<T>) {
  const load = () => readCollection(key, itemSchema);

  return {
    key,
    get: (id: string) => load().items.find((item) => item.id === id),
    getAll: () => load().items,
    isMissing: () => load().missing,
    isEmpty: () => load().items.length === 0,
    isCorrupt: () => load().corrupt,
    getById: (id: string) => load().items.find((item) => item.id === id),
    set: (items: T[]) => {
      const parsed: T[] = [];
      for (const item of items) {
        const result = itemSchema.safeParse(item);
        if (!result.success) return fail("VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid record.");
        parsed.push(result.data);
      }
      return writeJson(key, parsed);
    },
    setAll: (items: T[]) => {
      const parsed: T[] = [];
      for (const item of items) {
        const result = itemSchema.safeParse(item);
        if (!result.success) return fail("VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid record.");
        parsed.push(result.data);
      }
      return writeJson(key, parsed);
    },
    add: (item: T): Result<T> => {
      const parsed = itemSchema.safeParse(item);
      if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid record.");
      const current = load().items;
      if (current.some((existing) => existing.id === parsed.data.id)) {
        return fail("DUPLICATE_ID", "A record with this identifier already exists.");
      }
      const saved = writeJson(key, [...current, parsed.data]);
      if (!saved.success) return saved;
      return ok(parsed.data);
    },
    update: (id: string, patch: Partial<T>): Result<T> => {
      const current = load().items;
      const index = current.findIndex((item) => item.id === id);
      if (index < 0) return fail("NOT_FOUND", "The requested record was not found.");
      const merged = { ...current[index], ...patch, id };
      const parsed = itemSchema.safeParse(merged);
      if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid record.");
      const next = [...current];
      next[index] = parsed.data;
      const saved = writeJson(key, next);
      if (!saved.success) return saved;
      return ok(parsed.data);
    },
    remove: (id: string): Result<true> => {
      const current = load().items;
      if (!current.some((item) => item.id === id)) return fail("NOT_FOUND", "The requested record was not found.");
      return writeJson(
        key,
        current.filter((item) => item.id !== id),
      );
    },
    delete: (id: string): Result<true> => {
      const current = load().items;
      if (!current.some((item) => item.id === id)) return fail("NOT_FOUND", "The requested record was not found.");
      return writeJson(
        key,
        current.filter((item) => item.id !== id),
      );
    },
  };
}

const ALL_KEYS = Object.values(STORAGE_KEYS);

export function readMeta(): SchemaMeta {
  const result = readValidated(STORAGE_KEYS.meta, schemaMetaSchema, {
    schemaVersion: SCHEMA_VERSION,
    migratedAt: nowIso(),
  });
  return result.items;
}

export function writeMeta(meta: SchemaMeta) {
  const parsed = schemaMetaSchema.safeParse(meta);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid storage metadata.");
  return writeJson(STORAGE_KEYS.meta, parsed.data);
}

function seedIfEmpty<T extends { id: string }>(
  store: ReturnType<typeof collection<T>>,
  records: T[],
): Result<true> {
  if (store.isCorrupt()) return fail("STORAGE_CORRUPT", `Stored CineBook data for ${store.key} is invalid. A backup was retained.`);
  if (!store.isMissing() && !store.isEmpty()) return ok(true);
  return store.setAll(records);
}

export function migrateIfNeeded(): Result<true> {
  const existing = readRaw(STORAGE_KEYS.meta);
  if (existing.state === "missing") {
    return writeMeta({ schemaVersion: SCHEMA_VERSION, migratedAt: nowIso() });
  }
  if (existing.state === "corrupt") return fail("STORAGE_CORRUPT", "CineBook storage metadata is corrupted. A backup was retained.");
  const parsed = schemaMetaSchema.safeParse(existing.value);
  if (!parsed.success) {
    backupCorrupt(STORAGE_KEYS.meta, JSON.stringify(existing.value));
    return fail("STORAGE_CORRUPT", "CineBook storage metadata is invalid. A backup was retained.");
  }
  if (parsed.data.schemaVersion > SCHEMA_VERSION) {
    return fail("FUTURE_SCHEMA_VERSION", "This CineBook data was created by a newer version of the demo.");
  }
  if (parsed.data.schemaVersion === SCHEMA_VERSION) return ok(true);
  return writeMeta({ ...parsed.data, schemaVersion: SCHEMA_VERSION, migratedAt: nowIso() });
}

export const users = collection(STORAGE_KEYS.users, storedUserSchema);
export const movies = collection(STORAGE_KEYS.movies, movieRecordSchema);
export const cinemas = collection(STORAGE_KEYS.cinemas, cinemaSchema);
export const screens = collection(STORAGE_KEYS.screens, screenSchema);
export const seats = collection(STORAGE_KEYS.seats, storedSeatSchema);
export const showtimes = collection(STORAGE_KEYS.showtimes, storedShowtimeSchema);
export const bookings = collection(STORAGE_KEYS.bookings, storedBookingSchema);
export const bookingSeats = collection(STORAGE_KEYS.bookingSeats, storedBookingSeatSchema);
export const payments = collection(STORAGE_KEYS.payments, storedPaymentSchema);

export function readAdminSettings() {
  const result = readValidated(STORAGE_KEYS.adminSettings, adminSettingsSchema, {
    demoMode: true,
    pendingBookingMinutes: 15,
    notice: "Development-only LocalStorage demo.",
  });
  if (result.corrupt) return fail("STORAGE_CORRUPT", "CineBook admin settings are invalid. A backup was retained.");
  return ok(result.items);
}

export function initializeDemoData(): Result<true> {
  const storedMeta = readRaw(STORAGE_KEYS.meta);
  let shouldSeed = storedMeta.state === "missing";
  if (storedMeta.state === "corrupt") {
    return fail("STORAGE_CORRUPT", "CineBook storage metadata is corrupted. A backup was retained.");
  }
  if (storedMeta.state === "ok") {
    const parsed = schemaMetaSchema.safeParse(storedMeta.value);
    if (!parsed.success) {
      backupCorrupt(STORAGE_KEYS.meta, JSON.stringify(storedMeta.value));
      return fail("STORAGE_CORRUPT", "CineBook storage metadata is invalid. A backup was retained.");
    }
    if (parsed.data.schemaVersion > SCHEMA_VERSION) {
      return fail("FUTURE_SCHEMA_VERSION", "This CineBook data was created by a newer version of the demo.");
    }
    shouldSeed = parsed.data.seededAt == null;
  }

  const migrated = migrateIfNeeded();
  if (!migrated.success) return migrated;

  if (!shouldSeed) return ok(true);
  const seed = createDemoSeedData();
  const seededUsers = seedIfEmpty(users, seed.users);
  if (!seededUsers.success) return seededUsers;
  const seededMovies = seedIfEmpty(movies, seed.movies);
  if (!seededMovies.success) return seededMovies;
  const seededCinemas = seedIfEmpty(cinemas, seed.cinemas);
  if (!seededCinemas.success) return seededCinemas;
  const seededScreens = seedIfEmpty(screens, seed.screens);
  if (!seededScreens.success) return seededScreens;
  const seededSeats = seedIfEmpty(seats, seed.seats);
  if (!seededSeats.success) return seededSeats;
  const seededShowtimes = seedIfEmpty(showtimes, seed.showtimes);
  if (!seededShowtimes.success) return seededShowtimes;
  const seededBookings = seedIfEmpty(bookings, seed.bookings);
  if (!seededBookings.success) return seededBookings;
  const seededBookingSeats = seedIfEmpty(bookingSeats, seed.bookingSeats);
  if (!seededBookingSeats.success) return seededBookingSeats;
  const seededPayments = seedIfEmpty(payments, seed.payments);
  if (!seededPayments.success) return seededPayments;

  const settings = readValidated(STORAGE_KEYS.adminSettings, adminSettingsSchema, seed.adminSettings);
  if (settings.corrupt) return fail("STORAGE_CORRUPT", "CineBook admin settings are invalid. A backup was retained.");
  if (settings.missing) {
    const saved = writeJson(STORAGE_KEYS.adminSettings, seed.adminSettings);
    if (!saved.success) return saved;
  }
  return writeMeta({ schemaVersion: SCHEMA_VERSION, migratedAt: nowIso(), seededAt: nowIso() });
}

export function resetAndReseedDemoData(confirmation: string): Result<true> {
  if (confirmation !== "RESET_CINEBOOK_DEMO") {
    return fail("CONFIRMATION_REQUIRED", "Enter the reset confirmation string to replace all local CineBook demo data.");
  }
  try {
    clearAllCinebookKeys();
  } catch {
    return fail("STORAGE_UNAVAILABLE", "Browser storage could not be cleared.");
  }
  return initializeDemoData();
}

export function clearAllCinebookKeys() {
  const store = getStore();
  for (const key of ALL_KEYS) store.removeItem(key);
  if (store.key && typeof store.length === "number") {
    const extraKeys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith("cinebook_v1_") && !ALL_KEYS.includes(key as (typeof ALL_KEYS)[number])) extraKeys.push(key);
    }
    for (const key of extraKeys) store.removeItem(key);
  }
  if (typeof window !== "undefined") store.removeItem("cinebook_token");
}

export function listCinebookKeys() {
  return [...ALL_KEYS];
}

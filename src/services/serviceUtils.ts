import type { Result } from "./result";
import { initializeDemoData, readCollectionResult } from "./storageService";
import type { ZodType } from "zod";

export interface CollectionStore<T extends { id: string }> {
  key: string;
  getAll(): T[];
  getById(id: string): T | undefined;
  isCorrupt(): boolean;
  setAll(items: T[]): Result<true>;
  add(item: T): Result<T>;
  update(id: string, patch: Partial<T>): Result<T>;
  remove(id: string): Result<true>;
}

export function ready(): Result<true> {
  return initializeDemoData();
}

export function records<T extends { id: string }>(store: CollectionStore<T>, schema: ZodType<T>): Result<T[]> {
  return readCollectionResult(store.key, schema);
}

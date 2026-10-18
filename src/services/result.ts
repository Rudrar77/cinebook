export interface ServiceError {
  code: string;
  message: string;
}

export type Result<T> = { success: true; data: T } | { success: false; error: ServiceError };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function fail<T = never>(code: string, message: string): Result<T> {
  return { success: false, error: { code, message } };
}

/** Thrown by the Axios-compatible service wrappers so existing UI catch paths still work. */
export class CinebookError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CinebookError";
    this.code = code;
  }
}

export function unwrap<T>(result: Result<T>): T {
  if (result.success) return result.data;
  throw new CinebookError(result.error.code, result.error.message);
}

export async function unwrapAsync<T>(result: Result<T> | Promise<Result<T>>): Promise<T> {
  return unwrap(await result);
}

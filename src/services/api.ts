import { CinebookError } from "./result";

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof CinebookError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "The requested CineBook operation could not be completed. Please try again.";
}

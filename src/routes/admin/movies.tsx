import { createFileRoute } from "@tanstack/react-router";
import { AdminMoviesPage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/admin/movies")({
  component: AdminMoviesPage,
});

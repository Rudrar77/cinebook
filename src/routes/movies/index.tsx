import { createFileRoute } from "@tanstack/react-router";
import { MoviesPage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/movies/")({
  component: MoviesPage,
});

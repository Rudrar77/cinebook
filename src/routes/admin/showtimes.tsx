import { createFileRoute } from "@tanstack/react-router";
import { AdminShowtimesPage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/admin/showtimes")({
  component: AdminShowtimesPage,
});

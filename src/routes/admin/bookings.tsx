import { createFileRoute } from "@tanstack/react-router";
import { AdminBookingsPage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/admin/bookings")({
  component: AdminBookingsPage,
});

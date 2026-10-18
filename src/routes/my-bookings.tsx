import { createFileRoute } from "@tanstack/react-router";
import { MyBookingsPage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/my-bookings")({
  component: MyBookingsPage,
});

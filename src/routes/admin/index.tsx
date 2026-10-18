import { createFileRoute } from "@tanstack/react-router";
import { AdminHomePage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/admin/")({
  component: AdminHomePage,
});

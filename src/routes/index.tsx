import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/")({
  component: HomePage,
});

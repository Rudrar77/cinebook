import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/login")({
  component: () => <LoginPage />,
});

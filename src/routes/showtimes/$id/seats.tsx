import { createFileRoute } from "@tanstack/react-router";
import { SeatsPage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/showtimes/$id/seats")({
  component: SeatsRoute,
});

function SeatsRoute() {
  const { id } = Route.useParams();
  return <SeatsPage id={id} />;
}

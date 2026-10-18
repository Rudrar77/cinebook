import { createFileRoute } from "@tanstack/react-router";
import { BookingPage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/booking/$id")({
  component: BookingRoute,
});

function BookingRoute() {
  const { id } = Route.useParams();
  return <BookingPage id={id} />;
}

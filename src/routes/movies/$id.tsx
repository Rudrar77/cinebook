import { createFileRoute } from "@tanstack/react-router";
import { MoviePage } from "@/features/cinebook/CineBookApp";

export const Route = createFileRoute("/movies/$id")({
  component: MovieRoute,
});

function MovieRoute() {
  const { id } = Route.useParams();
  return <MoviePage id={id} />;
}

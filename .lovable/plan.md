# CineBook frontend

## What to build

A polished, responsive CineBook movie-ticket booking frontend with the requested browsing, seat selection, booking, account, and admin screens. Keep this project frontend-only; the separately developed Express service remains the source of truth.

## Experience

- Build a dark cinema interface with red accents, a cinematic featured title, and sample movie artwork.
- Add browse/search/filter pages, movie details and showtimes, interactive seat selection, booking/payment simulation, account pages, and admin views.
- Make the seat grid and booking summary usable at mobile and desktop widths.
- Clearly label demo payment methods. Never show a confirmed booking or ticket unless the configured API returns confirmation; show a useful unavailable/error state otherwise.

## API integration

- Add typed API request/response models, a centralized Axios client reading `VITE_API_BASE_URL`, and focused auth, movie, showtime, seat, booking, and admin services.
- Use supplied sample data for development browsing and seat availability, with an obvious API error when actions requiring the separate backend cannot complete.
- Keep request and response handling out of page components, and document connecting the separately hosted backend.

## Technical details

- Preserve the existing TanStack Start and file-based routing rather than introducing React Router; add a route file for each required URL.
- Use the existing shadcn controls and semantic design tokens in `src/styles.css`.
- Keep admin protection explicitly frontend-only; real authorization must be enforced by the separate backend.
- Add unique page metadata and validate the routes, browsing and seat-selection interaction, and booking failure behavior.

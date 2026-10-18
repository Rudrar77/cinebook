# CineBook

CineBook is a browser-based movie ticket booking demonstration built with React, TypeScript, and TanStack Router. It provides a movie catalog, cinema showtimes, seat selection, simulated payment, local demonstration tickets, and an admin area for managing movies and showtimes.

All application records are persisted in the current browser's **LocalStorage**. CineBook does not connect to a database or payment provider and does not require an application API server. It is intended for local and academic demonstrations, not production ticket sales.

## Contents

- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [Using CineBook](#using-cinebook)
- [Admin workflows](#admin-workflows)
- [Frontend service integration](#frontend-service-integration)
- [LocalStorage and seed data](#localstorage-and-seed-data)
- [Development commands](#development-commands)
- [Project structure](#project-structure)
- [Limitations and security](#limitations-and-security)

## Requirements

- Node.js with npm
- A modern browser with LocalStorage enabled

## Getting started

From the project directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. CineBook initializes its demo data in the browser when the services are first used. A backend server is not needed for application data.

To create and preview a production build:

```sh
npm run build
npm run preview
```

## Demo accounts

Choose an account on the **Sign in** page to fill in the demo credentials:

| Account | Email | Password |
| --- | --- | --- |
| Customer | `customer@cinebook.demo` | `Demo123!` |
| Administrator | `admin@cinebook.demo` | `Demo123!` |

These credentials are public and for demonstration only. Public registration creates customer accounts; it does not allow registration as an administrator. Passwords are hashed with bcryptjs before being saved in LocalStorage.

## Using CineBook

1. Browse the home page or open **Movies** to view the entire stored catalog. The catalog includes all movies, with filters for listing status, genre, language, and rating.
2. Open a movie to view its details and showtimes.
3. Choose a showtime and select seats. Seat availability and pricing are read from the stored showtime, screen, seat, and booking records.
4. Sign in or register before creating a booking. The selected seats are rechecked before a pending booking and its allocations are saved.
5. Complete the simulated payment on the booking page:
   - **UPI:** display the demo QR and confirm that it was scanned to continue. The QR is only a local demonstration code and cannot transfer money.
   - **Card:** enter the demo-only number `12345678`. No CVV or real card details are requested.
6. After simulated payment succeeds, the booking is confirmed and the page displays a local demonstration ticket with its own QR code.
7. Open **My bookings** to review the signed-in user's bookings.

Cash payment is not offered.

## Admin workflows

Sign in with the administrator demo account, then open **Admin**.

### Movies

The movie form saves the movie's title, synopsis, genre/category, language, rating, duration, certification, release date, listing status, and poster in LocalStorage. Posters can be supplied as an image URL or uploaded as an image file up to 2 MB. Uploaded images are stored as data URLs in the browser. A preview is shown before saving.

Newly saved movies are available in the **Movies** catalog and can be selected when creating a showtime.

### Showtimes

The showtime form selects a movie from the stored catalog and displays its category and other details. Select a cinema and a screen belonging to that cinema, then provide the date, start time, and regular and premium seat prices. The selected movie ID is stored on the showtime. Invalid screens and overlapping schedules are rejected.

Admin pages and role checks are for a local demonstration only. Client-side role checks do not provide secure authorization.

## Frontend service integration

The reusable browser service implementation is exported from `src/services/localCinebookService.ts`. Services return a discriminated result: either `{ success: true, data }` or `{ success: false, error: { code, message } }`.

```ts
import { localCinebookService } from "@/services/localCinebookService";

const result = localCinebookService.movies.getMovies();

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error.code, result.error.message);
}
```

`src/services/serviceInterface.ts` defines the service contract that a future HTTP-backed implementation can satisfy. The UI-facing convenience objects in modules such as `movieService.ts`, `bookingService.ts`, and `adminService.ts` return promises and throw `CinebookError` on failure, which supports the app's existing `try`/`catch` handling.

The service modules cover:

- Authentication simulation and profiles
- Movie search, filtering, and details
- Cinema, screen, and showtime management
- Seat inventory, availability, and pricing
- Booking creation, cancellation, and pending-booking expiry
- Simulated UPI and card payments
- Local ticket data and QR generation
- Demo-only administration and dashboard statistics

UI components should use these services rather than reading or writing application records directly.

## LocalStorage and seed data

CineBook uses JSON values under versioned `cinebook_v1_` keys:

| Key | Contents |
| --- | --- |
| `cinebook_v1_meta` | Storage schema version and seed marker |
| `cinebook_v1_users` | Demo users and password hashes |
| `cinebook_v1_movies` | Movie catalog |
| `cinebook_v1_cinemas` | Cinemas |
| `cinebook_v1_screens` | Screens belonging to cinemas |
| `cinebook_v1_seats` | Screen seat layouts |
| `cinebook_v1_showtimes` | Movie screenings and seat prices |
| `cinebook_v1_bookings` | Booking records and statuses |
| `cinebook_v1_booking_seats` | Seat allocations for bookings |
| `cinebook_v1_simulated_payments` | Demo payment records |
| `cinebook_v1_session` | Current local demo session |
| `cinebook_v1_admin_settings` | Demo settings, including pending-booking expiry |

On first service access, the application seeds empty or missing collections with demo data, including ten movies, cinemas, screens, seats, upcoming showtimes, and sample customer and booking records. It does not reseed non-empty collections on normal page loads. Storage validation and migration are centralized in `src/services/storageService.ts`.

For development only, all CineBook LocalStorage data can be cleared and reseeded explicitly:

```ts
import { resetAndReseedDemoData } from "@/services/storageService";

const result = resetAndReseedDemoData("RESET_CINEBOOK_DEMO");
```

The confirmation string is required. Reset removes CineBook v1 keys in the current browser, including local accounts, sessions, and bookings. Do not call it automatically during app startup.

## Development commands

```sh
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run preview   # Preview the production build
npm test          # Run the Vitest test suite
npm run test:watch # Run Vitest in watch mode
npm run lint      # Run ESLint
```

The test suite is configured with Vitest and jsdom; tests live under `src/test`.

## Project structure

```text
src/
  components/ui/       Shared UI primitives
  features/cinebook/   CineBook pages and presentation
  routes/              TanStack file-based routes
  services/            LocalStorage, validation, and business logic
  test/                Test setup and tests
```

Important service modules include `storageService.ts`, `seedData.ts`, `types.ts`, `validation.ts`, and the focused auth, movie, showtime, seat, booking, payment, ticket, and admin services.

## Limitations and security

- LocalStorage is available only in a browser. It is not a server database; browser data is local to that browser profile and does not synchronize across users, browsers, or devices.
- Browser storage can be inspected, edited, cleared, or disabled by its user. Local authentication and administrator role checks are simulated, bypassable, and unsuitable for production authorization.
- Password hashing in the browser does not make this authentication system production-secure.
- Booking availability is rechecked in the current browser, but LocalStorage does not provide atomic transactions. Concurrent reservations in different tabs, browsers, or devices cannot be prevented reliably.
- UPI and card operations are simulations only. No money is collected, no payment provider is contacted, and no real card number, CVV, UPI identifier, or bank credential is collected.
- QR codes contain local demo references. They do not provide secure or server-side verification.
- LocalStorage has limited capacity. In particular, uploaded movie posters consume browser storage; keep them at or below the form's 2 MB file limit.
- If browser storage is unavailable, full, or contains invalid data, operations may return an error. Do not treat a failed write as a successful booking or payment.

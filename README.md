# AI BookingMate

AI BookingMate is a SaaS-style booking platform for small service businesses.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: NestJS, TypeScript, Node.js
- Future AI service: Python, FastAPI
- Package manager: npm

## Day 1 Status

Day 1 project scaffolding is complete. The repository has a clean monorepo-style structure with separate folders for the frontend, backend, future AI service, and documentation.

No business features have been implemented yet.

## Day 2 Database Setup

Day 2 adds the PostgreSQL and Prisma foundation for the NestJS backend. The root `docker-compose.yml` defines a local PostgreSQL service, and the backend contains the first Prisma schema for users, services, time slots, and bookings.

See `docs/day-02-database.md` for the database design, manual Docker Compose startup command, migration command, Prisma Studio command, and Day 2 acceptance criteria.

## Day 3 Authentication Setup

Day 3 adds backend authentication with register, login, JWT-protected routes, request validation, and basic role-based access control for admin-only endpoints.

See `docs/day-03-auth.md` for the auth flow, password hashing notes, JWT explanation, manual API testing commands, and Day 3 acceptance criteria.

## Day 4 Services API

Day 4 adds backend endpoints for listing active services publicly and managing services through admin-only create, update, and soft delete actions.

See `docs/day-04-services.md` for the service model explanation, endpoint list, manual curl testing steps, and Day 4 acceptance criteria.

## Day 5 Time Slots API

Day 5 adds backend endpoints for admins to create and manage service time slots, plus a public endpoint for customers to view available slots for an active service.

See `docs/day-05-time-slots.md` for time slot status rules, overlap detection, endpoint details, manual curl testing steps, and Day 5 acceptance criteria.

## Day 6 Bookings API

Day 6 adds backend endpoints for authenticated customers to create and cancel bookings, plus admin endpoints for listing and updating booking status.

See `docs/day-06-bookings.md` for booking transactions, double-booking prevention, customer and admin endpoints, manual curl testing steps, and Day 6 acceptance criteria.

## Day 7 Developer Experience

Day 7 adds Swagger API documentation at `http://localhost:3000/api/docs`, a `GET /health` endpoint, and an idempotent backend seed script.

Run seed data from the backend folder:

```cmd
npm run seed
```

Seeded test accounts:

- Admin: `admin@example.com` / `Password123!`
- Customer: `customer.seed@example.com` / `Password123!`

See `docs/day-07-seed-swagger.md` for Swagger usage, seed details, manual test commands, and Day 7 acceptance criteria.

## Day 8 Frontend Authentication

Day 8 adds React authentication pages, JWT session handling, protected dashboard routing, and backend CORS support for the Vite frontend.

Frontend auth uses `VITE_API_BASE_URL=http://localhost:3000` and stores the JWT access token in localStorage under `accessToken`.

See `docs/day-08-frontend-auth.md` for the auth flow, routes, manual testing steps, and Day 8 acceptance criteria.

## Day 9 Frontend Services Browsing

Day 9 adds public React pages for browsing active services and viewing available time slots for each service.

Booking buttons are placeholders for Day 10 and do not call `POST /bookings` yet.

See `docs/day-09-frontend-services.md` for the service browsing flow, backend API calls, manual testing steps, and Day 9 acceptance criteria.

## Day 10 Frontend Bookings

Day 10 adds frontend booking creation from available time slots and a protected `My Bookings` page where customers can view and cancel their bookings.

The frontend calls the existing booking API and leaves time slot status changes to the backend transaction.

See `docs/day-10-frontend-bookings.md` for the booking flow, cancellation behavior, double-booking handling, manual testing steps, and Day 10 acceptance criteria.

## Day 11 Admin Booking Management

Day 11 adds an admin-only frontend page at `/admin/bookings` for viewing, filtering, confirming, and cancelling customer bookings.

The admin page is protected by a role-aware `AdminRoute`, while the backend remains the final authorization layer.

See `docs/day-11-admin-bookings.md` for admin booking behavior, route protection, manual testing steps, and Day 11 acceptance criteria.

## Day 12 Admin Services and Time Slots

Day 12 adds admin-only frontend pages at `/admin/services` and `/admin/time-slots` for managing bookable services and availability.

Admins can create, edit, and deactivate services, plus create, block, unblock, and filter time slots. The UI does not allow manually setting `BOOKED`; booking status remains controlled by the booking flow.

See `docs/day-12-admin-services-time-slots.md` for admin service and time slot behavior, manual testing steps, and Day 12 acceptance criteria.

## Day 13 FAQ Assistant

Day 13 adds a customer FAQ assistant with a public backend endpoint at `POST /assistant/ask` and a frontend chat page at `/assistant`.

The assistant uses a static backend knowledge base and deterministic keyword scoring, then can optionally call OpenAI from the backend when `OPENAI_API_KEY` is configured. If OpenAI is not configured, it falls back to the matched FAQ answer.

See `docs/day-13-faq-assistant.md` for the retrieval approach, API response shape, frontend behavior, limitations, manual testing steps, and Day 13 acceptance criteria.

## Day 14 OpenAI Rule-Grounded Assistant

Day 14 upgrades the assistant so admins can manage business rules that ground customer support answers.

The backend adds a `BusinessRule` model, admin-only `/business-rules` endpoints, default seed rules, and an OpenAI-backed assistant flow that uses matched rules as context. `OPENAI_API_KEY` stays in `backend/.env`, and the assistant falls back to rule-based retrieval when OpenAI is not configured.

See `docs/day-14-openai-rule-grounded-assistant.md` for the rule model, OpenAI setup, fallback behavior, manual testing steps, and Day 14 acceptance criteria.

## Day 15 OpenAI Cost Controls

Day 15 adds backend cost controls for the OpenAI-powered assistant.

Use these backend environment values:

```env
OPENAI_MODEL="gpt-5.6-luna"
OPENAI_MAX_OUTPUT_TOKENS="300"
```

The backend enforces an allowed model list and caps `OPENAI_MAX_OUTPUT_TOKENS` at 500. The OpenAI API key remains backend-only and is never exposed to the frontend.

See `docs/day-15-openai-cost-controls.md` for model allowlist behavior, output token limits, and manual testing steps.

## Day 16 Frontend Polish

Day 16 improves the React frontend UI so the app feels more demo-ready as a SaaS booking product.

The polish pass keeps the existing CSS setup and does not add a UI framework. It improves the navbar, landing page, service cards, booking views, assistant chat, dashboard, forms, and admin pages.

See `docs/day-16-frontend-polish.md` for the UI changes, testing checklist, and acceptance criteria.

## Automated Backend Testing

The backend includes Jest unit tests and Supertest e2e tests for health, authentication, role checks, services, time slots, bookings, business rules, and assistant fallback behavior.

E2E tests require a dedicated `DATABASE_URL_TEST` and will refuse to run against the normal development database. OpenAI calls are mocked in automated tests.

See `docs/day-16-automated-testing.md` for safe test database setup, commands, covered workflows, and troubleshooting.

## Day 17 Advanced Frontend Layout

Day 17 upgrades the frontend into a fuller demo-ready SaaS layout with wider page structures, two-column screens, side panels, summary cards, stat rows, richer empty states, and clearer product storytelling.

The polished pages include service browsing, bookings, assistant chat, dashboard, and the admin console, while still using plain React, TypeScript, and CSS.

See `docs/day-17-advanced-frontend-layout.md` for the layout improvements and manual testing checklist.

## Day 17b Layout Refinement

Day 17b refines the advanced layout into a wider, more balanced booking SaaS experience. It standardizes desktop page width, typography, panel spacing, service and booking card rhythm, and responsive behavior, with a focused redesign of the assistant workspace.

See `docs/day-17b-layout-refinement.md` for the visual issues addressed and the updated testing checklist.

## Home, Services, And Assistant Presentation

The customer-facing Home, Services, and Assistant pages use a wider SaaS-style presentation layout with a consistent typography scale, responsive card grids, and a chat-first assistant workspace. The implementation uses only the existing React and CSS setup.

See `docs/day-17b-home-services-assistant-redesign.md` for the focused redesign notes and manual testing checklist.

## Planned Features

- Customer booking workflow
- Role-based access control
- AI FAQ assistant

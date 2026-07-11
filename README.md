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

## Planned Features

- Customer booking workflow
- Admin service and time slot management
- Role-based access control
- AI FAQ assistant

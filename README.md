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

## Planned Features

- Customer booking workflow
- Admin service and time slot management
- Role-based access control
- AI FAQ assistant

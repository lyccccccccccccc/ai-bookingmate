# Day 2 Database Setup

Day 2 adds the PostgreSQL and Prisma foundation for AI BookingMate's NestJS backend.

## Why PostgreSQL

PostgreSQL is a reliable relational database that fits booking workflows well. AI BookingMate needs clear relationships between users, services, available time slots, and bookings, plus constraints that protect important rules such as one booking per time slot.

## Why Prisma

Prisma gives the backend a type-safe database client, a schema-first data model, and migrations that keep database structure repeatable across local development and future deployments.

## Designed Tables

- `User`: stores customers and admins with login identity, hashed passwords, names, roles, and timestamps.
- `Service`: stores bookable services with duration, optional price, active state, and timestamps.
- `TimeSlot`: stores service availability windows with a status of available, booked, or blocked.
- `Booking`: connects a customer to a service and a single time slot with booking status and optional notes.

## Relationships

- A `User` can have many `Booking` records.
- A `Service` can have many `TimeSlot` records.
- A `Service` can have many `Booking` records.
- A `TimeSlot` can have zero or one `Booking`.
- A `Booking` belongs to one customer, one service, and one time slot.
- Each service can only have one time slot with the same `startAt` value.
- Each booking must use a unique time slot.

## Start The Database

Run this from normal Windows CMD, not the Codex shell:

```cmd
cd /d D:\ai-bookingmate
docker compose up -d postgres
```

The database runs on host port `5433` and container port `5432`.

## Run The Migration

After the database is running, run this from normal Windows CMD:

```cmd
cd /d D:\ai-bookingmate\backend
npm run prisma:migrate -- --name init
```

## Inspect With Prisma Studio

Run this from normal Windows CMD:

```cmd
cd /d D:\ai-bookingmate\backend
npm run prisma:studio
```

Prisma Studio opens a browser UI for viewing and editing local database records.

## Acceptance Criteria

- PostgreSQL service is defined in `docker-compose.yml`.
- Prisma dependencies are installed in the backend.
- Prisma schema validates successfully.
- The first schema includes users, services, time slots, bookings, and required enums.
- NestJS has a reusable Prisma module and service.
- The backend builds successfully.
- `.env` stays uncommitted, while `.env.example` documents the expected variable.
- Migration can be run manually once PostgreSQL is started in normal CMD.

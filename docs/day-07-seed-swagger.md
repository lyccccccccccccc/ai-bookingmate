# Day 7 Swagger, Seed Data, And Health Check

Day 7 improves backend developer experience for AI BookingMate.

## Why Swagger Was Added

Swagger gives the backend a browsable API reference. It is useful during development because you can see available routes, request bodies, protected endpoints, and basic endpoint descriptions in one place.

## Swagger UI Route

Start the backend and open:

```text
http://localhost:3000/api/docs
```

Protected routes use Bearer authentication. In Swagger UI, click `Authorize` and paste a JWT access token.

## Health Check

The backend has a simple health endpoint:

```text
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "ai-bookingmate-backend"
}
```

## What Seed Data Is

Seed data is predictable demo data inserted into the local database. It gives developers and interview reviewers a quick way to test the app without manually creating users, services, and time slots every time.

## Why Seed Data Helps Demos And Testing

The seed script creates:

- an admin user
- a customer user
- two tennis services
- several future available time slots

This makes it easy to test authentication, admin-only routes, public availability, and booking flows.

## Run The Seed

Run this from normal Windows CMD after PostgreSQL is running and migrations are applied:

```cmd
cd /d D:\ai-bookingmate\backend
npm run seed
```

The seed script is idempotent, so it can be run more than once without creating duplicate users, services, or time slots.

## Seeded Test Accounts

Admin:

```text
email: admin@example.com
password: Password123!
```

Customer:

```text
email: customer.seed@example.com
password: Password123!
```

## Test Seeded Accounts

Login as admin:

```cmd
curl -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"Password123!\"}"
```

Login as customer:

```cmd
curl -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"customer.seed@example.com\",\"password\":\"Password123!\"}"
```

List seeded active services:

```cmd
curl http://localhost:3000/services
```

List available slots for a seeded service:

```cmd
curl http://localhost:3000/services/<serviceId>/time-slots
```

## Acceptance Criteria

- Swagger UI is available at `/api/docs`.
- Swagger supports Bearer auth.
- Core controllers have useful Swagger tags and endpoint summaries.
- `GET /health` returns the backend health response.
- `npm run seed` runs the Prisma seed script.
- Seed script uses the Prisma 7 PostgreSQL adapter.
- Seed script creates admin and customer test accounts.
- Seed script creates demo services and available future time slots.
- Seed script can be run repeatedly without duplicate records.
- The backend builds successfully.

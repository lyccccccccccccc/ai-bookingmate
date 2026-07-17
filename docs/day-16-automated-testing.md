# Day 16: Automated Backend Testing

Day 16 adds a focused NestJS test suite for the critical booking flows. It uses the existing Jest, Supertest, and Prisma stack; no separate testing framework or external OpenAI request is required.

## Test Architecture

- `backend/src/assistant/assistant.service.spec.ts` is a unit test for OpenAI and fallback behavior. The OpenAI SDK is mocked, so no API key or paid request is used.
- `backend/test/*.e2e-spec.ts` uses Supertest against a real Nest application and a separate PostgreSQL test database.
- `backend/test/helpers/test-app.ts` starts the application with the same validation settings as `main.ts`.
- `backend/test/helpers/test-database.ts` validates the database URL and clears test records in dependency order.
- `backend/test/helpers/auth-helper.ts` creates JWT-authenticated customer and admin users for tests.

## Test Database Safety

E2E tests require `DATABASE_URL_TEST`. The `test:e2e` preflight reads the local, untracked `backend/.env` when present and never falls back to `DATABASE_URL`.

The helper refuses to start destructive integration tests when:

- `DATABASE_URL_TEST` is missing.
- it is not a valid PostgreSQL URL.
- its database name does not contain `test`.
- it matches `DATABASE_URL`.

Every e2e test starts with an empty test database. Cleanup deletes bookings, time slots, services, business rules, and users in that order. Do not point `DATABASE_URL_TEST` at the normal development database.

## Windows CMD Setup

Create the database once from normal Windows CMD while PostgreSQL is running:

```cmd
docker exec -it ai-bookingmate-postgres psql -U bookingmate_user -d postgres -c "CREATE DATABASE ai_bookingmate_test;"
```

Set a local, untracked test URL for the current CMD session and apply migrations:

```cmd
cd D:\ai-bookingmate\backend
set DATABASE_URL_TEST=postgresql://bookingmate_user:bookingmate_password@localhost:5433/ai_bookingmate_test?schema=public
set DATABASE_URL=%DATABASE_URL_TEST%
npx prisma migrate deploy
```

Add the same `DATABASE_URL_TEST` value only to your local `backend/.env` if you want the command available in later sessions. Never commit credentials.

## Commands

```cmd
cd D:\ai-bookingmate\backend
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
```

`test:e2e` runs in band so suites do not race while clearing the shared test database.

## Covered Workflows

- Health response.
- Registration, login, JWT-protected current user lookup, and admin role checks.
- Admin service management and public active-service visibility.
- Time-slot creation, overlap protection, role checks, and public availability filtering.
- Booking creation, double-booking prevention, customer ownership, cancellation, admin status updates, and validation.
- Business-rule administration and assistant retrieval fallback.
- Mocked OpenAI mode, grounding context, and safe fallback on SDK errors.

## OpenAI Mocking

The AssistantService unit test replaces the OpenAI SDK constructor with a Jest mock. It verifies the allowed model, output-token limit, and retrieved business-rule context passed to the mocked response call. The e2e helper always clears `OPENAI_API_KEY`, so e2e tests use retrieval fallback only.

## Troubleshooting

- `DATABASE_URL_TEST is required`: set the test URL in the CMD session before running `npm run test:e2e`.
- `database name contains test`: use a database such as `ai_bookingmate_test`; this guard protects the development database.
- Missing tables: temporarily set `DATABASE_URL` to the test URL and rerun `npx prisma migrate deploy`.
- Connection refused: start PostgreSQL manually from normal CMD before running the e2e suite.

## Known Limitations

- E2E tests need a locally migrated PostgreSQL test database; they intentionally do not create or migrate databases automatically.
- The suite does not call OpenAI. OpenAI behavior is verified with a mocked SDK response.

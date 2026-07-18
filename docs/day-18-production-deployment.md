# Day 18: Production Deployment

Day 18 prepares AI BookingMate for a safe production-style deployment. It adds environment validation, explicit CORS rules, health monitoring, Docker builds, and a documented migration workflow without changing booking behavior.

## Architecture

The production Compose stack contains four services:

- `postgres`: PostgreSQL 16 with a persistent named volume and health check.
- `migrate`: a one-off Prisma migration job that runs `prisma migrate deploy` only after PostgreSQL is healthy.
- `backend`: the non-root NestJS runtime on port `3000`; it starts only after migrations complete successfully.
- `frontend`: a non-root Nginx runtime on port `8080` that serves the React single-page application.

The frontend reads `VITE_API_URL` from `/config.js`, which the Nginx entrypoint creates when the container starts. This makes the public API URL configurable at runtime and does not place secrets in the frontend.

## Required Environment

In production (`NODE_ENV=production`), the backend fails fast unless these values are non-empty:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
JWT_SECRET="use-a-long-random-secret"
FRONTEND_URL="https://your-frontend.example.com"
```

`JWT_SECRET` must not use an obvious local placeholder. `PORT`, when set, must be a valid port number. `OPENAI_MAX_OUTPUT_TOKENS`, when set, must be a positive integer.

Optional assistant configuration:

```env
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.6-luna"
OPENAI_MAX_OUTPUT_TOKENS="300"
```

`OPENAI_API_KEY` is backend-only. Leaving it empty keeps the retrieval fallback enabled.

For the bundled Compose file also set `POSTGRES_PASSWORD`, `JWT_SECRET`, and any public URLs:

```cmd
set "POSTGRES_PASSWORD=use-a-strong-database-password"
set "JWT_SECRET=use-a-long-random-jwt-secret"
set "FRONTEND_URL=http://localhost:8080"
set "VITE_API_URL=http://localhost:3000"
```

Do not place these values in a committed `.env` file.

## Local Production-Style Startup

From the repository root in Windows CMD:

```cmd
docker compose -f docker-compose.production.yml up --build
```

Then open:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/api/docs`

The backend allows only `FRONTEND_URL` in production. Development keeps the local Vite fallback of `http://localhost:5173`. CORS explicitly permits credentials, standard HTTP methods, and `Content-Type`/`Authorization` headers; it never uses a wildcard production origin.

## Database Operations

Generate the Prisma client after dependency installation:

```cmd
cd backend
npx prisma generate
```

Apply committed production migrations only:

```cmd
npx prisma migrate deploy
```

Never run `prisma migrate dev` or `prisma migrate reset` against production. The Compose `migrate` service runs `migrate deploy`; it does not seed data.

Demo seed data is optional and should only be used in a disposable demo environment:

```cmd
npm run seed
```

The seed is idempotent, but it updates demo users, services, and rules, so it should not be part of a normal production deploy.

## Health Monitoring

`GET /health` returns the service name, environment, timestamp, and database state. It returns `200` with `database: "connected"` when PostgreSQL is reachable. If the connectivity query fails, it returns `503` with `database: "unavailable"` and no connection string, secret, or stack trace.

## OpenAI Safeguards

- The API key is read only by the backend and is not exposed in frontend variables or Docker image source.
- The model defaults to `gpt-5.6-luna` and remains limited to the configured allowlist.
- Output is capped at 500 tokens by backend logic, with a normal default of 300.
- SDK calls use a 10-second timeout and no automatic retries.
- Missing keys or API errors return the grounded retrieval fallback.
- Automated tests mock OpenAI; E2E setup clears `OPENAI_API_KEY`.

## Test Database Warning

Automated E2E tests require `DATABASE_URL_TEST`. The test helper rejects a missing value, rejects equality with `DATABASE_URL`, and requires a database name containing `test`. Never set `DATABASE_URL_TEST` to a production or development database.

## Security Checklist

- Use unique, strong production database and JWT secrets.
- Supply secrets through the deployment platform or an uncommitted environment file.
- Set `NODE_ENV=production`, `FRONTEND_URL`, and `VITE_API_URL` to public HTTPS URLs.
- Restrict PostgreSQL network access to the backend only in a hosted environment.
- Put TLS termination in front of the frontend and backend.
- Run `prisma migrate deploy` before new application instances serve traffic.
- Monitor `/health` and rotate credentials if exposure is suspected.

## Troubleshooting

- **Backend stops at startup:** check required production variables and ensure `JWT_SECRET` is not a placeholder.
- **Migration job fails:** confirm `POSTGRES_PASSWORD` and database values match the generated `DATABASE_URL`; inspect the `migrate` service logs.
- **Browser requests are blocked:** ensure `FRONTEND_URL` exactly matches the frontend origin, including protocol and port.
- **Frontend calls the wrong backend:** set `VITE_API_URL` and restart the frontend container so it regenerates `/config.js`.
- **Assistant uses fallback mode:** this is expected when `OPENAI_API_KEY` is missing, invalid, timed out, or unavailable.

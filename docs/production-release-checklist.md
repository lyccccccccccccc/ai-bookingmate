# Production Release Checklist

Use this checklist when deploying the public portfolio demo. Do not commit real environment files or seed an existing database as part of a release.

## Required Variables

Set these through the deployment environment or an uncommitted production environment file:

```env
POSTGRES_DB="ai_bookingmate"
POSTGRES_USER="your_database_user"
POSTGRES_PASSWORD="use-a-strong-database-password"
JWT_SECRET="use-a-long-random-jwt-secret"
FRONTEND_URL="https://your-frontend.example.com"
VITE_API_URL="https://your-api.example.com"
```

Optional assistant values are `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_MAX_OUTPUT_TOKENS`. Leaving `OPENAI_API_KEY` empty is supported: the assistant uses its grounded retrieval fallback.

## Build And Startup

From the repository root:

```cmd
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
```

The stack starts PostgreSQL with the persistent `postgres_production_data` volume, runs the one-off migration service, then starts the backend and frontend. The migration service uses `npx prisma migrate deploy`; never use `migrate reset` or `db push --force-reset` in production.

To run pending migrations explicitly:

```cmd
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate
```

## Health And Smoke Test

1. Request `GET /health` and confirm `status: "ok"`, `environment: "production"`, and `database: "connected"`.
2. Open `/api/docs` and confirm Swagger loads.
3. Open the frontend and directly refresh a nested route such as `/services`; Nginx should return the React application.
4. Register and log in with a non-production demo account, browse services, and complete a booking flow.
5. Confirm CORS permits only the configured frontend origin.
6. Confirm the production Login page does not advertise password reset. The token flow remains available for development/test verification, but no public email delivery is configured.
7. Verify the assistant works with a configured key or returns the grounded fallback without one.

## Admin Account

Do not run `npm run seed` against an existing production database because it updates demo users, services, and rules.

1. Register the initial account through the application with a strong unique password.
2. In a controlled administrator shell, connect to PostgreSQL:

```cmd
docker compose --env-file .env.production -f docker-compose.production.yml exec postgres sh -lc "psql -U $POSTGRES_USER -d $POSTGRES_DB"
```

3. Promote the registered account, replacing the placeholder email before running it:

```sql
UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'admin@example.com';
```

4. Sign in and confirm access to the admin pages. Keep the SQL session private and remove any temporary maintenance access afterward.

## Backup And Rollback

- Take and verify a PostgreSQL backup before applying migrations.
- Keep the persistent PostgreSQL volume; never use `docker compose down -v`, `docker volume rm`, or `docker volume prune` for a live deployment.
- Roll back application images by redeploying the previous image version. Review a migration's rollback plan before applying it; Prisma migrations are not automatically reversed.
- Monitor backend logs and `/health` after deployment. The Compose backend and frontend use `unless-stopped`; the migration service intentionally does not restart.

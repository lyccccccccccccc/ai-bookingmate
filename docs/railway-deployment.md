# Railway Deployment Guide

This guide deploys AI BookingMate as three Railway services: managed PostgreSQL, Backend, and Frontend. It does not use the local `docker-compose.production.yml` directly. Do not run seed commands, destructive Prisma commands, or reset commands against Railway production data.

## Service Layout

| Service | Railway root directory | Build configuration |
| --- | --- | --- |
| Postgres | Railway managed PostgreSQL | Railway database service |
| Backend | `/backend` | `backend/Dockerfile` and `backend/railway.json` |
| Frontend | `/frontend` | `frontend/Dockerfile` and `frontend/railway.json` |

The backend health check is `/health`. The frontend serves its runtime API configuration from `/config.js`, so changing the public backend URL does not require rebuilding the frontend image.

## Environment Variables

### Backend

Set these in the Backend service Variables tab:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<generate-a-long-random-secret>
JWT_EXPIRES_IN=1d
FRONTEND_URL=https://<frontend-public-domain>
OPENAI_API_KEY=<optional-real-key>
OPENAI_MODEL=gpt-5.6-luna
OPENAI_MAX_OUTPUT_TOKENS=300
```

`DATABASE_URL=${{Postgres.DATABASE_URL}}` is a Railway reference variable. Replace `Postgres` only if the Railway database service has a different name. Do not copy database credentials into Backend variables manually.

Do not set `PORT` unless you have a specific Railway networking reason. Railway injects it, and the backend listens on `0.0.0.0:$PORT`. The assistant timeout is fixed in the backend at 10 seconds; there is no timeout environment variable to configure. When `OPENAI_API_KEY` is empty or an OpenAI request fails, the assistant uses the grounded retrieval fallback.

### Frontend

Set these in the Frontend service Variables tab:

```env
VITE_API_URL=https://<backend-public-domain>
PORT=8080
```

`VITE_API_URL` is the exact runtime variable used by the frontend entrypoint. The Nginx image listens on port `8080`, so `PORT=8080` tells Railway which port to route to. Do not use `localhost` for either public domain.

### PostgreSQL

Add Railway managed PostgreSQL. Railway provides `DATABASE_URL`; reference it from the Backend as shown above. Do not expose the PostgreSQL TCP proxy unless external database access is genuinely needed.

## Dashboard Deployment Steps

1. Sign in to Railway and choose **New Project** then **Empty Project**.
2. Click **New**, choose **Database**, then choose **PostgreSQL**. Keep the service name `Postgres` or update the Backend reference variable to match its actual name.
3. Click **New** and create an empty **Backend** service.
4. In the Backend service, choose **Connect Repo** and select `lyccccccccccccc/ai-bookingmate` on branch `master`.
5. Open Backend **Settings** then **Build**. Set **Root Directory** to `/backend`.
6. Confirm deployment logs say Railway detected `Dockerfile`.
7. In Backend **Variables**, set the Backend matrix values above. Generate a strong `JWT_SECRET` in Railway; never commit it.
8. In Backend **Settings** then **Deploy**, set **Pre-deploy Command** to:

   ```text
   npx prisma migrate deploy
   ```

9. Deploy Backend. The pre-deploy command runs with `DATABASE_URL`; a non-zero migration exit prevents the application deployment from proceeding.
10. In Backend **Networking**, generate a public domain. Verify `https://<backend-domain>/health` and `https://<backend-domain>/api/docs`.
11. Click **New** and create an empty **Frontend** service.
12. Connect the same GitHub repository and branch `master`.
13. Open Frontend **Settings** then **Build**. Set **Root Directory** to `/frontend`.
14. In Frontend **Variables**, set `VITE_API_URL` to the Backend public domain and set `PORT=8080`.
15. Generate the Frontend public domain and load it in a browser.
16. Update Backend `FRONTEND_URL` to the final Frontend public domain, including `https://` and no trailing path.
17. Redeploy Backend so strict production CORS accepts the final Frontend origin.
18. Register the first account through the public Frontend, then promote it using the procedure below.
19. Create the minimum demo data as an admin.
20. Complete the smoke-test checklist before sharing the portfolio URL.

## Initial Admin Procedure

1. Register a normal account through the public frontend with a strong unique password.
2. Open Railway PostgreSQL **Connect** or a Railway shell with database access.
3. Run this one-time SQL statement, replacing only the placeholder email:

```sql
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "email" = '<registered-admin-email>';
```

4. Sign in again and verify the admin navigation appears. Do not add a public admin registration endpoint or hardcode an administrator password.

## Manual Portfolio Demo Data

After signing in as the initial admin, create the following active services through the admin interface:

| Service | Duration | Price | Capacity guidance |
| --- | ---: | ---: | --- |
| Adult Private Tennis Lesson | 60 minutes | A$80.00 | private slots: 1 |
| Junior Private Tennis Lesson | 60 minutes | A$70.00 | private slots: 1 |
| Adult Group Tennis Session | 90 minutes | A$45.00 | group slots: 6 |
| Junior Group Tennis Session | 75 minutes | A$35.00 | group slots: 6 |

Create upcoming slots for each service, including at least one capacity-1 private slot and one capacity-6 group slot. Add a small set of polished rules, such as cancellation notice, late arrival, weather, and group-session participation policies. Do not run `npm run seed` against Railway production because it updates demo users, services, and rules.

## Smoke Test

- Backend deployment logs show `npx prisma migrate deploy` succeeded before the app started.
- `GET /health` returns `status: "ok"`, `environment: "production"`, and `database: "connected"`.
- `/api/docs` loads.
- Frontend loads and direct refresh works for `/`, `/login`, `/register`, `/services`, `/assistant`, `/dashboard`, `/my-bookings`, and admin routes. Nginx uses SPA fallback routing.
- Register, login, service browsing, a capacity-1 booking, a group booking, cancellation, and admin service/time-slot management work.
- The production Login page does not show **Forgot password?**. The backend also never returns development reset tokens or URLs in production.
- OpenAI answers when configured, and returns the grounded retrieval fallback when not configured.

## Expected Logs And Common Failures

- **Dockerfile not detected:** confirm the service root directory is exactly `/backend` or `/frontend`, and `Dockerfile` remains in that directory.
- **Pre-deploy migration fails:** inspect Backend deployment logs and confirm `DATABASE_URL=${{Postgres.DATABASE_URL}}` references the correct database service. Do not use `migrate dev`, `db push`, or reset commands.
- **Backend health check fails:** verify `NODE_ENV`, `JWT_SECRET`, `FRONTEND_URL`, and `DATABASE_URL`; check the Backend Logs tab for validation or Prisma errors.
- **Browser sees CORS errors:** set Backend `FRONTEND_URL` to the exact Frontend `https://` domain and redeploy Backend.
- **Frontend calls the wrong API:** set Frontend `VITE_API_URL` to the public Backend domain and redeploy Frontend. The entrypoint rewrites `/config.js` at runtime.
- **Railway shows 502 for Frontend:** verify `PORT=8080` is configured for the Frontend service.

Use each service's **Deployments** tab for build and runtime logs. Use **Redeploy** after variable changes or to return to a previous known-good image.

## Migration Safety And Rollback

- The Backend `railway.json` config sets `npx prisma migrate deploy` as a pre-deploy command. Railway does not proceed to the new application deployment if it fails.
- Take and verify a Railway PostgreSQL backup before schema changes. Never run `prisma migrate reset`, `prisma db push --force-reset`, `docker compose down -v`, or volume-pruning commands against production.
- To roll back application code, use Railway **Deployments** to redeploy the prior successful Backend or Frontend image. Database migrations require an explicit reviewed rollback plan; they are not automatically reversed.
- Future Git pushes to `master` can trigger Railway deployments. Review the resulting deployment logs and smoke-test the affected service after every production change.

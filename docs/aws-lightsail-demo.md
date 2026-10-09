# Existing Lightsail demo deployment

Target: Ubuntu 24.04, ai-bookingmate-demo, Sydney, 3.104.7.211.
No new AWS resources, domain purchase, Railway migration, or Railway removal.
This guide is prepared configuration; it is not evidence of a completed deployment.

## Before changes

Connect only after verifying the SSH host fingerprint through Lightsail browser SSH.
Check server git status and preserve uncommitted files. Fetch and inspect this branch
before switching; never reset the working tree. Keep the Compose project name and
project directory unchanged so the existing database volume is reused.

```sh
cd /home/ubuntu/ai-bookingmate
sudo docker compose --env-file .env.aws -f docker-compose.production.yml ps -a
sudo ss -lntp
sudo systemctl is-enabled docker
sudo systemctl status caddy --no-pager
```

Do not print `.env.aws` or expanded `docker compose config`: both may reveal secrets.

## Backup first

Run in Bash before changing configuration or initializing data:

```sh
cd /home/ubuntu/ai-bookingmate
umask 077
backup_dir="$HOME/bookingmate-backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
cp .env.aws docker-compose.production.yml "$backup_dir/"
git rev-parse HEAD > "$backup_dir/git-head.txt"
sudo docker compose --env-file .env.aws -f docker-compose.production.yml images -q > "$backup_dir/image-ids.txt"
if sudo test -f /etc/caddy/Caddyfile; then
  sudo cp /etc/caddy/Caddyfile "$backup_dir/Caddyfile"
  sudo chmod 600 "$backup_dir/Caddyfile"
fi
sudo docker compose --env-file .env.aws -f docker-compose.production.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_dir/database.dump"
test -s "$backup_dir/database.dump"
sudo docker compose --env-file .env.aws -f docker-compose.production.yml exec -T postgres \
  pg_restore --list < "$backup_dir/database.dump" > "$backup_dir/database-list.txt"
```

Keep backups outside the repository. Never delete or recreate the database volume.

## HTTPS and runtime configuration

Install Caddy using its official Ubuntu package instructions:
https://caddyserver.com/docs/install#debian-ubuntu-raspbian
No load balancer is needed. Verify DNS and inbound TCP 80/443 before requesting a certificate.
Validate `docs/aws/Caddyfile` with `caddy validate --config docs/aws/Caddyfile --adapter caddyfile`,
then install it at `/etc/caddy/Caddyfile` and enable the Caddy systemd service.
If a Caddy configuration already exists, preserve other sites and merge this site block.

Edit only these two entries in the existing `.env.aws`:

```env
FRONTEND_URL=https://bookingmate.3-104-7-211.sslip.io
VITE_API_URL=https://bookingmate.3-104-7-211.sslip.io/api
```

Preserve POSTGRES_PASSWORD, JWT_SECRET, all other secrets, and the existing volume.
The frontend writes `/config.js` at startup, so changing the URL needs container
recreation, not an image rebuild. Authentication uses a Bearer JWT in Authorization.
The proxy strips `/api` because NestJS routes are `/auth`, `/services`, etc.
Swagger is consequently available at `/api/api/docs`; health at `/health` or `/api/health`.
Nginx handles SPA deep links. Caddy supplies automatic HTTPS and HTTP redirection.

With the same Compose project and existing built images:

```sh
sudo docker compose --env-file .env.aws -f docker-compose.production.yml up -d --no-build --no-deps backend frontend
sudo systemctl enable --now docker caddy
sudo systemctl reload caddy
```

This recreates only frontend/backend. It does not run migrations or restart PostgreSQL.
If the server code or schema differs, review the mismatch before deploying an old image;
record its Git revision and selectively rebuild only the affected service if necessary.

## Demo initialization

Do not run the existing `npm run seed` unchanged. It sets a published fixed password,
updates existing users and services, archives matching development services, and creates
August 2026 time slots, which are already past. Back up and inspect the AWS database first.
Use an additive initialization procedure with fictional `.example` accounts, unique
random passwords stored only in a permission-600 file outside the repo, and future slots.
Existing user passwords, roles, bookings, services and rules must remain untouched.
Use explicit timezone offsets and verify displayed dates; Sydney and Brisbane offsets
can differ during daylight saving. Keep administration credentials private.

## Acceptance checks

- HTTPS certificate valid and HTTP redirects to HTTPS.
- `/`, `/login`, `/services`, `/dashboard` deep-link refresh returns the SPA.
- `/health` reports database connected; `/api/health` reaches the same API.
- `/config.js` contains the HTTPS API URL, with no secrets.
- Register/login, customer admin-denial, admin authorization, available future slots,
  booking creation, cancellation and capacity restoration.
- Browser console/network has no mixed-content or CORS errors.
- With empty OPENAI_API_KEY, verify an assistant response explicitly reports fallback;
  do not report real-model success without a real API response.
- `docker ps` and `ss` show loopback-only 3000, 8080 and 5433; inspect IPv6 too.
  Test direct-port access from outside the server.
- Docker and Caddy enabled, services use unless-stopped. A controlled server reboot
  followed by health/HTTPS checks verifies actual reboot recovery.
- Review logs with secret/token redaction before sharing output.

## Rollback

Restore the saved `.env.aws`, Compose and Caddy configuration; validate Caddy and
recreate only the affected application containers with the previously recorded images.
Ensure recorded image IDs are assigned to the service image references before recreation;
restoring Compose alone does not restore an overwritten image tag.
Keep the same Compose project and database volume. Never use `down -v` or prune volumes.
Application rollback does not reverse migrations or demo writes. If database restoration
is necessary, stop application writes, inspect the backup and arrange a separate reviewed
restore; do not overwrite a database that has new bookings without reconciliation.

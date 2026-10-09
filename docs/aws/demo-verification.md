# AWS Lightsail demo verification — 2026-10-09

URL: https://bookingmate.3-104-7-211.sslip.io

Existing Ubuntu Lightsail instance and Compose images reused, with no image rebuild,
new AWS resources, Railway changes, database migration from Railway, or volume deletion.
The original database password and JWT secret were compared with the pre-change backup
and confirmed unchanged, without printing either value.

## Completed

- Verified SSH host fingerprint against the instance browser terminal.
- Verified GitHub authenticated identity, repository read and push permissions.
- Existing server working tree was clean before switching the independent branch.
- Configuration and PostgreSQL custom-format backup created and archive listing checked.
- Caddy configured with Let's Encrypt HTTPS and HTTP 308 redirection.
- Certificate hostname verified; expiry 2027-01-07 UTC.
- Public HTTPS frontend and `/dashboard` returned 200 without disabling certificate checks.
- Runtime `/config.js` uses the HTTPS same-origin `/api` URL.
- Backend health reports production and database connected.
- Backend/frontend/PostgreSQL bind only to 127.0.0.1 on 3000/8080/5433;
  external connections to those ports timed out.
- Additive fictional administrator/customer accounts, two services, fourteen future
  time slots and a cancellation business rule initialized.
- API registration defaults to CUSTOMER; demo account login, anonymous denial,
  customer admin-denial and administrator permission checks passed.
- Booking creation, cancellation ownership checks, cancellation and restored
  availability passed. Verification records remain as fictional users/cancelled bookings.
- Future slot conversion checked: 2026-10-10 01:00 UTC is 11:00 Brisbane and 12:00 Sydney.
- Correct CORS origin returned for authenticated API requests.
- Assistant cancellation question returned `retrieval_fallback`; no real model call verified.
- Backend recent logs showed no ERROR/WARN matches. Caddy obtained the certificate;
  its OCSP warning indicates the issuer certificate has no OCSP server.
- An actual server reboot completed; Docker, Caddy, database and application containers
  recovered automatically. Health and the API smoke suite passed again after reboot.

## Private artifacts

- Configuration and database backup: `/home/ubuntu/bookingmate-backups/pre-https/`.
- Demo credentials: `/home/ubuntu/bookingmate-demo-credentials.json`, owner ubuntu, mode 600.
- Retrieve credentials in a private SSH terminal only; never publish admin passwords.

## Remaining verification

The browser automation kernel failed to start due to the desktop sandbox helper error.
Browser rendering, interactive forms, localStorage JWT behavior, console/network absence
of mixed content/CORS errors, and timezone labels therefore require manual verification.
HTTP/API tests and source inspection do not substitute for those browser checks.
Real OpenAI integration was subsequently verified as described below.
No complete database restore was exercised; archive readability was checked with pg_restore.

Follow `docs/aws-lightsail-demo.md` for repeat deployment, backups and rollback. The
pre-change Git revision is stored in the backup. Current image IDs were retained because
this deployment did not rebuild images. Application rollback preserves the database volume;
restoring the pre-initialization database requires a separate reviewed restore procedure.

## Real AI activation — subsequent verification on 2026-10-09

- Existing authorized Railway backend key was retrieved privately and authenticated
  against the OpenAI model-list API. No key or authentication token was printed.
- Local environment files also contained nonempty keys; their validity was not tested
  because the authenticated Railway key was reused.
- Railway configured model variable is `gpt-5-mini`; this variable alone is not evidence
  of its effective runtime model. Its assistant endpoint returned mode `openai` during
  one live check, confirming a real response rather than the deterministic fallback.
- AWS `.env.aws` was backed up to `/home/ubuntu/bookingmate-backups/pre-ai/.env.aws`.
  Only OPENAI_API_KEY changed; all other lines, including model and existing secrets,
  were verified unchanged. Temporary transfer files were removed.
- Backend was recreated from its existing image without rebuilding or restarting
  the database. Direct Responses API verification returned actual model `gpt-5.6-luna`,
  status `completed`, nonempty output and 10 output tokens.
- A public AWS `/api/assistant/ask` cancellation question returned mode `openai` and
  a nonempty answer with a matched business rule.
- Earlier fallback results above describe the pre-activation state; real-model
  integration is now verified. Browser limitations remain unchanged.

## PR review scope

The records above describe the earlier deployment session, not a new server audit.
The PR review did not connect through SSH, change runtime settings, or rerun database
initialization. It fixes transactional initialization and credential-file failure handling,
adds isolated failure/idempotence tests, and ensures the API verifier attempts to cancel
its booking if the ownership assertion fails. These revisions require an explicit later
server update; they have not been applied by this code-only review.

Review checks passed: five isolated initializer transaction/file-failure/idempotence
tests, three offline verifier cleanup/mode checks, all four existing backend unit-test
suites (12 tests), Compose configuration with placeholder variables, Python/Node syntax,
and Git whitespace checks. The new tests use a transaction test double and mocked HTTP;
they do not establish live PostgreSQL transaction behavior or browser behavior.
Secret-format and forbidden-file scans of the branch history and final diff found no
private keys, API tokens or database backups. Test passwords are fictional fixtures.
The local Docker engine was unavailable, so no new container startup or local Caddy
runtime validation was performed. The unchanged Caddy configuration was reviewed against
the backend routes and its previous successful deployment validation.

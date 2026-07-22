# Day 20: Password Reset

Day 20 adds a secure password recovery flow without sending real email yet.

## Flow

- `POST /auth/forgot-password` always returns the same generic message. This prevents callers from learning whether an email address has an account.
- For an existing account, the backend generates a cryptographically secure random token. Only its SHA-256 hash is stored in PostgreSQL.
- Tokens expire after 30 minutes and can be used once.
- Requesting another reset deletes any earlier unused token for that user.
- `POST /auth/reset-password` hashes the supplied token, atomically claims a valid unused token, updates the bcrypt password hash, and invalidates other unused tokens.

The raw token is returned only when `NODE_ENV` is `development` or `test`. Production responses contain only the generic message. Passwords, token hashes, API keys, JWT secrets, and database URLs are never logged.

## API

`POST /auth/forgot-password`

```json
{ "email": "customer@example.com" }
```

`POST /auth/reset-password`

```json
{
  "token": "raw-reset-token",
  "newPassword": "NewPassword123!"
}
```

## Frontend

- `/forgot-password` submits an email address and shows the generic outcome.
- In development, the page displays the backend-provided local reset link.
- `/reset-password?token=...` accepts a new password and confirmation before calling the reset endpoint.

## Manual Development Test

The production Docker stack may remain running on ports `3000` and `8080`. Its PostgreSQL service exposes `127.0.0.1:5433` only to the Windows host, while Docker services continue to use `postgres:5432` internally.

Start a local development backend with `NODE_ENV=development`, `PORT=3001`, and `FRONTEND_URL=http://localhost:5174`. Start Vite with `VITE_API_URL=http://localhost:3001` on port `5174`.

1. Open `http://localhost:5174/forgot-password` and use a registered email.
2. Open the displayed development reset link.
3. Set a new password, then log in with it.
4. Reuse the same link to confirm it returns a safe invalid-or-expired-token message.

## Production Note

Production intentionally does not return a reset token or URL, even when the production PostgreSQL database is reachable from the local host. A future email provider must deliver the generated reset URL before this flow is used for real customers.

## Acceptance Criteria

- Raw reset tokens are never stored in the database.
- Reset tokens expire in 30 minutes and are single-use.
- Unknown emails receive the same public response as known emails.
- Development/test can manually use a reset link; production cannot expose it.
- Passwords remain bcrypt hashes.

# Day 3 Authentication

Day 3 adds backend authentication for AI BookingMate. The backend now supports registering a user, logging in, reading the current authenticated user, and protecting an admin-only route.

## What Authentication Means

Authentication answers the question: "Who is making this request?"

For AI BookingMate, a customer or admin sends an email and password. If the credentials are valid, the backend returns a JWT access token. The client can then send that token with future requests.

## Why Passwords Are Hashed

Passwords should never be stored as plain text. If a database is ever exposed, plain-text passwords would immediately put users at risk.

The backend uses `bcryptjs` to hash passwords before saving them. During login, the backend compares the submitted password with the stored hash. The original password is never stored and cannot be returned by the API.

## How JWT Works

JWT stands for JSON Web Token. After register or login, the backend signs a token that includes:

- `sub`: the user's id
- `email`: the user's email address
- `role`: the user's role

Protected routes expect the token in the `Authorization` header:

```text
Authorization: Bearer <accessToken>
```

If the token is valid and not expired, the request is allowed through the JWT guard.

## Role-Based Access Control

Role-based access control answers the question: "Is this authenticated user allowed to do this?"

AI BookingMate currently has two roles:

- `CUSTOMER`
- `ADMIN`

The `@Roles()` decorator marks routes that require a specific role. The `RolesGuard` checks the authenticated user's role before allowing access.

## Manual Testing

Start the backend from normal Windows CMD:

```cmd
cd /d D:\ai-bookingmate\backend
npm run start:dev
```

Register a customer:

```cmd
curl -X POST http://localhost:3000/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"customer@example.com\",\"password\":\"Password123!\",\"name\":\"Test Customer\"}"
```

Login:

```cmd
curl -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"customer@example.com\",\"password\":\"Password123!\"}"
```

Copy the returned `accessToken`, then test the current user endpoint:

```cmd
curl http://localhost:3000/auth/me ^
  -H "Authorization: Bearer <accessToken>"
```

Test the admin-only endpoint with a customer token:

```cmd
curl http://localhost:3000/auth/admin-check ^
  -H "Authorization: Bearer <accessToken>"
```

A customer token should be rejected. An admin token should return:

```json
{
  "message": "Admin access granted"
}
```

For local admin testing, update a user's role to `ADMIN` in Prisma Studio:

```cmd
cd /d D:\ai-bookingmate\backend
npm run prisma:studio
```

## Acceptance Criteria

- Register creates a new customer with a hashed password.
- Register returns a safe user object and access token.
- Login validates credentials and returns a safe user object and access token.
- Invalid login attempts return `UnauthorizedException`.
- API responses never include `passwordHash`.
- `GET /auth/me` requires a valid JWT.
- `GET /auth/admin-check` requires a valid JWT and the `ADMIN` role.
- DTO validation rejects invalid request bodies.
- The backend builds successfully.

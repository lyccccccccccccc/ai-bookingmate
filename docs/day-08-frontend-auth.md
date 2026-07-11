# Day 8 Frontend Authentication

Day 8 adds frontend authentication pages and JWT-based session handling for AI BookingMate.

## What Frontend Authentication Does

The frontend now lets users register, log in, stay logged in after refresh, view a protected dashboard, and log out.

The frontend talks to the NestJS backend at:

```text
http://localhost:3000
```

The Vite frontend runs at:

```text
http://localhost:5173
```

## How JWT Is Stored

After login or registration, the backend returns an `accessToken`. The frontend stores that token in `localStorage` using this key:

```text
accessToken
```

The token is then attached to API requests as:

```text
Authorization: Bearer <accessToken>
```

For this beginner-friendly version, localStorage keeps the implementation easy to understand. A production app would need a deeper security review before choosing token storage.

## How AuthContext Works

`AuthContext` stores:

- the current user
- the access token
- loading state
- `login`
- `register`
- `logout`
- `loadCurrentUser`

When the app loads, `AuthContext` checks localStorage. If an access token exists, it calls `GET /auth/me`. If that request works, the user is restored. If it fails, the token is removed and the user is logged out.

## How ProtectedRoute Works

`ProtectedRoute` guards `/dashboard`.

- If auth is still loading, it shows a loading message.
- If there is no authenticated user, it redirects to `/login`.
- If the user is authenticated, it renders the protected page.

## How The Frontend Talks To The Backend

The API client uses axios and reads the backend URL from:

```text
VITE_API_BASE_URL
```

Local frontend env files use:

```text
VITE_API_BASE_URL=http://localhost:3000
```

The backend also allows CORS from:

```text
http://localhost:5173
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home page |
| `/login` | Login page |
| `/register` | Register page |
| `/dashboard` | Protected dashboard |

## Manual Testing

Start the backend:

```cmd
cd /d D:\ai-bookingmate\backend
npm run start:dev
```

Start the frontend:

```cmd
cd /d D:\ai-bookingmate\frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

Test login with the seeded customer:

```text
email: customer.seed@example.com
password: Password123!
```

Test login with the seeded admin:

```text
email: admin@example.com
password: Password123!
```

Dashboard checks:

- Customer can view dashboard.
- Customer admin check should show an error.
- Admin admin check should show `Admin access granted`.
- Refreshing the page should keep the user logged in.
- Logout should clear the session.

## Acceptance Criteria

- Frontend can register a new user.
- Frontend can log in an existing user.
- JWT is stored in localStorage as `accessToken`.
- Axios attaches the token automatically.
- App reload calls `GET /auth/me` to restore the session.
- Invalid or expired token clears the session.
- `/dashboard` redirects unauthenticated users to `/login`.
- Dashboard shows current user's name, email, and role.
- Admin check button calls `GET /auth/admin-check`.
- Backend allows CORS for the Vite frontend.
- Frontend and backend builds pass.

# Day 11 Admin Booking Management

Day 11 adds a frontend admin page for reviewing and updating customer bookings.

## What Admin Booking Management Does

Admins can open `/admin/bookings` to see all bookings from the backend. The page supports filtering by booking status and lets admins confirm or cancel bookings.

Each booking card shows:

- booking id
- customer name
- customer email
- service name
- booking status
- booking date and time
- notes when present

## Why Admin Routes Need Role Protection

Booking management changes customer appointments, so it should not be available to normal customer accounts.

The backend already protects admin booking endpoints with JWT auth and role-based access control. The frontend now also hides admin navigation from non-admin users and blocks the admin page with a role-aware route guard.

## How AdminRoute Works

`AdminRoute` uses the existing `AuthContext`.

- If auth is loading, it shows a loading state.
- If no user is logged in, it redirects to `/login`.
- If the user is not an admin, it shows an access denied page.
- If the user is an admin, it renders the admin page.

The backend remains the final source of truth for authorization.

## How Admin Confirms Bookings

For `PENDING` bookings, the admin page shows a `Confirm` button.

Clicking it calls:

```text
PATCH /bookings/:id/status
```

with:

```json
{
  "status": "CONFIRMED"
}
```

After success, the page refreshes the booking list.

## How Admin Cancels Bookings

For `PENDING` and `CONFIRMED` bookings, the admin page shows a `Cancel` button.

Clicking it calls:

```text
PATCH /bookings/:id/status
```

with:

```json
{
  "status": "CANCELLED"
}
```

After success, the page refreshes the booking list. Cancelled bookings show no action buttons.

## Frontend API Calls

The admin booking helper lives in:

```text
frontend/src/api/adminBookingsApi.ts
```

It wraps:

- `GET /bookings`
- `PATCH /bookings/:id/status`

The existing axios `apiClient` attaches the JWT Bearer token from localStorage.

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

Login as admin:

```text
admin@example.com / Password123!
```

Open:

```text
http://localhost:5173/admin/bookings
```

Test:

- Admin Bookings link appears for the admin user.
- Customer users do not see the Admin Bookings link.
- Customer users cannot view `/admin/bookings`.
- Admin can see all bookings.
- Status filter works for `ALL`, `PENDING`, `CONFIRMED`, and `CANCELLED`.
- Pending bookings can be confirmed.
- Pending and confirmed bookings can be cancelled.
- Cancelled bookings show no action buttons.
- Success and error messages display clearly.

## Acceptance Criteria

- `AdminRoute` protects admin frontend routes.
- `/admin/bookings` route exists.
- Admin Bookings nav link appears only for admin users.
- Admin bookings page loads bookings from `GET /bookings`.
- Status filter refetches bookings with the selected status.
- Admin can confirm pending bookings.
- Admin can cancel pending or confirmed bookings.
- Cancelled bookings have no action buttons.
- Non-admin users cannot use the admin booking page.
- Frontend and backend builds pass.

# Day 10 Frontend Bookings

Day 10 adds frontend booking creation and a customer-facing My Bookings page.

## What The Booking Flow Does

Customers can now browse services, choose an available time slot, and create a booking from the frontend.

On the service detail page:

- logged-out users see `Log in to book`
- logged-in users see `Book this time`
- successful booking redirects to `/my-bookings`

## How The Frontend Calls POST /bookings

The frontend uses `frontend/src/api/bookingsApi.ts` and the existing axios `apiClient`.

Creating a booking calls:

```text
POST /bookings
```

with:

```json
{
  "timeSlotId": "...",
  "notes": "Booked from frontend"
}
```

The `apiClient` automatically attaches the JWT from localStorage as a Bearer token.

## Why The Backend Changes TimeSlot Status

The frontend never manually changes a time slot from `AVAILABLE` to `BOOKED`.

That rule belongs on the backend because the backend owns the transaction that:

1. checks the slot is still available
2. updates the slot to `BOOKED`
3. creates the booking

This keeps double-booking prevention reliable.

## How My Bookings Works

The `/my-bookings` page is protected by `ProtectedRoute`.

It calls:

```text
GET /bookings/my
```

and displays:

- service name
- booking status
- notes
- date
- start and end time
- created date

## How Cancellation Works

Bookings that are not already cancelled show a `Cancel Booking` button.

Clicking it calls:

```text
PATCH /bookings/:id/cancel
```

After cancellation succeeds, the page refreshes the booking list.

The backend changes the related time slot back to `AVAILABLE` when appropriate.

## Double-Booking Errors

If booking creation returns `409 Conflict`, the frontend shows:

```text
This time slot has already been booked. Please choose another time.
```

It also refreshes the available time slot list so the user sees the latest availability.

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
http://localhost:5173/services
```

Test:

- logged-out users see `Log in to book`
- clicking `Log in to book` opens `/login`
- logged-in users see `Book this time`
- clicking `Book this time` creates a booking
- successful booking redirects to `/my-bookings`
- the booking appears with status, service, notes, date, and time
- cancelling a booking updates it to `CANCELLED`
- cancelled bookings no longer show the cancel button
- the slot appears again on the service detail page after cancellation
- trying to book the same slot from two sessions shows a friendly conflict message

## Acceptance Criteria

- `bookingsApi.ts` wraps create, list, and cancel booking calls.
- `/my-bookings` route exists and is protected.
- NavBar shows `My Bookings` only for logged-in users.
- Logged-out users cannot create bookings from service detail.
- Logged-in users can create a booking from an available time slot.
- Frontend does not manually update time slot status.
- Successful booking redirects to `/my-bookings`.
- My Bookings page supports loading, error, and empty states.
- Users can cancel their own non-cancelled bookings.
- Booking conflict errors are shown clearly.
- Frontend and backend builds pass.

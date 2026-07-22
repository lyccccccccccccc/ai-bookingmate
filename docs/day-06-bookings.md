# Day 6 Bookings API

Day 6 adds the backend API for creating and managing customer bookings.

## What A Booking Represents

A `Booking` is a customer's request to reserve one available time slot for one service. It stores the customer, service, time slot, status, optional notes, and timestamps.

## How Booking Connects User, Service, And TimeSlot

Each booking links three important records:

- `User`: the authenticated customer making the booking
- `Service`: the bookable service being reserved
- `TimeSlot`: the exact date and time window being reserved

This makes it easy to answer questions such as "who booked this?", "what service did they book?", and "when is the appointment?"

## Capacity-Based Availability

Day 19 supersedes the original single-booking status design. Creating a booking does not mark the slot `BOOKED`; active `PENDING` and `CONFIRMED` bookings are counted against the slot capacity instead. A capacity-one private slot behaves as before, while a group slot can accept multiple customers.

## Why A Transaction Is Used

Booking creation now performs these related checks and changes:

1. A transaction advisory lock serializes capacity operations for the time slot.
2. The backend checks blocked status, active capacity, and any duplicate active booking by the customer.
3. A booking record is created only when a place remains.

A transaction keeps those changes together. If one step fails, the other step is not left half-finished.

## Double-Booking Prevention

If two requests try to book the same slot at the same time, the transaction advisory lock makes their capacity checks run one at a time. Requests beyond capacity receive `409 Conflict`.

## Customer Endpoints

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/bookings` | Authenticated user | Create a booking |
| `GET` | `/bookings/my` | Authenticated user | List current user's bookings |
| `PATCH` | `/bookings/:id/cancel` | Authenticated user | Cancel current user's own booking |

## Admin Endpoints

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/bookings` | Admin only | List all bookings with optional filters |
| `PATCH` | `/bookings/:id/status` | Admin only | Set booking status to `CONFIRMED` or `CANCELLED` |

Admin `GET /bookings` supports these optional query parameters:

- `status`
- `serviceId`
- `customerId`

Responses never include `passwordHash`.

## Manual Testing

Start the backend from normal Windows CMD:

```cmd
cd /d D:\ai-bookingmate\backend
npm run start:dev
```

Login as a customer and copy the returned `accessToken`:

```cmd
curl -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"customer@example.com\",\"password\":\"Password123!\"}"
```

Create a booking:

```cmd
curl -X POST http://localhost:3000/bookings ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <customerAccessToken>" ^
  -d "{\"timeSlotId\":\"<availableTimeSlotId>\",\"notes\":\"First visit\"}"
```

List your bookings:

```cmd
curl http://localhost:3000/bookings/my ^
  -H "Authorization: Bearer <customerAccessToken>"
```

Cancel your booking:

```cmd
curl -X PATCH http://localhost:3000/bookings/<bookingId>/cancel ^
  -H "Authorization: Bearer <customerAccessToken>"
```

Login as an admin and copy the returned `accessToken`:

```cmd
curl -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"Password123!\"}"
```

List all bookings as admin:

```cmd
curl http://localhost:3000/bookings ^
  -H "Authorization: Bearer <adminAccessToken>"
```

Filter admin bookings:

```cmd
curl "http://localhost:3000/bookings?status=PENDING&serviceId=<serviceId>" ^
  -H "Authorization: Bearer <adminAccessToken>"
```

Confirm a booking:

```cmd
curl -X PATCH http://localhost:3000/bookings/<bookingId>/status ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"status\":\"CONFIRMED\"}"
```

Cancel a booking as admin:

```cmd
curl -X PATCH http://localhost:3000/bookings/<bookingId>/status ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"status\":\"CANCELLED\"}"
```

Try setting `PENDING` manually:

```cmd
curl -X PATCH http://localhost:3000/bookings/<bookingId>/status ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"status\":\"PENDING\"}"
```

That request should fail validation.

## Acceptance Criteria

- Authenticated users can create bookings for available time slots.
- Booking a missing time slot returns `404 NotFoundException`.
- Booking a blocked or booked time slot returns `409 Conflict`.
- Creating a booking marks the time slot as `BOOKED`.
- Double booking is prevented with a conditional `updateMany`.
- Authenticated users can list their own bookings.
- Authenticated users can cancel only their own bookings.
- Cancelling a booking sets its time slot back to `AVAILABLE` when currently `BOOKED`.
- Admin users can list bookings with optional filters.
- Admin users can update booking status to `CONFIRMED` or `CANCELLED`.
- Admin status updates never allow manually setting `PENDING`.
- API responses never include `passwordHash`.
- The backend builds successfully.

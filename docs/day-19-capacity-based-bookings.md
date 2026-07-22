# Day 19: Capacity-Based Bookings

Day 19 lets a single time slot accept more than one customer. Private lessons keep the default capacity of one, while group lesson slots can use a higher capacity such as eight.

## Schema Change

`TimeSlot` now has a required integer `capacity` field with a default of `1`. The migration adds a PostgreSQL check constraint so capacity cannot be lower than one.

The migration also changes legacy `BOOKED` time slots back to `AVAILABLE`. This is safe because active bookings now determine whether a slot is full. A legacy slot with one active booking and capacity one has zero remaining places, so it is not returned by the public availability endpoint.

## Capacity Rules

- `PENDING` and `CONFIRMED` bookings count as active bookings.
- `CANCELLED` bookings remain in history but do not count toward capacity.
- A customer may have only one active booking for the same time slot.
- A customer may book the same time slot again after their earlier booking is cancelled.
- `remainingSpots` is `capacity - activeBookingCount` and never drops below zero.
- A slot is full when `remainingSpots` is zero.
- `BLOCKED` slots cannot be booked even when they have remaining places.

`TimeSlotStatus.BOOKED` remains in the enum for migration compatibility, but it is no longer used to represent full capacity. `AVAILABLE` means the slot is not blocked; availability for booking also requires remaining places.

## API Behavior

Time-slot responses now include:

```json
{
  "capacity": 6,
  "activeBookingCount": 2,
  "remainingSpots": 4,
  "isFull": false
}
```

Admin endpoints:

- `POST /time-slots` accepts optional `capacity` (default `1`).
- `PATCH /time-slots/:id/capacity` updates capacity.
- Capacity updates return `409 Conflict` when the requested value is below the active booking count.

Public `GET /services/:serviceId/time-slots` returns only unblocked slots that have at least one remaining place. Admin `GET /time-slots` shows all matching slots, including full slots and their counts.

## Concurrency Strategy

Booking creation, cancellation, time-slot blocking, and capacity updates run in serializable Prisma transactions. Each operation acquires a PostgreSQL transaction advisory lock derived from the time-slot id before reading or changing capacity-related data.

The lock serializes competing operations for the same slot. The transaction then checks the current active count, checks for an existing active booking for the customer, and creates the booking only when a place remains. This prevents concurrent requests from exceeding capacity without trusting frontend state.

## Admin Workflow

Admins set capacity when creating a slot and can update it later. The admin time-slot page displays capacity, booked places, and remaining places. An attempted reduction below active bookings shows the backend validation message and leaves the slot unchanged.

## Customer Workflow

Customers see the remaining places next to each bookable slot. A full slot is not returned as public availability. The booking page also defensively disables its action when a response identifies a full slot, and it refreshes availability after a capacity conflict.

## Seed Data

Private, junior, and adult lesson slots seed with capacity `1`. Small Group Tennis Class slots seed with capacity `8`.

## Test Coverage

The isolated E2E suite covers:

- capacity-one private slots rejecting a second customer
- capacity-three slots accepting three customers and rejecting a fourth
- duplicate active bookings by one customer
- cancellation restoring a place and allowing rebooking
- cancelled bookings not consuming capacity
- blocked slots rejecting bookings
- capacity reductions below active booking count
- public capacity response values
- concurrent booking attempts not exceeding capacity

## Migration And Rollback

Apply the migration with:

```cmd
cd backend
npx prisma migrate deploy
```

For local development, use `npx prisma migrate dev`. Do not run destructive reset commands against production. A rollback should be planned as a new forward migration: preserve booking history, ensure no capacity above one is still in use, then restore legacy status semantics only if the old application version must be deployed. Do not manually alter production booking rows to simulate a rollback.

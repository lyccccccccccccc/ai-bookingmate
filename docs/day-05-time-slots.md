# Day 5 Time Slots API

Day 5 adds the backend API for managing bookable time slots for services.

## What A TimeSlot Represents

A `TimeSlot` is a specific window of time when a service can be booked. For example, a 60-minute consultation service might have a time slot from `2026-07-11T09:00:00.000Z` to `2026-07-11T10:00:00.000Z`.

## Why Time Slots Belong To A Service

Different services can have different durations, prices, and availability. Linking each time slot to one service lets the backend answer questions like:

- Which appointment times are available for this service?
- Which admin-created slots belong to this service?
- Is a requested slot valid for the selected service?

## Time Slot Statuses

- `AVAILABLE`: customers can book this slot.
- `BOOKED`: a future booking flow will mark this slot as booked.
- `BLOCKED`: admins can reserve or hide this slot so customers cannot book it.

## Why Day 5 Does Not Manually Set BOOKED

Day 5 only manages availability. The API allows admins to switch slots between `AVAILABLE` and `BLOCKED`.

The `BOOKED` status should be controlled by the booking workflow later, because booking a slot also needs to create a booking record and connect it to a customer.

## Overlap Detection

The API prevents overlapping time slots for the same service.

An existing slot overlaps a new slot when:

```text
existing.startAt < newEndAt AND existing.endAt > newStartAt
```

This catches partial overlaps, full overlaps, and duplicate time ranges. Back-to-back slots are still allowed, such as `09:00-10:00` and `10:00-11:00`.

## Endpoints

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/services/:serviceId/time-slots` | Public | List available time slots for an active service |
| `POST` | `/time-slots` | Admin only | Create a time slot |
| `GET` | `/time-slots` | Admin only | List all time slots with optional filters |
| `PATCH` | `/time-slots/:id/status` | Admin only | Change status to `AVAILABLE` or `BLOCKED` |

Admin `GET /time-slots` supports these optional query parameters:

- `serviceId`
- `status`

Responses do not include booking data.

## Manual Testing

Start the backend from normal Windows CMD:

```cmd
cd /d D:\ai-bookingmate\backend
npm run start:dev
```

Login as an admin and copy the returned `accessToken`:

```cmd
curl -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"Password123!\"}"
```

Create a time slot for an active service:

```cmd
curl -X POST http://localhost:3000/time-slots ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"serviceId\":\"<serviceId>\",\"startAt\":\"2026-07-11T09:00:00.000Z\",\"endAt\":\"2026-07-11T10:00:00.000Z\"}"
```

List public available slots for a service:

```cmd
curl http://localhost:3000/services/<serviceId>/time-slots
```

List all admin slots:

```cmd
curl http://localhost:3000/time-slots ^
  -H "Authorization: Bearer <adminAccessToken>"
```

Filter admin slots by service and status:

```cmd
curl "http://localhost:3000/time-slots?serviceId=<serviceId>&status=AVAILABLE" ^
  -H "Authorization: Bearer <adminAccessToken>"
```

Block a slot:

```cmd
curl -X PATCH http://localhost:3000/time-slots/<timeSlotId>/status ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"status\":\"BLOCKED\"}"
```

Make a blocked slot available again:

```cmd
curl -X PATCH http://localhost:3000/time-slots/<timeSlotId>/status ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"status\":\"AVAILABLE\"}"
```

Try setting `BOOKED` manually:

```cmd
curl -X PATCH http://localhost:3000/time-slots/<timeSlotId>/status ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"status\":\"BOOKED\"}"
```

That request should fail validation.

Try creating an overlapping slot:

```cmd
curl -X POST http://localhost:3000/time-slots ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"serviceId\":\"<serviceId>\",\"startAt\":\"2026-07-11T09:30:00.000Z\",\"endAt\":\"2026-07-11T10:30:00.000Z\"}"
```

That request should return `409 Conflict`.

## Acceptance Criteria

- Admin users can create time slots for active services.
- Missing or inactive services return `404 NotFoundException`.
- `endAt` must be after `startAt`.
- Overlapping time slots for the same service are rejected.
- Public users can list only `AVAILABLE` slots for an active service.
- Admin users can list all slots with optional `serviceId` and `status` filters.
- Admin users can change status to `AVAILABLE` or `BLOCKED`.
- Admin users cannot manually set `BOOKED` in Day 5.
- Customer users cannot create or update time slots.
- Responses do not include booking data.
- The backend builds successfully.

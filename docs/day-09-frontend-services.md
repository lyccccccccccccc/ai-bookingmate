# Day 9 Frontend Services Browsing

Day 9 adds public frontend pages for browsing services and viewing available time slots.

## What The Services Page Does

The `/services` page loads active services from the backend:

```text
GET /services
```

It shows loading, error, and empty states. When services are available, each service card shows:

- name
- description
- duration
- price
- a link to view available times

## What The Service Detail Page Does

The `/services/:serviceId` page loads:

```text
GET /services/:id
GET /services/:serviceId/time-slots
```

It shows service details and available time slots. Each time slot displays:

- local date
- start time
- end time
- status
- a disabled placeholder button

## How The Frontend Calls Backend APIs

The frontend uses the existing axios `apiClient`, which reads:

```text
VITE_API_BASE_URL=http://localhost:3000
```

The `frontend/src/api/servicesApi.ts` helper wraps the service and time slot endpoints so pages stay beginner-friendly and easy to read.

## Why Booking Is Deferred To Day 10

Day 9 only lets users browse. The time slot cards include a disabled button that says:

```text
Booking coming in Day 10
```

No frontend code calls `POST /bookings` yet. Booking needs its own UI flow, success states, conflict handling, and customer booking list.

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

- Services link appears in the nav for logged-out users.
- Services link appears in the nav for logged-in users.
- `/services` shows seeded active services.
- Clicking `View available times` opens `/services/:serviceId`.
- Service detail page shows service name, description, duration, and price.
- Available time slots are shown with readable local date and time.
- Time slot button is disabled and says `Booking coming in Day 10`.
- No booking is created from the frontend.

## Acceptance Criteria

- `/services` route exists.
- `/services/:serviceId` route exists.
- NavBar includes a public Services link.
- Services page loads from `GET /services`.
- Service detail page loads from `GET /services/:id`.
- Available slots load from `GET /services/:serviceId/time-slots`.
- Loading, error, and empty states exist.
- Price is formatted from cents into dollars.
- Time slots show readable local date and time.
- Booking button is only a placeholder.
- Frontend and backend builds pass.

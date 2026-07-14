# Day 12: Admin Services and Time Slots UI

Day 12 adds frontend admin pages for managing the services customers can book and the time slots attached to those services.

## What Admin Service Management Does

The admin services page is available at:

```text
/admin/services
```

Admins can:

- View active services.
- Create a new service.
- Edit a service name, description, duration, and price.
- Deactivate a service with a soft delete.

Deactivate calls the backend `DELETE /services/:id` endpoint. The service stays in the database, but `isActive` becomes `false`, so customers no longer see it in public service browsing.

## What Admin Time Slot Management Does

The admin time slots page is available at:

```text
/admin/time-slots
```

Admins can:

- View all time slots.
- Filter by service.
- Filter by status: `AVAILABLE`, `BOOKED`, or `BLOCKED`.
- Create new available or blocked slots.
- Block an available slot.
- Unblock a blocked slot.

Time slots belong to services because a customer books a specific service at a specific time. This keeps availability tied to the thing being booked.

## Why These Pages Are Admin-Only

Service setup and availability management affect what every customer can book. These pages are wrapped in `AdminRoute`, which checks the logged-in user's role before rendering the page.

The backend still protects the real API endpoints with JWT and role-based access control. The frontend route guard improves the user experience, but backend authorization is the security boundary.

## Why BOOKED Is Not Manually Set

The admin time slot UI does not allow manually setting a slot to `BOOKED`.

`BOOKED` is controlled by the booking flow. When a customer books an available slot, the backend transaction changes the slot from `AVAILABLE` to `BOOKED`. This keeps double-booking prevention in one place.

Admins can only switch slots between:

- `AVAILABLE`
- `BLOCKED`

## Manual Testing Steps

Start the backend and frontend in separate terminals:

```cmd
cd backend
npm run start:dev
```

```cmd
cd frontend
npm run dev
```

Log in as the seeded admin:

```text
admin@example.com
Password123!
```

Test services:

1. Open `http://localhost:5173/admin/services`.
2. Create a new service.
3. Edit the service.
4. Deactivate the service.
5. Confirm the deactivated service no longer appears on `/services`.

Test time slots:

1. Open `http://localhost:5173/admin/time-slots`.
2. Create a time slot for an active service.
3. Try creating an overlapping slot and confirm the friendly overlap message appears.
4. Block an available slot.
5. Confirm the blocked slot no longer appears on the public service detail page.
6. Unblock the slot.
7. Confirm it appears publicly again.

Test access control:

1. Log in as a customer.
2. Try opening `/admin/services` or `/admin/time-slots`.
3. Confirm access is denied.

## Day 12 Acceptance Criteria

- Admin users can manage services from the frontend.
- Admin users can create, block, and unblock time slots from the frontend.
- Admin users can filter time slots by service and status.
- Customers cannot access admin management pages.
- The UI does not allow manually setting `BOOKED`.
- Frontend and backend builds pass.

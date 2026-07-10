# Day 4 Services API

Day 4 adds the backend API for managing bookable services in AI BookingMate.

## What The Service Entity Represents

A `Service` is something a customer can book. Examples could include a haircut, consultation, massage, lesson, or repair appointment.

Each service stores:

- `name`: the customer-facing service name
- `description`: optional extra detail
- `durationMinutes`: how long the service takes
- `priceCents`: optional price stored in cents
- `isActive`: whether the service should be shown to customers

## Why Service Management Is Admin-Only

Customers should be able to view available services, but they should not be able to create, edit, or remove them. Service management changes the business offering, so those actions are restricted to authenticated users with the `ADMIN` role.

## Why Delete Uses Soft Delete

The API does not physically delete service records. Instead, `DELETE /services/:id` sets `isActive` to `false`.

This is useful because old services may already be linked to bookings or reports. Soft delete keeps historical data intact while hiding inactive services from public customer-facing reads.

## Endpoints

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/services` | Public | List active services |
| `GET` | `/services/:id` | Public | Get one active service |
| `POST` | `/services` | Admin only | Create a service |
| `PATCH` | `/services/:id` | Admin only | Update a service |
| `DELETE` | `/services/:id` | Admin only | Soft delete a service |

Public responses include only service fields. They do not include related bookings or time slots.

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

Create a service:

```cmd
curl -X POST http://localhost:3000/services ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"name\":\"Initial Consultation\",\"description\":\"A first appointment\",\"durationMinutes\":60,\"priceCents\":9900}"
```

List active services:

```cmd
curl http://localhost:3000/services
```

Get one active service:

```cmd
curl http://localhost:3000/services/<serviceId>
```

Update a service:

```cmd
curl -X PATCH http://localhost:3000/services/<serviceId> ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <adminAccessToken>" ^
  -d "{\"priceCents\":10900}"
```

Soft delete a service:

```cmd
curl -X DELETE http://localhost:3000/services/<serviceId> ^
  -H "Authorization: Bearer <adminAccessToken>"
```

Try creating a service with a customer token:

```cmd
curl -X POST http://localhost:3000/services ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <customerAccessToken>" ^
  -d "{\"name\":\"Customer Should Fail\",\"durationMinutes\":30}"
```

The customer request should return `403 Forbidden`.

## Acceptance Criteria

- Public users can list active services.
- Public users can view one active service by id.
- Admin users can create services.
- Admin users can update services.
- Admin users can soft delete services by setting `isActive` to `false`.
- Customer users cannot create, update, or delete services.
- Invalid request bodies are rejected by DTO validation.
- Service responses do not include bookings or time slots.
- The backend builds successfully.

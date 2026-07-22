import type { INestApplication } from '@nestjs/common';
import { BookingStatus, Role, TimeSlotStatus } from '@prisma/client';
import request from 'supertest';
import { bearer, createAuthenticatedUser } from './helpers/auth-helper';
import { createTestApp } from './helpers/test-app';
import { clearTestDatabase } from './helpers/test-database';

describe('Bookings (e2e)', () => {
  let app: INestApplication;
  let testApp: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
  });

  beforeEach(() => clearTestDatabase(testApp.prisma));
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createServiceAndSlot(
    adminToken: string,
    capacity = 1,
    startAt = '2027-02-10T09:00:00.000Z',
  ) {
    const service = await request(app.getHttpServer())
      .post('/services')
      .set(bearer(adminToken))
      .send({ name: 'Booking Service', durationMinutes: 60, priceCents: 8000 })
      .expect(201);

    const start = new Date(startAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const slot = await request(app.getHttpServer())
      .post('/time-slots')
      .set(bearer(adminToken))
      .send({
        serviceId: service.body.id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        capacity,
      })
      .expect(201);

    return { service: service.body, slot: slot.body };
  }

  function createBooking(customerToken: string, timeSlotId: string) {
    return request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(customerToken))
      .send({ timeSlotId, notes: 'Integration test booking' });
  }

  it('keeps private capacity-one slots limited to one active customer', async () => {
    const admin = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.ADMIN,
      'admin-private-capacity',
    );
    const firstCustomer = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.CUSTOMER,
      'customer-private-one',
    );
    const secondCustomer = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.CUSTOMER,
      'customer-private-two',
    );
    const { service, slot } = await createServiceAndSlot(admin.token);

    await createBooking(firstCustomer.token, slot.id).expect(201);
    await createBooking(secondCustomer.token, slot.id).expect(409);

    const publicSlots = await request(app.getHttpServer())
      .get(`/services/${service.id}/time-slots`)
      .expect(200);
    expect(publicSlots.body).toEqual([]);

    const adminSlots = await request(app.getHttpServer())
      .get('/time-slots')
      .set(bearer(admin.token))
      .expect(200);
    expect(adminSlots.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: slot.id,
          status: TimeSlotStatus.AVAILABLE,
          capacity: 1,
          activeBookingCount: 1,
          remainingSpots: 0,
          isFull: true,
        }),
      ]),
    );
  });

  it('accepts three customers in a capacity-three group slot and rejects a fourth', async () => {
    const admin = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.ADMIN,
      'admin-group-capacity',
    );
    const customers = await Promise.all(
      ['one', 'two', 'three', 'four'].map((label) =>
        createAuthenticatedUser(
          app,
          testApp.prisma,
          Role.CUSTOMER,
          `customer-group-${label}`,
        ),
      ),
    );
    const { service, slot } = await createServiceAndSlot(admin.token, 3);

    await createBooking(customers[0].token, slot.id).expect(201);
    await createBooking(customers[1].token, slot.id).expect(201);
    await createBooking(customers[2].token, slot.id).expect(201);
    await createBooking(customers[3].token, slot.id).expect(409);

    const publicSlots = await request(app.getHttpServer())
      .get(`/services/${service.id}/time-slots`)
      .expect(200);
    expect(publicSlots.body).toEqual([]);
  });

  it('prevents a customer from duplicate-booking an active group slot', async () => {
    const admin = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.ADMIN,
      'admin-duplicate-customer',
    );
    const customer = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.CUSTOMER,
      'customer-duplicate-customer',
    );
    const { slot } = await createServiceAndSlot(admin.token, 3);

    await createBooking(customer.token, slot.id).expect(201);
    const duplicate = await createBooking(customer.token, slot.id).expect(409);
    expect(duplicate.body.message).toContain('already have an active booking');
  });

  it('frees a place after cancellation and does not count cancelled bookings', async () => {
    const admin = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.ADMIN,
      'admin-cancel-capacity',
    );
    const customer = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.CUSTOMER,
      'customer-cancel-capacity',
    );
    const { service, slot } = await createServiceAndSlot(admin.token);
    const booking = await createBooking(customer.token, slot.id).expect(201);

    const cancelResponse = await request(app.getHttpServer())
      .patch(`/bookings/${booking.body.id}/cancel`)
      .set(bearer(customer.token))
      .expect(200);
    expect(cancelResponse.body.status).toBe(BookingStatus.CANCELLED);

    const publicSlots = await request(app.getHttpServer())
      .get(`/services/${service.id}/time-slots`)
      .expect(200);
    expect(publicSlots.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: slot.id,
          activeBookingCount: 0,
          remainingSpots: 1,
          isFull: false,
        }),
      ]),
    );

    await createBooking(customer.token, slot.id).expect(201);
  });

  it('rejects blocked slots regardless of remaining capacity', async () => {
    const admin = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.ADMIN,
      'admin-blocked-capacity',
    );
    const customer = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.CUSTOMER,
      'customer-blocked-capacity',
    );
    const { slot } = await createServiceAndSlot(admin.token, 3);

    await request(app.getHttpServer())
      .patch(`/time-slots/${slot.id}/status`)
      .set(bearer(admin.token))
      .send({ status: TimeSlotStatus.BLOCKED })
      .expect(200);

    await createBooking(customer.token, slot.id).expect(409);
  });

  it('does not allow capacity to be reduced below active bookings', async () => {
    const admin = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.ADMIN,
      'admin-capacity-update',
    );
    const customers = await Promise.all(
      ['one', 'two'].map((label) =>
        createAuthenticatedUser(
          app,
          testApp.prisma,
          Role.CUSTOMER,
          `customer-capacity-update-${label}`,
        ),
      ),
    );
    const { slot } = await createServiceAndSlot(admin.token, 3);

    await createBooking(customers[0].token, slot.id).expect(201);
    await createBooking(customers[1].token, slot.id).expect(201);

    await request(app.getHttpServer())
      .patch(`/time-slots/${slot.id}/capacity`)
      .set(bearer(admin.token))
      .send({ capacity: 1 })
      .expect(409);

    const response = await request(app.getHttpServer())
      .patch(`/time-slots/${slot.id}/capacity`)
      .set(bearer(admin.token))
      .send({ capacity: 4 })
      .expect(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        capacity: 4,
        activeBookingCount: 2,
        remainingSpots: 2,
      }),
    );
  });

  it('does not overbook concurrent requests beyond capacity', async () => {
    const admin = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.ADMIN,
      'admin-concurrent',
    );
    const customers = await Promise.all(
      ['one', 'two', 'three', 'four', 'five'].map((label) =>
        createAuthenticatedUser(
          app,
          testApp.prisma,
          Role.CUSTOMER,
          `customer-concurrent-${label}`,
        ),
      ),
    );
    const { slot } = await createServiceAndSlot(admin.token, 3);

    const responses = await Promise.all(
      customers.map((customer) => createBooking(customer.token, slot.id)),
    );
    const successfulBookings = responses.filter(
      (response) => response.status === 201,
    );
    const rejectedBookings = responses.filter(
      (response) => response.status === 409,
    );

    expect(successfulBookings).toHaveLength(3);
    expect(rejectedBookings).toHaveLength(2);

    const activeBookingCount = await testApp.prisma.booking.count({
      where: {
        timeSlotId: slot.id,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
    });
    expect(activeBookingCount).toBe(3);
  });

  it('keeps customer booking privacy and admin confirmation/cancellation behavior', async () => {
    const admin = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.ADMIN,
      'admin-manage-capacity',
    );
    const firstCustomer = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.CUSTOMER,
      'customer-private-capacity-one',
    );
    const secondCustomer = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.CUSTOMER,
      'customer-private-capacity-two',
    );
    const first = await createServiceAndSlot(admin.token, 2);
    const second = await createServiceAndSlot(
      admin.token,
      1,
      '2027-02-10T11:00:00.000Z',
    );
    const firstBooking = await createBooking(
      firstCustomer.token,
      first.slot.id,
    ).expect(201);
    await createBooking(secondCustomer.token, second.slot.id).expect(201);

    const mine = await request(app.getHttpServer())
      .get('/bookings/my')
      .set(bearer(firstCustomer.token))
      .expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].id).toBe(firstBooking.body.id);

    await request(app.getHttpServer())
      .patch(`/bookings/${firstBooking.body.id}/cancel`)
      .set(bearer(secondCustomer.token))
      .expect(403);

    await request(app.getHttpServer())
      .get('/bookings')
      .set(bearer(firstCustomer.token))
      .expect(403);
    const confirmResponse = await request(app.getHttpServer())
      .patch(`/bookings/${firstBooking.body.id}/status`)
      .set(bearer(admin.token))
      .send({ status: BookingStatus.CONFIRMED })
      .expect(200);
    expect(confirmResponse.body.status).toBe(BookingStatus.CONFIRMED);
  });
});

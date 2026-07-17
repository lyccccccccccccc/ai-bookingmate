import type { INestApplication } from '@nestjs/common'
import { BookingStatus, Role, TimeSlotStatus } from '@prisma/client'
import request from 'supertest'
import { bearer, createAuthenticatedUser } from './helpers/auth-helper'
import { createTestApp } from './helpers/test-app'
import { clearTestDatabase } from './helpers/test-database'

describe('Bookings (e2e)', () => {
  let app: INestApplication
  let testApp: Awaited<ReturnType<typeof createTestApp>>

  beforeAll(async () => {
    testApp = await createTestApp()
    app = testApp.app
  })

  beforeEach(() => clearTestDatabase(testApp.prisma))
  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  async function createServiceAndSlot(adminToken: string, startAt = '2027-02-10T09:00:00.000Z') {
    const service = await request(app.getHttpServer())
      .post('/services')
      .set(bearer(adminToken))
      .send({ name: 'Booking Service', durationMinutes: 60, priceCents: 8000 })
      .expect(201)

    const start = new Date(startAt)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const slot = await request(app.getHttpServer())
      .post('/time-slots')
      .set(bearer(adminToken))
      .send({
        serviceId: service.body.id,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      })
      .expect(201)

    return { service: service.body, slot: slot.body }
  }

  function createBooking(customerToken: string, timeSlotId: string) {
    return request(app.getHttpServer())
      .post('/bookings')
      .set(bearer(customerToken))
      .send({ timeSlotId, notes: 'Integration test booking' })
  }

  it('books an AVAILABLE slot, marks it BOOKED, and rejects a duplicate booking', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-booking')
    const customer = await createAuthenticatedUser(app, testApp.prisma, Role.CUSTOMER, 'customer-booking')
    const { slot } = await createServiceAndSlot(admin.token)

    const booking = await createBooking(customer.token, slot.id).expect(201)
    expect(booking.body.status).toBe(BookingStatus.PENDING)

    const savedSlot = await testApp.prisma.timeSlot.findUniqueOrThrow({
      where: { id: slot.id },
    })
    expect(savedSlot.status).toBe(TimeSlotStatus.BOOKED)

    await createBooking(customer.token, slot.id).expect(409)
  })

  it('rejects booking BLOCKED and BOOKED slots', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-unavailable')
    const customer = await createAuthenticatedUser(app, testApp.prisma, Role.CUSTOMER, 'customer-unavailable')
    const blocked = await createServiceAndSlot(admin.token)
    const booked = await createServiceAndSlot(admin.token, '2027-02-10T11:00:00.000Z')

    await testApp.prisma.timeSlot.update({
      where: { id: blocked.slot.id },
      data: { status: TimeSlotStatus.BLOCKED },
    })
    await testApp.prisma.timeSlot.update({
      where: { id: booked.slot.id },
      data: { status: TimeSlotStatus.BOOKED },
    })

    await createBooking(customer.token, blocked.slot.id).expect(409)
    await createBooking(customer.token, booked.slot.id).expect(409)
  })

  it('returns only the current customer bookings and prevents cancelling another customer booking', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-private')
    const firstCustomer = await createAuthenticatedUser(app, testApp.prisma, Role.CUSTOMER, 'first-customer')
    const secondCustomer = await createAuthenticatedUser(app, testApp.prisma, Role.CUSTOMER, 'second-customer')
    const first = await createServiceAndSlot(admin.token)
    const second = await createServiceAndSlot(admin.token, '2027-02-10T11:00:00.000Z')
    const firstBooking = await createBooking(firstCustomer.token, first.slot.id).expect(201)
    await createBooking(secondCustomer.token, second.slot.id).expect(201)

    const mine = await request(app.getHttpServer())
      .get('/bookings/my')
      .set(bearer(firstCustomer.token))
      .expect(200)

    expect(mine.body).toHaveLength(1)
    expect(mine.body[0].id).toBe(firstBooking.body.id)
    await request(app.getHttpServer())
      .patch(`/bookings/${firstBooking.body.id}/cancel`)
      .set(bearer(secondCustomer.token))
      .expect(403)
  })

  it('allows a customer cancellation and restores the time slot', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-cancel')
    const customer = await createAuthenticatedUser(app, testApp.prisma, Role.CUSTOMER, 'customer-cancel')
    const { slot } = await createServiceAndSlot(admin.token)
    const booking = await createBooking(customer.token, slot.id).expect(201)

    const cancelResponse = await request(app.getHttpServer())
      .patch(`/bookings/${booking.body.id}/cancel`)
      .set(bearer(customer.token))
      .expect(200)

    expect(cancelResponse.body).toEqual(
      expect.objectContaining({
        id: booking.body.id,
        status: BookingStatus.CANCELLED,
        timeSlot: expect.objectContaining({ status: TimeSlotStatus.AVAILABLE }),
      }),
    )

    const savedSlot = await testApp.prisma.timeSlot.findUniqueOrThrow({
      where: { id: slot.id },
    })
    expect(savedSlot.status).toBe(TimeSlotStatus.AVAILABLE)
  })

  it('allows an admin to list, confirm, and cancel bookings, while rejecting unsupported statuses', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-manage')
    const customer = await createAuthenticatedUser(app, testApp.prisma, Role.CUSTOMER, 'customer-manage')
    const { slot } = await createServiceAndSlot(admin.token)
    const booking = await createBooking(customer.token, slot.id).expect(201)

    await request(app.getHttpServer()).get('/bookings').set(bearer(customer.token)).expect(403)
    const listResponse = await request(app.getHttpServer())
      .get('/bookings')
      .set(bearer(admin.token))
      .expect(200)

    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: booking.body.id,
          status: BookingStatus.PENDING,
        }),
      ]),
    )

    const confirmResponse = await request(app.getHttpServer())
      .patch(`/bookings/${booking.body.id}/status`)
      .set(bearer(admin.token))
      .send({ status: BookingStatus.CONFIRMED })
      .expect(200)

    expect(confirmResponse.body).toEqual(
      expect.objectContaining({
        id: booking.body.id,
        status: BookingStatus.CONFIRMED,
      }),
    )
    await request(app.getHttpServer())
      .patch(`/bookings/${booking.body.id}/status`)
      .set(bearer(admin.token))
      .send({ status: 'PENDING' })
      .expect(400)
    const adminCancelResponse = await request(app.getHttpServer())
      .patch(`/bookings/${booking.body.id}/status`)
      .set(bearer(admin.token))
      .send({ status: BookingStatus.CANCELLED })
      .expect(200)

    expect(adminCancelResponse.body).toEqual(
      expect.objectContaining({
        id: booking.body.id,
        status: BookingStatus.CANCELLED,
        timeSlot: expect.objectContaining({ status: TimeSlotStatus.AVAILABLE }),
      }),
    )
  })
})

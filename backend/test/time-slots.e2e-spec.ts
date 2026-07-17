import type { INestApplication } from '@nestjs/common'
import { Role, TimeSlotStatus } from '@prisma/client'
import request from 'supertest'
import { bearer, createAuthenticatedUser } from './helpers/auth-helper'
import { createTestApp } from './helpers/test-app'
import { clearTestDatabase } from './helpers/test-database'

describe('Time slots (e2e)', () => {
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

  async function createService(token: string) {
    const response = await request(app.getHttpServer())
      .post('/services')
      .set(bearer(token))
      .send({ name: 'Time Slot Service', durationMinutes: 60, priceCents: 8000 })
      .expect(201)

    return response.body
  }

  async function createSlot(
    token: string,
    serviceId: string,
    startAt = '2027-01-10T09:00:00.000Z',
    endAt = '2027-01-10T10:00:00.000Z',
    status: TimeSlotStatus = TimeSlotStatus.AVAILABLE,
  ) {
    const response = await request(app.getHttpServer())
      .post('/time-slots')
      .set(bearer(token))
      .send({ serviceId, startAt, endAt, status })
      .expect(201)

    return response.body
  }

  it('allows an admin to create an AVAILABLE slot and exposes it publicly', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-slots')
    const service = await createService(admin.token)
    const slot = await createSlot(admin.token, service.id)

    const response = await request(app.getHttpServer())
      .get(`/services/${service.id}/time-slots`)
      .expect(200)

    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: slot.id, status: 'AVAILABLE' })]),
    )
  })

  it('rejects overlapping slots', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-overlap')
    const service = await createService(admin.token)
    await createSlot(admin.token, service.id)

    await request(app.getHttpServer())
      .post('/time-slots')
      .set(bearer(admin.token))
      .send({
        serviceId: service.id,
        startAt: '2027-01-10T09:30:00.000Z',
        endAt: '2027-01-10T10:30:00.000Z',
      })
      .expect(409)
  })

  it('prevents customers from creating or modifying slots', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-guard')
    const customer = await createAuthenticatedUser(app, testApp.prisma, Role.CUSTOMER, 'customer-slots')
    const service = await createService(admin.token)
    const slot = await createSlot(admin.token, service.id)

    await request(app.getHttpServer())
      .post('/time-slots')
      .set(bearer(customer.token))
      .send({
        serviceId: service.id,
        startAt: '2027-01-11T09:00:00.000Z',
        endAt: '2027-01-11T10:00:00.000Z',
      })
      .expect(403)
    await request(app.getHttpServer())
      .patch(`/time-slots/${slot.id}/status`)
      .set(bearer(customer.token))
      .send({ status: 'BLOCKED' })
      .expect(403)
  })

  it('hides BLOCKED and BOOKED slots from public availability', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-status')
    const service = await createService(admin.token)
    const availableSlot = await createSlot(admin.token, service.id)
    const blockedSlot = await createSlot(
      admin.token,
      service.id,
      '2027-01-10T11:00:00.000Z',
      '2027-01-10T12:00:00.000Z',
      TimeSlotStatus.BLOCKED,
    )
    const bookedSlot = await createSlot(
      admin.token,
      service.id,
      '2027-01-10T13:00:00.000Z',
      '2027-01-10T14:00:00.000Z',
    )
    await testApp.prisma.timeSlot.update({
      where: { id: bookedSlot.id },
      data: { status: TimeSlotStatus.BOOKED },
    })

    const response = await request(app.getHttpServer())
      .get(`/services/${service.id}/time-slots`)
      .expect(200)

    expect(response.body).toEqual([expect.objectContaining({ id: availableSlot.id })])
    expect(response.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: blockedSlot.id }),
        expect.objectContaining({ id: bookedSlot.id }),
      ]),
    )
  })
})

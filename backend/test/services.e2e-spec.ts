import type { INestApplication } from '@nestjs/common'
import { Role } from '@prisma/client'
import request from 'supertest'
import { bearer, createAuthenticatedUser } from './helpers/auth-helper'
import { createTestApp } from './helpers/test-app'
import { clearTestDatabase } from './helpers/test-database'

describe('Services and roles (e2e)', () => {
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

  async function createService(token: string, isActive = true) {
    const response = await request(app.getHttpServer())
      .post('/services')
      .set(bearer(token))
      .send({
        name: 'Private Tennis Coaching',
        description: 'One-on-one coaching.',
        durationMinutes: 60,
        priceCents: 8000,
        isActive,
      })
      .expect(201)

    return response.body
  }

  it('allows an admin to create a service and lists active services publicly', async () => {
    const admin = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.ADMIN,
      'admin-services',
    )
    const service = await createService(admin.token)

    const response = await request(app.getHttpServer()).get('/services').expect(200)

    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: service.id, isActive: true })]),
    )
  })

  it('prevents a customer from creating, updating, or deleting services', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin')
    const customer = await createAuthenticatedUser(
      app,
      testApp.prisma,
      Role.CUSTOMER,
      'customer-services',
    )
    const service = await createService(admin.token)

    await request(app.getHttpServer())
      .post('/services')
      .set(bearer(customer.token))
      .send({ name: 'Blocked', durationMinutes: 30 })
      .expect(403)
    await request(app.getHttpServer())
      .patch(`/services/${service.id}`)
      .set(bearer(customer.token))
      .send({ name: 'Blocked' })
      .expect(403)
    await request(app.getHttpServer())
      .delete(`/services/${service.id}`)
      .set(bearer(customer.token))
      .expect(403)
  })

  it('hides inactive services from public listings and detail lookups', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin')
    const inactiveService = await createService(admin.token, false)

    const list = await request(app.getHttpServer()).get('/services').expect(200)
    expect(list.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: inactiveService.id })]),
    )
    await request(app.getHttpServer()).get(`/services/${inactiveService.id}`).expect(404)
  })

  it('allows an admin-only endpoint for an admin and rejects a customer', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin')
    const customer = await createAuthenticatedUser(app, testApp.prisma, Role.CUSTOMER, 'customer')

    await request(app.getHttpServer())
      .get('/auth/admin-check')
      .set(bearer(admin.token))
      .expect(200)
    await request(app.getHttpServer())
      .get('/auth/admin-check')
      .set(bearer(customer.token))
      .expect(403)
  })
})

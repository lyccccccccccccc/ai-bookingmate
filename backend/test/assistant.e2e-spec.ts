import type { INestApplication } from '@nestjs/common'
import { Role } from '@prisma/client'
import request from 'supertest'
import { bearer, createAuthenticatedUser } from './helpers/auth-helper'
import { createTestApp } from './helpers/test-app'
import { clearTestDatabase } from './helpers/test-database'

describe('Business rules and assistant fallback (e2e)', () => {
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

  async function createRule(token: string) {
    const response = await request(app.getHttpServer())
      .post('/business-rules')
      .set(bearer(token))
      .send({
        title: 'Parking policy',
        category: 'parking',
        content: 'Complimentary parking is available for booked customers.',
      })
      .expect(201)

    return response.body
  }

  it('allows admins to create rules and prevents customers from changing them', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-rules')
    const customer = await createAuthenticatedUser(app, testApp.prisma, Role.CUSTOMER, 'customer-rules')
    const rule = await createRule(admin.token)

    await request(app.getHttpServer())
      .post('/business-rules')
      .set(bearer(customer.token))
      .send({ title: 'Blocked', category: 'blocked', content: 'Blocked.' })
      .expect(403)
    await request(app.getHttpServer())
      .patch(`/business-rules/${rule.id}`)
      .set(bearer(customer.token))
      .send({ content: 'Blocked.' })
      .expect(403)
    await request(app.getHttpServer())
      .delete(`/business-rules/${rule.id}`)
      .set(bearer(customer.token))
      .expect(403)
  })

  it('retrieves active business rules and uses safe fallback mode without OpenAI', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-assistant')
    const rule = await createRule(admin.token)

    const response = await request(app.getHttpServer())
      .post('/assistant/ask')
      .send({ question: 'Do you offer complimentary parking?' })
      .expect(201)

    expect(response.body).toMatchObject({
      mode: 'retrieval_fallback',
      matchedRules: [expect.objectContaining({ id: rule.id, title: 'Parking policy' })],
    })
    expect(response.body.answer).toContain(
      'Complimentary parking is available for booked customers.',
    )
  })

  it('does not use inactive rules and returns a safe grounded response for unsupported questions', async () => {
    const admin = await createAuthenticatedUser(app, testApp.prisma, Role.ADMIN, 'admin-inactive')
    const rule = await createRule(admin.token)
    await request(app.getHttpServer())
      .delete(`/business-rules/${rule.id}`)
      .set(bearer(admin.token))
      .expect(200)

    const inactiveRuleResponse = await request(app.getHttpServer())
      .post('/assistant/ask')
      .send({ question: 'Do you offer complimentary parking?' })
      .expect(201)
    expect(inactiveRuleResponse.body.matchedRules).toEqual([])
    expect(inactiveRuleResponse.body.answer).toContain(
      'business rules do not specify',
    )

    const unsupportedResponse = await request(app.getHttpServer())
      .post('/assistant/ask')
      .send({ question: 'What is the weather today?' })
      .expect(201)
    expect(unsupportedResponse.body).toMatchObject({
      mode: 'retrieval_fallback',
      confidence: 0,
      matchedRules: [],
      matchedFaq: null,
    })
    expect(unsupportedResponse.body.answer).toContain(
      'business rules do not specify',
    )
  })
})

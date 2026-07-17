import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from './helpers/test-app'
import { clearTestDatabase } from './helpers/test-database'

describe('Authentication (e2e)', () => {
  let app: INestApplication
  let testApp: Awaited<ReturnType<typeof createTestApp>>
  const credentials = {
    email: 'customer@example.com',
    password: 'Password123!',
    name: 'Customer Example',
  }

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

  it('registers a customer without exposing passwordHash', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201)

    expect(response.body.accessToken).toEqual(expect.any(String))
    expect(response.body.user).toMatchObject({
      email: credentials.email,
      name: credentials.name,
      role: 'CUSTOMER',
    })
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  it('logs in with valid credentials and rejects an incorrect password', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(201)

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(201)

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: 'WrongPassword123!' })
      .expect(401)
  })

  it('requires a JWT for /auth/me and returns the authenticated user', async () => {
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201)

    await request(app.getHttpServer()).get('/auth/me').expect(401)

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registration.body.accessToken}`)
      .expect(200)

    expect(response.body).toMatchObject({
      email: credentials.email,
      name: credentials.name,
      role: 'CUSTOMER',
    })
    expect(response.body.passwordHash).toBeUndefined()
  })
})

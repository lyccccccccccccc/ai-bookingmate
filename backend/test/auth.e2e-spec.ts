import type { INestApplication } from '@nestjs/common'
import { createHash } from 'node:crypto'
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
  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })
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

  it('returns the same generic response for known and unknown emails', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(201)

    const knownResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: credentials.email })
      .expect(201)
    const unknownResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'unknown@example.com' })
      .expect(201)

    expect(knownResponse.body.message).toBe(unknownResponse.body.message)
    expect(knownResponse.body.devResetToken).toEqual(expect.any(String))
    expect(unknownResponse.body.devResetToken).toBeUndefined()
  })

  it('stores only a hash for a generated password reset token', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(201)

    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: credentials.email })
      .expect(201)
    const token = response.body.devResetToken as string
    const savedToken = await testApp.prisma.passwordResetToken.findUniqueOrThrow({
      where: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
      },
    })

    expect(savedToken.tokenHash).not.toBe(token)
    expect(savedToken.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('resets a password, rejects a used token, and allows the new password', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(201)
    const forgotResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: credentials.email })
      .expect(201)
    const token = forgotResponse.body.devResetToken as string
    const newPassword = 'NewPassword123!'

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword })
      .expect(201)
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword })
      .expect(400)
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(401)
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: newPassword })
      .expect(201)
  })

  it('rejects expired and invalid reset tokens', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(201)
    const forgotResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: credentials.email })
      .expect(201)
    const token = forgotResponse.body.devResetToken as string

    await testApp.prisma.passwordResetToken.update({
      where: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
      },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'NewPassword123!' })
      .expect(400)
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'not-a-valid-token', newPassword: 'NewPassword123!' })
      .expect(400)
  })

  it('invalidates the previous unused token when a new one is requested', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(201)
    const firstResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: credentials.email })
      .expect(201)
    const secondResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: credentials.email })
      .expect(201)

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: firstResponse.body.devResetToken, newPassword: 'NewPassword123!' })
      .expect(400)
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: secondResponse.body.devResetToken, newPassword: 'NewPassword123!' })
      .expect(201)
  })

  it('does not expose development reset values in production mode', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(201)
    process.env.NODE_ENV = 'production'

    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: credentials.email })
      .expect(201)

    expect(response.body).toEqual({
      message:
        'If an account exists for that email, a password reset link has been generated.',
    })
  })
})

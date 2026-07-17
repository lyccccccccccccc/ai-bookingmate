import type { INestApplication } from '@nestjs/common'
import { Role } from '@prisma/client'
import request from 'supertest'
import type { PrismaService } from '../../src/prisma/prisma.service'

type TestUser = {
  email: string
  password: string
  name: string
}

export async function createAuthenticatedUser(
  app: INestApplication,
  prisma: PrismaService,
  role: Role,
  label: string,
) {
  const user: TestUser = {
    email: `${label}@example.com`,
    password: 'Password123!',
    name: `${label} user`,
  }

  const registration = await request(app.getHttpServer())
    .post('/auth/register')
    .send(user)
    .expect(201)

  if (role === Role.ADMIN) {
    await prisma.user.update({
      where: { id: registration.body.user.id },
      data: { role },
    })
  }

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(201)

  return {
    ...login.body.user,
    token: login.body.accessToken as string,
  }
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` }
}

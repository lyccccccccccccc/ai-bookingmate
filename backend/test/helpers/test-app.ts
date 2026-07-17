import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../src/app.module'
import { PrismaService } from '../../src/prisma/prisma.service'

export type TestApp = {
  app: INestApplication
  prisma: PrismaService
}

export async function createTestApp(): Promise<TestApp> {
  process.env.JWT_SECRET = 'test-jwt-secret'
  process.env.JWT_EXPIRES_IN = '1d'

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()
  const app = moduleRef.createNestApplication()

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  await app.init()

  return {
    app,
    prisma: app.get(PrismaService),
  }
}

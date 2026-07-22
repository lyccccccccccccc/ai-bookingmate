import { config } from 'dotenv'
import { resolve } from 'node:path'
import { PrismaService } from '../../src/prisma/prisma.service'

config({ path: resolve(__dirname, '../../.env'), quiet: true })

// Preserve the development URL before the Jest setup file switches DATABASE_URL
// to the isolated test database.
const developmentDatabaseUrl = process.env.DATABASE_URL

export function getTestDatabaseUrl() {
  const testDatabaseUrl = process.env.DATABASE_URL_TEST

  if (!testDatabaseUrl) {
    throw new Error(
      'DATABASE_URL_TEST is required for e2e tests. Refusing to use DATABASE_URL.',
    )
  }

  let databaseName: string

  try {
    databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, '')
  } catch {
    throw new Error('DATABASE_URL_TEST must be a valid PostgreSQL URL.')
  }

  if (!databaseName.toLowerCase().includes('test')) {
    throw new Error(
      'DATABASE_URL_TEST must point to a database with "test" in its name.',
    )
  }

  if (
    developmentDatabaseUrl &&
    developmentDatabaseUrl === testDatabaseUrl
  ) {
    throw new Error('DATABASE_URL_TEST must not match DATABASE_URL.')
  }

  return testDatabaseUrl
}

export async function clearTestDatabase(prisma: PrismaService) {
  await prisma.booking.deleteMany()
  await prisma.timeSlot.deleteMany()
  await prisma.service.deleteMany()
  await prisma.businessRule.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.user.deleteMany()
}

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, TimeSlotStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed script');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const password = 'Password123!';

async function upsertUser(email: string, name: string, role: Role) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      passwordHash,
    },
    create: {
      email,
      name,
      role,
      passwordHash,
    },
  });
}

async function upsertService(data: {
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
}) {
  const existingService = await prisma.service.findFirst({
    where: { name: data.name },
  });

  if (existingService) {
    return prisma.service.update({
      where: { id: existingService.id },
      data,
    });
  }

  return prisma.service.create({ data });
}

async function upsertTimeSlot(
  serviceId: string,
  startAt: string,
  endAt: string,
) {
  return prisma.timeSlot.upsert({
    where: {
      serviceId_startAt: {
        serviceId,
        startAt: new Date(startAt),
      },
    },
    update: {
      endAt: new Date(endAt),
      status: TimeSlotStatus.AVAILABLE,
    },
    create: {
      serviceId,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      status: TimeSlotStatus.AVAILABLE,
    },
  });
}

async function main() {
  const admin = await upsertUser('admin@example.com', 'Admin User', Role.ADMIN);
  const customer = await upsertUser(
    'customer.seed@example.com',
    'Seed Customer',
    Role.CUSTOMER,
  );

  const privateLesson = await upsertService({
    name: 'Private Tennis Lesson',
    description: 'One-on-one tennis coaching session',
    durationMinutes: 60,
    priceCents: 8000,
    isActive: true,
  });

  const groupLesson = await upsertService({
    name: 'Group Tennis Lesson',
    description: 'Small group coaching session',
    durationMinutes: 90,
    priceCents: 5000,
    isActive: true,
  });

  const timeSlots = [
    await upsertTimeSlot(
      privateLesson.id,
      '2026-08-01T09:00:00.000Z',
      '2026-08-01T10:00:00.000Z',
    ),
    await upsertTimeSlot(
      privateLesson.id,
      '2026-08-01T10:30:00.000Z',
      '2026-08-01T11:30:00.000Z',
    ),
    await upsertTimeSlot(
      groupLesson.id,
      '2026-08-02T09:00:00.000Z',
      '2026-08-02T10:30:00.000Z',
    ),
    await upsertTimeSlot(
      groupLesson.id,
      '2026-08-02T11:00:00.000Z',
      '2026-08-02T12:30:00.000Z',
    ),
  ];

  console.log('Seed completed successfully');
  console.log(`Users ready: ${admin.email}, ${customer.email}`);
  console.log(`Services ready: ${privateLesson.name}, ${groupLesson.name}`);
  console.log(`Time slots ready: ${timeSlots.length}`);
}

main()
  .catch((error) => {
    console.error('Seed failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

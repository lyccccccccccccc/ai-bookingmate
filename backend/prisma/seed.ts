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

async function upsertBusinessRule(data: {
  title: string;
  category: string;
  content: string;
  isActive: boolean;
}) {
  const existingRule = await prisma.businessRule.findFirst({
    where: { title: data.title },
  });

  if (existingRule) {
    return prisma.businessRule.update({
      where: { id: existingRule.id },
      data,
    });
  }

  return prisma.businessRule.create({ data });
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

  const businessRules = await Promise.all([
    upsertBusinessRule({
      title: 'Cancellation policy',
      category: 'cancellation',
      content:
        'Customers can cancel their own booking from the My Bookings page. Cancelling a booking changes the booking status to CANCELLED and makes the related time slot available again.',
      isActive: true,
    }),
    upsertBusinessRule({
      title: 'Refund policy',
      category: 'refunds',
      content:
        'Refund handling is not automated in AI BookingMate. Customers should contact the business directly for refund questions.',
      isActive: true,
    }),
    upsertBusinessRule({
      title: 'Booking login requirement',
      category: 'accounts',
      content:
        'Customers can browse services and available time slots without logging in, but they must log in or register before creating a booking.',
      isActive: true,
    }),
    upsertBusinessRule({
      title: 'Time slot availability rule',
      category: 'availability',
      content:
        'Only AVAILABLE time slots appear on public service pages. BOOKED or BLOCKED time slots are hidden from customers.',
      isActive: true,
    }),
    upsertBusinessRule({
      title: 'Booking confirmation rule',
      category: 'confirmation',
      content:
        'New bookings are created with PENDING status. An admin can confirm a pending booking or cancel it from the admin bookings page.',
      isActive: true,
    }),
    upsertBusinessRule({
      title: 'Late arrival rule',
      category: 'late-arrival',
      content:
        'The current business rules do not define a specific late arrival grace period. Customers should contact the business if they expect to be late.',
      isActive: true,
    }),
    upsertBusinessRule({
      title: 'Pricing and duration rule',
      category: 'pricing',
      content:
        'Each service has its own duration and optional price. Customers should check the service card for the current duration and price before booking.',
      isActive: true,
    }),
  ]);

  console.log('Seed completed successfully');
  console.log(`Users ready: ${admin.email}, ${customer.email}`);
  console.log(`Services ready: ${privateLesson.name}, ${groupLesson.name}`);
  console.log(`Time slots ready: ${timeSlots.length}`);
  console.log(`Business rules ready: ${businessRules.length}`);
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

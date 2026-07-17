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

type ServiceSeedData = {
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
};

async function archiveService(id: string) {
  return prisma.service.update({
    where: { id },
    data: {
      name: `Archived service ${id.slice(-8)}`,
      description: 'Previously offered service.',
      isActive: false,
    },
  });
}

async function ensurePolishedService(
  data: ServiceSeedData,
  legacyNames: string[] = [],
) {
  const matchingServices = await prisma.service.findMany({
    where: { name: { in: [data.name, ...legacyNames] } },
    orderBy: { createdAt: 'asc' },
  });

  const existingService =
    matchingServices.find((service) => service.name === data.name) ??
    matchingServices[0];

  if (!existingService) {
    return prisma.service.create({ data });
  }

  await Promise.all(
    matchingServices
      .filter((service) => service.id !== existingService.id)
      .map((service) => archiveService(service.id)),
  );

  return prisma.service.update({
    where: { id: existingService.id },
    data,
  });
}

async function archiveDevelopmentServices(excludedServiceIds: string[]) {
  const services = await prisma.service.findMany({
    select: { id: true, name: true },
  });
  const developmentNamePattern = /\btest\b|day\s*\d+|testing|booking test/i;
  const developmentServices = services.filter(
    (service) =>
      !excludedServiceIds.includes(service.id) &&
      developmentNamePattern.test(service.name),
  );

  await Promise.all(
    developmentServices.map((service) => archiveService(service.id)),
  );

  return developmentServices.length;
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
  const admin = await upsertUser(
    'admin@example.com',
    'Court Manager',
    Role.ADMIN,
  );
  const customer = await upsertUser(
    'customer.seed@example.com',
    'Jordan Taylor',
    Role.CUSTOMER,
  );

  const privateCoaching = await ensurePolishedService(
    {
      name: 'Private Tennis Coaching',
      description:
        'One-on-one coaching tailored to your level, technique, and match-play goals.',
      durationMinutes: 60,
      priceCents: 8000,
      isActive: true,
    },
    ['Private Tennis Lesson'],
  );

  const juniorLesson = await ensurePolishedService({
    name: 'Junior Private Tennis Lesson',
    description:
      'A personalised junior lesson focused on technique, movement, confidence, and rally skills.',
    durationMinutes: 60,
    priceCents: 7000,
    isActive: true,
  });

  const adultLesson = await ensurePolishedService({
    name: 'Adult Private Tennis Lesson',
    description:
      'Individual coaching for adults covering stroke development, movement, and point construction.',
    durationMinutes: 60,
    priceCents: 8000,
    isActive: true,
  });

  const groupClass = await ensurePolishedService(
    {
      name: 'Small Group Tennis Class',
      description:
        'A structured small-group session combining drills, technique, and point play.',
      durationMinutes: 90,
      priceCents: 5000,
      isActive: true,
    },
    ['Group Tennis Lesson'],
  );

  const archivedDevelopmentServices = await archiveDevelopmentServices([
    privateCoaching.id,
    juniorLesson.id,
    adultLesson.id,
    groupClass.id,
  ]);

  const timeSlots = [
    await upsertTimeSlot(
      privateCoaching.id,
      '2026-08-01T09:00:00.000Z',
      '2026-08-01T10:00:00.000Z',
    ),
    await upsertTimeSlot(
      privateCoaching.id,
      '2026-08-01T10:30:00.000Z',
      '2026-08-01T11:30:00.000Z',
    ),
    await upsertTimeSlot(
      juniorLesson.id,
      '2026-08-01T13:00:00.000Z',
      '2026-08-01T14:00:00.000Z',
    ),
    await upsertTimeSlot(
      juniorLesson.id,
      '2026-08-01T14:30:00.000Z',
      '2026-08-01T15:30:00.000Z',
    ),
    await upsertTimeSlot(
      adultLesson.id,
      '2026-08-02T09:00:00.000Z',
      '2026-08-02T10:00:00.000Z',
    ),
    await upsertTimeSlot(
      adultLesson.id,
      '2026-08-02T10:30:00.000Z',
      '2026-08-02T11:30:00.000Z',
    ),
    await upsertTimeSlot(
      groupClass.id,
      '2026-08-02T13:00:00.000Z',
      '2026-08-02T14:30:00.000Z',
    ),
    await upsertTimeSlot(
      groupClass.id,
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
  console.log(
    `Services ready: ${privateCoaching.name}, ${juniorLesson.name}, ${adultLesson.name}, ${groupClass.name}`,
  );
  console.log(`Time slots ready: ${timeSlots.length}`);
  console.log(`Development services archived: ${archivedDevelopmentServices}`);
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

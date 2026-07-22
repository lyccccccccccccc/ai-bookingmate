import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, Prisma, Role, TimeSlotStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

type AdminBookingFilters = {
  status?: BookingStatus;
  serviceId?: string;
  customerId?: string;
};

const activeBookingWhere = {
  status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
} satisfies Prisma.BookingWhereInput;

const serviceSelect = {
  id: true,
  name: true,
  durationMinutes: true,
  priceCents: true,
} satisfies Prisma.ServiceSelect;

const timeSlotSelect = {
  id: true,
  serviceId: true,
  startAt: true,
  endAt: true,
  status: true,
  capacity: true,
} satisfies Prisma.TimeSlotSelect;

const customerSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
} satisfies Prisma.UserSelect;

const customerBookingSelect = {
  id: true,
  customerId: true,
  serviceId: true,
  timeSlotId: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  service: {
    select: serviceSelect,
  },
  timeSlot: {
    select: timeSlotSelect,
  },
} satisfies Prisma.BookingSelect;

const adminBookingSelect = {
  ...customerBookingSelect,
  customer: {
    select: customerSelect,
  },
} satisfies Prisma.BookingSelect;

@Injectable()
export class BookingsService implements OnModuleDestroy {
  private readonly bookingPool: Pool;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.bookingPool = new Pool({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });
  }

  async createBooking(currentUser: AuthenticatedUser, dto: CreateBookingDto) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const bookingId = await this.createBookingWithCapacityLock(
          currentUser,
          dto,
        );

        return this.findCustomerBookingOrThrow(bookingId);
      } catch (error) {
        if (this.isSerializationFailure(error) && attempt < 3) {
          continue;
        }

        if (this.isSerializationFailure(error)) {
          throw new ConflictException('Time slot is no longer available');
        }

        throw error;
      }
    }

    throw new ConflictException('Time slot is no longer available');
  }

  async onModuleDestroy() {
    await this.bookingPool.end();
  }

  findMyBookings(currentUser: AuthenticatedUser) {
    return this.prisma.booking.findMany({
      where: {
        customerId: currentUser.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: customerBookingSelect,
    });
  }

  async cancelMyBooking(currentUser: AuthenticatedUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        customerId: true,
        timeSlotId: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== currentUser.id) {
      throw new ForbiddenException('You cannot cancel this booking');
    }

    return this.prisma.$transaction(
      async (tx) => {
        await this.lockTimeSlot(tx, booking.timeSlotId);
        const currentBooking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: {
            id: true,
            customerId: true,
            status: true,
          },
        });

        if (!currentBooking) {
          throw new NotFoundException('Booking not found');
        }

        if (currentBooking.customerId !== currentUser.id) {
          throw new ForbiddenException('You cannot cancel this booking');
        }

        if (currentBooking.status !== BookingStatus.CANCELLED) {
          await tx.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.CANCELLED },
          });
        }

        return tx.booking.findUniqueOrThrow({
          where: { id: bookingId },
          select: customerBookingSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  findAllForAdmin(filters: AdminBookingFilters) {
    return this.prisma.booking.findMany({
      where: {
        status: filters.status,
        serviceId: filters.serviceId,
        customerId: filters.customerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: adminBookingSelect,
    });
  }

  async updateStatusForAdmin(bookingId: string, dto: UpdateBookingStatusDto) {
    const booking = await this.findAdminBookingOrThrow(bookingId);

    return this.prisma.$transaction(
      async (tx) => {
        await this.lockTimeSlot(tx, booking.timeSlotId);
        await this.findAdminBookingOrThrow(bookingId, tx);

        return tx.booking.update({
          where: { id: bookingId },
          data: { status: dto.status },
          select: adminBookingSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async createBookingWithCapacityLock(
    currentUser: AuthenticatedUser,
    dto: CreateBookingDto,
  ): Promise<string> {
    const client = await this.bookingPool.connect();
    let transactionStarted = false;

    try {
      await client.query('BEGIN');
      transactionStarted = true;

      // This transaction-scoped lock serializes booking decisions per time slot.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        dto.timeSlotId,
      ]);

      const timeSlotResult = await client.query<{
        serviceId: string;
        status: TimeSlotStatus;
        capacity: number;
        isActive: boolean;
      }>(
        `
          SELECT
            time_slot."serviceId",
            time_slot."status",
            time_slot."capacity",
            service."isActive"
          FROM "TimeSlot" AS time_slot
          INNER JOIN "Service" AS service ON service."id" = time_slot."serviceId"
          WHERE time_slot."id" = $1
        `,
        [dto.timeSlotId],
      );
      const timeSlot = timeSlotResult.rows[0];

      if (!timeSlot || !timeSlot.isActive) {
        throw new NotFoundException('Active service time slot not found');
      }

      if (timeSlot.status !== TimeSlotStatus.AVAILABLE) {
        throw new ConflictException('Time slot is not available');
      }

      const duplicateBookingResult = await client.query(
        `
          SELECT 1
          FROM "Booking"
          WHERE "customerId" = $1
            AND "timeSlotId" = $2
            AND "status" IN ('PENDING', 'CONFIRMED')
          LIMIT 1
        `,
        [currentUser.id, dto.timeSlotId],
      );

      if (duplicateBookingResult.rows.length > 0) {
        throw new ConflictException('You already have an active booking for this time slot');
      }

      const activeBookingCountResult = await client.query<{ count: number }>(
        `
          SELECT COUNT(*)::integer AS "count"
          FROM "Booking"
          WHERE "timeSlotId" = $1
            AND "status" IN ('PENDING', 'CONFIRMED')
        `,
        [dto.timeSlotId],
      );
      const activeBookingCount = activeBookingCountResult.rows[0]?.count ?? 0;

      if (activeBookingCount >= timeSlot.capacity) {
        throw new ConflictException('Time slot is fully booked');
      }

      const bookingId = `c${randomUUID().replaceAll('-', '')}`;
      await client.query(
        `
          INSERT INTO "Booking" (
            "id",
            "customerId",
            "serviceId",
            "timeSlotId",
            "status",
            "notes",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, 'PENDING', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [
          bookingId,
          currentUser.id,
          timeSlot.serviceId,
          dto.timeSlotId,
          dto.notes ?? null,
        ],
      );

      await client.query('COMMIT');
      transactionStarted = false;
      return bookingId;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Preserve the original error if PostgreSQL has already aborted the transaction.
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }

  private async findCustomerBookingOrThrow(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: customerBookingSelect,
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  private async lockTimeSlot(tx: Prisma.TransactionClient, timeSlotId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${timeSlotId}))`;
  }

  private async findAdminBookingOrThrow(
    bookingId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        timeSlotId: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  private isSerializationFailure(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      return true;
    }

    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '40001'
    );
  }
}

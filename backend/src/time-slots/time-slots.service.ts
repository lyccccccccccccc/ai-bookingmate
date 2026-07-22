import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, TimeSlotStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotCapacityDto } from './dto/update-time-slot-capacity.dto';
import { UpdateTimeSlotStatusDto } from './dto/update-time-slot-status.dto';

const activeBookingWhere = {
  status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
} satisfies Prisma.BookingWhereInput;

const timeSlotSelect = {
  id: true,
  serviceId: true,
  startAt: true,
  endAt: true,
  status: true,
  capacity: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      bookings: { where: activeBookingWhere },
    },
  },
} satisfies Prisma.TimeSlotSelect;

const adminTimeSlotSelect = {
  ...timeSlotSelect,
  service: {
    select: {
      id: true,
      name: true,
      durationMinutes: true,
    },
  },
} satisfies Prisma.TimeSlotSelect;

type TimeSlotWithCapacity = Prisma.TimeSlotGetPayload<{
  select: typeof timeSlotSelect;
}>;

type AdminTimeSlotWithCapacity = Prisma.TimeSlotGetPayload<{
  select: typeof adminTimeSlotSelect;
}>;

type AdminTimeSlotFilters = {
  serviceId?: string;
  status?: TimeSlotStatus;
};

@Injectable()
export class TimeSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTimeSlotDto) {
    await this.findActiveServiceOrThrow(dto.serviceId);

    if (dto.status === TimeSlotStatus.BOOKED) {
      throw new BadRequestException(
        'BOOKED is managed by booking capacity and cannot be set manually',
      );
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.validateTimeRange(startAt, endAt);

    const overlappingSlot = await this.prisma.timeSlot.findFirst({
      where: {
        serviceId: dto.serviceId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });

    if (overlappingSlot) {
      throw new ConflictException('Time slot overlaps with an existing slot');
    }

    try {
      const timeSlot = await this.prisma.timeSlot.create({
        data: {
          serviceId: dto.serviceId,
          startAt,
          endAt,
          status: dto.status ?? TimeSlotStatus.AVAILABLE,
          capacity: dto.capacity ?? 1,
        },
        select: timeSlotSelect,
      });

      return this.toCapacityResponse(timeSlot);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'A time slot already exists for this service and start time',
        );
      }

      throw error;
    }
  }

  async findAvailableByService(serviceId: string) {
    await this.findActiveServiceOrThrow(serviceId);

    const timeSlots = await this.prisma.timeSlot.findMany({
      where: {
        serviceId,
        status: TimeSlotStatus.AVAILABLE,
      },
      orderBy: { startAt: 'asc' },
      select: timeSlotSelect,
    });

    return timeSlots
      .map((timeSlot) => this.toCapacityResponse(timeSlot))
      .filter((timeSlot) => !timeSlot.isFull);
  }

  async findAllForAdmin(filters: AdminTimeSlotFilters) {
    const timeSlots = await this.prisma.timeSlot.findMany({
      where: {
        serviceId: filters.serviceId,
        status: filters.status,
      },
      orderBy: { startAt: 'asc' },
      select: adminTimeSlotSelect,
    });

    return timeSlots.map((timeSlot) => this.toCapacityResponse(timeSlot));
  }

  async findOne(id: string) {
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id },
      select: timeSlotSelect,
    });

    if (!timeSlot) {
      throw new NotFoundException('Time slot not found');
    }

    return this.toCapacityResponse(timeSlot);
  }

  async updateStatus(id: string, dto: UpdateTimeSlotStatusDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockTimeSlot(tx, id);
        await this.findTimeSlotOrThrow(tx, id);

        const timeSlot = await tx.timeSlot.update({
          where: { id },
          data: { status: dto.status },
          select: timeSlotSelect,
        });

        return this.toCapacityResponse(timeSlot);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async updateCapacity(id: string, dto: UpdateTimeSlotCapacityDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.lockTimeSlot(tx, id);
        const timeSlot = await this.findTimeSlotOrThrow(tx, id);
        const activeBookingCount = timeSlot._count.bookings;

        if (dto.capacity < activeBookingCount) {
          throw new ConflictException(
            `Capacity cannot be lower than the ${activeBookingCount} active booking${activeBookingCount === 1 ? '' : 's'} already using this slot`,
          );
        }

        const updatedTimeSlot = await tx.timeSlot.update({
          where: { id },
          data: { capacity: dto.capacity },
          select: timeSlotSelect,
        });

        return this.toCapacityResponse(updatedTimeSlot);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async findActiveServiceOrThrow(serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!service || !service.isActive) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  private async lockTimeSlot(tx: Prisma.TransactionClient, timeSlotId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${timeSlotId}))`;
  }

  private async findTimeSlotOrThrow(tx: Prisma.TransactionClient, id: string) {
    const timeSlot = await tx.timeSlot.findUnique({
      where: { id },
      select: timeSlotSelect,
    });

    if (!timeSlot) {
      throw new NotFoundException('Time slot not found');
    }

    return timeSlot;
  }

  private toCapacityResponse(
    timeSlot: TimeSlotWithCapacity | AdminTimeSlotWithCapacity,
  ) {
    const { _count, ...timeSlotData } = timeSlot;
    const activeBookingCount = _count.bookings;
    const remainingSpots = Math.max(
      timeSlotData.capacity - activeBookingCount,
      0,
    );

    return {
      ...timeSlotData,
      activeBookingCount,
      remainingSpots,
      isFull: remainingSpots === 0,
    };
  }

  private validateTimeRange(startAt: Date, endAt: Date) {
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

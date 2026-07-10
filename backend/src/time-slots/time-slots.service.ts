import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TimeSlotStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotStatusDto } from './dto/update-time-slot-status.dto';

const timeSlotSelect = {
  id: true,
  serviceId: true,
  startAt: true,
  endAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
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

type AdminTimeSlotFilters = {
  serviceId?: string;
  status?: TimeSlotStatus;
};

@Injectable()
export class TimeSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTimeSlotDto) {
    await this.findActiveServiceOrThrow(dto.serviceId);

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
      return await this.prisma.timeSlot.create({
        data: {
          serviceId: dto.serviceId,
          startAt,
          endAt,
          status: dto.status ?? TimeSlotStatus.AVAILABLE,
        },
        select: timeSlotSelect,
      });
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

    return this.prisma.timeSlot.findMany({
      where: {
        serviceId,
        status: TimeSlotStatus.AVAILABLE,
      },
      orderBy: { startAt: 'asc' },
      select: timeSlotSelect,
    });
  }

  findAllForAdmin(filters: AdminTimeSlotFilters) {
    return this.prisma.timeSlot.findMany({
      where: {
        serviceId: filters.serviceId,
        status: filters.status,
      },
      orderBy: { startAt: 'asc' },
      select: adminTimeSlotSelect,
    });
  }

  async findOne(id: string) {
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id },
      select: timeSlotSelect,
    });

    if (!timeSlot) {
      throw new NotFoundException('Time slot not found');
    }

    return timeSlot;
  }

  async updateStatus(id: string, dto: UpdateTimeSlotStatusDto) {
    await this.findOne(id);

    return this.prisma.timeSlot.update({
      where: { id },
      data: { status: dto.status },
      select: timeSlotSelect,
    });
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

  private validateTimeRange(startAt: Date, endAt: Date) {
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }
  }

  private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

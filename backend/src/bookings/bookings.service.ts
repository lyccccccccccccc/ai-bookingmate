import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, Role, TimeSlotStatus } from '@prisma/client';
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
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBooking(currentUser: AuthenticatedUser, dto: CreateBookingDto) {
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id: dto.timeSlotId },
      include: {
        service: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!timeSlot) {
      throw new NotFoundException('Time slot not found');
    }

    if (!timeSlot.service.isActive) {
      throw new NotFoundException('Service not found');
    }

    if (timeSlot.status !== TimeSlotStatus.AVAILABLE) {
      throw new ConflictException('Time slot is not available');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTimeSlot = await tx.timeSlot.updateMany({
        where: {
          id: dto.timeSlotId,
          status: TimeSlotStatus.AVAILABLE,
        },
        data: {
          status: TimeSlotStatus.BOOKED,
        },
      });

      if (updatedTimeSlot.count === 0) {
        throw new ConflictException('Time slot is not available');
      }

      return tx.booking.create({
        data: {
          customerId: currentUser.id,
          serviceId: timeSlot.serviceId,
          timeSlotId: dto.timeSlotId,
          notes: dto.notes,
        },
        select: customerBookingSelect,
      });
    });
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
        status: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== currentUser.id) {
      throw new ForbiddenException('You cannot cancel this booking');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return this.findCustomerBookingOrThrow(bookingId);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      await tx.timeSlot.updateMany({
        where: {
          id: booking.timeSlotId,
          status: TimeSlotStatus.BOOKED,
        },
        data: {
          status: TimeSlotStatus.AVAILABLE,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        select: customerBookingSelect,
      });
    });
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

  async updateStatusForAdmin(
    bookingId: string,
    dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.findAdminBookingOrThrow(bookingId);

    if (dto.status === BookingStatus.CONFIRMED) {
      return this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
        select: adminBookingSelect,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      await tx.timeSlot.updateMany({
        where: {
          id: booking.timeSlotId,
          status: TimeSlotStatus.BOOKED,
        },
        data: {
          status: TimeSlotStatus.AVAILABLE,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        select: adminBookingSelect,
      });
    });
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

  private async findAdminBookingOrThrow(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
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
}

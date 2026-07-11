import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingStatus, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

type BookingFilters = {
  status?: BookingStatus;
  serviceId?: string;
  customerId?: string;
};

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking for the current user' })
  @UseGuards(JwtAuthGuard)
  createBooking(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(currentUser, createBookingDto);
  }

  @Get('my')
  @ApiOperation({ summary: "List the current user's bookings" })
  @UseGuards(JwtAuthGuard)
  findMyBookings(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.bookingsService.findMyBookings(currentUser);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: "Cancel the current user's booking" })
  @UseGuards(JwtAuthGuard)
  cancelMyBooking(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.bookingsService.cancelMyBooking(
      currentUser,
      this.getBookingId(id),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all bookings as admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllForAdmin(@Query() filters: BookingFilters) {
    return this.bookingsService.findAllForAdmin(filters);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status as admin' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateStatusForAdmin(
    @Param('id') id: string,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatusForAdmin(
      this.getBookingId(id),
      updateBookingStatusDto,
    );
  }

  private getBookingId(id: string) {
    const bookingId = id?.trim();

    if (!bookingId) {
      throw new BadRequestException('Booking id is required');
    }

    return bookingId;
  }
}

import { BookingStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsIn([BookingStatus.CONFIRMED, BookingStatus.CANCELLED], {
    message: 'status must be CONFIRMED or CANCELLED',
  })
  status: BookingStatus;
}

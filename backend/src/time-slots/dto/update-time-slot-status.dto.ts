import { IsIn } from 'class-validator';
import { TimeSlotStatus } from '@prisma/client';

export class UpdateTimeSlotStatusDto {
  @IsIn([TimeSlotStatus.AVAILABLE, TimeSlotStatus.BLOCKED], {
    message: 'status must be AVAILABLE or BLOCKED',
  })
  status: TimeSlotStatus;
}

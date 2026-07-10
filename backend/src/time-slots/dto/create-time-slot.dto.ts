import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TimeSlotStatus } from '@prisma/client';

export class CreateTimeSlotDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsEnum(TimeSlotStatus)
  status?: TimeSlotStatus;
}

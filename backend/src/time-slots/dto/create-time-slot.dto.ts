import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'Maximum number of active bookings for this time slot.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;
}

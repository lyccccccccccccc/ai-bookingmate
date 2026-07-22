import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTimeSlotCapacityDto {
  @ApiProperty({
    minimum: 1,
    example: 6,
    description: 'Maximum number of active bookings for this time slot.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;
}

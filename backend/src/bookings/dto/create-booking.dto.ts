import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  timeSlotId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

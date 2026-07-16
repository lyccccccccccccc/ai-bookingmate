import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateBusinessRuleDto {
  @ApiPropertyOptional({ example: 'Cancellation policy' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: 'cancellation' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({
    example:
      'Customers can cancel from My Bookings before the appointment starts.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

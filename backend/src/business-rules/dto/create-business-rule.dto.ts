import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBusinessRuleDto {
  @ApiProperty({ example: 'Cancellation policy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'cancellation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category: string;

  @ApiProperty({
    example:
      'Customers can cancel from My Bookings before the appointment starts.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}

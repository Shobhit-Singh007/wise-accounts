import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Invalid phone number format' })
  phone: string;
}

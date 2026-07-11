import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  password: string;
}

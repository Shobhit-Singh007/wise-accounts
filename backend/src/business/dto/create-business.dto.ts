import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusinessDto {
  @ApiProperty({ example: 'My Shop' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '29ABCDE1234F1Z5', required: false })
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'shop@example.com', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '123, Main Street', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Mumbai', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Maharashtra', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ example: '400001', required: false })
  @IsString()
  @IsOptional()
  pincode?: string;
}

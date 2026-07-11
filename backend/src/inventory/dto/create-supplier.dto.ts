import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'ABC Traders' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'abc@traders.com', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '29ABCDE1234F1Z5', required: false })
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;
}

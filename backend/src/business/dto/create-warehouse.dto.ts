import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '456, Industrial Area', required: false })
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
}

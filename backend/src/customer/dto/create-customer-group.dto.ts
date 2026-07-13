import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerGroupDto {
  @ApiProperty({ example: 'Premium Customers' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  discount?: number;
}

export class UpdateCustomerGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discount?: number;
}

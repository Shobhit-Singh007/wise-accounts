import { IsString, IsOptional, IsNumber, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'rahul@example.com', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '29ABCDE1234F1Z5', required: false })
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiProperty({ example: '456, Park Street', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Delhi', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Delhi', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ example: '110001', required: false })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiProperty({ example: 50000, required: false })
  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  openingBalance?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  groupId?: string;
}

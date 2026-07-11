import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class RecordPaymentDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 'Payment for invoice INV-001', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

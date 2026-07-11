import { IsString, IsNumber, IsOptional, IsEnum, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum LedgerEntryType {
  GAVE = 'GAVE',
  RECEIVED = 'RECEIVED',
}

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export class CreateLedgerEntryDto {
  @ApiProperty({ example: 5000, description: 'Transaction amount' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: LedgerEntryType, example: LedgerEntryType.GAVE, description: 'GAVE = You gave to customer (debit), RECEIVED = You got from customer (credit)' })
  @IsEnum(LedgerEntryType)
  type: LedgerEntryType;

  @ApiProperty({ enum: PaymentMode, example: PaymentMode.CASH, required: false })
  @IsEnum(PaymentMode)
  @IsOptional()
  paymentMode?: PaymentMode;

  @ApiProperty({ example: 'Advance for next order', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-07-11', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: 'REF-001', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ example: '/uploads/ledger/image.jpg', required: false, description: 'Path to attached image' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

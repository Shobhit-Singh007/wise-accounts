import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReconciliationEntryDto {
  @ApiProperty({ example: 'payment-uuid' })
  @IsString()
  paymentId: string;

  @ApiProperty({ example: 'invoice-uuid' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiProperty({ example: 5000.00 })
  @IsNumber()
  matchedAmount: number;

  @ApiPropertyOptional({ example: 'Matched by reference number' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReconcilePaymentsDto {
  @ApiProperty({ type: [ReconciliationEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationEntryDto)
  entries: ReconciliationEntryDto[];
}

export class AutoReconcileDto {
  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ example: 0.01, description: 'Maximum amount difference for auto-match' })
  @IsOptional()
  @IsNumber()
  tolerance?: number;
}

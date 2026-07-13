import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RecurringInvoiceItemDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 'Premium Widget' })
  @IsString()
  itemName: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'piece' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 150.00 })
  @IsNumber()
  rate: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  discount?: number;
}

export class CreateRecurringInvoiceDto {
  @ApiPropertyOptional({ example: 'Monthly supply invoice' })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiProperty({ example: 'customer-uuid' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], example: 'MONTHLY' })
  @IsString()
  frequency: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  nextRunDate: string;

  @ApiProperty({ type: [RecurringInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringInvoiceItemDto)
  items: RecurringInvoiceItemDto[];

  @ApiPropertyOptional({ example: 'Recurring supply order' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  discount?: number;
}

export class UpdateRecurringInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextRunDate?: string;

  @ApiPropertyOptional({ type: [RecurringInvoiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringInvoiceItemDto)
  items?: RecurringInvoiceItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discount?: number;
}

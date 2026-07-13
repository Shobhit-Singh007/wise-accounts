import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BulkInvoiceItemDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 'Premium Widget' })
  @IsString()
  itemName: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'piece' })
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

class BulkInvoiceEntryDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @ApiProperty({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ type: [BulkInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkInvoiceItemDto)
  items: BulkInvoiceItemDto[];

  @ApiPropertyOptional({ example: 'Bulk order' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  discount?: number;
}

export class BulkCreateInvoiceDto {
  @ApiProperty({ type: [BulkInvoiceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkInvoiceEntryDto)
  invoices: BulkInvoiceEntryDto[];
}

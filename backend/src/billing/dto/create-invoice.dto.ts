import { IsString, IsOptional, IsArray, IsNumber, IsEnum, Min, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { InvoiceType, InvoiceDirection, DocumentType } from '@prisma/client';

class InvoiceItemDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ example: 'Wheat Flour' })
  @IsString()
  itemName: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 45 })
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiProperty({ example: 5, required: false })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  batchNo?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ required: false, description: 'Custom invoice number (auto-generated if not provided)' })
  @IsString()
  @IsOptional()
  invoiceNo?: string;

  @ApiProperty({ enum: InvoiceType, example: 'B2C' })
  @IsEnum(InvoiceType)
  type: InvoiceType;

  @ApiProperty({ enum: InvoiceDirection, example: 'SALE', default: 'SALE' })
  @IsEnum(InvoiceDirection)
  @IsOptional()
  direction?: InvoiceDirection;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ required: false, description: 'Supplier ID for purchase invoices' })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiProperty({ enum: DocumentType, required: false, default: 'INVOICE', description: 'Document type: INVOICE, QUOTATION, PROFORMA, DELIVERY_CHALLAN, JOBWORK, CREDIT_NOTE, LETTERHEAD' })
  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;
}

import {
  IsArray,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerImportDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  Name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  Phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gstin?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  openingBalance?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  GSTIN?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  Address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  City?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  State?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  Pincode?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  OpeningBalance?: number;

  [key: string]: any;
}

export class ProductImportDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  Name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  SKU?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  hsnCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  HSNCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  Unit?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  sellingPrice?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  SellingPrice?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  PurchasePrice?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  mrp?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  MRP?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  TaxRate?: number;

  [key: string]: any;
}

export class InvoiceItemImportDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  rate?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  taxRate?: number;
}

export class InvoiceImportDto {
  // Simple format fields
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceNo?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemImportDto)
  items?: InvoiceItemImportDto[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  grandTotal?: number;

  // GoGST B2B format fields
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  gstin_of_recipient?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoice_number?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  invoice_date?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  invoice_value?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  place_of_supply?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reverse_charge?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  rate?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  taxable_value?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  cess_amount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  Name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  InvoiceNumber?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  InvoiceDate?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  InvoiceValue?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  PlaceOfSupply?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  Rate?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  TaxableValue?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  CessAmount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerState?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reverseCharge?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  poNo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  challanNo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lrNo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentNote?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  cessTotal?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  totalInWords?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  cgstTotal?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  sgstTotal?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  igstTotal?: number;

  [key: string]: any;
}

export class ImportCustomersDto {
  @ApiProperty({ type: [CustomerImportDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerImportDto)
  records: CustomerImportDto[];
}

export class ImportProductsDto {
  @ApiProperty({ type: [ProductImportDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImportDto)
  records: ProductImportDto[];
}

export class ImportInvoicesDto {
  @ApiProperty({ type: [InvoiceImportDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceImportDto)
  records: InvoiceImportDto[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface CsvParseResult {
  headers: string[];
  rows: any[][];
  totalRows: number;
  detectedType: 'customers' | 'products' | 'invoices' | 'unknown';
}

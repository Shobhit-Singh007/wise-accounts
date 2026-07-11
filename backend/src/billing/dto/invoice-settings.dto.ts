import { IsString, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceSettingsDto {
  @ApiProperty({ description: 'Invoice prefix (e.g., INV-, BILL-)', default: 'INV-' })
  @IsString()
  @IsOptional()
  invoicePrefix?: string;

  @ApiProperty({ description: 'Starting invoice number', default: 1 })
  @IsNumber()
  @IsOptional()
  startingNumber?: number;

  @ApiProperty({ description: 'Default notes for invoices' })
  @IsString()
  @IsOptional()
  defaultNotes?: string;

  @ApiProperty({ description: 'Default terms and conditions' })
  @IsString()
  @IsOptional()
  defaultTerms?: string;

  @ApiProperty({ description: 'Bank name' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({ description: 'Bank account number' })
  @IsString()
  @IsOptional()
  bankAccountNo?: string;

  @ApiProperty({ description: 'Bank IFSC code' })
  @IsString()
  @IsOptional()
  bankIfsc?: string;

  @ApiProperty({ description: 'Bank branch' })
  @IsString()
  @IsOptional()
  bankBranch?: string;

  @ApiProperty({ description: 'UPI ID for QR code' })
  @IsString()
  @IsOptional()
  upiId?: string;

  @ApiProperty({ description: 'Show GSTIN on invoice', default: true })
  @IsBoolean()
  @IsOptional()
  showGstin?: boolean;

  @ApiProperty({ description: 'Show bank details on invoice', default: false })
  @IsBoolean()
  @IsOptional()
  showBankDetails?: boolean;

  @ApiProperty({ description: 'Show QR code on invoice', default: false })
  @IsBoolean()
  @IsOptional()
  showQrCode?: boolean;

  @ApiProperty({ description: 'Signature image URL' })
  @IsString()
  @IsOptional()
  signatureUrl?: string;

  @ApiProperty({ description: 'E-Way Bill API credentials' })
  @IsObject()
  @IsOptional()
  ewayBillApi?: {
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
    environment?: 'sandbox' | 'production';
  };

  @ApiProperty({ description: 'E-Invoice API credentials' })
  @IsObject()
  @IsOptional()
  einvoiceApi?: {
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
    environment?: 'sandbox' | 'production';
  };
}

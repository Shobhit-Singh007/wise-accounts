import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateBothDto {
  @ApiProperty({ description: 'Vehicle Number (required for E-Way Bill)' })
  @IsString()
  vehicleNo: string;

  @ApiProperty({ description: 'Distance in KM' })
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @ApiProperty({ description: 'Transporter GSTIN or PAN' })
  @IsString()
  @IsOptional()
  transporterId?: string;

  @ApiProperty({ description: 'Transporter Name' })
  @IsString()
  @IsOptional()
  transporterName?: string;

  @ApiProperty({ description: 'Supply Type', default: 'Outward' })
  @IsString()
  @IsOptional()
  supplyType?: string;

  @ApiProperty({ description: 'Document Type', default: 'Tax Invoice' })
  @ApiProperty({ description: 'Document Type', default: 'Tax Invoice' })
  @IsString()
  @IsOptional()
  docType?: string;

  @ApiProperty({ description: 'Generate e-Invoice via GSTN API', default: true })
  @IsBoolean()
  @IsOptional()
  generateEinvoice?: boolean;

  @ApiProperty({ description: 'If not via API, provide IRN manually' })
  @IsString()
  @IsOptional()
  irn?: string;

  @ApiProperty({ description: 'Manual Ack No' })
  @IsString()
  @IsOptional()
  ackNo?: string;

  @ApiProperty({ description: 'Manual Ack Date' })
  @IsString()
  @IsOptional()
  ackDate?: string;

  @ApiProperty({ description: 'Transport Mode', default: 'Road' })
  @IsString()
  @IsOptional()
  transportMode?: string;
}

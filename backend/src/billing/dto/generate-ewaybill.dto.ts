import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateEwayBillDto {
  @ApiProperty({ description: 'Transporter GSTIN or PAN' })
  @IsString()
  @IsOptional()
  transporterId?: string;

  @ApiProperty({ description: 'Transporter Name' })
  @IsString()
  @IsOptional()
  transporterName?: string;

  @ApiProperty({ description: 'Vehicle Number' })
  @IsString()
  vehicleNo: string;

  @ApiProperty({ description: 'Distance in KM' })
  @IsNumber()
  @Min(1)
  distanceKm: number;

  @ApiProperty({ description: 'Supply Type', default: 'Regular', enum: ['Regular', 'Job Work', 'SKD/CKD', 'Lines Sales', 'Others'] })
  @IsString()
  @IsOptional()
  supplyType?: string;

  @ApiProperty({ description: 'Document Type', default: 'Tax Invoice', enum: ['Tax Invoice', 'Bill of Supply', 'Delivery Challan', 'Credit Note'] })
  @IsString()
  @IsOptional()
  docType?: string;

  @ApiProperty({ description: 'Transport Mode', default: 'Road', enum: ['Road', 'Rail', 'Air', 'Ship'] })
  @IsString()
  @IsOptional()
  transportMode?: string;
}

import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Organic Wheat Flour' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'WF-001', required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: '1105', required: false })
  @IsString()
  @IsOptional()
  hsnCode?: string;

  @ApiProperty({ example: 'kg', required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 45 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiProperty({ example: 35, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  purchasePrice?: number;

  @ApiProperty({ example: 50, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  mrp?: number;

  @ApiProperty({ example: 5, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiProperty({ example: 'inclusive', required: false })
  @IsString()
  @IsOptional()
  taxType?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  trackBatch?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  trackExpiry?: boolean;

  @ApiProperty({ example: 10, required: false })
  @IsNumber()
  @IsOptional()
  lowStockThreshold?: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isService?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  barcode?: string;
}

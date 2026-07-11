import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StockMovementType } from '@prisma/client';

export class StockAdjustDto {
  @ApiProperty({ enum: StockMovementType, example: 'ADJUSTMENT' })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  batchNo?: string;

  @ApiProperty({ example: 'Stock count adjustment', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

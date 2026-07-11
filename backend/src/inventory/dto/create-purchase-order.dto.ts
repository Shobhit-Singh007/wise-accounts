import { IsString, IsOptional, IsArray, IsNumber, Min, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PurchaseOrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 35 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  batchNo?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
